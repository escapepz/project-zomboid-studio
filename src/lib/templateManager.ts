import { homedir } from 'os';
import { spawnSync } from 'child_process';
import { basename, dirname, join, resolve, relative } from 'path';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
    cpSync,
    symlinkSync,
} from 'fs';
import { log, warn } from './logger';
import { minimatch } from 'minimatch';

/**
 * Creates a filter for fs.cpSync derived from .pzstudioignore or hardcoded defaults.
 * @param sourceDir The source directory to compute relative paths from
 * @returns A filter function compatible with fs.cpSync
 */
/**
 * Creates a filter for fs.cpSync derived from .pzstudioignore or hardcoded defaults.
 * @param sourceDir The source directory to compute relative paths from
 * @param options Filter options
 * @returns A filter function compatible with fs.cpSync
 */
export function createIgnoreFilter(
    sourceDir: string,
    options: { excludeIgnoreFile?: boolean } = {},
): (src: string, dest: string) => boolean {
    const ignorePath = join(sourceDir, '.pzstudioignore');
    // Built-in defaults: always ignore .git, .github, and any .gitkeep
    const builtInPatterns = ['.git/**', '.github/**', '**/.gitkeep'];
    let userPatterns: string[] = [];

    if (existsSync(ignorePath)) {
        try {
            const content = readFileSync(ignorePath, 'utf-8');
            userPatterns = content
                .split(/\r?\n/)
                .map((line: string) => line.trim())
                .filter((line: string) => line && !line.startsWith('#'));
        } catch (e) {
            warn(
                `Failed to read .pzstudioignore at ${ignorePath}. Using default ignores.`,
            );
        }
    }

    const allPatterns = [...builtInPatterns, ...userPatterns];

    return (src: string) => {
        let relPath = relative(sourceDir, src);
        if (!relPath) return true; // Include root itself

        // Normalize to forward slashes for consistent glob matching
        relPath = relPath.replace(/\\/g, '/');

        // Rule: .pzstudioignore is special
        if (relPath === '.pzstudioignore') {
            return !options.excludeIgnoreFile;
        }

        for (const pattern of allPatterns) {
            try {
                // We use { dot: true } to ensure .git and .github are matched even if they start with a dot
                if (minimatch(relPath, pattern, { dot: true })) {
                    return false;
                }
            } catch (e) {
                warn(`Invalid ignore pattern skipped: "${pattern}"`);
            }
        }

        return true;
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
    useSymlinks?: boolean;
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
        '.template-legacy',
        join('..', '.template-legacy'),
        join(getConfigDir(), '.template-legacy'),
    ];

    for (const basePath of searchPaths) {
        const fullPath = join(basePath, `.template-${category}`);
        if (existsSync(fullPath) && isDirNonEmpty(fullPath)) {
            return fullPath;
        }
    }

    return join(searchPaths[0], `.template-${category}`);
}

/**
 * Checks if a directory is a valid git repository and non-empty.
 */
