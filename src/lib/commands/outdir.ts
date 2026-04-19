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
    const configPath = join(storeDir, 'config.json');

    // Ensure store directory exists
    mkdirSync(storeDir, { recursive: true });

    // Read existing config or create new one
    let config: any = { templates: {} };
    if (existsSync(configPath)) {
        try {
            const content = readFileSync(configPath, 'utf8');
            config = { ...config, ...JSON.parse(content) };
        } catch (e) {
            // Use default config
        }
    }

    // check if the new path is the same as the old one
    if (config.outdir && config.outdir === newOutDir) {
        throw new Error('The output directory is already set to this value.');
    }

    // write the new path to config.json
    config.outdir = newOutDir;
    writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
    log(`The output directory has been changed to "${newOutDir}".`);
}
