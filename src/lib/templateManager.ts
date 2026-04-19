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
    writeFileSync,
    cpSync,
} from 'fs';
import { log, warn } from './logger';
import { relative } from 'path';

/**
 * Creates a filter for fs.cpSync derived from .pzstudioignore or hardcoded defaults.
 * @param templateDir The source template directory
 * @returns A filter function compatible with fs.cpSync
 */
export function createIgnoreFilter(
    templateDir: string,
): (src: string, dest: string) => boolean {
    const ignorePath = join(templateDir, '.pzstudioignore');
    let ignoreList = ['.git', '.github']; // Always ignore .git and .github

    if (existsSync(ignorePath)) {
        try {
            const content = readFileSync(ignorePath, 'utf-8');
            const lines = content
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line && !line.startsWith('#'));
            ignoreList = [...new Set([...ignoreList, ...lines])];
        } catch (e) {
            warn(
                `Failed to read .pzstudioignore at ${ignorePath}. Using default ignores.`,
            );
        }
    }

    return (src: string) => {
        const relPath = relative(templateDir, src);
        if (!relPath) return true; // Include root itself

        // Simple prefix match for ignore list
        return !ignoreList.some((pattern) => {
            if (pattern === relPath) return true;
            if (
                relPath.startsWith(pattern + '/') ||
                relPath.startsWith(pattern + '\\')
            )
                return true;
            return false;
        });
    };
}

export type TemplateCategory = 'project' | 'mod' | 'workshop' | 'language';

export interface TemplateConfig {
    url: string;
    ref?: string; // branch or tag
}

export interface GlobalConfig {
    templates: Partial<Record<TemplateCategory, TemplateConfig>>;
    outdir?: string;
}

const DEFAULT_TEMPLATES: Record<TemplateCategory, TemplateConfig> = {
    project: {
        url: 'https://github.com/escapepz/pzstudio-template-project.git',
        ref: '42.13.1',
    },
    mod: {
        url: 'https://github.com/escapepz/pzstudio-template-mod.git',
        ref: '42.13.1-simple',
    },
    workshop: {
        url: 'https://github.com/escapepz/pzstudio-template-workshop.git',
        ref: 'default',
    },
    language: {
        url: 'https://github.com/escapepz/pzstudio-template-language.git',
        ref: 'default',
    },
};

const OFFICIAL_ORG = 'escapepz';

function getCachePathFromUrl(url: string): string {
    // Expected: https://github.com/user/repo.git OR user/repo
    const parts = url
        .replace('https://github.com/', '')
        .replace('.git', '')
        .split('/');

    if (parts.length >= 2) {
        const user = parts[parts.length - 2];
        const repo = parts[parts.length - 1];
        return join(getConfigDir(), 'templates', user, repo);
    }

    // Fallback if URL is weird
    return join(
        getConfigDir(),
        'templates',
        'unknown',
        basename(url).replace('.git', ''),
    );
}

function isOfficialTemplate(url: string): boolean {
    return url.includes(`github.com/${OFFICIAL_ORG}/`) || !url.includes('/');
}

/**
 * Parses a template URL/string into url and ref.
 * Supports:
 * - user/repo
 * - user/repo@tag
 * - user/repo#branch
 * - https://github.com/user/repo.git
 * - https://github.com/user/repo.git@tag
 */
export function parseTemplateUrl(input: string): { url: string; ref?: string } {
    let url = input;
    let ref: string | undefined;

    if (url.includes('@')) {
        const parts = url.split('@');
        url = parts[0];
        ref = parts[1];
    } else if (url.includes('#')) {
        const parts = url.split('#');
        url = parts[0];
        ref = parts[1];
    }

    return { url, ref };
}

function getConfigDir(): string {
    return join(homedir(), '.pzstudio');
}

function getConfigPath(): string {
    return join(getConfigDir(), 'config.json');
}

function getTemplateCacheDir(category: TemplateCategory): string {
    return join(getConfigDir(), 'templates', category);
}

function getEmbeddedTemplateDir(category: TemplateCategory): string {
    const searchPaths = [
        join(dirname(__dirname), '.template-legacy'), // dist/.template-legacy
        join(dirname(dirname(__dirname)), '.template-legacy'), // root/.template-legacy
        join(getConfigDir(), '.template-legacy'), // user-home/.pzstudio/.template-legacy
    ];

    for (const basePath of searchPaths) {
        const fullPath = join(basePath, `.template-${category}`);
        if (existsSync(fullPath) && isDirNonEmpty(fullPath)) {
            return fullPath;
        }
    }

    return join(searchPaths[0], `.template-${category}`);
}

function isDirNonEmpty(dir: string): boolean {
    if (!existsSync(dir)) return false;
    try {
        if (!lstatSync(dir).isDirectory()) return false;
    } catch {
        return false;
    }
    return readdirSync(dir).length > 0;
}

/**
 * Clones a remote template from a GitHub repository.
 * @param url The repository URL or user/repo shorthand
 * @param dest The destination directory
 * @param ref Optional branch or tag
 * @returns True if the clone was successful
 */
