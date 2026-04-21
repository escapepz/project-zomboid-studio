import { addHelp } from '../help';
import { info, log } from '../logger';
import { readProjectConfig, updateProjectConfig, projectDir } from '../helper';
import { migration } from '../migration';
import { readGlobalConfig, writeGlobalConfig } from '../templateManager';
import { existsSync } from 'fs';
import { basename } from 'path';

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
    const config = readGlobalConfig();
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
    const project = readProjectConfig(undefined, false); // Read without validation-driven exit
    if (project) {
        const projectCheck = migration.checkProject(project);
        if (projectCheck.needsMigration) {
            info(`- Migrating project.json: ${projectCheck.reason}`);
            const upgradedProject = migration.upgradeProject(project);
            updateProjectConfig('project.json', upgradedProject);
            info('  → project.json upgraded successfully.');
        } else {
            log('- project.json is already up to date.');
        }
    } else {
        log('- No project.json found in current directory.');
    }

    info('\nMigration complete.');
}
