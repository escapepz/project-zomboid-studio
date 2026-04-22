import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('new — project dir already exists (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should fail when the project directory already exists on disk', async () => {
        // formatTitleToId('My Project') → 'my_project'
        const modId = 'my_project';
        // Pre-create the directory so it already exists
        fs.mkdirSync(path.join(workspace.dir, modId), { recursive: true });

        // Pass --offline so template resolution uses the bootstrapped legacy templates
        // instead of attempting a network clone (which would time out).
        const result = await workspace.run('new', [
            'My Project',
            modId,
            '--offline',
        ]);
        workspace.assertFailure(result, 1);
        workspace.assertStderr(result, 'already exists');
    }, 60000);
});

describe('new — --offline flag (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should create a project using legacy templates when --offline is passed', async () => {
        const result = await workspace.run('new', [
            'Offline Project',
            'offline_proj',
            '--offline',
        ]);

        try {
            workspace.assertSuccess(result);
            expect(
                workspace.exists(path.join('offline_proj', 'project.json')),
            ).toBe(true);
            const config = workspace.readJson(
                path.join('offline_proj', 'project.json'),
            );
            expect(config.workshop.title).toBe('Offline Project');
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    }, 60000);
});

describe('new — --symlinks flag (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should accept --symlinks flag and create the project', async () => {
        const result = await workspace.run('new', [
            'Symlinks Project',
            'symlinks_proj',
            '--symlinks',
        ]);

        try {
            workspace.assertSuccess(result);
            expect(
                workspace.exists(path.join('symlinks_proj', 'project.json')),
            ).toBe(true);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    }, 60000);
});

describe('new — local .template-mod / .template-workshop CWD override (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should use local .template-mod from CWD when non-empty and no --template flag', async () => {
        // Seed local templates in the workspace root (which is CWD for the CLI run)
        const modMarker = 'local_mod_marker.txt';
        workspace.write(`.template-mod/${modMarker}`, 'local mod template');

        // Also seed .template-workshop so resolveTemplateDir does not fail
        workspace.write(
            '.template-workshop/placeholder.txt',
            'local workshop template',
        );

        const result = await workspace.run('new', [
            'Local Template Project',
            'local_tpl_proj',
            '--offline',
        ]);

        try {
            workspace.assertSuccess(result);

            // The marker file should appear inside the newly created mod directory
            expect(
                workspace.exists(
                    path.join('local_tpl_proj', 'local_tpl_proj', modMarker),
                ),
            ).toBe(true);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    }, 60000);
});

import cp from 'child_process';
import { vi, MockInstance } from 'vitest';

describe('new — --template and --force-update (E2E Mocked)', () => {
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
                        // Provide a valid project template structure
                        fs.writeFileSync(
                            path.join(dest, 'project.json'),
                            JSON.stringify({ workshop: {} }),
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
        const customUrl = 'https://github.com/escapepz/custom-project.git';
        const result = await workspace.run('new', [
            'Custom Proj',
            'custom_proj',
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

        // Assert the project was created using the mocked template
        expect(workspace.exists('custom_proj/project.json')).toBe(true);
    });

    it('should refresh the template cache when --force-update is provided', async () => {
        const result = await workspace.run('new', [
            'Force Proj 1',
            'force_proj_1',
            '--force-update',
        ]);

        workspace.assertSuccess(result);

        // Second run to ensure cache exists and refresh is triggered
        const result2 = await workspace.run('new', [
            'Force Proj 2',
            'force_proj_2',
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
        gitMock.mockImplementation((command, args) => {
            if (command === 'git' && args[0] === 'clone') {
                return {
                    status: 1,
                    stderr: Buffer.from('fatal: repository not found'),
                } as any;
            }
            return { status: 0 } as any;
        });

        const result = await workspace.run('new', [
            'Bad Project',
            'bad_project',
            '--template',
            'https://invalid.url',
        ]);
        workspace.assertFailure(result);
        expect(result.stderr.join('\n')).toMatch(/error|fatal|fail/i);
    });

    it('should fail when force-update refresh fails', async () => {
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
                fs.writeFileSync(
                    path.join(dest, 'project.json'),
                    JSON.stringify({ workshop: {} }),
                );
                return { status: 0 } as any;
            }
            return { status: 0 } as any;
        });

        // Run once to simulate existing cache (since we mocked clone to succeed)
        await workspace.run('new', ['First Project', 'first_project']);

        const result = await workspace.run('new', [
            'Second Project',
            'second_project',
            '--force-update',
        ]);
        workspace.assertFailure(result);
        expect(result.stderr.join('\n')).toMatch(/error|fatal|fail/i);
    });

    it('should fallback to default .template-language even when a custom template is used', async () => {
        const customUrl = 'https://github.com/escapepz/custom-project.git';
        const result = await workspace.run('new', [
            'Lang Proj',
            'lang_proj',
            '--template',
            customUrl,
        ]);

        workspace.assertSuccess(result);
        expect(workspace.exists('lang_proj/.template-language')).toBe(true);
    });
});

describe('new — auto-derived modId edge cases (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should fail when the project directory already exists using an auto-derived modId from title', async () => {
        // Auto derived from "My Auto Title" -> "my_auto_title"
        const title = 'My Auto Title';
        const expectedModId = 'my_auto_title';
        fs.mkdirSync(path.join(workspace.dir, expectedModId), {
            recursive: true,
        });

        const result = await workspace.run('new', [title]);
        workspace.assertFailure(result, 1);
        workspace.assertStderr(result, 'already exists');
    });
});
