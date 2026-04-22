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
});
