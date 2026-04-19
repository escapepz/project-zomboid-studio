import { resolve } from 'path';
import { existsSync } from 'fs';
import { expect } from '../expect';
import { addHelp } from '../help';
import { log } from '../logger';
import { readGlobalConfig, writeGlobalConfig } from '../templateManager';

addHelp(
    'outdir',
    `Change the output directory of your project.

    Usages:
        pzstudio outdir <newOutDir> - Change the output directory of your project.`,
);

export function outdirCmd(newOutDir: string) {
    expect('param [newOutDir]', newOutDir, 'string');

    // resolve the path
    newOutDir = resolve(newOutDir);

    // check if the new path exists
    if (!existsSync(newOutDir)) {
        throw new Error(`The output directory "${newOutDir}" does not exist.`);
    }

    const config = readGlobalConfig();

    // check if the new path is the same as the old one
    if (config.outdir && config.outdir === newOutDir) {
        throw new Error('The output directory is already set to this value.');
    }

    // write the new path to config.json
    config.outdir = newOutDir;
    writeGlobalConfig(config);
    log(`The output directory has been changed to "${newOutDir}".`);
}
