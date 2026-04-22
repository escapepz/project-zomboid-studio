import { addHelp } from '../help';
import { info, log } from '../logger';
import { readProjectConfig, updateProjectConfig, projectDir } from '../helper';
import { migration } from '../migration';
import {
    readGlobalConfig,
    writeGlobalConfig,
    getConfigPath,
} from '../templateManager';
import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';

addHelp(
    'migrate',
    `Upgrade legacy project.json and config.json files to the current shape without losing unknown fields.
    
    Usage:
        pzstudio migrate`,
);

/**
 * Handles the migrate command.
 */
export async function migrateCmd() {
    log('\nChecking for legacy file shapes...\n');

    // 1. Migrate config.json
    const configPath = getConfigPath();
    const config = existsSync(configPath)
        ? JSON.parse(readFileSync(configPath, 'utf8'))
        : {};
    const configCheck = migration.checkConfig(config);
    if (configCheck.needsMigration) {
        info(`- Migrating config.json: ${configCheck.reason}`);
        const upgradedConfig = migration.upgradeConfig(config);
        writeGlobalConfig(upgradedConfig);
        info('  → config.json upgraded successfully.');
    } else {
        log('- config.json is already up to date.');
    }

    // 2. Migrate project.json (if it exists)
    const projectPath = join(projectDir(), 'project.json');
    const project = existsSync(projectPath)
        ? JSON.parse(readFileSync(projectPath, 'utf8'))
        : undefined;
    if (project) {
        const projectCheck = migration.checkProject(project);
        if (projectCheck.needsMigration) {
            info(`- Migrating project.json: ${projectCheck.reason}`);
            const upgradedProject = migration.upgradeProject(project);
            const projectPath = join(projectDir(), 'project.json');
            updateProjectConfig(projectPath, upgradedProject, true);
            info('  → project.json upgraded successfully.');
        } else {
            log('- project.json is already up to date.');
        }
    } else {
        log('- No project.json found in current directory.');
    }

    info('\nMigration complete.');
}
