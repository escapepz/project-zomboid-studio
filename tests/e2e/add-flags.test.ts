import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

/**
 * Helper: write a minimal project.json and mod source directory.
 */
function writeMinimalProject(workspace: E2ETestWorkspace, modId = 'test_mod') {
    workspace.write(
        'project.json',
        JSON.stringify({
            workshop: { title: 'Test Project', visibility: 'public', tags: [] },
            mods: {
                [modId]: { name: 'Test Mod', description: 'D' },
            },
            excludes: [],
        }),
    );
    workspace.write(`${modId}/poster.png`, 'fake');
}

describe('add — 1-arg auto-format modId (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should auto-format the modId from modName when only 1 argument is given', async () => {
        writeMinimalProject(workspace);

        // Only pass modName, no explicit modId
        const result = await workspace.run('add', ['My New Mod']);

        try {
            workspace.assertSuccess(result);

            // formatTitleToId('My New Mod') → 'my_new_mod'
            const expectedModId = 'my_new_mod';
            expect(workspace.exists(expectedModId)).toBe(true);

            const config = workspace.readJson('project.json');
            expect(config.mods[expectedModId]).toBeDefined();
            expect(config.mods[expectedModId].name).toBe('My New Mod');
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });

    it('should fail when an auto-derived modId already exists in the project', async () => {
        writeMinimalProject(workspace, 'my_duplicate_mod');

        // This will auto-derive to 'my_duplicate_mod' which already exists
        const result = await workspace.run('add', ['My Duplicate Mod']);

        workspace.assertFailure(result, 1);
        workspace.assertStderr(result, 'already exists');
    });
});

describe('add — local .template-mod tier-0 override (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should use local .template-mod directory when it exists and is non-empty', async () => {
        writeMinimalProject(workspace);

        // Seed a non-empty local .template-mod in the project dir
        const markerFile = 'local_template_marker.txt';
        workspace.write(
            `.template-mod/${markerFile}`,
            'local template content',
        );

        const newModId = 'local_mod';
        const result = await workspace.run('add', ['Local Mod', newModId]);

        try {
            workspace.assertSuccess(result);

            // The local template should have been used — the marker file should appear
            // in the newly scaffolded mod directory
            expect(workspace.exists(path.join(newModId, markerFile))).toBe(
                true,
            );

            const config = workspace.readJson('project.json');
            expect(config.mods[newModId]).toBeDefined();
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });
});

describe('add — offline flag (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should succeed with --offline using legacy templates when no cache exists', async () => {
        writeMinimalProject(workspace);

        const result = await workspace.run('add', [
            'Offline Mod',
            'offline_mod',
            '--offline',
        ]);

        try {
            workspace.assertSuccess(result);
            expect(workspace.exists('offline_mod')).toBe(true);

            const config = workspace.readJson('project.json');
            expect(config.mods['offline_mod']).toBeDefined();
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });
});

describe('add — --symlinks flag (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should accept the --symlinks flag without failing', async () => {
        writeMinimalProject(workspace);

        const result = await workspace.run('add', [
            'Symlink Mod',
            'symlink_mod',
            '--symlinks',
        ]);

        // The flag is accepted; directory creation still succeeds regardless of
        // whether the OS supports junctions or falls back to a copy.
        try {
            workspace.assertSuccess(result);
            expect(workspace.exists('symlink_mod')).toBe(true);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });
});

import cp from 'child_process';
import { vi, MockInstance } from 'vitest';

