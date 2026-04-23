import { homedir } from 'os';
import { spawnSync } from 'child_process';
import { basename, dirname, join, resolve } from 'path';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'fs';
import {
    IProjectConfig,
    IModConfig,
    IVsCodeSettings,
    TemplateCategory,
    ITemplateConfig,
} from './project';
import { error, log, warn, verbose } from './logger';
import {
    GlobalConfig,
    readGlobalConfig,
    writeGlobalConfig,
} from './templateManager';

let vscodeWorkspaceSettings: IVsCodeSettings | undefined;
let vscodeUserSettings: IVsCodeSettings | undefined;

export function setVsCodeSettings(
    workspaceSettings?: IVsCodeSettings,
    userSettings?: IVsCodeSettings,
) {
    vscodeWorkspaceSettings = workspaceSettings;
    vscodeUserSettings = userSettings;
}

export function getVsCodeSettings(): IVsCodeSettings | undefined {
    if (!vscodeWorkspaceSettings && !vscodeUserSettings) return undefined;

    const wsTemplates = vscodeWorkspaceSettings?.templates || {};
    const userTemplates = vscodeUserSettings?.templates || {};

    const templates: Partial<Record<TemplateCategory, ITemplateConfig>> = {};
    for (const cat of [
        'project',
        'mod',
        'workshop',
        'language',
    ] as TemplateCategory[]) {
        const val = wsTemplates[cat] ?? userTemplates[cat];
        if (val) templates[cat] = val;
    }

    return {
        templates: Object.keys(templates).length > 0 ? templates : undefined,
        outdir: vscodeWorkspaceSettings?.outdir ?? vscodeUserSettings?.outdir,
        useSymlinks:
            vscodeWorkspaceSettings?.useSymlinks ??
            vscodeUserSettings?.useSymlinks,
    };
}

export function getResolvedTemplates(
    globalConfig: GlobalConfig,
): Partial<Record<TemplateCategory, ITemplateConfig>> | undefined {
    const wsTemplates = vscodeWorkspaceSettings?.templates || {};
    const userTemplates = vscodeUserSettings?.templates || {};
    const globalTemplates = globalConfig.templates || {};

    const merged: Partial<Record<TemplateCategory, ITemplateConfig>> = {};
    for (const cat of [
        'project',
        'mod',
        'workshop',
        'language',
    ] as TemplateCategory[]) {
        const val =
            wsTemplates[cat] ?? userTemplates[cat] ?? globalTemplates[cat];
        if (val) merged[cat] = val;
    }

    return merged;
}

export function getResolvedUseSymlinks(
    globalConfig: GlobalConfig,
): boolean | undefined {
    return (
        vscodeWorkspaceSettings?.useSymlinks ??
        vscodeUserSettings?.useSymlinks ??
        globalConfig.useSymlinks
    );
}

/**
 * Resolves the full project configuration by merging workspace and global settings.
 * Workspace (project.json) settings always take precedence.
 * @returns {IProjectConfig | undefined} The resolved configuration, or undefined if no project.json exists.
 */
export function resolveProjectConfig(): IProjectConfig | undefined {
    const project = readProjectConfig();
    if (!project) return undefined;

    const global = readGlobalConfig(false);

    return {
        ...project,
        outdir: getOutDir(project, global),
    };
}

let externalProjectDir: string | undefined;

/**
 * Sets the project working directory externally (e.g. from VS Code)
 * @param dir The directory path
 */
export function setProjectDir(dir: string | undefined) {
    externalProjectDir = dir;
}

/**
 * Searches for project.json in the current directory and its parents.
 * @param startDir The directory to start searching from
 * @returns The directory containing project.json, or process.cwd() if not found
 */
function findProjectRoot(startDir: string): string {
    let currentDir = startDir;
    while (true) {
        if (existsSync(join(currentDir, 'project.json'))) {
            return currentDir;
        }
        const parentDir = dirname(currentDir);
        if (parentDir === currentDir) {
            break; // Reached filesystem root
        }
        currentDir = parentDir;
    }
    return startDir; // Fallback to start dir if not found
}

/**
 * Returns the current project working directory
 * @returns {string} The current working directory
 */
export function projectDir() {
    return externalProjectDir ?? findProjectRoot(process.cwd());
}

/**
 * Returns the current working directory
 * @returns {string} The current working directory
 */
export function workingDir() {
    return basename(__dirname) === 'dist'
        ? __dirname
        : join(dirname(__dirname), 'lib');
}

import { ValidationContext, validateProject } from './validation';
import { migration } from './migration';

