import { join } from 'path';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { addHelp } from '../help';
import {
    copyFolderSync,
    generateModInfoText,
    generateWorkshopText,
    getOutDir,
    projectDir,
    readProjectConfig,
} from '../helper';
import { info, log, warn } from '../logger';
import { createIgnoreFilter, resolveTemplateDir } from '../templateManager';

addHelp(
    'build',
    `Build your project and update your output directory with your project.

    Usages:
        pzstudio build - Builds your project and updates the output directory.`,
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
    const templateWorkshopPath = resolveTemplateDir('workshop');

    // Remove the output directory
    rmSync(outPath, { recursive: true, force: true });

    // Create the output directory
    mkdirSync(outPath, { recursive: true });

    // Copy the workshop template
    const workshopFilter = createIgnoreFilter(templateWorkshopPath, {
        excludeIgnoreFile: true,
    });
    copyFolderSync(templateWorkshopPath, outPath, true, workshopFilter);

    // Copy the mods
    for (const modId of Object.keys(projectConfig.mods).filter(
        (modId: string) => !projectConfig.workshop.excludes.includes(modId),
    )) {
        const prefixedModId = modIdPrefix ? `${modId}${modIdPrefix}` : modId;
        // Copy the mod
        const outModsPath = join(outPath, 'Contents', 'mods', prefixedModId);
        log(`- Copying mod '${modId}'...`);
        const modSrcPath = join(projectPath, modId);
        const modFilter = createIgnoreFilter(modSrcPath, {
            excludeIgnoreFile: true,
        });
        copyFolderSync(modSrcPath, outModsPath, true, modFilter);

        // Generate the mod.info
        const modInfoFlag = projectConfig.mods[modId].build?.modInfo;
        if (modInfoFlag === undefined) {
            warn(
                `[BREAKING CHANGE] The default 'modInfo' flag has changed from 'auto' to 'skip'. ` +
                    `If you want to continue auto-generating mod.info for '${modId}', please set 'build.modInfo': 'auto' in your project.json.`,
            );
        }

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
    const projectConfig = readProjectConfig();

    // Check if we are in a project directory
    if (!projectConfig) {
        throw new Error(
            'You must execute this command within a project directory!',
        );
    }

    const startTime = performance.now();

    const projectPath = projectDir();
    const outDir = getOutDir();

    // Build main workshop
    log(`\nBuilding main workshop...`);
    const mainOutPath = join(outDir, projectConfig.title);
    await buildWorkshop(projectConfig, mainOutPath);

    // Build dev_branch workshop
    log(`\nBuilding dev_branch workshop...`);
    const devOutPath = join(outDir, `${projectConfig.title} - dev_branch`);
    await buildWorkshop(
        projectConfig,
        devOutPath,
        '_dev',
        'unlisted',
        true,
        ' - dev_branch',
    );

    const endTime = performance.now();
    info(`Build complete in ${((endTime - startTime) / 1000).toFixed(2)}s!`);
}
