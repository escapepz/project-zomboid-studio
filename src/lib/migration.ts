import { IProjectConfig } from './project';

/**
 * Result of a migration check.
 */
export interface MigrationResult {
    needsMigration: boolean;
    reason?: string;
    upgradedConfig?: any;
}

/**
 * Helpers for detecting and upgrading legacy file shapes.
 */
export const migration = {
    /**
     * Detects if a project.json needs migration.
     */
    checkProject: (config: any): MigrationResult => {
        const issues: string[] = [];

        // Legacy: missing workshop.excludes
        if (config.workshop && config.workshop.excludes === undefined) {
            issues.push('missing "workshop.excludes"');
        }

        // Legacy: missing build.modInfo in mods
        if (config.mods) {
            for (const modId in config.mods) {
                const mod = config.mods[modId];
                if (
                    mod.build === undefined ||
                    mod.build.modInfo === undefined
                ) {
                    issues.push(`mod "${modId}" missing "build.modInfo"`);
                    break;
                }
            }
        }

        // Legacy: IWorshopConfig vs IWorkshopConfig (typo in code but might exist in JSON if we strict-check)
        // Actually the typo is in the code's interface name, not necessarily the JSON key.
        // But data-model says "IWorshopConfig rename and WorkshopTags sync".

        if (issues.length > 0) {
            return {
                needsMigration: true,
                reason: issues.join(', '),
            };
        }

        return { needsMigration: false };
    },

    /**
     * Upgrades a project.json to the current shape.
     */
    upgradeProject: (config: any): IProjectConfig => {
        const upgraded = JSON.parse(JSON.stringify(config));

        if (!upgraded.workshop) upgraded.workshop = {};
        if (upgraded.workshop.excludes === undefined) {
            upgraded.workshop.excludes = [];
        }

        if (upgraded.mods) {
            for (const modId in upgraded.mods) {
                const mod = upgraded.mods[modId];
                if (!mod.build) mod.build = {};
                if (mod.build.modInfo === undefined) {
                    mod.build.modInfo = 'skip'; // Default per specification
                }
            }
        }

        return upgraded as IProjectConfig;
    },

    /**
     * Detects if config.json needs migration.
     */
    checkConfig: (config: any): MigrationResult => {
        // config.json migration is usually just filling defaults,
        // but we might want to materialize them if they are missing.
        const issues: string[] = [];
        if (config.useSymlinks === undefined)
            issues.push('missing "useSymlinks"');

        if (issues.length > 0) {
            return {
                needsMigration: true,
                reason: issues.join(', '),
            };
        }
        return { needsMigration: false };
    },

    /**
     * Upgrades config.json to the current shape.
     */
    upgradeConfig: (config: any): any => {
        const upgraded = JSON.parse(JSON.stringify(config));
        if (upgraded.useSymlinks === undefined) upgraded.useSymlinks = false;
        return upgraded;
    },

    /**
     * Upgrades mod.info content.
     */
    upgradeModInfo: (content: string): string => {
        const lines = content
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0);
        const map = new Map<string, string>();

        lines.forEach((line) => {
            const index = line.indexOf('=');
            if (index !== -1) {
                const key = line.substring(0, index).trim();
                const value = line.substring(index + 1).trim();
                map.set(key, value);
            }
        });

        // Ensure required fields
        if (!map.has('id')) map.set('id', 'new_mod');
        if (!map.has('name')) map.set('name', 'New Mod');
        if (!map.has('description'))
            map.set('description', 'A Project Zomboid mod.');

        return Array.from(map.entries())
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');
    },
};
