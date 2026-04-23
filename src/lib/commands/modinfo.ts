import { writeFileSync } from 'fs';
import { join } from 'path';
import { expect } from '../expect';
import { addHelp } from '../help';
import { log, verbose } from '../logger';
import {
    generateModInfoText,
    resolveProjectConfig,
    resolveModInfoTargets,
} from '../helper';

addHelp(
    'modinfo',
    `Generate mod.info files for your mods in the source tree.

    Usages:
        pzstudio modinfo generate          - Generate mod.info for all mods.
        pzstudio modinfo generate <modId> - Generate mod.info for a specific mod.
    
    Flags:
        --verbose        - Enable diagnostic output.`,
);

/**
 * Handle the modinfo command.
 * @param action The action to perform (e.g., 'generate').
 * @param modId The ID of the mod to process (optional).
 */
export async function modinfoCmd(action: string, modId?: string) {
    expect('param [action]', action, 'string');
    expect('param [modId]', modId, 'string|undefined');

    const projectConfig = resolveProjectConfig();
    if (!projectConfig) {
        throw new Error(
            'You must execute this command within a project directory!',
        );
    }

    if (action === 'generate') {
        if (modId) {
            await generateForMod(modId, projectConfig);
        } else {
            await generateForAll(projectConfig);
        }
    } else {
        throw new Error(`Unknown modinfo action [${action}]`);
    }
}

/**
 * Generate mod.info for a specific mod.
 * @param modId The mod id
 * @param projectConfig The project config
 */
async function generateForMod(modId: string, projectConfig: any) {
    const mod = projectConfig.mods[modId];
    if (!mod) {
        throw new Error(`Mod [${modId}] not found in project.json`);
    }

    const modInfoFlag = mod.build?.modInfo ?? 'skip';
    if (modInfoFlag === 'skip') {
        verbose(`Mod '${modId}' is configured to skip mod.info generation.`);
        log(
            `- Skipping '${modId}' mod.info generation (build.modInfo: "skip")...`,
        );
        return;
    }

    verbose(`Resolving mod.info targets for mod '${modId}'...`);
    const targets = resolveModInfoTargets(modId);
    if (targets.length === 0) {
        verbose(`No Build 42 targets found for mod '${modId}'.`);
        log(
            `- No valid Build 42 branch folders found for mod '${modId}'. Skipping...`,
        );
        return;
    }

    verbose(`Found targets for '${modId}': ${targets.join(', ')}`);
    for (const targetDir of targets) {
        const modInfoPath = join(targetDir, 'mod.info');
        verbose(`Generating mod.info content for '${modId}'...`);
        log(`- Generating mod.info for '${modId}' in '${targetDir}'...`);
        const content = generateModInfoText(modId, projectConfig);
        verbose(`Writing mod.info to: ${modInfoPath}`);
        writeFileSync(modInfoPath, content);
    }
}

/**
 * Generate mod.info for all eligible mods.
 * @param projectConfig The project config
 */
async function generateForAll(projectConfig: any) {
    log('Generating mod.info for all eligible mods...');
    const mods = Object.keys(projectConfig.mods).filter((id) => {
        const isExcluded = projectConfig.excludes.includes(id);
        if (isExcluded) {
            verbose(`Mod '${id}' is explicitly excluded from generation.`);
        }
        return !isExcluded;
    });

    verbose(`Eligible mods for mod.info: ${mods.join(', ')}`);

    for (const modId of mods) {
        await generateForMod(modId, projectConfig);
    }
}
