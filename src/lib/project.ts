export type WorkshopVisibility =
    | 'public'
    | 'friendsOnly'
    | 'private'
    | 'unlisted';

export type WorkshopTags =
    | 'Build 40'
    | 'Build 41'
    | 'Build 42'
    | 'Animals'
    | 'Audio'
    | 'Balance'
    | 'Building'
    | 'Clothing/Armor'
    | 'Farming'
    | 'Food'
    | 'Framework'
    | 'Hardmode'
    | 'Interface'
    | 'Items'
    | 'Language/Translation'
    | 'Literature'
    | 'Map'
    | 'Military'
    | 'Misc'
    | 'Models'
    | 'Multiplayer'
    | 'Pop Culture'
    | 'Realistic'
    | 'Silly/Fun'
    | 'Skills'
    | 'Textures'
    | 'Traits'
    | 'Vehicles'
    | 'QoL'
    | 'WIP'
    | 'Weapons';

export interface IWorkshopConfig {
    id?: number;
    title: string;
    description?: string;
    visibility: WorkshopVisibility;
    tags: WorkshopTags[];
}

export interface IModConfig {
    name: string;
    description: string | string[];
    author?: string;
    modversion?: string;
    poster?: string | string[];
    icon?: string;
    require?: string | string[];
    incompatible?: string | string[];
    loadModAfter?: string | string[];
    loadModBefore?: string | string[];
    pack?: string | string[];
    tiledef?: string | string[];
    category?: string;
    url?: string;
    versionMin?: string;
    versionMax?: string;

    /**
     * Custom build flags for this mod.
     * Omitting a flag uses the default (auto-if-missing) behaviour.
     */
    build?: {
        /**
         * Controls whether mod.info is auto-generated from project.json.
         *
         * - "auto-if-missing" (default) — generate only if mod.info is not already present in the source/output
         * - "auto"                      — generate mod.info from project.json (overwrite existing)
         * - "skip"                      — never generate; use whatever file exists in the mod folder
         */
        modInfo?: 'auto' | 'skip' | 'auto-if-missing';
    };
}

export type TemplateCategory = 'project' | 'mod' | 'workshop' | 'language';

export interface ITemplateConfig {
    url: string;
    ref?: string;
}

export interface GlobalConfig {
    templates: Partial<Record<TemplateCategory, ITemplateConfig>>;
    outdir?: string;
    useSymlinks?: boolean;
}

export interface IProjectConfig {
    workshop: IWorkshopConfig;
    mods: { [modId: string]: IModConfig };
    outdir?: string;

    excludes?: string[];
}
