import { writeFileSync } from 'fs';
import { join } from 'path';
import { expect } from '../expect';
import { addHelp } from '../help';
import { log } from '../logger';
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
        pzstudio modinfo generate <modId> - Generate mod.info for a specific mod.`,
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
        log(
            `- Skipping '${modId}' mod.info generation (build.modInfo: "skip")...`,
        );
        return;
    }

    const targets = resolveModInfoTargets(modId);
    if (targets.length === 0) {
        log(
            `- No valid Build 42 branch folders found for mod '${modId}'. Skipping...`,
        );
        return;
    }

    for (const targetDir of targets) {
        const modInfoPath = join(targetDir, 'mod.info');
        log(`- Generating mod.info for '${modId}' in '${targetDir}'...`);
        writeFileSync(modInfoPath, generateModInfoText(modId, projectConfig));
    }
}

/**
 * Generate mod.info for all eligible mods.
 * @param projectConfig The project config
 */
async function generateForAll(projectConfig: any) {
    log('Generating mod.info for all eligible mods...');
    const mods = Object.keys(projectConfig.mods).filter(
        (id) => !projectConfig.excludes.includes(id),
    );

    for (const modId of mods) {
        await generateForMod(modId, projectConfig);
    }
}