export function cloneRemoteTemplate(
    url: string,
    dest: string,
    ref?: string,
): boolean {
    const fullUrl =
        url.includes('/') && !url.startsWith('http')
            ? `https://github.com/${url}.git`
            : url;

    log(`- Cloning template from ${fullUrl}${ref ? ` (ref: ${ref})` : ''}...`);

    const args = [
        'clone',
        '--depth',
        '1',
        '--recurse-submodules',
        '--shallow-submodules',
    ];
    if (ref && ref !== 'default') {
        args.push('-b', ref);
    }
    args.push(fullUrl, dest);

    const result = spawnSync('git', args, { shell: true, stdio: 'pipe' });
    return result.status === 0;
}

/**
 * Reads the global pzstudio config from ~/.pzstudio/config.json
 */
export function readGlobalConfig(): GlobalConfig {
    const configPath = getConfigPath();
    const defaultConfig: GlobalConfig = { templates: {} };
    if (!existsSync(configPath)) {
        return defaultConfig;
    }
    try {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);
        return {
            ...defaultConfig,
            ...config,
            templates: {
                ...defaultConfig.templates,
                ...(config.templates || {}),
            },
        };
    } catch {
        return defaultConfig;
    }
}

/**
 * Migrates the global config to the latest version if needed.
 */
export function migrateGlobalConfigIfNeeded(): void {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) {
        try {
            writeGlobalConfig({ templates: {} });
        } catch (e) {
            warn(
                'Failed to create initial config.json, continuing with in-memory defaults',
            );
        }
        return;
    }

    try {
        const content = readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        let needsMigration = false;
        if (!config.templates) {
            config.templates = {};
            needsMigration = true;
        }

        if (needsMigration) {
            log(`- Migrating config.json to include 'templates' key...`);
            try {
                writeGlobalConfig(config);
            } catch (e) {
                warn(
                    'Failed to persist config migration, continuing with in-memory defaults',
                );
            }
        }
    } catch (e) {
        // Silently fail if config is corrupt, readGlobalConfig will handle it
    }
}

/**
 * Writes the global pzstudio config to ~/.pzstudio/config.json
 */
export function writeGlobalConfig(config: GlobalConfig): void {
    const configDir = getConfigDir();
    if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
    }
    writeFileSync(getConfigPath(), JSON.stringify(config, null, 4), 'utf-8');
}

/**
 * Validates that a template directory exists and has content
 * (Just checks if directory is non-empty after clone)
 */
export function validateTemplateManifest(
    dir: string,
    expectedCategory: TemplateCategory,
): boolean {
    if (!isDirNonEmpty(dir)) {
        return false;
    }
    // Future: Can enhance to validate template.json if repos add it
    return true;
}

/**
 * Resolves the template directory for a given category.
 *
 * Resolution chain:
 * 1. overrideUrl → clone to namespace cache, validate manifest, return
 * 2. Cached template exists → return cached path (if offline or freshness ok)
 * 3. Cache missing or online → clone from config or hardcoded default → cache
 * 4. Clone fails → fall back to local .template-legacy
 * 5. Nothing found → throw actionable error
 */
export function resolveTemplateDir(
    category: TemplateCategory,
    overrideUrl?: string,
    isOffline?: boolean,
): string {
    const override = overrideUrl ? parseTemplateUrl(overrideUrl) : undefined;

    const templateConfig = override
        ? override
        : (readGlobalConfig().templates[category] ??
          DEFAULT_TEMPLATES[category]);

    if (!templateConfig) {
        throw new Error(
            `No default template defined for category '${category}'.`,
        );
    }

    const cacheDir = getCachePathFromUrl(templateConfig.url);
    const legacyDir = getEmbeddedTemplateDir(category);

    // If offline, try cache first, then legacy for defaults
    if (isOffline) {
        if (isDirNonEmpty(cacheDir)) {
            return cacheDir;
        }
        if (!overrideUrl) {
            if (isDirNonEmpty(legacyDir)) {
                warn(
                    `Template not found in cache. Falling back to offline legacy template.`,
                );
                return legacyDir;
            }
        }
        throw new Error(
            overrideUrl
                ? `Template '${overrideUrl}' not found in cache. Run without --offline first.`
                : `No cached or legacy template found for '${category}'.`,
        );
    }

    // Online mode: ensure freshness by deleting and re-cloning
    if (!isOfficialTemplate(templateConfig.url)) {
        warn(
            `⚠ Cloning from community template '${templateConfig.url}'. Not verified by PZStudio.`,
        );
    }

    if (existsSync(cacheDir)) {
        rmSync(cacheDir, { recursive: true, force: true });
    }
    mkdirSync(dirname(cacheDir), { recursive: true });

    if (cloneRemoteTemplate(templateConfig.url, cacheDir, templateConfig.ref)) {
        if (validateTemplateManifest(cacheDir, category)) {
            return cacheDir;
        }
    } else {
        warn(`Failed to clone template from '${templateConfig.url}'.`);
    }

    // Fallback to legacy for official templates only if clone failed
    if (!overrideUrl && isDirNonEmpty(legacyDir)) {
        warn(`Falling back to offline legacy template for '${category}'.`);
        return legacyDir;
    }

    throw new Error(
        `Failed to resolve template for category '${category}'. ` +
            `Clone failed and no legacy fallback found.`,
    );
}

/**
 * Scaffolds a project by copying files from a template with filtering.
 */
export function scaffoldProject(templateDir: string, destDir: string): void {
    if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
    }

    log(`- Scaffolding project into ${destDir}...`);

    const filter = createIgnoreFilter(templateDir);
    cpSync(templateDir, destDir, {
        recursive: true,
        filter: (src, dest) => {
            return filter(src, dest);
        },
    });
}
