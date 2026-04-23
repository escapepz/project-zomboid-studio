import { existsSync, rmSync } from 'fs';
import { addHelp } from '../help';
import { resolveProjectConfig, resolveBuildOutputPath } from '../helper';
import { log, verbose } from '../logger';

addHelp(
    'clean',
    `Clean your output directory from the current built project.
    Removes both the main workshop output and the development output if they exist.

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

    const mainOutPath = resolveBuildOutputPath(projectConfig, 'main');
    const devOutPath = resolveBuildOutputPath(projectConfig, 'development');

    let cleaned = false;

    // Clean main output
    if (existsSync(mainOutPath)) {
        log(`Cleaning main output directory at '${mainOutPath}'...`);
        rmSync(mainOutPath, { recursive: true, force: true });
        verbose(`Cleaned: ${mainOutPath}`);
        cleaned = true;
    }

    // Clean development output
    if (existsSync(devOutPath)) {
        log(`Cleaning development output directory at '${devOutPath}'...`);
        rmSync(devOutPath, { recursive: true, force: true });
        verbose(`Cleaned: ${devOutPath}`);
        cleaned = true;
    }

    if (!cleaned) {
        throw new Error(
            `No build output found to clean (checked '${mainOutPath}' and '${devOutPath}')`,
        );
    }

    const endTime = performance.now();
    log(`Clean complete in ${((endTime - startTime) / 1000).toFixed(2)}s!`);
}