/**
 * Returns the current project config.
 * Uses atomic read (readFileSync) to avoid require cache issues.
 * @param path Optional path to the project config
 * @param validate Whether to validate the config (default: true)
 * @returns {IProjectConfig} The current project config
 */
export function readProjectConfig(
    path?: string,
    validate: boolean = true,
): IProjectConfig | undefined {
    try {
        const configPath = path ?? join(projectDir(), 'project.json');
        if (!existsSync(configPath)) return undefined;

        const content = readFileSync(configPath, 'utf8');
        let config = JSON.parse(content);

        if (validate) {
            // Apply migration FIRST so we validate the modern shape
            const migrationCheck = migration.checkProject(config);
            if (migrationCheck.needsMigration) {
                warn(
                    `[MIGRATION] ${basename(configPath)} needs migration: ${migrationCheck.reason}`,
                );
                config = migration.upgradeProject(config);
            }

            const context = new ValidationContext(basename(configPath));
            validateProject(config, context);
            if (context.hasErrors()) {
                error(
                    `Validation failed for ${basename(configPath)}:\n${context.formatErrors()}`,
                );
                process.exit(1);
            }
        }

        return applyProjectDefaults(config);
    } catch (_err) {
        return undefined;
    }
}

/**
 * Applies safe defaults to a project config.
 * @param config The original project config
 * @returns The config with defaults applied
 */
export function applyProjectDefaults(config: any): IProjectConfig {
    if (!config) return config;

    // Default workshop settings
    if (!config.workshop) config.workshop = {};
    if (config.excludes === undefined) {
        verbose(`Defaulting excludes to empty list`);
        config.excludes = [];
    }

    // Default mods settings
    if (config.mods) {
        for (const modId in config.mods) {
            const mod = config.mods[modId];
            if (mod.poster === undefined) {
                verbose(`Mod '${modId}' defaulting poster to: poster.png`);
                mod.poster = 'poster.png';
            }
            if (mod.icon === undefined) {
                verbose(`Mod '${modId}' defaulting icon to: icon.png`);
                mod.icon = 'icon.png';
            }
            if (!mod.build) mod.build = {};
            if (mod.build.modInfo === undefined) {
                mod.build.modInfo = 'auto-if-missing';
            }
        }
    }

    return config as IProjectConfig;
}

/**
 * Performs an atomic write to a JSON file, preserving unknown fields.
 * @param filePath Path to the file
 * @param updated Updated configuration object
 */
export function atomicWriteJson(
    filePath: string,
    updated: any,
    overwrite: boolean = false,
) {
    let finalContent = updated;

    // Preserve unknown fields if file exists and we are not overwriting
    if (!overwrite && existsSync(filePath)) {
        try {
            const existing = JSON.parse(readFileSync(filePath, 'utf8'));
            finalContent = { ...existing, ...updated };
        } catch (_e) {
            // If existing is corrupt, we overwrite with updated
        }
    }

    // Strip useSymlinks from project.json if it exists (no longer supported in workspace)
    if (
        basename(filePath) === 'project.json' &&
        finalContent.useSymlinks !== undefined
    ) {
        delete finalContent.useSymlinks;
    }

    const content = JSON.stringify(finalContent, null, 4);
    const tempPath = `${filePath}.tmp`;

    try {
        writeFileSync(tempPath, content, 'utf8');
        rmSync(filePath, { force: true });
        spawnSync(
            'powershell',
            [
                '-Command',
                `Move-Item -Path "${tempPath}" -Destination "${filePath}" -Force`,
            ],
            { shell: true },
        );
        // Fallback for non-powershell or if Move-Item fails (though we are on Windows)
        if (existsSync(tempPath)) {
            writeFileSync(filePath, content, 'utf8');
            rmSync(tempPath, { force: true });
        }
    } catch (_e) {
        // Fallback to direct write if atomic fails
        writeFileSync(filePath, content, 'utf8');
    }
}

/**
 * Updates the a project config
 * @param {string} path The path to the project config
 * @param {IProjectConfig} updated The updated project config
 */
export function updateProjectConfig(
    path: string,
    updatedConfig: IProjectConfig,
    overwrite: boolean = false,
) {
    if (!existsSync(path)) {
        throw new Error('The given path does not exist!');
    }

    atomicWriteJson(path, updatedConfig, overwrite);
}

/**
 * Format a title to a valid id (Unix-compatible for Windows and Linux)
 * @param {string} title The title to format
 * @returns {string} The formatted id
 */
export function formatTitleToId(title: string) {
    return title
        .toLowerCase()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^a-z0-9_]/g, ''); // Remove any other special characters
}

