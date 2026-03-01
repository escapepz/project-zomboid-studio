import { homedir } from 'os';
import { spawnSync } from 'child_process';
import { basename, dirname, join } from 'path';
import {
    existsSync,
    lstatSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    rmSync,
    writeFileSync,
} from 'fs';
import { warn } from './logger';

export type TemplateCategory = 'project' | 'mod' | 'workshop' | 'language';

export interface TemplateConfig {
    url: string;
    ref?: string; // branch or tag
}

export interface GlobalConfig {
    templates: Partial<Record<TemplateCategory, TemplateConfig>>;
}

const DEFAULT_TEMPLATES: Record<TemplateCategory, TemplateConfig> = {
    project: {
        url: 'https://github.com/escapepz/pzstudio-template-project',
        ref: '42.13.1',
    },
    mod: {
        url: 'https://github.com/escapepz/pzstudio-template-mod',
        ref: '42.13.1-simple',
    },
    workshop: {
        url: 'https://github.com/escapepz/pzstudio-template-workshop',
        ref: 'default',
    },
    language: {
        url: 'https://github.com/escapepz/pzstudio-template-language',
        ref: 'default',
    },
};

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
    const root =
        basename(__dirname) === 'dist'
            ? join(__dirname, '..')
            : join(dirname(__dirname), '..');
    return join(root, `.template-${category}`);
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

function gitClone(url: string, dest: string, ref?: string): boolean {
    const args = ['clone', '--depth', '1'];
    if (ref) {
        args.push('-b', ref);
    }
    args.push(url, dest);

    const result = spawnSync('git', args, { shell: true, stdio: 'pipe' });
    return result.status === 0;
}

/**
 * Reads the global pzstudio config from ~/.pzstudio/config.json
 */
export function readGlobalConfig(): GlobalConfig {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) {
        return { templates: {} };
    }
    try {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {
        return { templates: {} };
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
 * 1. overrideUrl → clone to temp, validate manifest, return
 * 2. ~/.pzstudio/templates/<category>/ exists & non-empty → return cached path
 * 3. Cache missing → clone from config or hardcoded default → cache
 * 4. Clone fails → fall back to embedded <cli-root>/.template-<category>
 * 5. Nothing found → throw actionable error
 */
export function resolveTemplateDir(
    category: TemplateCategory,
    overrideUrl?: string,
): string {
    // 1. Override URL → clone to temp, validate, return
    if (overrideUrl) {
        const tempDir = join(getConfigDir(), 'temp', category);
        if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true });
        }
        mkdirSync(dirname(tempDir), { recursive: true });

        if (
            gitClone(overrideUrl, tempDir) &&
            validateTemplateManifest(tempDir, category)
        ) {
            return tempDir;
        }
        // Fall through to normal resolution if override fails
    }

    // 2. Cached template exists → return
    const cacheDir = getTemplateCacheDir(category);
    if (isDirNonEmpty(cacheDir)) {
        return cacheDir;
    }

    // 3. Clone from config or hardcoded default → cache
    const config = readGlobalConfig();
    const templateConfig =
        config.templates[category] ?? DEFAULT_TEMPLATES[category];

    if (templateConfig) {
        mkdirSync(dirname(cacheDir), { recursive: true });
        if (gitClone(templateConfig.url, cacheDir, templateConfig.ref)) {
            return cacheDir;
        }
        warn(
            `Failed to clone '${category}' template from '${templateConfig.url}'. Falling back to embedded template.`,
        );
    }

    // 4. Fall back to embedded template
    const embeddedDir = getEmbeddedTemplateDir(category);
    if (existsSync(embeddedDir)) {
        return embeddedDir;
    }

    // 5. Nothing found → throw
    throw new Error(
        `No template found for category '${category}'. ` +
            `Ensure the template is cached at '${cacheDir}' or the embedded template exists at '${embeddedDir}'.`,
    );
}
