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
import { info, log, warn } from '../logger';
import { extractFlag, hasFlag } from '../cli';
import {
    resolveTemplateDir,
    scaffoldProject,
    scaffoldTemplateFolder,
} from '../templateManager';

addHelp(
    'new',
    `Create a new project.

    Usages:
    pzstudio new <projectTitle>         - Create a new project with the given title and automatically formatted mod id.
    pzstudio new <projectTitle> <modId> - Create a new project with the given title and mod id.
    
    Flags:
    --template <url> - Use a custom template URL for the mod template.
    --offline        - Bypass network updates and use local cache or legacy templates.
    --force-update   - Force refresh of cached templates from remote.
    --symlinks       - Use directory junctions for template folders (if supported).`,
);

export async function newCmd(projectTitle: string, modId?: string) {
    const templateUrl = extractFlag('template');
    const isOffline = hasFlag('offline');
    const forceUpdate = hasFlag('force-update');
    const useSymlinks = hasFlag('symlinks') || resolveUseSymlinks();

    const templateProjectPath = resolveTemplateDir(
        'project',
        templateUrl,
        isOffline,
        forceUpdate,
    );

    // Check if we are in a project directory
    if (readProjectConfig()) {
        throw new Error(
            'You cannot execute this command within a project directory!',
        );
    }

    // Validate params
    expect('param [projectTitle]', projectTitle, 'string');
    expect('param [modId]', modId, 'string|undefined');

    // Prepare mod id
    modId = formatTitleToId(modId || projectTitle);

    // Check if project already exists
    const projectPath = join(projectDir(), modId);
    if (existsSync(projectPath)) {
        throw new Error(
            `The project '${projectTitle}' dir '${modId}' already exists!`,
        );
    }

    // US2: Check for local .template-mod tier-0 guard
    const localTemplatePath = join(projectPath, '.template-mod');
    let templateModPath: string;

    if (
        !templateUrl &&
        existsSync(localTemplatePath) &&
        readdirSync(localTemplatePath).length > 0
    ) {
        templateModPath = localTemplatePath;
    } else {
        templateModPath = resolveTemplateDir(
            'mod',
            templateUrl,
            isOffline,
            forceUpdate,
        );
    }

    const templateLanguagePath = resolveTemplateDir(
        'language',
        undefined,
        isOffline,
        forceUpdate,
    );
    const templateWorkshopPath = resolveTemplateDir(
        'workshop',
        undefined,
        isOffline,
        forceUpdate,
    );

    log(`- Creating project '${projectTitle}' dir '${modId}' ...`);
    scaffoldProject(templateProjectPath, projectPath, useSymlinks);

    // Copy mod template into the project mod folder
    log(`- Creating mod '${modId}'...`);
    scaffoldProject(templateModPath, join(projectPath, modId), useSymlinks);

    // Link or copy shared template folders
    log(`- Creating shared template folders...`);

    scaffoldTemplateFolder(
        templateModPath,
        join(projectPath, '.template-mod'),
        useSymlinks,
    );

    scaffoldTemplateFolder(
        templateLanguagePath,
        join(projectPath, '.template-language'),
        useSymlinks,
    );

    const templateLibrariesPath = join(templateProjectPath, '.libraries');
    if (existsSync(templateLibrariesPath)) {
        scaffoldTemplateFolder(
            templateLibrariesPath,
            join(projectPath, '.libraries'),
            useSymlinks,
        );
    }

    // Copy workshop template
    log(`- Creating workshop folder...`);
    scaffoldProject(
        templateWorkshopPath,
        join(projectPath, 'workshop'),
        useSymlinks,
    );

    // Update config
    log(`- Updating project config...`);
    const newProjectConfigPath = join(projectPath, 'project.json');
    const newProjectConfig = readProjectConfig(newProjectConfigPath);
    newProjectConfig.title = projectTitle;
    newProjectConfig.mods[modId] = {
        name: projectTitle,
        description: '',
    };
    updateProjectConfig(newProjectConfigPath, newProjectConfig);

    // Run experimental scripts
    updateExperimentalScripts('addProject', projectPath);
    updateExperimentalScripts('addMod', projectPath, modId);

    // Done
    info(`The project '${projectTitle}' has been created at '${projectPath}'`);
}
