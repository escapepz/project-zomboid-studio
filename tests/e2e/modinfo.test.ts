import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import * as cp from 'child_process';

vi.mock('child_process');

describe('modinfo command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        vi.spyOn(cp, 'spawnSync').mockReturnValue({
            status: 0,
            stdout: Buffer.from(''),
            stderr: Buffer.from(''),
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        workspace.cleanup();
    });

    it('should generate mod.info for all mods', async () => {
        const modId1 = 'mod1';
        const modId2 = 'mod2';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId1]: {
                        name: 'Mod 1',
                        description: 'Desc 1',
                        build: { modInfo: 'auto' },
                    },
                    [modId2]: {
                        name: 'Mod 2',
                        description: 'Desc 2',
                        build: { modInfo: 'auto' },
                    },
                },
                excludes: [],
            }),
        );

        fs.mkdirSync(path.join(workspace.dir, modId1, 'common', 'media'), {
            recursive: true,
        });
        fs.mkdirSync(path.join(workspace.dir, modId2, '42', 'media'), {
            recursive: true,
        });

        const result = await workspace.run('modinfo', ['generate']);
        workspace.assertSuccess(result);

        expect(
            fs.existsSync(
                path.join(workspace.dir, modId1, 'common', 'mod.info'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(path.join(workspace.dir, modId2, '42', 'mod.info')),
        ).toBe(true);

        // Root level should NOT have mod.info
        expect(
            fs.existsSync(path.join(workspace.dir, modId1, 'mod.info')),
        ).toBe(false);
    });

    it('should generate mod.info for a specific mod', async () => {
        const modId1 = 'mod1';
        const modId2 = 'mod2';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId1]: {
                        name: 'Mod 1',
                        description: 'Desc 1',
                        build: { modInfo: 'auto' },
                    },
                    [modId2]: {
                        name: 'Mod 2',
                        description: 'Desc 2',
                        build: { modInfo: 'auto' },
                    },
                },
                excludes: [],
            }),
        );

        fs.mkdirSync(path.join(workspace.dir, modId1, 'common', 'media'), {
            recursive: true,
        });
        fs.mkdirSync(path.join(workspace.dir, modId2, 'common', 'media'), {
            recursive: true,
        });

        const result = await workspace.run('modinfo', ['generate', modId1]);
        workspace.assertSuccess(result);

        expect(
            fs.existsSync(
                path.join(workspace.dir, modId1, 'common', 'mod.info'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(workspace.dir, modId2, 'common', 'mod.info'),
            ),
        ).toBe(false);
    });

    it('should skip excluded mods during all-mod generation', async () => {
        const modId1 = 'mod1';
        const modId2 = 'mod2';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId1]: {
                        name: 'Mod 1',
                        description: 'Desc 1',
                        build: { modInfo: 'auto' },
                    },
                    [modId2]: {
                        name: 'Mod 2',
                        description: 'Desc 2',
                        build: { modInfo: 'auto' },
                    },
                },
                excludes: [modId2],
            }),
        );

        fs.mkdirSync(path.join(workspace.dir, modId1, 'common', 'media'), {
            recursive: true,
        });
        fs.mkdirSync(path.join(workspace.dir, modId2, 'common', 'media'), {
            recursive: true,
        });

        const result = await workspace.run('modinfo', ['generate']);
        workspace.assertSuccess(result);

        expect(
            fs.existsSync(
                path.join(workspace.dir, modId1, 'common', 'mod.info'),
            ),
        ).toBe(true);
        expect(
            fs.existsSync(
                path.join(workspace.dir, modId2, 'common', 'mod.info'),
            ),
        ).toBe(false);
    });
    it('should skip mods with no valid branch folders', async () => {
        const modId = 'empty_mod';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId]: {
                        name: 'Empty Mod',
                        description: 'No folders',
                        build: { modInfo: 'auto' },
                    },
                },
                excludes: [],
            }),
        );

        // No folders created

        const result = await workspace.run('modinfo', ['generate']);
        workspace.assertSuccess(result);

        expect(fs.existsSync(path.join(workspace.dir, modId, 'mod.info'))).toBe(
            false,
        );
    });

    it('should fail on unknown modinfo action', async () => {
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    mod1: { name: 'M1', description: 'D1' },
                },
            }),
        );

        const result = await workspace.run('modinfo', ['invalid']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'Unknown modinfo action [invalid]');
    });

    it('should honor build.modInfo: "skip"', async () => {
        const modId = 'skip_mod';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId]: {
                        name: 'Skip Mod',
                        description: 'Desc',
                        build: { modInfo: 'skip' },
                    },
                },
            }),
        );

        fs.mkdirSync(path.join(workspace.dir, modId, 'common', 'media'), {
            recursive: true,
        });

        const result = await workspace.run('modinfo', ['generate']);
        workspace.assertSuccess(result);

        expect(
            fs.existsSync(
                path.join(workspace.dir, modId, 'common', 'mod.info'),
            ),
        ).toBe(false);
    });

    it('should honor build.modInfo: "auto-if-missing" (skip if exists)', async () => {
        const modId = 'missing_mod';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId]: {
                        name: 'Missing Mod',
                        description: 'Desc',
                        build: { modInfo: 'auto-if-missing' },
                    },
                },
            }),
        );

        const modInfoDir = path.join(workspace.dir, modId, 'common');
        fs.mkdirSync(path.join(modInfoDir, 'media'), { recursive: true });

        const existingContent = 'VERSION=EXISTING';
        fs.writeFileSync(path.join(modInfoDir, 'mod.info'), existingContent);

        const result = await workspace.run('modinfo', ['generate']);
        workspace.assertSuccess(result);

        const currentContent = fs.readFileSync(
            path.join(modInfoDir, 'mod.info'),
            'utf8',
        );
        expect(currentContent).toBe(existingContent);
    });

    it('should honor build.modInfo: "auto" (overwrite if exists)', async () => {
        const modId = 'auto_mod';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId]: {
                        name: 'Auto Mod',
                        description: 'Desc',
                        build: { modInfo: 'auto' },
                    },
                },
            }),
        );

        const modInfoDir = path.join(workspace.dir, modId, 'common');
        fs.mkdirSync(path.join(modInfoDir, 'media'), { recursive: true });

        const existingContent = 'VERSION=EXISTING';
        fs.writeFileSync(path.join(modInfoDir, 'mod.info'), existingContent);

        const result = await workspace.run('modinfo', ['generate']);
        workspace.assertSuccess(result);

        const currentContent = fs.readFileSync(
            path.join(modInfoDir, 'mod.info'),
            'utf8',
        );
        expect(currentContent).not.toBe(existingContent);
        expect(currentContent).toContain('name=Auto Mod');
    });

    it('should default to "auto-if-missing" if omitted', async () => {
        const modId = 'default_mod';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Test Project',
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId]: {
                        name: 'Default Mod',
                        description: 'Desc',
                        // build.modInfo omitted
                    },
                },
            }),
        );

        const modInfoDir = path.join(workspace.dir, modId, 'common');
        fs.mkdirSync(path.join(modInfoDir, 'media'), { recursive: true });

        const existingContent = 'VERSION=EXISTING';
        fs.writeFileSync(path.join(modInfoDir, 'mod.info'), existingContent);

        const result = await workspace.run('modinfo', ['generate']);
        workspace.assertSuccess(result);

        const currentContent = fs.readFileSync(
            path.join(modInfoDir, 'mod.info'),
            'utf8',
        );
        expect(currentContent).toBe(existingContent);
    });
});
