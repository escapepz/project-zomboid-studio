import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as templateManager from '../../src/lib/templateManager';
import * as helper from '../../src/lib/helper';
import {
    createIgnoreFilter,
    readGlobalConfig,
    resolveTemplateDir,
    getConfigPath,
} from '../../src/lib/templateManager';
import fs, { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import * as logger from '../../src/lib/logger';

vi.mock('../../src/lib/logger');
vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs');
    const mocks = {
        existsSync: vi.fn(actual.existsSync),
        readFileSync: vi.fn(actual.readFileSync),
        lstatSync: vi.fn(actual.lstatSync),
        readdirSync: vi.fn(actual.readdirSync),
        rmSync: vi.fn(actual.rmSync),
        mkdirSync: vi.fn(actual.mkdirSync),
        writeFileSync: vi.fn(actual.writeFileSync),
        cpSync: vi.fn(actual.cpSync),
    };
    return {
        ...actual,
        ...mocks,
        default: {
            ...actual.default,
            ...mocks,
        },
    };
});

describe('templateManager - createIgnoreFilter', () => {
    let tmpRoot: string;
    let actualFs: any;

    beforeEach(async () => {
        vi.restoreAllMocks();
        // createIgnoreFilter needs a real directory for relative() and dirname()
        actualFs = await vi.importActual('fs');
        tmpRoot = actualFs.mkdtempSync(join(tmpdir(), 'pzstudio-test-'));

        vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
            actualFs.existsSync(p),
        );
        vi.spyOn(fs, 'readFileSync').mockImplementation(((p: any, e: any) =>
            actualFs.readFileSync(p, e)) as any);
        vi.spyOn(fs, 'lstatSync').mockImplementation((p) =>
            actualFs.lstatSync(p),
        );
    });

    afterEach(async () => {
        if (tmpRoot && actualFs) {
            actualFs.rmSync(tmpRoot, { recursive: true, force: true });
        }
    });

    it('T006 - filters literal files correctly based on .pzstudioignore', () => {
        actualFs.writeFileSync(
            join(tmpRoot, '.pzstudioignore'),
            'ignored-file.txt\n',
        );
        actualFs.writeFileSync(join(tmpRoot, 'ignored-file.txt'), 'test');
        actualFs.writeFileSync(join(tmpRoot, 'kept-file.txt'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'ignored-file.txt'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'kept-file.txt'), '')).toBe(true);
    });
    it('T006 - filters literal folders correctly based on .pzstudioignore', () => {
        actualFs.writeFileSync(
            join(tmpRoot, '.pzstudioignore'),
            'ignored-folder\n',
        );
        actualFs.mkdirSync(join(tmpRoot, 'ignored-folder'));
        actualFs.writeFileSync(
            join(tmpRoot, 'ignored-folder', 'file.txt'),
            'test',
        );

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'ignored-folder'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'ignored-folder', 'file.txt'), '')).toBe(
            false,
        );

        actualFs.mkdirSync(join(tmpRoot, 'kept-folder'));
        expect(filter(join(tmpRoot, 'kept-folder'), '')).toBe(true);
    });

    it('T008 - non-matching literals, whitespace handling', () => {
        actualFs.writeFileSync(
            join(tmpRoot, '.pzstudioignore'),
            '  spaced-file.txt  \n\n',
        );
        actualFs.writeFileSync(join(tmpRoot, 'spaced-file.txt'), 'test');
        actualFs.writeFileSync(join(tmpRoot, 'other-file.txt'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'spaced-file.txt'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'other-file.txt'), '')).toBe(true);
    });

    it('T008 - folder-prefix matching with explicit trailing slash', () => {
        actualFs.writeFileSync(
            join(tmpRoot, '.pzstudioignore'),
            'my-folder/\n',
        );
        actualFs.mkdirSync(join(tmpRoot, 'my-folder'));
        actualFs.writeFileSync(join(tmpRoot, 'my-folder', 'file.txt'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'my-folder'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'my-folder', 'file.txt'), '')).toBe(false);
    });

    it('T008 - long-path stability', () => {
        actualFs.writeFileSync(
            join(tmpRoot, '.pzstudioignore'),
            'deep/nested/folder\n',
        );
        actualFs.mkdirSync(join(tmpRoot, 'deep'));
        actualFs.mkdirSync(join(tmpRoot, 'deep', 'nested'));
        actualFs.mkdirSync(join(tmpRoot, 'deep', 'nested', 'folder'));
        actualFs.writeFileSync(
            join(tmpRoot, 'deep', 'nested', 'folder', 'file.txt'),
            'test',
        );

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'deep'), '')).toBe(true);
        expect(filter(join(tmpRoot, 'deep', 'nested'), '')).toBe(true);
        expect(filter(join(tmpRoot, 'deep', 'nested', 'folder'), '')).toBe(
            false,
        );
        expect(
            filter(join(tmpRoot, 'deep', 'nested', 'folder', 'file.txt'), ''),
        ).toBe(false);
    });

    it('T010 - built-in exclusions', () => {
        actualFs.mkdirSync(join(tmpRoot, '.git'));
        actualFs.writeFileSync(join(tmpRoot, '.git', 'config'), 'test');
        actualFs.writeFileSync(join(tmpRoot, '.gitmodules'), 'test');
        actualFs.writeFileSync(join(tmpRoot, '.gitkeep'), 'test');
        actualFs.mkdirSync(join(tmpRoot, '.github'));
        actualFs.writeFileSync(
            join(tmpRoot, '.github', 'workflows.yml'),
            'test',
        );

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, '.git'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.git', 'config'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.gitmodules'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.gitkeep'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.github'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.github', 'workflows.yml'), '')).toBe(
            false,
        );
    });

    it('T010 - nested .pzstudioignore resolves to closest', () => {
        actualFs.writeFileSync(
            join(tmpRoot, '.pzstudioignore'),
            'root-ignored\n',
        );
        actualFs.mkdirSync(join(tmpRoot, 'subfolder'));
        actualFs.writeFileSync(
            join(tmpRoot, 'subfolder', '.pzstudioignore'),
            'sub-ignored\n',
        );

        actualFs.writeFileSync(join(tmpRoot, 'root-ignored'), 'test');
        actualFs.writeFileSync(
            join(tmpRoot, 'subfolder', 'root-ignored'),
            'test',
        );
        actualFs.writeFileSync(
            join(tmpRoot, 'subfolder', 'sub-ignored'),
            'test',
        );

        const filter = createIgnoreFilter(tmpRoot);

        // At root
        expect(filter(join(tmpRoot, 'root-ignored'), '')).toBe(false);
        // At subfolder (since subfolder/.pzstudioignore doesn't ignore 'root-ignored')
        expect(filter(join(tmpRoot, 'subfolder', 'root-ignored'), '')).toBe(
            true,
        );
        // At subfolder, ignored by subfolder
        expect(filter(join(tmpRoot, 'subfolder', 'sub-ignored'), '')).toBe(
            false,
        );
    });
});

