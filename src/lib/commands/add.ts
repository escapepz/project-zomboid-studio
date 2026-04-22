import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { expect } from '../expect';
import { addHelp } from '../help';
import {
    formatTitleToId,
    projectDir,
    resolveProjectConfig,
    updateExperimentalScripts,
    updateProjectConfig,
} from '../helper';
import { log, verbose } from '../logger';
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
    --offline        - Bypass network updates and use local cache or legacy templates.
    --force-update   - Force refresh of cached templates from remote.
    --symlinks       - Use directory junctions for template folders (if supported).
    --verbose        - Enable diagnostic output.`,
);

export function addCmd(modName: string, modId?: string) {
    // Validate params
    expect('param [modName]', modName, 'string');
    expect('param [modId]', modId, 'string|undefined');

    const projectPath = projectDir();
    const projectConfig = resolveProjectConfig();
    // Check if we are in a project directory
    if (!projectConfig) {
        throw new Error(
            'You must execute this command within a project directory!',
        );
    }

    const modTemplateUrl = extractFlag('template');
    const isOffline = hasFlag('offline');
    const forceUpdate = hasFlag('force-update');
    const useSymlinks =
        hasFlag('symlinks') || (projectConfig.useSymlinks ?? false);

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
        verbose(`Using local .template-mod from project root`);
    } else {
        verbose(`Resolving remote/default mod template...`);
        templateModPath = resolveTemplateDir(
            'mod',
            modTemplateUrl,
            isOffline,
            forceUpdate,
        );
        verbose(`Mod template path: ${templateModPath}`);
    }

    // Prepare mod id
    modId = formatTitleToId(modId ?? modName);

    // Check if mod already exists
    if (projectConfig.mods[modId] || existsSync(join(projectPath, modId))) {
        throw new Error(`A mod with id '${modId}' already exists!`);
    }

    // Copy mod template
    verbose(
        `Scaffolding mod from ${templateModPath} to ${join(projectPath, modId)}`,
    );
    scaffoldProject(
        templateModPath,
        join(projectPath, modId),
        useSymlinks,
        false,
        {
            excludeIgnoreFile: true,
            ignoreDotFiles: false,
        },
    );

    // Seed local cache if we resolved a remote template and no local one existed
    if (!usedLocalTemplate && !modTemplateUrl) {
        scaffoldProject(
            templateModPath,
            localTemplatePath,
            useSymlinks,
            false,
            {
                excludeIgnoreFile: true,
                ignoreDotFiles: false,
            },
        );
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
