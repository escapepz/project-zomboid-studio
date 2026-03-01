import * as vscode from 'vscode';
import { setLogger, setProjectDir, runCLI, ILogger } from 'pzstudio-cli/api';

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

    const executePZCommand = async (command: string, ...args: string[]) => {
        outputChannel.show();

        if (
            vscode.workspace.workspaceFolders &&
            vscode.workspace.workspaceFolders.length > 0
        ) {
            setProjectDir(vscode.workspace.workspaceFolders[0].uri.fsPath);
        } else {
            setProjectDir(undefined);
        }

        try {
            await runCLI(command, args);
        } catch (e) {
            // Already handled by logger.error
        }
    };

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
            const projectTitle = await vscode.window.showInputBox({
                prompt: 'Enter Project Title',
                placeHolder: 'My Awesome Mod',
            });
            if (!projectTitle) return;

            const modId = await vscode.window.showInputBox({
                prompt: 'Enter Mod ID (Optional, leave blank for auto-generated)',
                placeHolder: 'my_awesome_mod',
            });

            await executePZCommand('new', projectTitle, modId || '');
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

            await executePZCommand('add', modName, modId || '');
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

            await executePZCommand('delete', modId);
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

            await executePZCommand('rename', modId, newName);
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

            await executePZCommand('lang', language, modId);
        }),
    ];

    context.subscriptions.push(outputChannel, ...commands);
}

export function deactivate() {
    setLogger(undefined);
    setProjectDir(undefined);
}
