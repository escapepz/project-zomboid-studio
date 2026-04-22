import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import * as cp from 'child_process';

vi.mock('child_process');

describe('add command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        vi.spyOn(cp, 'spawnSync').mockImplementation((command, args) => {
            if (command === 'git') {
                const argsList = args as string[];
                if (argsList[0] === 'clone') {
                    const dest = argsList[argsList.length - 1];
                    fs.mkdirSync(dest, { recursive: true });
                    fs.mkdirSync(path.join(dest, '.git'), { recursive: true });
                    // Create a dummy template structure if needed, or just leave it empty
                    // so it falls back to legacy if it wants to find something specific.
                    return {
                        status: 0,
                        stdout: Buffer.from(''),
                        stderr: Buffer.from(''),
                    } as any;
                }
            }
            return {
                status: 0,
                stdout: Buffer.from(''),
                stderr: Buffer.from(''),
            } as any;
        });
    });

    afterEach(() => {
        workspace.cleanup();
        vi.clearAllMocks();
    });

    it('should add a new mod to an existing project', async () => {
        // 1. Setup existing project
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Main Project',
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    main_mod: {
                        name: 'Main Mod',
                        description: 'Main Desc',
                    },
                },
                excludes: [],
            }),
        );

        // 2. Run add command
        const newModTitle = 'Second Mod';
        const newModId = 'second_mod';
        const result = await workspace.run('add', [newModTitle, newModId]);

        try {
            workspace.assertSuccess(result);
            workspace.assertStdout(result, 'Command [add] completed');

            // 3. Verify filesystem
            expect(workspace.exists(newModId)).toBe(true);
            // The template might have media/lua or other structure, let's just check if it's a directory

            // 4. Verify project.json update
            const config = workspace.readJson('project.json');
            expect(config.mods[newModId]).toBeDefined();
            expect(config.mods[newModId].name).toBe(newModTitle);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });

    it('should fail if not in a project directory', async () => {
        const result = await workspace.run('add', ['New Mod', 'new_mod']);
        workspace.assertFailure(result);
        workspace.assertStderr(
            result,
            'You must execute this command within a project directory',
        );
    });

    it('should fail if mod already exists', async () => {
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'P', visibility: 'public', tags: [] },
                mods: {
                    existing: {
                        name: 'E',
                        description: 'D',
                        build: { modInfo: 'skip' },
                    },
                },
                excludes: [],
            }),
        );
        workspace.write('existing/poster.png', 'fake');

        const result = await workspace.run('add', ['Existing', 'existing']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'already exists');
    });
});
