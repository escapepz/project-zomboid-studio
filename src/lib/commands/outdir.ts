import { resolve } from 'path';
import { existsSync } from 'fs';
import { expect } from '../expect';
import { addHelp } from '../help';
import { log, verbose } from '../logger';
import { readGlobalConfig, writeGlobalConfig } from '../templateManager';

addHelp(
    'outdir',
    `Change the output directory of your project.

    Usages:
        pzstudio outdir <newOutDir> - Change the output directory of your project.
    
    Flags:
        --verbose        - Enable diagnostic output.`,
);

export function outdirCmd(newOutDir: string) {
    expect('param [newOutDir]', newOutDir, 'string');

    verbose(`Changing outdir to: ${newOutDir}`);

    // resolve the path
    newOutDir = resolve(newOutDir);
    verbose(`Resolved outdir path: ${newOutDir}`);

    // check if the new path exists
    if (!existsSync(newOutDir)) {
        verbose(`Validation failed: Path ${newOutDir} does not exist.`);
        throw new Error(`The output directory "${newOutDir}" does not exist.`);
    }

    const config = readGlobalConfig();
    verbose(`Current outdir: ${config.outdir}`);

    // check if the new path is the same as the old one
    if (config.outdir && config.outdir === newOutDir) {
        verbose(`Validation failed: New path is the same as current path.`);
        throw new Error('The output directory is already set to this value.');
    }

    // write the new path to config.json
    verbose(`Writing new outdir to global config...`);
    config.outdir = newOutDir;
    writeGlobalConfig(config);
    log(`The output directory has been changed to "${newOutDir}".`);
}
