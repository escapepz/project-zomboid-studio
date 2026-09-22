import * as vscode from 'vscode';
import {
    setLogger,
    setProjectDir,
    setVsCodeSettings,
    runCLI,
    ILogger,
} from 'pzstudio-cli/api';

let isExecutingCommand = false;

function getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel(
        'Project Zomboid Studio',
    );

    setLogger({
        log: (msg: string) => outputChannel.appendLine(msg),
        info: (msg: string) =>
            outputChannel.appendLine(`[${getTimestamp()}] [INFO] ${msg}`),
        warn: (msg: string) =>
            outputChannel.appendLine(`[${getTimestamp()}] [WARN] ${msg}`),
        error: (err: string | Error) => {
            const timestamp = getTimestamp();
            if (err instanceof Error) {
                outputChannel.appendLine(
                    `[${timestamp}] [ERROR] ${err.message}\n${err.stack}`,
                );
            } else {
                outputChannel.appendLine(`[${timestamp}] [ERROR] ${err}`);
            }
            vscode.window.showErrorMessage(
                `PZStudio Error: ${err instanceof Error ? err.message : err}`,
            );
        },
        clear: () => outputChannel.clear(),
    });

    function updateVsCodeSettings() {
        const config = vscode.workspace.getConfiguration('pzstudio');
        const outdirInspect = config.inspect<string>('outdir');
        const useSymlinksInspect = config.inspect<boolean>('useSymlinks');

        const extractTemplates = (
            valueKey: 'workspaceValue' | 'globalValue',
        ) => {
            const result: any = {};
            for (const cat of ['project', 'mod', 'workshop', 'language']) {
                const catConfig = vscode.workspace.getConfiguration(
                    `pzstudio.templates.${cat}`,
                );
                const url = catConfig.inspect<string>('url')?.[valueKey];
                const ref = catConfig.inspect<string>('ref')?.[valueKey];
                if (url) {
                    result[cat] = { url, ...(ref ? { ref } : {}) };
                }
            }
            return Object.keys(result).length > 0 ? result : undefined;
        };

        setVsCodeSettings(
            {
                templates: extractTemplates('workspaceValue'),
                outdir: outdirInspect?.workspaceValue,
                useSymlinks: useSymlinksInspect?.workspaceValue,
            },
            {
                templates: extractTemplates('globalValue'),
                outdir: outdirInspect?.globalValue,
                useSymlinks: useSymlinksInspect?.globalValue,
            },
        );
    }

    updateVsCodeSettings();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('pzstudio')) {
                updateVsCodeSettings();
            }
        }),
    );

    function resolveFlags(command: string): string[] {
        const config = vscode.workspace.getConfiguration('pzstudio');
        const flags: string[] = [];

        if (config.get<boolean>('verbose')) {
            flags.push('--verbose');
        }

        if (command === 'new' || command === 'add') {
            if (config.get<boolean>('offline')) {
                flags.push('--offline');
            }
            if (config.get<boolean>('forceUpdate')) {
                flags.push('--force-update');
            }
            if (config.get<boolean>('useSymlinks')) {
                flags.push('--symlinks');
            }
        }

        if (command === 'build') {
            const target = config.get<string>('build.target');
            if (target === 'production') {
                flags.push('--production');
            } else if (target === 'development') {
                flags.push('--development');
            }
        }

        return flags;
    }

    const executePZCommand = async (
        command: string,
        args: string[] = [],
        extraFlags: string[] = [],
        commandProjectDir?: string,
    ) => {
        if (isExecutingCommand) {
            vscode.window.showWarningMessage(
                'PZStudio: Another command is already running.',
            );
            return;
        }

        isExecutingCommand = true;
        outputChannel.show();

        if (commandProjectDir) {
            setProjectDir(commandProjectDir);
        } else if (
            vscode.workspace.workspaceFolders &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            setProjectDir(vscode.workspace.workspaceFolders[0].uri.fsPath);
        } else {
            setProjectDir(undefined);
        }

        // extraFlags (e.g. --path) go on process.argv because the CLI reads
        // flags with hasFlag/extractFlag, which parse process.argv.
        const flags = [...resolveFlags(command), ...extraFlags];
        const savedArgv = process.argv;
        process.argv = [...savedArgv, ...flags];

        try {
            await runCLI(command, args);
        } catch (e) {
            // Already handled by logger.error
        } finally {
            process.argv = savedArgv;
            isExecutingCommand = false;
        }
    };

    async function promptForProjectDetails(): Promise<
        { title: string; modId: string } | undefined
    > {
        const title = await vscode.window.showInputBox({
            prompt: 'Enter Project Title',
            placeHolder: 'My Awesome Mod',
        });
        if (!title) return undefined;

        const modId = await vscode.window.showInputBox({
            prompt: 'Enter Mod ID (Optional, leave blank for auto-generated)',
            placeHolder: 'my_awesome_mod',
        });

        return { title, modId: modId || '' };
    }

    async function createProject(destination: string) {
        const project = await promptForProjectDetails();
        if (!project) return;

        await executePZCommand(
            'new',
            [project.title, project.modId],
            ['--path', destination],
            destination,
        );
    }

    async function pickNewProjectDestination(): Promise<string | undefined> {
        const defaultLocation = vscode.workspace
            .getConfiguration('pzstudio')
            .inspect<string>('newProject.defaultLocation')?.globalValue;
        const picked = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Destination Folder',
            title: 'Create project in...',
            defaultUri: defaultLocation
                ? vscode.Uri.file(defaultLocation)
                : undefined,
        });

        if (picked && picked.length > 0) return picked[0].fsPath;
        return defaultLocation || undefined;
    }

    async function getWorkspaceProjectDestination(): Promise<
        string | undefined
    > {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage(
                'PZStudio: Open a workspace folder before creating a project here.',
            );
            return undefined;
        }
        if (folders.length === 1) return folders[0].uri.fsPath;

        const selected = await vscode.window.showQuickPick(
            folders.map((folder) => ({
                label: folder.name,
                description: folder.uri.fsPath,
                folder,
            })),
            { placeHolder: 'Select the workspace folder for the new project' },
        );
        return selected?.folder.uri.fsPath;
    }

    const commands = [
        vscode.commands.registerCommand('pzstudio.build', () =>
            executePZCommand('build'),
        ),
        vscode.commands.registerCommand('pzstudio.clean', () =>
            executePZCommand('clean'),
        ),
        vscode.commands.registerCommand('pzstudio.update', () =>
            executePZCommand('update'),
        ),
        vscode.commands.registerCommand('pzstudio.watch', () =>
            executePZCommand('watch'),
        ),

        vscode.commands.registerCommand('pzstudio.new', async () => {
            const destination = await pickNewProjectDestination();
            if (!destination) {
                vscode.window.showWarningMessage(
                    'PZStudio: No destination folder selected, project creation cancelled.',
                );
                return;
            }

            await createProject(destination);
        }),

        vscode.commands.registerCommand('pzstudio.newHere', async () => {
            const destination = await getWorkspaceProjectDestination();
            if (!destination) return;

            await createProject(destination);
        }),

        vscode.commands.registerCommand('pzstudio.add', async () => {
            const modName = await vscode.window.showInputBox({
                prompt: 'Enter Mod Name',
                placeHolder: 'My New Mod',
            });
            if (!modName) return;

            const modId = await vscode.window.showInputBox({
                prompt: 'Enter Mod ID (Optional, leave blank for auto-generated)',
                placeHolder: 'my_new_mod',
            });

            await executePZCommand('add', [modName, modId || '']);
        }),

        vscode.commands.registerCommand('pzstudio.delete', async () => {
            const modId = await vscode.window.showInputBox({
                prompt: 'Enter Mod ID to delete',
            });
            if (!modId) return;

            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete mod '${modId}'? This cannot be undone.`,
                { modal: true },
                'Yes',
            );
            if (confirm !== 'Yes') return;

            await executePZCommand('delete', [modId]);
        }),

        vscode.commands.registerCommand('pzstudio.rename', async () => {
            const modId = await vscode.window.showInputBox({
                prompt: 'Enter current Mod ID',
            });
            if (!modId) return;

            const newName = await vscode.window.showInputBox({
                prompt: 'Enter new Mod Name',
            });
            if (!newName) return;

            await executePZCommand('rename', [modId, newName]);
        }),

        vscode.commands.registerCommand('pzstudio.lang', async () => {
            const modId = await vscode.window.showInputBox({
                prompt: 'Enter Mod ID',
            });
            if (!modId) return;

            const language = await vscode.window.showInputBox({
                prompt: 'Enter language code (e.g. EN, FR, PTBR)',
            });
            if (!language) return;

            await executePZCommand('lang', [modId, language]);
        }),

        vscode.commands.registerCommand(
            'pzstudio.modinfoGenerate',
            async () => {
                const modId = await vscode.window.showInputBox({
                    prompt: 'Enter Mod ID (Optional, leave blank for all mods)',
                    placeHolder: 'my_mod',
                });

                await executePZCommand('modinfo', [
                    'generate',
                    ...(modId ? [modId] : []),
                ]);
            },
        ),
    ];

    context.subscriptions.push(outputChannel, ...commands);
}

export function deactivate() {
    isExecutingCommand = false;
    setLogger(undefined);
    setProjectDir(undefined);
    setVsCodeSettings(undefined, undefined);
}
