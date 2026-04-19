import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { expect } from '../expect';
import { addHelp } from '../help';
import {
    formatTitleToId,
    projectDir,
    readProjectConfig,
    resolveUseSymlinks,
    updateExperimentalScripts,
    updateProjectConfig,
} from '../helper';
import { log } from '../logger';
import { extractFlag, hasFlag } from '../cli';
import { resolveTemplateDir, scaffoldProject } from '../templateManager';

addHelp(
    'add',
    `Add a mod to your project.

    Usages:
        pzstudio add <modName> - Add a mod to your project.
        pzstudio add <modName> <modId> - Add a mod to your project.
    
    Flags:
    --template <url> - Use a custom template URL for the mod template.
    --symlinks       - Use directory junctions for .libraries and .docs (if supported).`,
);

export function addCmd(modName: string, modId?: string) {
    const projectPath = projectDir();
    const projectConfig = readProjectConfig();
    // Check if we are in a project directory
    if (!projectConfig) {
        throw new Error(
            'You must execute this command within a project directory!',
        );
    }

    const modTemplateUrl = extractFlag('template');
    const useSymlinks = hasFlag('symlinks') || resolveUseSymlinks();

    // US2: Check for local .template-mod tier-0 guard
    const localTemplatePath = join(projectPath, '.template-mod');
    let templateModPath: string;
    let usedLocalTemplate = false;

    if (
        !modTemplateUrl &&
        existsSync(localTemplatePath) &&
        readdirSync(localTemplatePath).length > 0
    ) {
        templateModPath = localTemplatePath;
        usedLocalTemplate = true;
    } else {
        templateModPath = resolveTemplateDir('mod', modTemplateUrl);
    }

    // Validate params
    expect('param [modName]', modName, 'string');
    expect('param [modId]', modId, 'string|undefined');

    // Prepare mod id
    modId = formatTitleToId(modId ?? modName);

    // Check if mod already exists
    if (projectConfig.mods[modId] || existsSync(join(projectPath, modId))) {
        throw new Error(`A mod with id '${modId}' already exists!`);
    }

    // Copy mod template
    scaffoldProject(templateModPath, join(projectPath, modId), useSymlinks);

    // Seed local cache if we resolved a remote template and no local one existed
    if (!usedLocalTemplate && !modTemplateUrl) {
        scaffoldProject(templateModPath, localTemplatePath, useSymlinks);
    }

    // Update config
    projectConfig.mods[modId] = {
        name: modName,
        description: '',
    };
    updateProjectConfig(join(projectPath, 'project.json'), projectConfig);

    // Run experimental scripts
    updateExperimentalScripts('addMod', projectPath, modId);

    // Done
    log(`Added mod '${modName}' with id '${modId}'`);
}
