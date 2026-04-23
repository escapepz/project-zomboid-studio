import { join } from 'path';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { addHelp } from '../help';
import { processArgs } from '../args';
import {
    generateModInfoText,
    generateWorkshopText,
    projectDir,
    resolveProjectConfig,
    resolveBuildOutputPath,
} from '../helper';
import { info, log, warn, verbose } from '../logger';
import { resolveTemplateDir, scaffoldProject } from '../templateManager';

/**
 * Check if a flag exists in command arguments
 */
function hasFlag(name: string): boolean {
    return processArgs().some((a) => a === `--${name}`);
}

addHelp(
    'build',
    `Build your project and package it for the workshop.

    NOTE: This command is for packaging only. To generate mod.info files in your source tree,
    use 'pzstudio modinfo generate'.

    Usages:
        pzstudio build               - Builds only the main workshop output (Default).
        pzstudio build --production  - Builds only the main workshop output.
        pzstudio build --development - Builds only the dev_branch workshop output.
        pzstudio build --verbose     - Enable diagnostic output.`,
);

async function buildWorkshop(
    projectConfig: any,
    outPath: string,
    modIdPrefix: string = '',
    overrideVisibility?: string,
    excludeId: boolean = false,
    titleSuffix?: string,
) {
    const projectPath = projectDir();
    verbose(`Resolving workshop template...`);
    const templateWorkshopPath = resolveTemplateDir('workshop');
    verbose(`Workshop template path: ${templateWorkshopPath}`);

    // Remove the output directory
    rmSync(outPath, { recursive: true, force: true });

    // Create the output directory
    mkdirSync(outPath, { recursive: true });

    // Copy the workshop template
    log(`- Copying workshop template...`);
    scaffoldProject(templateWorkshopPath, outPath, false, false, {
        excludeIgnoreFile: true,
        ignoreDotFiles: true,
    });

    // Copy the mods
    for (const modId of Object.keys(projectConfig.mods).filter(
        (modId: string) => !projectConfig.excludes.includes(modId),
    )) {
        const prefixedModId = modIdPrefix ? `${modId}${modIdPrefix}` : modId;
        // Copy the mod
        const outModsPath = join(outPath, 'Contents', 'mods', prefixedModId);
        log(`- Copying mod '${modId}'...`);
        verbose(`Mod source: ${join(projectPath, modId)}`);
        verbose(`Mod destination: ${outModsPath}`);
        const modSrcPath = join(projectPath, modId);
        scaffoldProject(modSrcPath, outModsPath, false, false, {
            excludeIgnoreFile: true,
            ignoreDotFiles: true,
            ignoreItems: projectConfig.excludes,
        });

        // Generate the mod.info
        const modInfoFlag = projectConfig.mods[modId].build?.modInfo;
        const effectiveModInfoFlag = modInfoFlag ?? 'skip';
        const modInfoPath = join(outModsPath, 'mod.info');

        if (effectiveModInfoFlag === 'skip') {
            log(
                `- Skipping '${modId}' mod.info generation (build.modInfo: "skip")...`,
            );
        } else if (
            effectiveModInfoFlag === 'auto-if-missing' &&
            existsSync(modInfoPath)
        ) {
            log(
                `- Skipping '${modId}' mod.info generation (already exists, build.modInfo: "auto-if-missing")...`,
            );
        } else {
            log(`- Generating '${modId}' mod.info...`);
            writeFileSync(
                modInfoPath,
                generateModInfoText(modId, projectConfig, prefixedModId),
            );
        }
    }

    // Copy the workshop preview.png
    const projectPreviewPath = join(projectPath, 'workshop', 'preview.png');
    if (existsSync(projectPreviewPath)) {
        log(`- Copying workshop 'preview.png'...`);
        cpSync(
            join(projectDir(), 'workshop', 'preview.png'),
            join(outPath, 'preview.png'),
        );
    } else {
        warn(`- No workshop 'preview.png' found as '${projectPreviewPath}'...`);
    }

    // Generate the workshop.txt
    log(`- Generating 'workshop.txt'...`);
    writeFileSync(
        join(outPath, 'workshop.txt'),
        generateWorkshopText(
            projectConfig,
            overrideVisibility,
            excludeId,
            titleSuffix,
        ),
    );
}

export async function buildCmd() {
    const projectConfig = resolveProjectConfig();

    // Check if we are in a project directory
    if (!projectConfig) {
        throw new Error(
            'You must execute this command within a project directory!',
        );
    }

    const startTime = performance.now();

    const projectPath = projectDir();
    const outDir = projectConfig.outdir!;
    verbose(`Project root: ${projectPath}`);
    verbose(`Output root: ${outDir}`);

    const isProduction = hasFlag('production');
    const isDevelopment = hasFlag('development');
    verbose(
        `Targets: production=${isProduction}, development=${isDevelopment}`,
    );

    // Conflict detection
    if (isProduction && isDevelopment) {
        throw new Error(
            'Conflicting targets selected: Use either --production or --development, not both.',
        );
    }

    const noFlags = !isProduction && !isDevelopment;

    // Build main workshop (Default or explicit --production)
    if (noFlags || isProduction) {
        log(`\nBuilding main workshop...`);
        const mainOutPath = resolveBuildOutputPath(projectConfig, 'main');
        await buildWorkshop(projectConfig, mainOutPath);
    }

    // Build dev_branch workshop (Only if --development is specified)
    if (isDevelopment) {
        log(`\nBuilding dev_branch workshop...`);
        const devOutPath = resolveBuildOutputPath(projectConfig, 'development');
        await buildWorkshop(
            projectConfig,
            devOutPath,
            '_dev',
            'unlisted',
            true,
            ' - dev_branch',
        );
    }

    const endTime = performance.now();
    info(`Build complete in ${((endTime - startTime) / 1000).toFixed(2)}s!`);
}
