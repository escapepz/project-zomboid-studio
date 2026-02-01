import * as vscode from 'vscode';
import { setLogger } from './lib/logger';
import { runCLI } from './lib/cli';
import { setProjectDir } from './lib/helper';

export function activate(context: vscode.ExtensionContext) {
    const outputChannel = vscode.window.createOutputChannel('Project Zomboid Studio');

    // Initialize Logger
    setLogger({
        log: (msg) => outputChannel.appendLine(msg),
        info: (msg) => outputChannel.appendLine(`[INFO] ${msg}`),
        warn: (msg) => outputChannel.appendLine(`[WARN] ${msg}`),
        error: (err) => {
            if (err instanceof Error) {
                outputChannel.appendLine(`[ERROR] ${err.message}\n${err.stack}`);
            } else {
                outputChannel.appendLine(`[ERROR] ${err}`);
            }
            vscode.window.showErrorMessage(`PZStudio Error: ${err instanceof Error ? err.message : err}`);
        }
    });

    const executePZCommand = async (command: string, ...args: string[]) => {
        outputChannel.show();

        // Update Project Dir to current workspace
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
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

    // Register Commands
    const commands = [
        vscode.commands.registerCommand('pzstudio.build', () => executePZCommand('build')),
        vscode.commands.registerCommand('pzstudio.clean', () => executePZCommand('clean')),
        vscode.commands.registerCommand('pzstudio.update', () => executePZCommand('update')),
        vscode.commands.registerCommand('pzstudio.watch', () => executePZCommand('watch')),

        vscode.commands.registerCommand('pzstudio.new', async () => {
            const projectTitle = await vscode.window.showInputBox({
                prompt: 'Enter Project Title',
                placeHolder: 'My Awesome Mod'
            });
            if (!projectTitle) return;

            const modId = await vscode.window.showInputBox({
                prompt: 'Enter Mod ID (Optional, leave blank for auto-generated)',
                placeHolder: 'my_awesome_mod'
            });

            await executePZCommand('new', projectTitle, modId || '');
        }),

        vscode.commands.registerCommand('pzstudio.add', async () => {
            const modName = await vscode.window.showInputBox({
                prompt: 'Enter Mod Name',
                placeHolder: 'My New Mod'
            });
            if (!modName) return;

            const modId = await vscode.window.showInputBox({
                prompt: 'Enter Mod ID (Optional, leave blank for auto-generated)',
                placeHolder: 'my_new_mod'
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
                'Yes'
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
