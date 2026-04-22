import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('add command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
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
