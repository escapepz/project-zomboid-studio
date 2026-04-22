import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { expect } from '../expect';
import { addHelp } from '../help';
import {
    formatTitleToId,
    projectDir,
    readProjectConfig,
    resolveProjectConfig,
    resolveUseSymlinks,
    updateExperimentalScripts,
    updateProjectConfig,
} from '../helper';
import { info, log, warn, verbose } from '../logger';
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
    // Validate params
    expect('param [projectTitle]', projectTitle, 'string');
    expect('param [modId]', modId, 'string|undefined');

    const templateUrl = extractFlag('template');
    const isOffline = hasFlag('offline');
    const forceUpdate = hasFlag('force-update');

    // Check if we are in a project directory
    const existingProject = resolveProjectConfig();
    if (existingProject) {
        throw new Error(
            'You cannot execute this command within a project directory!',
        );
    }

    const useSymlinks = hasFlag('symlinks') || resolveUseSymlinks();

    const templateProjectPath = resolveTemplateDir(
        'project',
        templateUrl,
        isOffline,
        forceUpdate,
    );

    // Prepare mod id
    modId = formatTitleToId(modId || projectTitle);

    // Check if project already exists
    const projectPath = join(projectDir(), modId);
    if (existsSync(projectPath)) {
        throw new Error(
            `The project '${projectTitle}' dir '${modId}' already exists!`,
        );
    }

    // US2: Check for local templates in current working directory (parent of new project)
    const cwdTemplateModPath = join(process.cwd(), '.template-mod');
    const cwdTemplateWorkshopPath = join(process.cwd(), '.template-workshop');

    let templateModPath: string;
    if (
        !templateUrl &&
        existsSync(cwdTemplateModPath) &&
        readdirSync(cwdTemplateModPath).length > 0
    ) {
        templateModPath = cwdTemplateModPath;
        verbose(`Using local .template-mod from CWD`);
    } else {
        templateModPath = resolveTemplateDir(
            'mod',
            templateUrl,
            isOffline,
            forceUpdate,
        );
    }

    let templateWorkshopPath: string;
    if (
        !templateUrl &&
        existsSync(cwdTemplateWorkshopPath) &&
        readdirSync(cwdTemplateWorkshopPath).length > 0
    ) {
        templateWorkshopPath = cwdTemplateWorkshopPath;
        verbose(`Using local .template-workshop from CWD`);
    } else {
        templateWorkshopPath = resolveTemplateDir(
            'workshop',
            undefined,
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

    log(`- Creating project '${projectTitle}' dir '${modId}' ...`);
    scaffoldProject(templateProjectPath, projectPath, useSymlinks, false, {
        ignoreItems: ['.libraries'],
    });

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
    newProjectConfig.workshop.title = projectTitle;
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
