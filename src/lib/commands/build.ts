import { join } from "path";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { addHelp } from "../help";
import { copyFolderSync, generateModInfoText, generateWorkshopText, getOutDir, projectDir, readProjectConfig, templateDir } from "../helper";
import { info, log, warn } from "../logger";

addHelp('build', `Build your project and update your output directory with your project.

    Usages:
        pzstudio build - Builds your project and updates the output directory.`);

async function buildWorkshop(projectConfig: any, outPath: string, modIdPrefix: string = '', overrideVisibility?: string, excludeId: boolean = false, titleSuffix?: string) {
    const projectPath = projectDir();
    const templateWorkshopPath = templateDir('workshop');

    // Remove the output directory
    rmSync(outPath, { recursive: true, force: true });

    // Create the output directory
    mkdirSync(outPath, { recursive: true });

    // Copy the workshop template
    copyFolderSync(templateWorkshopPath, outPath, true);

    // Copy the mods
    for (const modId of Object.keys(projectConfig.mods).filter((modId: string) => !projectConfig.workshop.excludes.includes(modId))) {
        const prefixedModId = modIdPrefix ? `${modId}${modIdPrefix}` : modId;
        // Copy the mod
        const outModsPath = join(outPath, 'Contents', 'mods', prefixedModId)
        log(`- Copying mod '${modId}'...`);
        copyFolderSync(join(projectPath,  modId), outModsPath, true);

        // Generate the mod.info
        log(`- Generating '${modId}' mod.info...`);
        const modVersionPath = join(outModsPath, '42.13.1');
        mkdirSync(modVersionPath, { recursive: true });
        writeFileSync(join(modVersionPath, 'mod.info'), generateModInfoText(modId, projectConfig, prefixedModId));
    }

    // Copy the workshop preview.png
    const projectPreviewPath = join(projectPath, 'workshop', 'preview.png');
    if (existsSync(projectPreviewPath)) {
        log(`- Copying workshop 'preview.png'...`)
        cpSync(join(projectDir(), 'workshop', 'preview.png'), join(outPath, 'preview.png'));
    }
    else {
        warn(`- No workshop 'preview.png' found as '${projectPreviewPath}'...`);
    }

    // Generate the workshop.txt
    log(`- Generating 'workshop.txt'...`);
    writeFileSync(join(outPath, 'workshop.txt'), generateWorkshopText(projectConfig, overrideVisibility, excludeId, titleSuffix));
}

export async function buildCmd() {
    const projectConfig = readProjectConfig();

    // Check if we are in a project directory
    if (!projectConfig) {
        throw new Error('You must execute this command within a project directory!');
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
    await buildWorkshop(projectConfig, devOutPath, '_dev', 'unlisted', true, ' - dev_branch');

    const endTime = performance.now();
    info(`Build complete in ${((endTime - startTime) / 1000).toFixed(2)}s!`);
}