/**
 * Returns the files in a directory recursively
 * @param {string} dir The directory to search
 * @param {string[]} filelist The file list
 * @returns {string[]} The files in the directory
 */
export function getFilesRecursively(dir: string, filelist: string[] = []) {
    readdirSync(dir).forEach((file) => {
        filelist = statSync(join(dir, file)).isDirectory()
            ? getFilesRecursively(join(dir, file), filelist)
            : filelist.concat(join(dir, file));
    });
    return filelist;
}

/**
 * Returns the store directory
 * @returns {string} The store directory
 */
/**
 * Migrate legacy file-based store to directory-based store
 */
export function migrateStoreDirIfNeeded() {
    const storeDir = join(homedir(), '.pzstudio');

    // Check if legacy file exists
    if (existsSync(storeDir) && statSync(storeDir).isFile()) {
        try {
            const outDirContent = readFileSync(storeDir, 'utf8').trim();

            // Remove file first and create directory
            rmSync(storeDir);
            mkdirSync(storeDir, { recursive: true });

            // Backup old file content in new directory
            const backupPath = join(storeDir, '.pzstudio.bak');
            writeFileSync(backupPath, outDirContent);

            // Save to config.json
            const config = readGlobalConfig();
            config.outdir = outDirContent;
            writeGlobalConfig(config);

            log(`- Migrated legacy .pzstudio file to directory structure`);
        } catch (e) {
            warn(`Failed to migrate legacy store: ${e}`);
        }
    }
}

export function getStoreDir() {
    return join(homedir(), '.pzstudio');
}

/**
 * Returns the output directory following the hierarchy:
 * project.json > config.json > .pzstudio.bak > default
 * @param project Optional project config to use
 * @param config Optional global config to use
 * @returns {string} The output directory
 */
export function getOutDir(project?: IProjectConfig, config?: GlobalConfig) {
    // 1. Try project config
    if (project && project.outdir) {
        return resolve(projectDir(), project.outdir);
    }

    // 2. Try workspace settings
    if (vscodeWorkspaceSettings?.outdir) {
        return resolve(vscodeWorkspaceSettings.outdir);
    }

    // 3. Try user settings
    if (vscodeUserSettings?.outdir) {
        return resolve(vscodeUserSettings.outdir);
    }

    // 4. Try global config
    const global = config ?? readGlobalConfig(false);
    if (global.outdir) {
        return resolve(global.outdir);
    }

    // This should technically never be reached because readGlobalConfig has a final fallback
    const defaultPath = join(homedir(), 'Zomboid', 'Workshop');
    verbose(`Defaulting output directory to: ${defaultPath}`);
    return defaultPath;
}

/**
 * Resolves the build output path for a given variant.
 * @param config The project configuration
 * @param variant The build variant ('main' or 'development')
 * @returns {string} The absolute path to the build output
 */
export function resolveBuildOutputPath(
    config: IProjectConfig,
    variant: 'main' | 'development',
): string {
    const outDir = config.outdir!;
    const title = config.workshop.title;
    if (variant === 'development') {
        return join(outDir, `${title} - dev_branch`);
    }
    return join(outDir, title);
}

/**
 * Generate the workshop text
 * @param config The project config
 * @param overrideVisibility Optional visibility override
 * @param excludeId Whether to exclude the id field
 * @param titleSuffix Optional suffix to append to title
 * @returns {string} The workshop text
 */
export function generateWorkshopText(
    config: IProjectConfig,
    overrideVisibility?: string,
    excludeId: boolean = false,
    titleSuffix?: string,
) {
    const lines: string[] = [];

    lines.push(`version=1`);
    if (!excludeId && config.workshop.id)
        lines.push(`id=${config.workshop.id}`);
    if (config.workshop.title)
        lines.push(`title=${config.workshop.title}${titleSuffix ?? ''}`);
    if (config.workshop.tags)
        lines.push(`tags=${config.workshop.tags.join(';')}`);
    if (overrideVisibility || config.workshop.visibility)
        lines.push(
            `visibility=${overrideVisibility ?? config.workshop.visibility}`,
        );

    const workshopDescriptionPath = join(
        projectDir(),
        'workshop',
        'description.txt',
    );
    if (existsSync(workshopDescriptionPath)) {
        readFileSync(workshopDescriptionPath, { encoding: 'utf-8' })
            .split('\n')
            .forEach((line) => {
                lines.push(`description=${line}`);
            });
    }

    return lines.join('\n');
}

