/**
 * Structured validation failure details.
 */
export interface ValidationError {
    location: string; // File path + field path (e.g., "project.json:workshop.visibility")
    problem: string; // What is wrong (e.g., "Must be one of: public, friendsOnly, private, unlisted")
    impact: string; // How to fix it or why it matters (e.g., "PZ requires a valid visibility to publish to the Workshop")
}

/**
 * Aggregates validation errors during a single pass.
 */
export class ValidationContext {
    private errors: ValidationError[] = [];
    public readonly filePath: string;

    constructor(filePath: string) {
        this.filePath = filePath;
    }

    public addError(fieldPath: string, problem: string, impact: string) {
        this.errors.push({
            location: `${this.filePath}${fieldPath ? ':' + fieldPath : ''}`,
            problem,
            impact,
        });
    }

    public hasErrors(): boolean {
        return this.errors.length > 0;
    }

    public getErrors(): ValidationError[] {
        return [...this.errors];
    }

    public formatErrors(): string {
        return this.errors
            .map((e) => `[${e.location}] ${e.problem}\n   → ${e.impact}`)
            .join('\n\n');
    }
}

/**
 * Basic type guards for runtime validation.
 */
export const guards = {
    isObject: (val: any): val is Record<string, any> =>
        val !== null && typeof val === 'object' && !Array.isArray(val),
    isArray: (val: any): val is any[] => Array.isArray(val),
    isString: (val: any): val is string => typeof val === 'string',
    isBoolean: (val: any): val is boolean => typeof val === 'boolean',
    isNumber: (val: any): val is number => typeof val === 'number',
};

/**
 * Validates a project.json configuration.
 */
