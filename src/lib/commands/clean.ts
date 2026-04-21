import { join } from 'path';
import { existsSync, rmSync } from 'fs';
import { addHelp } from '../help';
import { resolveProjectConfig } from '../helper';
import { log } from '../logger';

addHelp(
    'clean',
    `Clean your output directory from the current built project.

    Usages:
        pzstudio clean - Clean your output directory from the current built project.`,
);

export function cleanCmd() {
    const projectConfig = resolveProjectConfig();

    // Check if we are in a project directory
    if (!projectConfig) {
        throw new Error(
            'You must execute this command within a project directory!',
        );
    }

    const startTime = performance.now();

    // Clean the output directory
    const outPath = join(projectConfig.outdir!, projectConfig.workshop.title);
    if (existsSync(outPath)) {
        log(`Cleaning output directory at '${outPath}'...`);
        rmSync(outPath, { recursive: true, force: true });
    } else throw new Error(`Output directory at '${outPath}' does not exist!`);

    const endTime = performance.now();
    log(`Clean complete in ${((endTime - startTime) / 1000).toFixed(2)}s!`);
}