/**
 * Generate the mod.info text
 * @param modId The mod id
 * @param config The project config
 * @param prefixedId Optional prefixed id to use in mod.info instead of modId
 * @returns {string} The mod.info text
 */
export function generateModInfoText(
    modId: string,
    config: IProjectConfig,
    prefixedId?: string,
) {
    const lines: string[] = [];
    const mod = config.mods[modId];

    if (mod) {
        // id (MUST BE FIRST or near top for PZ)
        lines.push(`id=${prefixedId ?? modId}`);

        // name
        if (mod.name) lines.push(`name=${mod.name}`);

        // description
        if (mod.description) {
            const descLines = Array.isArray(mod.description)
                ? mod.description
                : [mod.description];
            descLines.forEach((d) => lines.push(`description=${d}`));
        }

        // author
        if (mod.author) lines.push(`author=${mod.author}`);

        // modversion
        if (mod.modversion) lines.push(`modversion=${mod.modversion}`);

        // poster
        if (typeof mod.poster === 'object')
            (mod.poster as string[]).forEach((poster) =>
                lines.push(`poster=${poster}`),
            );
        else if (typeof mod.poster === 'string')
            lines.push(`poster=${mod.poster}`);

        // icon
        if (mod.icon) {
            lines.push(`icon=${mod.icon}`);
        }

        // require
        if (typeof mod.require === 'string')
            lines.push(`require=${mod.require}`);
        else if (typeof mod.require === 'object' && mod.require.length > 0)
            lines.push(`require=${(mod.require as string[]).join(',')}`);

        // incompatible
        if (typeof mod.incompatible === 'string')
            lines.push(`incompatible=${mod.incompatible}`);
        else if (
            typeof mod.incompatible === 'object' &&
            mod.incompatible.length > 0
        )
            lines.push(
                `incompatible=${(mod.incompatible as string[]).join(',')}`,
            );

        // loadModAfter
        if (typeof mod.loadModAfter === 'string')
            lines.push(`loadModAfter=${mod.loadModAfter}`);
        else if (
            typeof mod.loadModAfter === 'object' &&
            mod.loadModAfter.length > 0
        )
            lines.push(
                `loadModAfter=${(mod.loadModAfter as string[]).join(',')}`,
            );

        // loadModBefore
        if (typeof mod.loadModBefore === 'string')
            lines.push(`loadModBefore=${mod.loadModBefore}`);
        else if (
            typeof mod.loadModBefore === 'object' &&
            mod.loadModBefore.length > 0
        )
            lines.push(
                `loadModBefore=${(mod.loadModBefore as string[]).join(',')}`,
            );

        // pack
        if (mod.pack) {
            const packs = Array.isArray(mod.pack) ? mod.pack : [mod.pack];
            packs.forEach((p) => {
                lines.push(`pack=${p}`);
            });
        }

        // tiledef
        if (mod.tiledef) {
            const tiledefs = Array.isArray(mod.tiledef)
                ? mod.tiledef
                : [mod.tiledef];
            tiledefs.forEach((t) => {
                lines.push(`tiledef=${t}`);
            });
        }

        // category
        if (mod.category) lines.push(`category=${mod.category}`);

        // url
        if (mod.url) lines.push(`url=${mod.url}`);

        // version
        if (mod.versionMin) lines.push(`versionMin=${mod.versionMin}`);
        // version
        if (mod.versionMax) lines.push(`versionMax=${mod.versionMax}`);

        // Unknown / Forward-compatible fields
        const knownFields = [
            'id',
            'name',
            'description',
            'author',
            'modversion',
            'poster',
            'icon',
            'require',
            'incompatible',
            'loadModAfter',
            'loadModBefore',
            'pack',
            'tiledef',
            'category',
            'url',
            'versionMin',
            'versionMax',
            'build',
        ];
        for (const key in mod) {
            if (!knownFields.includes(key)) {
                lines.push(`${key}=${(mod as any)[key]}`);
            }
        }
    }

    return lines.join('\n');
}

/**
 * Parses mod.info text into a partial IModConfig.
 * @param content The mod.info file content
 * @returns {Partial<IModConfig>} The parsed mod config
 */
