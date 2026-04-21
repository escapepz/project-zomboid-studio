import { describe, it, expect } from 'vitest';
import {
    IProjectConfig,
    IWorkshopConfig,
    IModConfig,
} from '../../src/lib/project';

describe('Project Types', () => {
    it('should allow valid IProjectConfig object', () => {
        const config: IProjectConfig = {
            title: 'My Project',
            authors: ['Author 1', 'Author 2'],
            workshop: {
                id: 12345,
                visibility: 'public',
                tags: ['Build 41', 'Farming'],
                excludes: ['mod-a'],
            },
            mods: {
                'mod-id': {
                    name: 'Mod Name',
                    description: 'Mod Description',
                    poster: 'poster.png',
                    icon: 'icon.png',
                    build: {
                        modInfo: 'auto',
                    },
                },
            },
            useSymlinks: true,
        };
        expect(config).toBeDefined();
        expect(config.workshop.visibility).toBe('public');
    });

    it('should allow minimal IProjectConfig object', () => {
        const config: IProjectConfig = {
            title: 'Minimal',
            authors: 'Single Author',
            workshop: {
                visibility: 'private',
                tags: [],
            },
            mods: {
                'min-mod': {
                    name: 'Min Mod',
                    description: 'Min Desc',
                },
            },
        };
        expect(config).toBeDefined();
    });

    it('should have correct WorkshopTags (Animals, Audio, Farming, Skills, QoL, WIP)', () => {
        const config: IWorkshopConfig = {
            visibility: 'public',
            tags: ['Animals', 'Audio', 'Farming', 'Skills', 'QoL', 'WIP'],
        };
        expect(config.tags).toContain('Animals');
        expect(config.tags).toContain('QoL');
        expect(config.tags).toContain('WIP');
    });

    it('should have correct IModConfig build flags (auto, skip, auto-if-missing)', () => {
        const mod: IModConfig = {
            name: 'Test',
            description: 'Test',
            build: {
                modInfo: 'auto-if-missing',
            },
        };
        expect(mod.build?.modInfo).toBe('auto-if-missing');

        const mod2: IModConfig = {
            name: 'Test',
            description: 'Test',
            build: {
                modInfo: 'skip',
            },
        };
        expect(mod2.build?.modInfo).toBe('skip');
    });
});