describe('templateManager - config and resolution', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('readGlobalConfig', () => {
        it('should return defaults if config does not exist', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(false);
            const config = readGlobalConfig();
            expect(config.templates).toBeDefined();
            expect(config.useSymlinks).toBe(true);
            expect(config.outdir).toBeDefined();
        });

        it('should normalize empty templates to defaults', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readFileSync').mockReturnValue(
                JSON.stringify({ templates: {} }),
            );
            const config = readGlobalConfig();
            expect(config.templates.project).toBeDefined();
            expect(config.templates.project?.url).toContain(
                'pzstudio-template-project',
            );
        });

        it('should normalize missing useSymlinks to true', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readFileSync').mockReturnValue(
                JSON.stringify({ templates: {} }),
            );
            const config = readGlobalConfig();
            expect(config.useSymlinks).toBe(true);
        });

        it('should treat an empty config file as missing keys', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readFileSync').mockReturnValue('');
            const config = readGlobalConfig();
            expect(config.templates).toBeDefined();
            expect(config.useSymlinks).toBe(true);
            expect(config.outdir).toBeDefined();
        });

        it('should preserve existing user values', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readFileSync').mockReturnValue(
                JSON.stringify({
                    templates: { project: { url: 'custom-url' } },
                    useSymlinks: false,
                    outdir: '/custom/out',
                }),
            );
            const config = readGlobalConfig();
            expect(config.templates.project?.url).toBe('custom-url');
            expect(config.templates.mod?.url).toContain(
                'pzstudio-template-mod',
            ); // Filled default
            expect(config.useSymlinks).toBe(false);
            expect(config.outdir).toBe('/custom/out');
        });
    });

    describe('resolveTemplateDir', () => {
        it('should resolve built-in workshop template', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            const path = resolveTemplateDir('workshop');
            expect(path).toContain('workshop');
        });

        it('should resolve built-in mod template', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            const path = resolveTemplateDir('mod');
            expect(path).toContain('mod');
        });

        it('should resolve from global config if available', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({
                    templates: { mod: { url: 'my-custom-url' } },
                }) as any,
            );
            vi.mocked(fs.lstatSync).mockReturnValue({
                isDirectory: () => true,
            } as any);
            vi.mocked(fs.readdirSync).mockReturnValue(['.git'] as any);

            const path = resolveTemplateDir('mod', true);
            expect(path).toContain('my-custom-url');
        });

        it('should throw if template cannot be resolved offline', () => {
            vi.spyOn(fs, 'existsSync').mockReturnValue(false);
            vi.spyOn(fs, 'readdirSync').mockReturnValue([] as any); // To make isDirNonEmpty return false for legacy
            expect(() => resolveTemplateDir('mod', true)).toThrow(
                'No valid cached or legacy template found',
            );
        });
        it('should ignore project-level template overrides and use global config', () => {
            const projectSpy = vi.spyOn(helper, 'resolveProjectConfig');

            // Mock global config to return a specific URL
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(
                JSON.stringify({
                    templates: { mod: { url: 'global-url' } },
                }) as any,
            );
            vi.mocked(fs.lstatSync).mockReturnValue({
                isDirectory: () => true,
            } as any);
            vi.mocked(fs.readdirSync).mockReturnValue(['.git'] as any);

            const path = resolveTemplateDir('mod', true);

            // Verify project config was never even consulted
            expect(projectSpy).not.toHaveBeenCalled();

            // Verify global config URL was used
            expect(path).toContain('global-url');
            expect(path).not.toContain('project-url');
        });
    });

    describe('migrateGlobalConfigIfNeeded', () => {
        it('should migrate legacy config.json and materialize defaults', () => {
            const configPath = getConfigPath();
            vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
                if (typeof p !== 'string') return false;
                return p.includes('config.json') || p.includes('.pzstudio');
            });
            // Use different values for different files to avoid collision
            vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
                if (String(p).includes('config.json'))
                    return JSON.stringify({ templates: {} });
                return 'backup-outdir';
            });
            const writeSpy = vi.spyOn(fs, 'writeFileSync');

            templateManager.migrateGlobalConfigIfNeeded();

            expect(writeSpy).toHaveBeenCalled();
            const lastCall =
                writeSpy.mock.calls[writeSpy.mock.calls.length - 1];
            const written = JSON.parse(lastCall[1] as string);
            expect(written.useSymlinks).toBe(true);
            expect(written.templates.project).toBeDefined();
            expect(written.outdir).toBe('backup-outdir');
        });

        it('should preserve existing values during migration', () => {
            const configPath = getConfigPath();
            vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
                if (typeof p !== 'string') return false;
                return p.includes('config.json') || p.includes('.pzstudio');
            });
            vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
                if (String(p).includes('config.json'))
                    return JSON.stringify({
                        templates: { project: { url: 'old' } },
                        useSymlinks: false,
                    });
                return 'backup-outdir';
            });
            const writeSpy = vi.spyOn(fs, 'writeFileSync');

            templateManager.migrateGlobalConfigIfNeeded();

            expect(writeSpy).toHaveBeenCalled();
            const lastCall =
                writeSpy.mock.calls[writeSpy.mock.calls.length - 1];
            const written = JSON.parse(lastCall[1] as string);
            expect(written.useSymlinks).toBe(false);
            expect(written.templates.project.url).toBe('old');
            expect(written.templates.mod).toBeDefined(); // Filled default
        });
    });
});
