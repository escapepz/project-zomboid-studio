/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore - necessary because we can't reliably predict if typescript will resolve this outside src without structural errors in some configs
import { version, branch } from '../../package.json';
/* eslint-enable @typescript-eslint/ban-ts-comment */
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
import { migrateCmd } from './commands/migrate';
import { arg, args, cmd, processArgs, splitArgs, parseArgType } from './args';
import { clear, error, info, log, warn, verbose } from './logger';
import { projectDir, migrateStoreDirIfNeeded } from './helper';
import { migrateGlobalConfigIfNeeded } from './templateManager';

/**
 * Extract a flag value from command arguments
 * @param name The flag name (without dashes)
 * @returns The flag value or undefined
 */
export function extractFlag(name: string): string | undefined {
    const allArgs = processArgs();
    const flagIndex = allArgs.findIndex((a) => a === `--${name}`);
    if (flagIndex !== -1 && flagIndex + 1 < allArgs.length) {
        const val = allArgs[flagIndex + 1];
        if (val.startsWith('--')) {
            return undefined;
        }
        return val;
    }
    return undefined;
}

/**
 * Check if a flag exists in command arguments
 * @param name The flag name (without dashes)
 * @returns True if the flag exists
 */
export function hasFlag(name: string): boolean {
    return processArgs().some((a) => a === `--${name}`);
}

import { setVerbose } from './logger';

export async function runCLI(cmdName?: string, cmdArgs?: string[]) {
    // Handle SIGINT for clean cleanup
    process.on('SIGINT', () => {
        log('\n');
        warn('Process interrupted by user (SIGINT).');
        process.exit(130);
    });

    // Initialize verbose mode early
    if (hasFlag('verbose')) {
        setVerbose(true);
    }

    // Handle root-level help and version (side-effect free)
    if (hasFlag('version')) {
        log(`v${version}`);
        return;
    }

    // Migrate legacy store and config on first CLI call
    migrateStoreDirIfNeeded();
    migrateGlobalConfigIfNeeded();

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
    } catch (_e) {
        // ignore
    }

    const currentCmd = cmdName ?? cmd();

    if (!currentCmd) {
        log(`Project Zomboid Studio v${version} - @${branch} (${buildDate})\n`);
    }

    if (hasFlag('help') && !currentCmd) {
        await helpCmd();
        return;
    }

    let commandParams: any[] | undefined = cmdArgs;
    if (!commandParams) {
        const rawCmdArgs = processArgs().slice(1);
        const { positionals } = splitArgs(rawCmdArgs);
        commandParams = positionals.map((a) => parseArgType(a));
    }

    const command = {
        name: currentCmd,
        params: commandParams,
    };

    verbose('Project Dir:  ' + projectDir());

    verbose(
        `Executing command [${command.name}] ${command.params.length ? `with params [${command.params.join(', ')}]` : ''}`,
    );

    // Handle --help for specific command BEFORE executing it (allows help even outside projects)
    if (hasFlag('help') && command.name) {
        await helpCmd(command.name);
        return;
    }

    try {
        switch (command.name) {
            case 'add':
                await addCmd(
                    command.params[0] as string,
                    command.params[1] as string,
                );
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

            case 'migrate':
                await migrateCmd();
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
            command.name !== 'help' &&
            command.name !== undefined
        ) {
            info(`Command [${command.name}] completed.`);
        }
    } catch (e) {
        error(e);
        process.exit(1);
    }

    log('\n');
}
