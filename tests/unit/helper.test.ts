import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    formatTitleToId,
    generateWorkshopText,
    generateModInfoText,
    readProjectConfig,
    updateProjectConfig,
    getOutDir,
    atomicWriteJson,
    migrateStoreDirIfNeeded,
    updateExperimentalScripts,
    setProjectDir,
    workingDir,
    applyProjectDefaults,
    getStoreDir,
    parseModInfoText,
} from '../../src/lib/helper';
import { migration } from '../../src/lib/migration';
import { IProjectConfig } from '../../src/lib/project';
import fs from 'fs';
import * as logger from '../../src/lib/logger';
import * as templateManager from '../../src/lib/templateManager';

vi.mock('fs');
vi.mock('../../src/lib/logger');
vi.mock('../../src/lib/templateManager');

describe('Helper Library', () => {
    const defaultGlobalConfig = {
        templates: {},
        useSymlinks: true,
        outdir: undefined,
    };

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.mocked(templateManager.readGlobalConfig).mockReturnValue({
            ...defaultGlobalConfig,
        } as any);
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

        it('should warn and continue if a real legacy shape is detected', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({
                    // root-level "title" is a legacy field that triggers migration
                    title: 'Old Title',
                    workshop: { title: 'Test', visibility: 'public', tags: [] },
                    mods: {},
                }),
            );

            const config = readProjectConfig();
            expect(config).toBeDefined();
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('[MIGRATION]'),
            );
        });

        it('should NOT emit a migration warning when build.modInfo is omitted', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({
                    workshop: { title: 'Test', visibility: 'public', tags: [] },
                    mods: { mod1: { name: 'Mod 1', description: 'Desc' } },
                    // build.modInfo intentionally absent – this is the default
                }),
            );

            // Clear warn history from previous tests in this describe block
            // (vi.restoreAllMocks does not reset call records on vi.mock() module fns)
            vi.mocked(logger.warn).mockClear();

            const config = readProjectConfig();
            expect(config).toBeDefined();
            expect(logger.warn).not.toHaveBeenCalledWith(
                expect.stringContaining('[MIGRATION]'),
            );
            // applyProjectDefaults silently defaults modInfo to 'skip'
            expect(config!.mods.mod1.build!.modInfo).toBe('skip');
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

        it('should fall back to direct write if atomic move fails', () => {
            const filePath = 'project.json';
            const updated = { title: 'New' };

            vi.mocked(fs.existsSync).mockReturnValue(false);
            vi.mocked(fs.writeFileSync).mockImplementationOnce(() => {
                throw new Error('disk error');
            });

            atomicWriteJson(filePath, updated);

            // The catch fallback calls writeFileSync again with the file path directly
            const fallbackCall = vi
                .mocked(fs.writeFileSync)
                .mock.calls.find(
                    (c) => c[0] === filePath && !String(c[0]).includes('.tmp'),
                );
            expect(fallbackCall).toBeDefined();
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

    describe('updateProjectConfig', () => {
        it('should throw if the target path does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            expect(() =>
                updateProjectConfig('nonexistent.json', {} as any),
            ).toThrow('The given path does not exist!');
        });
    });

    describe('setProjectDir', () => {
        it('should set and clear the external project dir', () => {
            setProjectDir('/custom/path');
            // Reset so it doesn't leak into other tests
            setProjectDir(undefined);
        });
    });

    describe('workingDir', () => {
        it('should return a path ending in lib when not running from dist', () => {
            const dir = workingDir();
            expect(dir).toMatch(/lib$/);
        });
    });

    describe('applyProjectDefaults', () => {
        it('should return falsy if config is falsy', () => {
            expect(applyProjectDefaults(undefined)).toBeUndefined();
            expect(applyProjectDefaults(null)).toBeNull();
        });

        it('should default workshop settings if missing', () => {
            const config = { mods: {} } as any;
            const result = applyProjectDefaults(config);
            expect(result.workshop).toBeDefined();
            expect(result.workshop).toEqual({});
        });

        it('should default build.modInfo to skip when missing', () => {
            const config = {
                workshop: {},
                mods: {
                    testmod: {
                        name: 'Test',
                        description: 'Desc',
                    },
                },
            };
            const result = applyProjectDefaults(config);
            expect(result.mods.testmod.build!.modInfo).toBe('skip');
        });

        it('should default poster and icon when missing', () => {
            const config = {
                workshop: {},
                mods: {
                    testmod: {
                        name: 'Test',
                        description: 'Desc',
                    },
                },
            };
            const result = applyProjectDefaults(config);
            expect(result.mods.testmod.poster).toBe('poster.png');
            expect(result.mods.testmod.icon).toBe('icon.png');
        });

        it('should default excludes to empty array when missing', () => {
            const config = { workshop: {}, mods: {} };
            const result = applyProjectDefaults(config);
            expect(result.excludes).toEqual([]);
        });

        it('should handle missing mods gracefully', () => {
            const config = { workshop: {} };
            const result = applyProjectDefaults(config);
            expect(result.mods).toBeUndefined();
        });
    });

    describe('getStoreDir', () => {
        it('should return a path containing .pzstudio', () => {
            const dir = getStoreDir();
            expect(dir).toContain('.pzstudio');
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

        it('should return empty string if mod is missing', () => {
            const text = generateModInfoText('nonexistent', mockConfig);
            expect(text).toBe('');
        });

        it('should omit name if missing', () => {
            const config = {
                mods: {
                    my_mod: {
                        description: 'Desc',
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('id=my_mod');
            expect(text).not.toContain('name=');
        });

        it('should handle poster as an array', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        poster: ['poster1.png', 'poster2.png'],
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('poster=poster1.png');
            expect(text).toContain('poster=poster2.png');
        });

        it('should handle require as a string', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        require: 'singleMod',
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('require=singleMod');
        });

        it('should handle require as comma-separated array', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        require: ['modA', 'modB'],
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('require=modA,modB');
        });

        it('should handle incompatible as a string', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        incompatible: 'badMod',
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('incompatible=badMod');
        });

        it('should handle incompatible as comma-separated array', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        incompatible: ['badMod1', 'badMod2'],
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('incompatible=badMod1,badMod2');
        });

        it('should handle loadModAfter as string', () => {
            const config = {
                mods: { my_mod: { name: 'M', loadModAfter: 'otherMod' } },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('loadModAfter=otherMod');
        });

        it('should handle loadModAfter as array', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        loadModAfter: ['modA', 'modB'],
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('loadModAfter=modA,modB');
        });

        it('should handle loadModBefore as string', () => {
            const config = {
                mods: { my_mod: { name: 'M', loadModBefore: 'otherMod' } },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('loadModBefore=otherMod');
        });

        it('should handle loadModBefore as array', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        loadModBefore: ['modA', 'modB'],
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('loadModBefore=modA,modB');
        });

        it('should handle pack, tiledef, category, url, versionMax', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        pack: 'myPack',
                        tiledef: 'myTileDef 123',
                        category: 'Gameplay',
                        url: 'https://example.com',
                        versionMax: '42.0',
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('pack=myPack');
            expect(text).toContain('tiledef=myTileDef 123');
            expect(text).toContain('category=Gameplay');
            expect(text).toContain('url=https://example.com');
            expect(text).toContain('versionMax=42.0');
        });

        it('should handle multiple packs and tiledefs', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        pack: ['pack1', 'pack2 ui'],
                        tiledef: ['tile1 111', 'tile2 222'],
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('pack=pack1');
            expect(text).toContain('pack=pack2 ui');
            expect(text).toContain('tiledef=tile1 111');
            expect(text).toContain('tiledef=tile2 222');
        });

        it('should output unknown forward-compatible fields', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        customField: 'customValue',
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('customField=customValue');
        });
    });

    describe('migrateStoreDirIfNeeded', () => {
        it('should migrate legacy .pzstudio file to directory', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => true,
            } as any);
            vi.mocked(fs.readFileSync).mockReturnValue('/some/outdir\n');
            vi.mocked(templateManager.readGlobalConfig).mockReturnValue({
                templates: {},
                useSymlinks: true,
                outdir: undefined,
            } as any);

            migrateStoreDirIfNeeded();

            expect(fs.rmSync).toHaveBeenCalled();
            expect(fs.mkdirSync).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(templateManager.writeGlobalConfig).toHaveBeenCalledWith(
                expect.objectContaining({ outdir: '/some/outdir' }),
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining('Migrated'),
            );
        });

        it('should warn on migration failure', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => true,
            } as any);
            vi.mocked(fs.readFileSync).mockImplementation(() => {
                throw new Error('read error');
            });

            migrateStoreDirIfNeeded();

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to migrate'),
            );
        });

        it('should do nothing if .pzstudio is already a directory', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.statSync).mockReturnValue({
                isFile: () => false,
            } as any);

            const rmBefore = vi.mocked(fs.rmSync).mock.calls.length;
            migrateStoreDirIfNeeded();

            expect(vi.mocked(fs.rmSync).mock.calls.length).toBe(rmBefore);
        });
    });

    describe('getOutDir', () => {
        it('should return default workshop path if not configured', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false); // No config.json
            expect(getOutDir().toLowerCase()).toContain('workshop');
        });

        it('should fall back to ~/Zomboid/Workshop when no config provides outdir', () => {
            const result = getOutDir(undefined, {
                templates: {},
                useSymlinks: true,
                outdir: undefined,
            } as any);
            expect(result.toLowerCase()).toContain('zomboid');
            expect(result.toLowerCase()).toContain('workshop');
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

        it('should handle missing title, tags, and visibility', () => {
            const minimalConfig: IProjectConfig = {
                workshop: {},
                mods: {},
            } as any;
            const text = generateWorkshopText(minimalConfig);
            expect(text).toContain('version=1');
            expect(text).not.toContain('title=');
            expect(text).not.toContain('tags=');
            expect(text).not.toContain('visibility=');
        });

        it('should include description.txt lines when the file exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('Line one\nLine two');

            const text = generateWorkshopText(mockConfig);
            expect(text).toContain('description=Line one');
            expect(text).toContain('description=Line two');
        });
    });

    describe('updateExperimentalScripts', () => {
        beforeEach(() => {
            // Provide valid JSON so the internal functions don't throw when parsing package.json
            vi.mocked(fs.readFileSync).mockReturnValue('{}');
        });

        it('should do nothing if script file does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            vi.mocked(logger.warn).mockClear();
            updateExperimentalScripts('addProject', '/some/dir');
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('should run addProject dispatch without error when script exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(logger.warn).mockClear();

            expect(() =>
                updateExperimentalScripts('addProject', '/nonexistent/dir'),
            ).not.toThrow();
            // Should not warn (meaning no exceptions were caught)
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('should run addMod dispatch without error when script exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(logger.warn).mockClear();

            expect(() =>
                updateExperimentalScripts(
                    'addMod',
                    '/nonexistent/dir',
                    'mymod',
                ),
            ).not.toThrow();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('should run removeMod dispatch without error when script exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(logger.warn).mockClear();

            expect(() =>
                updateExperimentalScripts(
                    'removeMod',
                    '/nonexistent/dir',
                    'mymod',
                ),
            ).not.toThrow();
            expect(logger.warn).not.toHaveBeenCalled();
        });

        it('should use mocked script paths if running from dist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            vi.doMock('path', async (importOriginal) => {
                const actual = await importOriginal<typeof import('path')>();
                return {
                    ...actual,
                    basename: () => 'dist',
                };
            });
            const { updateExperimentalScripts: updateScriptsMocked } =
                await import('../../src/lib/helper');
            expect(() =>
                updateScriptsMocked('addProject', '/some/dir'),
            ).not.toThrow();
            vi.doUnmock('path');
        });

        it('should gracefully catch exceptions inside the experimental script block', () => {
            vi.mocked(fs.existsSync).mockImplementation(() => {
                throw new Error('intentional error for test');
            });
            updateExperimentalScripts('addProject', '/some/dir');
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to run experimental script'),
            );
        });

        it('should handle missing dispatch functions in script', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);

            // To truly test missing functions without it actually invoking the real ones,
            // we could stub it. But simply calling an unknown action covers the default switch branch.
            expect(() =>
                updateExperimentalScripts('unknownAction' as any, '/some/dir'),
            ).not.toThrow();
        });
    });

    describe('parseModInfoText', () => {
        it('should parse basic fields correctly', () => {
            const content = 'id=test\nname=Test Mod\nauthor=Antigravity';
            const result = parseModInfoText(content);
            expect(result.id).toBe('test');
            expect(result.name).toBe('Test Mod');
            expect(result.author).toBe('Antigravity');
        });

        it('should skip empty lines and comments', () => {
            const content =
                '\n# Comment\n// Another comment\nid=test\n   \nname=Test';
            const result = parseModInfoText(content);
            expect(result.id).toBe('test');
            expect(result.name).toBe('Test');
            expect(Object.keys(result)).toHaveLength(2);
        });

        it('should skip lines without equals sign', () => {
            const content = 'id=test\nInvalidLine\nname=Test';
            const result = parseModInfoText(content);
            expect(result.id).toBe('test');
            expect(result.name).toBe('Test');
        });

        it('should parse multiple posters as an array', () => {
            const content = 'id=test\nposter=poster1.png\nposter=poster2.png';
            const result = parseModInfoText(content);
            expect(result.poster).toEqual(['poster1.png', 'poster2.png']);
        });

        it('should parse single poster as a string', () => {
            const content = 'id=test\nposter=poster.png';
            const result = parseModInfoText(content);
            expect(result.poster).toBe('poster.png');
        });

        it('should parse comma-separated lists (require, incompatible, etc)', () => {
            const content = 'id=test\nrequire=modA, modB\nincompatible=modC';
            const result = parseModInfoText(content);
            expect(result.require).toEqual(['modA', 'modB']);
            expect(result.incompatible).toEqual(['modC']);
        });

        it('should parse pack and tiledef as strings (single) or arrays (multiple)', () => {
            const content =
                'id=test\npack=pack1\npack=pack2 ui\ntiledef=tile1 111';
            const result = parseModInfoText(content);
            expect(result.pack).toEqual(['pack1', 'pack2 ui']);
            expect(result.tiledef).toBe('tile1 111');

            const content2 =
                'id=test\npack=pack1\ntiledef=tile1 111\ntiledef=tile2 222';
            const result2 = parseModInfoText(content2);
            expect(result2.pack).toBe('pack1');
            expect(result2.tiledef).toEqual(['tile1 111', 'tile2 222']);
        });

        it('should handle description as a single string in generateModInfoText', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        description: 'Single line description',
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('description=Single line description');
        });

        it('should handle description as an array in generateModInfoText', () => {
            const config = {
                mods: {
                    my_mod: {
                        name: 'M',
                        description: ['Line 1', 'Line 2'],
                    },
                },
            } as any;
            const text = generateModInfoText('my_mod', config);
            expect(text).toContain('description=Line 1');
            expect(text).toContain('description=Line 2');
        });

        it('should parse multiple descriptions as an array', () => {
            const content = 'id=test\ndescription=line1\ndescription=line2';
            const result = parseModInfoText(content);
            expect(result.description).toEqual(['line1', 'line2']);
        });

        it('should preserve unknown fields', () => {
            const content = 'id=test\ncustom=value';
            const result = parseModInfoText(content);
            expect(result.custom).toBe('value');
        });
    });

    describe('migration.checkProject', () => {
        it('should return needsMigration=false for a clean config', () => {
            const result = migration.checkProject({
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: { mod1: { name: 'Mod 1', description: 'Desc' } },
            });
            expect(result.needsMigration).toBe(false);
        });

        it('should return needsMigration=false when build.modInfo is absent', () => {
            // Omitting build.modInfo is the new default – not a migration trigger
            const result = migration.checkProject({
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: {
                    mod1: { name: 'Mod 1', description: 'Desc' },
                    mod2: { name: 'Mod 2', description: 'Desc', build: {} },
                },
            });
            expect(result.needsMigration).toBe(false);
        });

        it('should return needsMigration=true for legacy root fields', () => {
            const withTitle = migration.checkProject({
                title: 'Old',
                workshop: {},
                mods: {},
            });
            expect(withTitle.needsMigration).toBe(true);

            const withAuthors = migration.checkProject({
                authors: ['me'],
                workshop: {},
                mods: {},
            });
            expect(withAuthors.needsMigration).toBe(true);

            const withId = migration.checkProject({
                id: 123,
                workshop: {},
                mods: {},
            });
            expect(withId.needsMigration).toBe(true);
        });

        it('should return needsMigration=true when workshop.excludes is present', () => {
            const result = migration.checkProject({
                workshop: { excludes: ['someMod'] },
                mods: {},
            });
            expect(result.needsMigration).toBe(true);
        });
    });
});
