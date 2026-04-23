import { IProjectConfig, IModConfig } from './project';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { DEFAULT_TEMPLATES } from './constants';

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

        // Legacy: deprecated root fields
        if ('title' in config) issues.push('root "title" is deprecated');
        if ('authors' in config) issues.push('root "authors" is deprecated');
        if ('id' in config) issues.push('root "id" is deprecated');

        // Legacy: workshop.excludes has moved to root excludes
        if (config.workshop && 'excludes' in config.workshop) {
            issues.push('"workshop.excludes" has moved to root');
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

        // Migrate root id to workshop.id
        if ('id' in upgraded && upgraded.workshop.id === undefined) {
            upgraded.workshop.id = upgraded.id;
        }
        delete upgraded.id;

        // Migrate root title to workshop.title
        if ('title' in upgraded && upgraded.workshop.title === undefined) {
            upgraded.workshop.title = upgraded.title;
        }
        delete upgraded.title;

        // Migrate root authors (not kept in workshop, but we remove it)
        delete upgraded.authors;

        // Migrate workshop.excludes to root excludes
        if (upgraded.workshop.excludes !== undefined) {
            if (
                upgraded.excludes === undefined ||
                (Array.isArray(upgraded.excludes) &&
                    upgraded.excludes.length === 0)
            ) {
                upgraded.excludes = upgraded.workshop.excludes;
            } else if (Array.isArray(upgraded.excludes)) {
                upgraded.excludes = Array.from(
                    new Set([
                        ...upgraded.excludes,
                        ...upgraded.workshop.excludes,
                    ]),
                );
            }
            delete upgraded.workshop.excludes;
        }

        if (upgraded.excludes === undefined) {
            upgraded.excludes = [];
        }

        return upgraded as IProjectConfig;
    },

    /**
     * Detects if config.json needs migration.
     */
    checkConfig: (config: any): MigrationResult => {
        const issues: string[] = [];
        if (config.useSymlinks === undefined)
            issues.push('missing "useSymlinks"');

        if (!config.templates || Object.keys(config.templates).length === 0) {
            issues.push('missing or empty "templates"');
        }

        if (!config.outdir) {
            issues.push('missing "outdir"');
        }

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

        if (upgraded.useSymlinks === undefined) {
            upgraded.useSymlinks = true;
        }

        if (
            !upgraded.templates ||
            Object.keys(upgraded.templates).length === 0
        ) {
            upgraded.templates = { ...DEFAULT_TEMPLATES };
        } else {
            upgraded.templates = {
                ...DEFAULT_TEMPLATES,
                ...upgraded.templates,
            };
        }

        if (!upgraded.outdir) {
            const configDir = join(homedir(), '.pzstudio');
            const backupPath = join(configDir, '.pzstudio.bak');
            if (existsSync(backupPath)) {
                try {
                    upgraded.outdir = readFileSync(backupPath, 'utf-8').trim();
                } catch {
                    // Fall through
                }
            }
            if (!upgraded.outdir) {
                upgraded.outdir = join(homedir(), 'Zomboid', 'Workshop');
            }
        }

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
    /**
     * Parses mod.info content into a partial IModConfig.
     */
    parseModInfo: (content: string): Partial<IModConfig> & { id?: string } => {
        // Simple parser to avoid dependency on helper.ts
        const lines = content.split('\n');
        const result: any = {
            description: [],
            poster: [],
            require: [],
            incompatible: [],
            loadModAfter: [],
            loadModBefore: [],
            pack: [],
            tiledef: [],
        };

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('//') || line.startsWith('#'))
                continue;

            const eqIndex = line.indexOf('=');
            if (eqIndex === -1) continue;

            const key = line.substring(0, eqIndex).trim();
            const value = line.substring(eqIndex + 1).trim();

            switch (key) {
                case 'id':
                case 'name':
                case 'author':
                case 'modversion':
                case 'icon':
                case 'category':
                case 'url':
                case 'versionMin':
                case 'versionMax':
                    result[key] = value;
                    break;
                case 'description':
                    result.description.push(value);
                    break;
                case 'pack':
                    result.pack.push(value);
                    break;
                case 'tiledef':
                    result.tiledef.push(value);
                    break;
                case 'poster':
                    result.poster.push(value);
                    break;
                case 'require':
                case 'incompatible':
                case 'loadModAfter':
                case 'loadModBefore':
                    result[key].push(
                        ...value.split(',').map((s: string) => s.trim()),
                    );
                    break;
                default:
                    result[key] = value;
                    break;
            }
        }

        // Clean up empty arrays
        const arrays = [
            'description',
            'poster',
            'require',
            'incompatible',
            'loadModAfter',
            'loadModBefore',
            'pack',
            'tiledef',
        ];
        for (const arr of arrays) {
            if (result[arr].length === 0) delete result[arr];
            else if (
                result[arr].length === 1 &&
                (arr === 'description' ||
                    arr === 'poster' ||
                    arr === 'pack' ||
                    arr === 'tiledef')
            ) {
                result[arr] = result[arr][0];
            }
        }

        return result;
    },
};
