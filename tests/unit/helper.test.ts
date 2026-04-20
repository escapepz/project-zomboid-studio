import { describe, it, expect } from 'vitest';
import {
    formatTitleToId,
    generateWorkshopText,
    generateModInfoText,
} from '../../src/lib/helper';
import { IProjectConfig } from '../../src/lib/project';

describe('Helper Library', () => {
    describe('formatTitleToId', () => {
        it('should convert spaces to underscores and lowercase', () => {
            expect(formatTitleToId('My Mod')).toBe('my_mod');
            expect(formatTitleToId('Teleportal Prototype')).toBe(
                'teleportal_prototype',
            );
        });

        it('should remove special characters', () => {
            expect(formatTitleToId('My-Cool Mod!')).toBe('mycool_mod');
        });

        it('should maintain existing underscores', () => {
            expect(formatTitleToId('my_already_formatted_mod')).toBe(
                'my_already_formatted_mod',
            );
        });
    });

    describe('generateWorkshopText', () => {
        const mockConfig: IProjectConfig = {
            title: 'Test Project',
            workshop: {
                id: '123456789',
                tags: ['Mod', 'Script'],
                visibility: 'public',
            },
            mods: {},
        } as any;

        it('should generate correct workshop text', () => {
            const text = generateWorkshopText(mockConfig);
            expect(text).toContain('version=1');
            expect(text).toContain('id=123456789');
            expect(text).toContain('title=Test Project');
            expect(text).toContain('tags=Mod;Script');
            expect(text).toContain('visibility=public');
        });

        it('should exclude id when requested', () => {
            const text = generateWorkshopText(mockConfig, undefined, true);
            expect(text).not.toContain('id=123456789');
        });

        it('should append title suffix', () => {
            const text = generateWorkshopText(
                mockConfig,
                undefined,
                false,
                ' - dev',
            );
            expect(text).toContain('title=Test Project - dev');
        });
    });

    describe('generateModInfoText', () => {
        const mockConfig: IProjectConfig = {
            mods: {
                my_mod: {
                    name: 'My Mod',
                    description: 'A cool mod',
                    poster: 'poster.png',
                    icon: 'icon.png',
                    url: 'https://example.com',
                    versionMin: '41.0',
                    require: ['other_mod'],
                },
            },
        } as any;

        it('should generate correct mod.info text', () => {
            const text = generateModInfoText('my_mod', mockConfig);
            expect(text).toContain('id=my_mod');
            expect(text).toContain('name=My Mod');
            expect(text).toContain('description=A cool mod');
            expect(text).toContain('poster=poster.png');
            expect(text).toContain('icon=icon.png');
            expect(text).toContain('url=https://example.com');
            expect(text).toContain('versionMin=41.0');
            expect(text).toContain('require=other_mod');
        });

        it('should use prefixed id if provided', () => {
            const text = generateModInfoText(
                'my_mod',
                mockConfig,
                'prefixed_id',
            );
            expect(text).toContain('id=prefixed_id');
        });
    });
});
