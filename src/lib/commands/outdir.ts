import { resolve, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { expect } from '../expect';
import { addHelp } from '../help';
import { getStoreDir } from '../helper';
import { log } from '../logger';

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

    const storeDir = getStoreDir();
    const outDirFile = join(storeDir, 'outdir');

    // Ensure store directory exists
    mkdirSync(storeDir, { recursive: true });

    // check if the new path is the same as the old one
    if (existsSync(outDirFile)) {
        const oldPath = readFileSync(outDirFile, 'utf8').trim();
        if (oldPath === newOutDir) {
            throw new Error(
                'The output directory is already set to this value.',
            );
        }
    }

    // write the new path
    writeFileSync(outDirFile, newOutDir);
    log(`The output directory has been changed to "${newOutDir}".`);
}
