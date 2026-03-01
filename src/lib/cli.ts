// @ts-ignore
import { version, branch } from '../../package.json';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
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
import { arg, args, cmd, processArgs } from './args';
import { clear, error, info, log, warn } from './logger';
import { projectDir, migrateStoreDirIfNeeded } from './helper';

/**
 * Extract a flag value from command arguments
 * @param name The flag name (without dashes)
 * @returns The flag value or undefined
 */
export function extractFlag(name: string): string | undefined {
    const allArgs = processArgs();
    const flagIndex = allArgs.findIndex((a) => a === `--${name}`);
    if (flagIndex !== -1 && flagIndex + 1 < allArgs.length) {
        return allArgs[flagIndex + 1];
    }
    return undefined;
}

export async function runCLI(cmdName?: string, cmdArgs?: string[]) {
    // Migrate legacy store on first CLI call
    migrateStoreDirIfNeeded();

    clear();
    log('\n');

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
        log(`Project Zomboid Studio v${version} - @${branch} (${buildDate})\n`);
    }

    const command = {
        name: cmdName ?? cmd(),
        params: cmdArgs ?? args(),
    };

    log('Project Dir:  ' + projectDir());

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
                await langCmd(
                    command.params[0] as string,
                    command.params[1] as string,
                );
                break;

            case 'new':
                await newCmd(
                    command.params[0] as string,
                    command.params[1] as string,
                );
                break;

            case 'outdir':
                await outdirCmd(command.params[0] as string);
                break;

            case 'rename':
                await renameCmd(
                    command.params[0] as string,
                    command.params[1] as string,
                );
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

        if (
            command.name !== 'build' &&
            command.name !== 'clean' &&
            command.name !== 'help'
        ) {
            info(`Command [${command.name}] completed.`);
        }
    } catch (e) {
        error(e);
    }

    log('\n');
}
