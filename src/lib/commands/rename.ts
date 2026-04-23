import { join } from 'path';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { expect } from '../expect';
import { addHelp } from '../help';
import {
    getFilesRecursively,
    projectDir,
    readProjectConfig,
    updateExperimentalScripts,
    updateProjectConfig,
} from '../helper';
import { log, verbose } from '../logger';
import { scaffoldProject } from '../templateManager';

addHelp(
    'rename',
    `Rename a mod in your project.

    Usages:
        pzstudio rename <oldModId> <newModId> - Rename a mod in your project.`,
);

export function renameCmd(oldModId: string, newModId: string) {
    const projectPath = projectDir();
    const projectConfig = readProjectConfig();

    // Check if we are in a project directory
    if (!projectConfig) {
        throw new Error(
            'You must execute this command within a project directory!',
        );
    }

    // Validate params
    expect('param [oldModId]', oldModId, 'string');
    expect('param [newModId]', newModId, 'string');

    // Check if old mod id already exists
    if (!projectConfig.mods[oldModId]) {
        throw new Error(`Mod '${oldModId}' does not exist!`);
    }

    // Check if mod already exists
    if (
        projectConfig.mods[newModId] ||
        existsSync(join(projectPath, newModId))
    ) {
        throw new Error(`A mod with id '${newModId}' already exists!`);
    }

    // Rename mod
    const oldPath = join(projectPath, oldModId);
    const newPath = join(projectPath, newModId);
    if (existsSync(oldPath)) {
        log(`- Renaming mod '${oldModId}' to '${newModId}'...`);
        verbose(`Copying ${oldPath} to ${newPath}`);
        scaffoldProject(oldPath, newPath, false, false);
        verbose(`Removing old mod directory: ${oldPath}`);
        rmSync(oldPath, { force: true, recursive: true });
    }

    // Update code
    []
        .concat(getFilesRecursively(join(projectPath, newModId)))
        .forEach((file) => {
            const content = readFileSync(file, 'utf-8');
            const newContent = content.replaceAll(oldModId, newModId);
            if (content !== newContent) {
                writeFileSync(file, newContent, { encoding: 'utf-8' });
                log(`- Updated file ${file} with new mod id '${newModId}'`);
            }
        });

    // Update config
    projectConfig.mods[newModId] = projectConfig.mods[oldModId];
    delete projectConfig.mods[oldModId];
    updateProjectConfig(join(projectPath, 'project.json'), projectConfig);
    log(`- Mod '${oldModId}' updated to '${newModId}' in project.json!`);

    // Update experimental package scripts
    updateExperimentalScripts('renameMod', projectPath, oldModId, newModId);
}