export function validateProject(config: any, context: ValidationContext): void {
    if (!guards.isObject(config)) {
        context.addError(
            '',
            'Root must be a plain object',
            'Fix the project.json structure to be a valid JSON object',
        );
        return;
    }

    // Legacy/Unsupported root fields
    if ('title' in config) {
        context.addError(
            'title',
            'Field "title" is no longer supported at the root',
            'Move this to "workshop.title" in your project.json',
        );
    }

    if ('authors' in config) {
        context.addError(
            'authors',
            'Field "authors" is no longer supported at the root',
            'Use mod-level authors or remove it',
        );
    }

    if ('id' in config) {
        context.addError(
            'id',
            'Field "id" is no longer supported at the root',
            'Move this to "workshop.id" in your project.json',
        );
    }

    if (!guards.isObject(config.workshop)) {
        context.addError(
            'workshop',
            'Field "workshop" must be an object',
            'Add workshop configuration details',
        );
    } else {
        const w = config.workshop;

        if (!guards.isString(w.title)) {
            context.addError(
                'workshop.title',
                'Field "title" must be a string',
                'Add a descriptive title for your project',
            );
        }

        if (w.id !== undefined && !guards.isNumber(w.id)) {
            context.addError(
                'workshop.id',
                'Field "id" must be a number',
                'Provide a valid numeric Steam Workshop ID',
            );
        }

        const validVis = ['public', 'friendsOnly', 'private', 'unlisted'];
        if (
            !guards.isString(w.visibility) ||
            !validVis.includes(w.visibility)
        ) {
            context.addError(
                'workshop.visibility',
                `Field "visibility" must be one of: ${validVis.join(', ')}`,
                'Choose a valid visibility for the Steam Workshop',
            );
        }

        if (!guards.isArray(w.tags)) {
            context.addError(
                'workshop.tags',
                'Field "tags" must be an array of strings',
                'Add at least one tag to categorize your mod',
            );
        } else {
            w.tags.forEach((tag: any, i: number) => {
                if (!guards.isString(tag)) {
                    context.addError(
                        formatFieldPath('workshop.tags', i),
                        'Tag must be a string',
                        'Ensure all tags are strings',
                    );
                }
            });
        }

        if ('excludes' in w) {
            context.addError(
                'workshop.excludes',
                'Field "excludes" is no longer supported under "workshop"',
                'Move "excludes" to the root of your project.json',
            );
        }
    }

    if (!guards.isObject(config.mods)) {
        context.addError(
            'mods',
            'Field "mods" must be an object',
            'Add at least one mod definition to your project',
        );
    } else {
        for (const modId in config.mods) {
            const mod = config.mods[modId];
            const path = formatFieldPath('mods', modId);
            if (!guards.isObject(mod)) {
                context.addError(
                    path,
                    `Mod "${modId}" must be an object`,
                    'Check the mod definition structure',
                );
                continue;
            }

            if (!guards.isString(mod.name)) {
                context.addError(
                    formatFieldPath('mods', modId, 'name'),
                    'Field "name" must be a string',
                    'Add a name for this mod',
                );
            }

            if (
                !guards.isString(mod.description) &&
                !guards.isArray(mod.description)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'description'),
                    'Field "description" must be a string or array of strings',
                    'Add a description for this mod',
                );
            }

            if (mod.author !== undefined && !guards.isString(mod.author)) {
                context.addError(
                    formatFieldPath('mods', modId, 'author'),
                    'Field "author" must be a string',
                    'Specify mod author',
                );
            }

            if (
                mod.modversion !== undefined &&
                !guards.isString(mod.modversion)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'modversion'),
                    'Field "modversion" must be a string',
                    'Specify mod version',
                );
            }

            if (
                mod.poster !== undefined &&
                !guards.isString(mod.poster) &&
                !guards.isArray(mod.poster)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'poster'),
                    'Field "poster" must be a string or array of strings',
                    'Specify a poster image file path',
                );
            }

            if (mod.icon !== undefined && !guards.isString(mod.icon)) {
                context.addError(
                    formatFieldPath('mods', modId, 'icon'),
                    'Field "icon" must be a string',
                    'Specify an icon file path (e.g., "icon.png")',
                );
            }

            if (
                mod.require !== undefined &&
                !guards.isString(mod.require) &&
                !guards.isArray(mod.require)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'require'),
                    'Field "require" must be a string or array of strings',
                    'List mod dependencies by their IDs',
                );
            }

            if (
                mod.incompatible !== undefined &&
                !guards.isString(mod.incompatible) &&
                !guards.isArray(mod.incompatible)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'incompatible'),
                    'Field "incompatible" must be a string or array of strings',
                    'List incompatible mod IDs',
                );
            }

            if (
                mod.loadModAfter !== undefined &&
                !guards.isString(mod.loadModAfter) &&
                !guards.isArray(mod.loadModAfter)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'loadModAfter'),
                    'Field "loadModAfter" must be a string or array of strings',
                    'List mods to load before this one',
                );
            }

            if (
                mod.loadModBefore !== undefined &&
                !guards.isString(mod.loadModBefore) &&
                !guards.isArray(mod.loadModBefore)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'loadModBefore'),
                    'Field "loadModBefore" must be a string or array of strings',
                    'List mods to load after this one',
                );
            }

            if (mod.pack !== undefined) {
                const packs = guards.isArray(mod.pack) ? mod.pack : [mod.pack];
                packs.forEach((p: any, i: number) => {
                    const packPath = guards.isArray(mod.pack)
                        ? formatFieldPath('mods', modId, 'pack', i)
                        : formatFieldPath('mods', modId, 'pack');
                    if (!guards.isString(p)) {
                        context.addError(
                            packPath,
                            'Pack entry must be a string',
                            'Specify texture pack name (e.g., "npcshop" or "npcshop ui")',
                        );
                    }
                });
            }

            if (mod.tiledef !== undefined) {
                const tiledefs = guards.isArray(mod.tiledef)
                    ? mod.tiledef
                    : [mod.tiledef];
                tiledefs.forEach((t: any, i: number) => {
                    const tiledefPath = guards.isArray(mod.tiledef)
                        ? formatFieldPath('mods', modId, 'tiledef', i)
                        : formatFieldPath('mods', modId, 'tiledef');
                    if (!guards.isString(t)) {
                        context.addError(
                            tiledefPath,
                            'Tiledef entry must be a string',
                            'Specify tile definition name and number (e.g., "npcshop 1212")',
                        );
                    }
                });
            }

            if (mod.category !== undefined && !guards.isString(mod.category)) {
                context.addError(
                    formatFieldPath('mods', modId, 'category'),
                    'Field "category" must be a string',
                    'Specify mod category',
                );
            }

            if (mod.url !== undefined && !guards.isString(mod.url)) {
                context.addError(
                    formatFieldPath('mods', modId, 'url'),
                    'Field "url" must be a string',
                    'Specify a valid URL',
                );
            }

            if (
                mod.versionMin !== undefined &&
                !guards.isString(mod.versionMin)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'versionMin'),
                    'Field "versionMin" must be a string',
                    'Specify minimum PZ version',
                );
            }

            if (
                mod.versionMax !== undefined &&
                !guards.isString(mod.versionMax)
            ) {
                context.addError(
                    formatFieldPath('mods', modId, 'versionMax'),
                    'Field "versionMax" must be a string',
                    'Specify maximum PZ version',
                );
            }

            if (mod.build !== undefined) {
                if (!guards.isObject(mod.build)) {
                    context.addError(
                        formatFieldPath('mods', modId, 'build'),
                        'Field "build" must be an object',
                        'Add build settings for this mod',
                    );
                } else if (
                    mod.build.modInfo !== undefined &&
                    !guards.isString(mod.build.modInfo)
                ) {
                    context.addError(
                        formatFieldPath('mods', modId, 'build.modInfo'),
                        'Field "modInfo" must be a string (e.g., "auto", "skip", "auto-if-missing")',
                        'Set how mod.info is handled during build',
                    );
                }
            }
        }
    }

    if (config.excludes !== undefined && !guards.isArray(config.excludes)) {
        context.addError(
            'excludes',
            'Field "excludes" must be an array of strings',
            'Specify mod IDs to exclude from the workshop build',
        );
    }

    if (config.outdir !== undefined && !guards.isString(config.outdir)) {
        context.addError(
            'outdir',
            'Field "outdir" must be a string',
            'Specify a valid directory path for output',
        );
    }

    if (config.templates !== undefined) {
        context.addError(
            'templates',
            'Field "templates" is no longer supported in project.json',
            'Move this configuration to your global config.json at ~/.pzstudio/config.json',
        );
    }
}

