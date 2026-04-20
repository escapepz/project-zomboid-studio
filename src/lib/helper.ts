import { homedir } from 'os';
import { spawnSync } from 'child_process';
import { basename, dirname, join, resolve } from 'path';
import {
    copyFileSync,
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    readlinkSync,
    rmSync,
    statSync,
    writeFileSync,
    symlinkSync,
} from 'fs';
import { IProjectConfig } from './project';
import { error, log, warn } from './logger';
import { readGlobalConfig, writeGlobalConfig } from './templateManager';

/**
 * Resolves the useSymlinks configuration flag following the hierarchy:
 * project.json > config.json > default (false)
 * @returns {boolean} The resolved useSymlinks flag
 */
export function resolveUseSymlinks(): boolean {
    const projectConfig = readProjectConfig();
    if (projectConfig && projectConfig.useSymlinks !== undefined) {
        return projectConfig.useSymlinks;
    }

    const globalConfig = readGlobalConfig();
    if (globalConfig && globalConfig.useSymlinks !== undefined) {
        return globalConfig.useSymlinks;
    }

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

/**
 * Returns the template directory
 * @returns {string} The template directory
 */
export function templateDir(
    template: 'language' | 'mod' | 'mod-simple' | 'project' | 'workshop',
) {
    const root =
        basename(__dirname) === 'dist'
            ? join(__dirname, '..')
            : join(dirname(__dirname), '..');
    return join(root, `.template-${template}`);
}

/**
 * Returns the current project config
 * @returns {IProjectConfig} The current project config
 */
export function readProjectConfig(path?: string): IProjectConfig | undefined {
    try {
        const module = path ?? join(projectDir(), 'project.json');
        delete require.cache[require.resolve(module)];
        return require(module);
    } catch (err) {
        return;
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
    if (readProjectConfig(path) === undefined) {
        throw new Error('The given path is not a valid project config!');
    }

    writeFileSync(path, JSON.stringify(updatedConfig, null, 4), {
        encoding: 'utf-8',
    });
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
 * Copy a folder recursively
 * @param {string} from The source folder
 * @param {string} to The destination folder
 */
export function copyFolderSync(
    from: string,
    to: string,
    ignoreDotFiles: boolean = false,
    filter?: (src: string, dest: string) => boolean,
) {
    mkdirSync(to, { recursive: true });
    const files = readdirSync(from);
    for (const file of files) {
        if (ignoreDotFiles && (file.startsWith('.') || file === '.gitkeep')) {
            continue;
        }
        const srcFile = join(from, file);
        const destFile = join(to, file);

        if (filter && !filter(srcFile, destFile)) {
            continue;
        }

        const current = lstatSync(srcFile);
        if (current.isDirectory()) {
            copyFolderSync(srcFile, destFile, ignoreDotFiles, filter);
        } else if (current.isSymbolicLink()) {
            const symlink = readlinkSync(srcFile);
            writeFileSync(destFile, symlink);
        } else {
            copyFileSync(srcFile, destFile);
        }
    }
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

    return join(homedir(), 'Zomboid', 'Workshop');
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
        else lines.push(`poster=poster.png`);

        // icon
        lines.push(`icon=${config.mods[modId].icon ?? 'icon.png'}`);

        // url
        if (config.mods[modId].url) lines.push(`url=${config.mods[modId].url}`);

        // version
        if (config.mods[modId].versionMin)
            lines.push(`versionMin=${config.mods[modId].versionMin}`);
        if (config.mods[modId].versionMax)
            lines.push(`versionMax=${config.mods[modId].versionMax}`);

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