describe('add — --template and --force-update (E2E Mocked)', () => {
    let workspace: E2ETestWorkspace;
    let gitMock: MockInstance;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        // Mock git so we don't actually hit network
        gitMock = vi
            .spyOn(cp, 'spawnSync')
            .mockImplementation((command, args, opts) => {
                if (command === 'git') {
                    const argsList = args as string[];
                    if (argsList[0] === 'clone') {
                        const dest = argsList[argsList.length - 1];
                        fs.mkdirSync(dest, { recursive: true });
                        fs.mkdirSync(path.join(dest, '.git'), {
                            recursive: true,
                        });
                        fs.writeFileSync(
                            path.join(dest, 'dummy-template-file.txt'),
                            'mocked',
                        );
                        return { status: 0 } as any;
                    } else {
                        return { status: 0 } as any; // Mock refresh success
                    }
                }
                return { status: 0 } as any;
            });
    });

    afterEach(() => {
        if (gitMock) gitMock.mockRestore();
        workspace.cleanup();
    });

    it('should clone and use a custom template when --template <url> is provided', async () => {
        writeMinimalProject(workspace);

        const customUrl = 'https://github.com/escapepz/custom-mod-template.git';
        const result = await workspace.run('add', [
            'Custom Template Mod',
            'custom_mod',
            '--template',
            customUrl,
        ]);

        workspace.assertSuccess(result);

        // Assert the custom template was cloned
        const cloneCalls = gitMock.mock.calls.filter(
            (c) => c[0] === 'git' && c[1][0] === 'clone',
        );
        expect(cloneCalls.length).toBeGreaterThan(0);
        expect(cloneCalls[0][1]).toContain(customUrl);

        // Assert the file from the mock template was scaffolded into the new mod
        expect(workspace.exists('custom_mod/dummy-template-file.txt')).toBe(
            true,
        );
    });

    it('should refresh the template cache when --force-update is provided', async () => {
        writeMinimalProject(workspace);

        // First add creates the cache (we don't pass --force-update here, but it triggers initial clone)
        // Wait, to test force-update, we can just pass it directly. If cache doesn't exist,
        // it clones anyway, but if we create a mock cache first...

        // We'll just pass --force-update. The templateManager handles initial clone if missing,
        // or refresh if present. To ensure refresh is called, we can pre-create a valid cache.
        const defaultModUrl =
            'https://github.com/escapepz/pzstudio-template-mod.git';

        // Using CLI to resolveTemplateDir directly is hard from here, let's just make the CLI run
        // and check if the refresh commands were spawned.
        const result = await workspace.run('add', [
            'Force Mod',
            'force_mod',
            '--force-update',
        ]);

        workspace.assertSuccess(result);

        // Either clone (if cache was empty) or refresh (fetch/reset) was called.
        // Because the workspace points ~/.pzstudio to a temp dir, it will be empty initially -> clone
        // Let's run it a SECOND time with a different mod id to ensure refresh is triggered
        const result2 = await workspace.run('add', [
            'Force Mod 2',
            'force_mod_2',
            '--force-update',
        ]);
        workspace.assertSuccess(result2);

        // Assert git fetch/reset were called during the second run
        const fetchCalls = gitMock.mock.calls.filter(
            (c) => c[0] === 'git' && c[1][0] === 'fetch',
        );
        expect(fetchCalls.length).toBeGreaterThan(0);
    });

    it('should fail when a custom template URL is invalid or clone fails', async () => {
        writeMinimalProject(workspace);
        gitMock.mockImplementation((command, args) => {
            if (command === 'git' && args[0] === 'clone') {
                return {
                    status: 1,
                    stderr: Buffer.from('fatal: repository not found'),
                } as any;
            }
            return { status: 0 } as any;
        });

        const result = await workspace.run('add', [
            'Bad Mod',
            'bad_mod',
            '--template',
            'https://invalid.url',
        ]);
        workspace.assertFailure(result);
        // The cli or template manager will throw an error including git output
        expect(result.stderr.join('\n')).toMatch(/error|fatal|fail/i);
    });

    it('should fail when force-update refresh fails', async () => {
        writeMinimalProject(workspace);

        gitMock.mockImplementation((command, args) => {
            if (command === 'git' && args[0] === 'fetch') {
                return {
                    status: 1,
                    stderr: Buffer.from('fatal: could not read from remote'),
                } as any;
            }
            if (command === 'git' && args[0] === 'clone') {
                const dest = args[args.length - 1];
                fs.mkdirSync(dest, { recursive: true });
                fs.mkdirSync(path.join(dest, '.git'), { recursive: true });
                return { status: 0 } as any;
            }
            return { status: 0 } as any;
        });

        // Run once to simulate existing cache (since we mocked clone to succeed)
        await workspace.run('add', ['First Mod', 'first_mod']);

        const result = await workspace.run('add', [
            'Second Mod',
            'second_mod',
            '--force-update',
        ]);
        workspace.assertFailure(result);
        expect(result.stderr.join('\n')).toMatch(/error|fatal|fail/i);
    });
});
