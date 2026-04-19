import { join } from 'path';
import { existsSync } from 'fs';
import { expect } from '../expect';
import { addHelp } from '../help';
import {
    formatTitleToId,
    installLibraries,
    copyFolderSync,
    projectDir,
    readProjectConfig,
    updateExperimentalScripts,
    updateProjectConfig,
} from '../helper';
import { info, log, warn } from '../logger';
import { extractFlag, hasFlag } from '../cli';
import { resolveTemplateDir, scaffoldProject } from '../templateManager';

addHelp(
    'new',
    `Create a new project.

    Usages:
    pzstudio new <projectTitle>         - Create a new project with the given title and automatically formatted mod id.
    pzstudio new <projectTitle> <modId> - Create a new project with the given title and mod id.
    
    Flags:
    --template <url> - Use a custom template URL for the project template.
    --offline        - Bypass network updates and use local cache or legacy templates.`,
);

export async function newCmd(projectTitle: string, modId?: string) {
    const projectTemplateUrl = extractFlag('template');
    const isOffline = hasFlag('offline');

    const templateProjectPath = resolveTemplateDir(
        'project',
        projectTemplateUrl,
        isOffline,
    );
    const templateModPath = resolveTemplateDir('mod', undefined, isOffline);
    const templateSimpleModPath = resolveTemplateDir(
        'mod',
        undefined,
        isOffline,
    );
    const templateLanguagePath = resolveTemplateDir(
        'language',
        undefined,
        isOffline,
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

    // Copy template
    log(`- Creating project '${projectTitle}' dir '${modId}' ...`);
    scaffoldProject(templateProjectPath, projectPath);

    // Copy simple mod template
    log(`- Creating simple mod '${modId}'...`);
    scaffoldProject(templateSimpleModPath, join(projectPath, modId));

    // Copy mod template
    log(`- Creating .template-mod`);
    scaffoldProject(templateModPath, join(projectPath, '.template-mod'));

    // Copy language template
    log(`- Creating .template-language`);
    scaffoldProject(
        templateLanguagePath,
        join(projectPath, '.template-language'),
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
