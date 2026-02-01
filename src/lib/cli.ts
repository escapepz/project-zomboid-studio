// @ts-ignore
import { version, branch } from '../../package.json';
import { terminal } from 'terminal-kit';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { addCmd } from './commands/add';
import { buildCmd } from './commands/build';
import { cleanCmd } from './commands/clean';
import { deleteCmd } from './commands/delete';
import { helpCmd } from './commands/help';
import { langCmd } from './commands/lang';
import { newCmd } from './commands/new';
import { outdirCmd } from './commands/outdir';
import { renameCmd } from './commands/rename';
import { updateCmd } from './commands/update';
import { watchCmd } from './commands/watch';
import { arg, args, cmd } from './args';
import { error, info, log, warn } from './logger';
import { projectDir } from './helper';

export async function runCLI(cmdName?: string, cmdArgs?: string[]) {
    let buildDate = 'Unknown';
    try {
        const buildInfoPath = join(__dirname, '../build.json');
        if (existsSync(buildInfoPath)) {
            buildDate =
                JSON.parse(readFileSync(buildInfoPath, 'utf8')).buildDate ??
                'Unknown';
        }
    } catch (e) {
        // ignore
    }

    if (!cmdName) {
        terminal.clear();
        terminal.green(
            `Project Zomboid Studio v${version} - @${branch} (${buildDate})\n`,
        );
    }

    const command = {
        name: cmdName ?? cmd(),
        params: cmdArgs ?? args(),
    };

    //log('PZStudio Dir: ' + workingDir());
    log('Project Dir:  ' + projectDir());

    // Check for updates
    // const versions = JSON.parse(
    //     spawnSync('npm', ['view', 'pzstudio', 'versions', '--json'], {
    //         shell: true,
    //         stdio: 'pipe',
    //     }).stdout.toString(),
    // );
    // if (version) {
    //     const latestVersion = versions[versions.length - 1];
    //     if (version !== latestVersion) {
    //         warn(`\n** New version of PZStudio is available! **`);
    //         warn(
    //             `Execute 'npm i -g pzstudio' to update to the latest version.`,
    //         );
    //         warn(`Version: ${version} < ${latestVersion}\n`);
    //     }
    // }

    // Execute command
    info(
        `Executing command [${command.name}] ${command.params.length ? `with params [${command.params.join(', ')}]` : ''}`,
    );
    try {
        switch (command.name) {
            case 'add':
                await addCmd(command.params[0] as string);
                break;

            case 'build':
                await buildCmd();
                break;

            case 'clean':
                await cleanCmd();
                break;

            case 'delete':
                await deleteCmd(command.params[0] as string);
                break;

            case 'help':
                await helpCmd(command.params[0] as string);
                break;

            case 'lang':
                await langCmd(command.params[0] as string, command.params[1] as string);
                break;

            case 'new':
                await newCmd(command.params[0] as string, command.params[1] as string);
                break;

            case 'outdir':
                await outdirCmd(command.params[0] as string);
                break;

            case 'rename':
                await renameCmd(command.params[0] as string, command.params[1] as string);
                break;

            case 'update':
                await updateCmd();
                break;

            case 'watch':
                await watchCmd();
                break;

            case undefined:
                await helpCmd();
                break;

            default:
                throw new Error(`Unknown command [${command.name}]`);
        }
    } catch (e) {
        error(e);
    }

    if (!cmdName) {
        terminal('\n');
    }
}