/**
 * Validates a config.json configuration.
 */
export function validateConfig(config: any, context: ValidationContext): void {
    if (!guards.isObject(config)) {
        context.addError(
            '',
            'Root must be a plain object',
            'Fix the config.json structure',
        );
        return;
    }

    const unsupportedProjectKeys = [
        'workshop',
        'mods',
        'excludes',
        'title',
        'authors',
        'id',
    ];
    for (const key of unsupportedProjectKeys) {
        if (key in config) {
            context.addError(
                key,
                `Field "${key}" is not supported in config.json`,
                'Move this setting to your workspace project.json',
            );
        }
    }

    if (config.outdir !== undefined && !guards.isString(config.outdir)) {
        context.addError(
            'outdir',
            'Field "outdir" must be a string',
            'Specify a valid directory path for output',
        );
    }

    if (config.templates !== undefined) {
        if (!guards.isObject(config.templates)) {
            context.addError(
                'templates',
                'Field "templates" must be an object',
                'Check your custom templates configuration',
            );
        } else {
            for (const key in config.templates) {
                const t = config.templates[key];
                if (!guards.isObject(t)) {
                    context.addError(
                        formatFieldPath('templates', key),
                        'Template must be an object',
                        'Specify url and optional ref',
                    );
                } else if (!guards.isString(t.url)) {
                    context.addError(
                        formatFieldPath('templates', key, 'url'),
                        'Field "url" must be a string',
                        'Provide a repository URL or user/repo shorthand',
                    );
                }

                if (t.ref !== undefined && !guards.isString(t.ref)) {
                    context.addError(
                        formatFieldPath('templates', key, 'ref'),
                        'Field "ref" must be a string',
                        'Provide a branch, tag, or commit reference',
                    );
                }
            }
        }
    }

    if (
        config.useSymlinks !== undefined &&
        !guards.isBoolean(config.useSymlinks)
    ) {
        context.addError(
            'useSymlinks',
            'Field "useSymlinks" must be a boolean',
            'Set to true or false for global symlink default',
        );
    }
}

/**
 * Formats a field path for reporting.
 */
export function formatFieldPath(...parts: (string | number)[]): string {
    return parts
        .filter((p) => p !== undefined && p !== '')
        .map((p, i) =>
            typeof p === 'number' ? `[${p}]` : i === 0 ? p : `.${p}`,
        )
        .join('');
}
