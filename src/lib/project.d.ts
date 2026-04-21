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
    visibility: WorkshopVisibility;
    tags: WorkshopTags[];
    excludes?: string[];
}

export interface IModConfig {
    name: string;
    description: string;
    poster?: string | string[];
    icon?: string;
    require?: string | string[];
    pack?: string;
    tiledef?: string;
    url?: string;
    versionMin?: string;
    versionMax?: string;

    /**
     * Custom build flags for this mod.
     * Omitting a flag uses the default (auto) behaviour.
     */
    build?: {
        /**
         * Controls whether mod.info is auto-generated from project.json.
         *
         * - "skip"   (default) — never generate; use whatever file exists in the mod folder
         * - "auto"             — generate mod.info from project.json
         * - "auto-if-missing"  — generate only if mod.info is not already present in the output
         */
        modInfo?: 'auto' | 'skip' | 'auto-if-missing';
    };
}

export interface IProjectConfig {
    title: string;
    authors: string | string[];
    workshop: IWorkshopConfig;
    mods: { [modId: string]: IModConfig };
    useSymlinks?: boolean;
}
