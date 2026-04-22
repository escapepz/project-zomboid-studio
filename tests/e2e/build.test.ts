import path from 'path';
import fs from 'fs';
import os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('build command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should build a project created with new', async () => {
        // 1. Create a new project
        const projectTitle = 'Build Project';
        const modId = 'build_mod';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: projectTitle,
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    [modId]: {
                        name: 'Build Mod',
                        description: 'Description',
                        build: {
                            modInfo: 'auto',
                        },
                    },
                },
                excludes: [],
            }),
        );
        workspace.write(path.join(modId, 'poster.png'), 'fake image');
        workspace.write(path.join('workshop', 'preview.png'), 'fake preview');

        const buildResult = await workspace.run('build');
        workspace.assertSuccess(buildResult);

        try {
            const expectedOutDir = path.join(
                workspace.fakeHome,
                'Zomboid',
                'Workshop',
                projectTitle,
            );
            expect(fs.existsSync(expectedOutDir)).toBe(true);
            expect(
                fs.existsSync(path.join(expectedOutDir, 'workshop.txt')),
            ).toBe(true);
            expect(
                fs.existsSync(path.join(expectedOutDir, 'preview.png')),
            ).toBe(true);
            expect(
                fs.existsSync(
                    path.join(
                        expectedOutDir,
                        'Contents',
                        'mods',
                        modId,
                        'mod.info',
                    ),
                ),
            ).toBe(true);
        } catch (e) {
            console.log('STDOUT:', buildResult.stdout.join('\n'));
            console.log('STDERR:', buildResult.stderr.join('\n'));
            throw e;
        }
    });

    it('should build with custom outdir', async () => {
        const projectTitle = 'Custom OutDir';
        const modId = 'custom_mod';
        const customOutDirName = 'custom_output';
        const customOutDirPath = path.join(workspace.dir, customOutDirName);

        workspace.write(
            'project.json',
            JSON.stringify({
                outdir: './' + customOutDirName,
                workshop: {
                    title: projectTitle,
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    [modId]: {
                        name: 'Custom Mod',
                        description: 'Description',
                        build: {
                            modInfo: 'auto',
                        },
                    },
                },
                excludes: [],
            }),
        );
        workspace.write(path.join(modId, 'poster.png'), 'fake image');

        const buildResult = await workspace.run('build');
        workspace.assertSuccess(buildResult);

        const expectedOutDir = path.join(customOutDirPath, projectTitle);
        expect(fs.existsSync(expectedOutDir)).toBe(true);
        expect(fs.existsSync(path.join(expectedOutDir, 'workshop.txt'))).toBe(
            true,
        );
    });

    it('should fail cleanly when outdir is invalid or missing', async () => {
        workspace.write(
            'project.json',
            JSON.stringify({
                outdir: '/root/some/invalid/path/that/does/not/exist/999',
                workshop: {
                    title: 'Invalid OutDir',
                    visibility: 'public',
                    tags: [],
                },
                mods: { mod: { name: 'M', description: 'D' } },
            }),
        );
        workspace.write(path.join('mod', 'poster.png'), 'fake image');

        const buildResult = await workspace.run('build');
        workspace.assertFailure(buildResult);
        expect(buildResult.stderr.join('\n')).toMatch(/does not exist|error/i);
    });

    it('should clean up stale output files before building', async () => {
        const projectTitle = 'Stale Output';
        const modId = 'stale_mod';
        const customOutDirName = 'stale_output';
        const customOutDirPath = path.join(workspace.dir, customOutDirName);

        workspace.write(
            'project.json',
            JSON.stringify({
                outdir: './' + customOutDirName,
                workshop: {
                    title: projectTitle,
                    visibility: 'public',
                    tags: [],
                },
                mods: { [modId]: { name: 'M', description: 'D' } },
            }),
        );
        workspace.write(path.join(modId, 'poster.png'), 'fake image');

        // Create a stale file in the expected output directory
        const outModPath = path.join(
            customOutDirPath,
            projectTitle,
            'Contents',
            'mods',
            modId,
        );
        fs.mkdirSync(outModPath, { recursive: true });
        fs.writeFileSync(
            path.join(outModPath, 'stale_file.txt'),
            'this should be removed',
        );

        const buildResult = await workspace.run('build');
        workspace.assertSuccess(buildResult);

        expect(fs.existsSync(path.join(outModPath, 'stale_file.txt'))).toBe(
            false,
        );
        expect(fs.existsSync(path.join(outModPath, 'poster.png'))).toBe(true);
    });

    it('should not generate mod.info when build.modInfo is skip', async () => {
        const projectTitle = 'Skip ModInfo';
        const modId = 'skip_mod';

        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: projectTitle,
                    visibility: 'public',
                    tags: [],
                },
                mods: {
                    [modId]: {
                        name: 'Skip',
                        description: 'Skip',
                        build: { modInfo: 'skip' },
                    },
                },
            }),
        );
        workspace.write(path.join(modId, 'poster.png'), 'fake');

        const buildResult = await workspace.run('build');
        workspace.assertSuccess(buildResult);

        const outModPath = path.join(
            workspace.fakeHome,
            'Zomboid',
            'Workshop',
            projectTitle,
            'Contents',
            'mods',
            modId,
        );
        expect(fs.existsSync(path.join(outModPath, 'mod.info'))).toBe(false);
    });
});
