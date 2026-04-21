import { WatchOptions, watch } from 'chokidar';
import { dirname, join, resolve, sep } from 'path';
import {
    copyFileSync,
    cpSync,
    existsSync,
    mkdirSync,
    rmSync,
    writeFileSync,
} from 'fs';
import { addHelp } from '../help';
import {
    generateModInfoText,
    generateWorkshopText,
    getOutDir,
    projectDir,
    readProjectConfig,
} from '../helper';
import { error, info, log, warn } from '../logger';
import { scaffoldProject } from '../templateManager';

addHelp(
    'watch',
    `Watch your project and update your output directory with your project.

    Usages:
        pzstudio watch - Watch your project and update your output directory with your project.
    
    WARNING: This command is EXPERIMENTAL and may not handle all edge cases correctly. Use with caution.`,
);

export async function watchCmd() {
    throw new Error('Not implemented yet!');
}