function isCacheValid(dir: string): boolean {
    if (!existsSync(dir)) return false;
    try {
        if (!lstatSync(dir).isDirectory()) return false;
        if (readdirSync(dir).length === 0) return false;
        // Basic git check: must have a .git directory
        if (!existsSync(join(dir, '.git'))) return false;
    } catch {
        return false;
    }
    return true;
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
 * Refreshes a cached template repository using git fetch and hard reset.
 * @param dir The cache directory
 * @param ref Optional branch or tag
 * @returns True if the refresh was successful
 */
export function refreshCachedTemplate(dir: string, ref?: string): boolean {
    log(`- Refreshing template cache at ${dir}...`);
    const git = (args: string[]) =>
        spawnSync('git', args, {
            cwd: dir,
            shell: true,
            stdio: 'pipe',
        });

    // 1. git fetch --all
    if (git(['fetch', '--all']).status !== 0) return false;

    // 2. git reset --hard origin/<ref> or just origin/HEAD if ref is missing
    const target = ref && ref !== 'default' ? `origin/${ref}` : 'origin/HEAD';
    if (git(['reset', '--hard', target]).status !== 0) return false;

    // 3. git submodule update --init --recursive --force
    if (
        git(['submodule', 'update', '--init', '--recursive', '--force'])
            .status !== 0
    )
        return false;

    // 4. git clean -fdx
    if (git(['clean', '-fdx']).status !== 0) return false;

    return true;
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
 * Validates that a template directory exists and has content.
 */
export function validateTemplateManifest(
    dir: string,
    expectedCategory: TemplateCategory,
): boolean {
    return isCacheValid(dir);
}

/**
 * Resolves the template directory for a given category.
 *
 * Resolution chain:
 * 1. overrideUrl → resolve cache path, if exists and valid:
 *    - if forceUpdate: refresh, return
 *    - else: return cached
 *    - if missing/invalid or refresh fails: delete, clone, return
 * 2. Cached default exists and valid:
 *    - if forceUpdate: refresh, return
 *    - else: return cached
 * 3. Cache missing or invalid: clone from config or hardcoded default → cache
 * 4. Clone fails → fall back to local .template-legacy
 * 5. Nothing found → throw actionable error
 */
export function resolveTemplateDir(
    category: TemplateCategory,
    overrideUrl?: string,
    isOffline?: boolean,
    forceUpdate?: boolean,
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
        if (isCacheValid(cacheDir)) {
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
                ? `Template '${overrideUrl}' not found or invalid in cache. Run without --offline first.`
                : `No valid cached or legacy template found for '${category}'.`,
        );
    }

    // Online mode: use cache if valid and not forcing update
    if (isCacheValid(cacheDir)) {
        if (forceUpdate) {
            if (refreshCachedTemplate(cacheDir, templateConfig.ref)) {
                return cacheDir;
            }
            warn(`Failed to refresh template cache. Re-cloning...`);
            rmSync(cacheDir, { recursive: true, force: true });
        } else {
            return cacheDir;
        }
    } else if (existsSync(cacheDir)) {
        // Invalid cache: clean up before re-clone
        warn(`Template cache at ${cacheDir} is invalid. Re-cloning...`);
        rmSync(cacheDir, { recursive: true, force: true });
    }

    // Re-clone or initial clone
    if (!isOfficialTemplate(templateConfig.url)) {
        warn(
            `⚠ Cloning from community template '${templateConfig.url}'. Not verified by PZStudio.`,
        );
    }

    mkdirSync(dirname(cacheDir), { recursive: true });

    if (cloneRemoteTemplate(templateConfig.url, cacheDir, templateConfig.ref)) {
        if (validateTemplateManifest(cacheDir, category)) {
            return cacheDir;
        }
    } else {
        warn(`Failed to clone template from '${templateConfig.url}'.`);
    }

    // Fallback to legacy for official templates only if clone/cache failed
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
 * Supports directory junctions for specific folders if useSymlinks is enabled.
 */
export function scaffoldProject(
    templateDir: string,
    destDir: string,
    useSymlinks: boolean = false,
    asJunction: boolean = false,
): void {
    if (useSymlinks && asJunction) {
        try {
            if (existsSync(destDir)) {
                rmSync(destDir, { recursive: true, force: true });
            }
            mkdirSync(dirname(destDir), { recursive: true });
            symlinkSync(templateDir, destDir, 'junction');
            log(`  - Created template junction: ${basename(destDir)}`);
            return;
        } catch (e) {
            warn(
                `  - Failed to create template junction for ${basename(
                    destDir,
                )}, falling back to copy.`,
            );
        }
    }

    if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
    }

    log(`- Scaffolding into ${destDir}...`);

    const filter = createIgnoreFilter(templateDir);
    const symlinkFolders = ['.libraries', '.docs'];

    readdirSync(templateDir).forEach((file: string) => {
        const srcPath = join(templateDir, file);
        const destPath = join(destDir, file);

        if (!filter(srcPath, destPath)) {
            return;
        }

        const stats = lstatSync(srcPath);

        if (
            useSymlinks &&
            stats.isDirectory() &&
            symlinkFolders.includes(file)
        ) {
            try {
                if (existsSync(destPath)) {
                    rmSync(destPath, { recursive: true, force: true });
                }
                symlinkSync(srcPath, destPath, 'junction');
                log(`  - Created junction: ${file}`);
                return;
            } catch (e) {
                warn(
                    `  - Failed to create junction for ${file}, falling back to copy.`,
                );
            }
        }

        cpSync(srcPath, destPath, {
            recursive: true,
            filter: (src: string, dest: string) => filter(src, dest),
        });
    });
}