export function parseModInfoText(
    content: string,
): Partial<IModConfig> & { id?: string } {
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
        if (!line || line.startsWith('//') || line.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;

        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();

        switch (key) {
            case 'id':
                result[key] = value;
                break;
            case 'name':
                result[key] = value;
                break;
            case 'author':
                result[key] = value;
                break;
            case 'modversion':
                result[key] = value;
                break;
            case 'icon':
                result[key] = value;
                break;
            case 'category':
                result[key] = value;
                break;
            case 'url':
                result[key] = value;
                break;
            case 'versionMin':
                result[key] = value;
                break;
            case 'versionMax':
                result[key] = value;
                break;
            case 'description':
                result.description.push(value);
                break;
            case 'pack': {
                result.pack.push(value);
                break;
            }
            case 'tiledef': {
                result.tiledef.push(value);
                break;
            }
            case 'poster':
                result.poster.push(value);
                break;
            case 'require':
                result.require.push(...value.split(',').map((s) => s.trim()));
                break;
            case 'incompatible':
                result.incompatible.push(
                    ...value.split(',').map((s) => s.trim()),
                );
                break;
            case 'loadModAfter':
                result.loadModAfter.push(
                    ...value.split(',').map((s) => s.trim()),
                );
                break;
            case 'loadModBefore':
                result.loadModBefore.push(
                    ...value.split(',').map((s) => s.trim()),
                );
                break;
            default:
                // Preserve unknown fields for forward compatibility
                result[key] = value;
                break;
        }
    }

    // Clean up empty arrays
    if (result.description.length === 0) delete result.description;
    else if (result.description.length === 1)
        result.description = result.description[0];

    if (result.poster.length === 0) delete result.poster;
    else if (result.poster.length === 1) result.poster = result.poster[0];

    if (result.require.length === 0) delete result.require;
    if (result.incompatible.length === 0) delete result.incompatible;
    if (result.loadModAfter.length === 0) delete result.loadModAfter;
    if (result.loadModBefore.length === 0) delete result.loadModBefore;

    if (result.pack.length === 0) delete result.pack;
    else if (result.pack.length === 1) result.pack = result.pack[0];

    if (result.tiledef.length === 0) delete result.tiledef;
    else if (result.tiledef.length === 1) result.tiledef = result.tiledef[0];

    return result;
}

/**
 * Returns the branch folders (direct subdirectories) of a mod.
 * @param modId The mod id
 * @returns {string[]} An array of absolute paths to branch folders
 */
export function getModBranchFolders(modId: string): string[] {
    const modDir = join(projectDir(), modId);
    if (!existsSync(modDir)) return [];

    try {
        return readdirSync(modDir)
            .map((child) => join(modDir, child))
            .filter((childPath) => statSync(childPath).isDirectory());
    } catch (_e) {
        return [];
    }
}

/**
 * Resolves the valid branch folders for a mod that should contain a mod.info file.
 * Following Build 42 rules:
 * 1. Only existing nested folders that contain a 'media' directory.
 * 2. Root-level mod.info is NOT a target for Build 42 generation.
 * @param modId The mod id
 * @returns {string[]} An array of absolute paths to valid branch folders
 */
export function resolveModInfoTargets(modId: string): string[] {
    const branchFolders = getModBranchFolders(modId);
    return branchFolders.filter((folder) => {
        const mediaPath = join(folder, 'media');
        return existsSync(mediaPath) && statSync(mediaPath).isDirectory();
    });
}

/**
 * Update experimental package scripts
 * @param action The action to perform ('addProject', 'addMod', 'removeMod', 'renameMod')
 * @param projectDir The project directory
 * @param modId The mod id (optional)
 * @param newModId The new mod id (required for 'renameMod')
 */
export function updateExperimentalScripts(
    action: 'addProject' | 'addMod' | 'removeMod' | 'renameMod',
    projectDir: string,
    modId?: string,
    newModId?: string,
) {
    try {
        const srcPath = resolve(
            __dirname,
            '../../scripts/experimental-package-scripts.js',
        );
        const distPath = resolve(
            __dirname,
            '../scripts/experimental-package-scripts.js',
        );
        const scriptPath = existsSync(srcPath) ? srcPath : distPath;
        if (!existsSync(scriptPath)) {
            return;
        }

        // Clear cache to allow modifications without rebuild
        // delete require.cache[require.resolve(scriptPath)];
        const script = require(scriptPath);

        switch (action) {
            case 'addProject':
                if (script.addProjectScripts)
                    script.addProjectScripts(projectDir);
                break;
            case 'addMod':
                if (script.addModScripts && modId)
                    script.addModScripts(projectDir, modId);
                break;
            case 'removeMod':
                if (script.removeModScripts && modId)
                    script.removeModScripts(projectDir, modId);
                break;
            case 'renameMod':
                if (script.renameModScripts && modId && newModId)
                    script.renameModScripts(projectDir, modId, newModId);
                break;
        }
    } catch (e) {
        warn(`Failed to run experimental script: ${e}`);
    }
}
