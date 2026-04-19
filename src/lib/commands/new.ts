import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { expect } from '../expect';
import { addHelp } from '../help';
import {
    formatTitleToId,
    installLibraries,
    copyFolderSync,
    projectDir,
    readProjectConfig,
    resolveUseSymlinks,
    updateExperimentalScripts,
    updateProjectConfig,
} from '../helper';
import { info, log, warn } from '../logger';
import { extractFlag, hasFlag } from '../cli';
import {
    createIgnoreFilter,
    resolveTemplateDir,
    scaffoldProject,
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
    --symlinks       - Use directory junctions for .libraries and .docs (if supported).`,
);

export async function newCmd(projectTitle: string, modId?: string) {
    const projectTemplateUrl = extractFlag('template');
    const modTemplateUrl = extractFlag('template');
    const isOffline = hasFlag('offline');
    const forceUpdate = hasFlag('force-update');
    const useSymlinks = hasFlag('symlinks') || resolveUseSymlinks();

    const templateProjectPath = resolveTemplateDir(
        'project',
        projectTemplateUrl,
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
        !modTemplateUrl &&
        existsSync(localTemplatePath) &&
        readdirSync(localTemplatePath).length > 0
    ) {
        templateModPath = localTemplatePath;
    } else {
        templateModPath = resolveTemplateDir(
            'mod',
            modTemplateUrl,
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

    // Copy template
    log(`- Creating project '${projectTitle}' dir '${modId}' ...`);
    scaffoldProject(templateProjectPath, projectPath, useSymlinks);

    // Copy simple mod template
    log(`- Creating simple mod '${modId}'...`);
    scaffoldProject(templateModPath, join(projectPath, modId), useSymlinks);

    // Copy mod template
    log(`- Creating .template-mod`);
    scaffoldProject(
        templateModPath,
        join(projectPath, '.template-mod'),
        useSymlinks,
        true,
    );

    // Copy language template
    log(`- Creating .template-language`);
    scaffoldProject(
        templateLanguagePath,
        join(projectPath, '.template-language'),
        useSymlinks,
        true,
    );

    // Copy workshop template
    log(`- Creating workshop`);
    const workshopFilter = createIgnoreFilter(templateWorkshopPath);
    copyFolderSync(
        templateWorkshopPath,
        join(projectPath, 'workshop'),
        true,
        workshopFilter,
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

    // Update Umbrella (if not present in template)
    if (!existsSync(join(projectPath, '.libraries'))) {
        installLibraries(projectPath);
    }

    // Run experimental scripts
    updateExperimentalScripts('addProject', projectPath);
    updateExperimentalScripts('addMod', projectPath, modId);

    // Done
    info(`The project '${projectTitle}' has been created at '${projectPath}'`);
}
