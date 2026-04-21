import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    formatTitleToId,
    generateWorkshopText,
    generateModInfoText,
    readProjectConfig,
    updateProjectConfig,
    getOutDir,
    resolveUseSymlinks,
    atomicWriteJson,
} from '../../src/lib/helper';
import { IProjectConfig } from '../../src/lib/project';
import fs from 'fs';
import * as logger from '../../src/lib/logger';

vi.mock('fs');
vi.mock('../../src/lib/logger');

describe('Helper Library', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

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

    describe('readProjectConfig', () => {
        it('should return undefined if project.json does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            expect(readProjectConfig()).toBeUndefined();
        });

        it('should return undefined if project.json is malformed JSON', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

            expect(readProjectConfig()).toBeUndefined();
        });

        it('should exit with error if project.json is valid JSON but invalid schema', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({ title: 123 }),
            );
            const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
                throw new Error('exit');
            });

            // It will return undefined because of the try-catch in readProjectConfig catching the 'exit' error
            expect(readProjectConfig()).toBeUndefined();
            expect(logger.error).toHaveBeenCalled();
            expect(exitSpy).toHaveBeenCalledWith(1);
        });

        it('should warn and continue if legacy shape is detected', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({
                    workshop: { title: 'Test', visibility: 'public', tags: [] },
                    mods: { mod1: { name: 'Mod 1', description: 'Desc' } },
                    // missing build.modInfo in mod1
                }),
            );

            const config = readProjectConfig();
            expect(config).toBeDefined();
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('[MIGRATION]'),
            );
        });
    });

    describe('atomicWriteJson', () => {
        it('should preserve unknown fields when updating', () => {
            const filePath = 'project.json';
            const existing = { title: 'Old', unknown: 'keep' };
            const updated = { title: 'New' };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify(existing),
            );

            atomicWriteJson(filePath, updated);
            const writeCall = vi
                .mocked(fs.writeFileSync)
                .mock.calls.find((c) => c[0].includes('.tmp'));
            expect(writeCall).toBeDefined();
            const writtenContent = JSON.parse(writeCall![1] as string);
            expect(writtenContent.title).toBe('New');
            expect(writtenContent.unknown).toBe('keep');
        });

        it('should overwrite if file is corrupt', () => {
            const filePath = 'project.json';
            const updated = { title: 'New' };

            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('not json');

            atomicWriteJson(filePath, updated);
            const writeCall = vi
                .mocked(fs.writeFileSync)
                .mock.calls.find((c) => c[0].includes('.tmp'));
            const writtenContent = JSON.parse(writeCall![1] as string);
            expect(writtenContent.title).toBe('New');
        });
    });

    describe('getOutDir', () => {
        it('should return default workshop path if not configured', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false); // No config.json
            expect(getOutDir().toLowerCase()).toContain('workshop');
        });
    });

    describe('resolveUseSymlinks', () => {
        it('should return false by default', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            expect(resolveUseSymlinks()).toBe(false);
        });
    });

    describe('generateWorkshopText', () => {
        const mockConfig: IProjectConfig = {
            workshop: {
                title: 'Test Project',
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
        });
    });
});
