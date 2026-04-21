import { homedir } from 'os';
import { spawnSync } from 'child_process';
import { basename, dirname, join, resolve } from 'path';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'fs';
import { IProjectConfig } from './project';
import { error, log, warn, verbose } from './logger';
import { readGlobalConfig, writeGlobalConfig } from './templateManager';

/**
 * Resolves the useSymlinks configuration flag following the hierarchy:
 * project.json > config.json > default (false)
 * @returns {boolean} The resolved useSymlinks flag
 */
export function resolveUseSymlinks(): boolean {
    const project = readProjectConfig();
    if (project && project.useSymlinks !== undefined) {
        return project.useSymlinks;
    }

    const config = readGlobalConfig();
    if (config && config.useSymlinks !== undefined) {
        return config.useSymlinks;
    }

    verbose(`Defaulting useSymlinks to: false`);
    return false; // Default
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
 * Returns the current project working directory
 * @returns {string} The current working directory
 */
export function projectDir() {
    return externalProjectDir ?? process.cwd();
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

import {
    ValidationContext,
    validateProject,
    validateConfig,
} from './validation';
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
        const config = JSON.parse(content);

        if (validate) {
            const context = new ValidationContext(basename(configPath));
            validateProject(config, context);
            if (context.hasErrors()) {
                error(
                    `Validation failed for ${basename(configPath)}:\n${context.formatErrors()}`,
                );
                process.exit(1);
            }

            // Check for legacy shape and warn
            const migrationCheck = migration.checkProject(config);
            if (migrationCheck.needsMigration) {
                warn(
                    `[LEGACY] ${basename(configPath)} is using a legacy shape: ${migrationCheck.reason}`,
                );
                warn(
                    `Please run 'pzstudio migrate' to upgrade your project file.`,
                );
            }
        }

        return applyProjectDefaults(config);
    } catch (err) {
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
    if (config.workshop.excludes === undefined) {
        verbose(`Defaulting workshop.excludes to empty list`);
        config.workshop.excludes = [];
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
                mod.build.modInfo = 'skip';
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
export function atomicWriteJson(filePath: string, updated: any) {
    let finalContent = updated;

    // Preserve unknown fields if file exists
    if (existsSync(filePath)) {
        try {
            const existing = JSON.parse(readFileSync(filePath, 'utf8'));
            finalContent = { ...existing, ...updated };
        } catch (e) {
            // If existing is corrupt, we overwrite with updated
        }
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
    } catch (e) {
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
) {
    if (!existsSync(path)) {
        throw new Error('The given path does not exist!');
    }

    atomicWriteJson(path, updatedConfig);
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
 * Returns the output directory
 * @returns {string} The output directory
 */
export function getOutDir() {
    const storeDir = getStoreDir();
    // 1. Try config.json
    const config = readGlobalConfig();
    if (config.outdir) {
        return resolve(config.outdir);
    }

    const backupPath = join(storeDir, '.pzstudio.bak');
    // 2. Fall back to .pzstudio.bak
    if (existsSync(backupPath)) {
        try {
            return resolve(readFileSync(backupPath, 'utf8').trim());
        } catch (e) {
            // Fall through to default
        }
    }

    const defaultPath = join(homedir(), 'Zomboid', 'Workshop');
    verbose(`Defaulting output directory to: ${defaultPath}`);
    return defaultPath;
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
    if (config.title) lines.push(`title=${config.title}${titleSuffix ?? ''}`);
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

    if (config.mods[modId]) {
        // id
        lines.push(`id=${prefixedId ?? modId}`);

        // name
        if (config.mods[modId].name)
            lines.push(`name=${config.mods[modId].name}`);

        // description
        if (config.mods[modId].description)
            lines.push(`description=${config.mods[modId].description}`);

        // poster
        if (typeof config.mods[modId].poster === 'object')
            (config.mods[modId].poster as string[]).forEach((poster) =>
                lines.push(`poster=${poster}`),
            );
        else if (typeof config.mods[modId].poster === 'string')
            lines.push(`poster=${config.mods[modId].poster}`);

        // icon
        if (config.mods[modId].icon) {
            lines.push(`icon=${config.mods[modId].icon}`);
        }

        // url
        if (config.mods[modId].url) lines.push(`url=${config.mods[modId].url}`);

        // version
        if (config.mods[modId].versionMin)
            lines.push(`versionMin=${config.mods[modId].versionMin}`);
        if (config.mods[modId].versionMax)
            lines.push(`versionMax=${config.mods[modId].versionMax}`);

        // pack
        if (config.mods[modId].pack)
            lines.push(`pack=${config.mods[modId].pack}`);

        // tiledef
        if (config.mods[modId].tiledef)
            lines.push(`tiledef=${config.mods[modId].tiledef}`);

        // require
        if (typeof config.mods[modId].require === 'string')
            lines.push(`require=${config.mods[modId].require}`);
        else if (typeof config.mods[modId].require === 'object')
            lines.push(
                `require=${(config.mods[modId].require as string[]).join(',')}`,
            );
    }

    return lines.join('\n');
}
/**
 * Update experimental package scripts
 * @param action The action to perform ('addProject', 'addMod', 'removeMod')
 * @param projectDir The project directory
 * @param modId The mod id (optional)
 */
export function updateExperimentalScripts(
    action: 'addProject' | 'addMod' | 'removeMod',
    projectDir: string,
    modId?: string,
) {
    try {
        const scriptPath =
            basename(__dirname) === 'dist'
                ? resolve(__dirname, 'scripts/experimental-package-scripts.js')
                : resolve(
                      dirname(__dirname),
                      '../scripts/experimental-package-scripts.js',
                  );
        if (!existsSync(scriptPath)) {
            return;
        }

        // Clear cache to allow modifications without rebuild
        delete require.cache[require.resolve(scriptPath)];
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
        }
    } catch (e) {
        warn(`Failed to run experimental script: ${e}`);
    }
}
