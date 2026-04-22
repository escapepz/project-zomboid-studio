import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('delete command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should delete an existing mod', async () => {
        // 1. Setup existing project with a mod
        const modId = 'target_mod';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'P', visibility: 'public', tags: [] },
                mods: {
                    [modId]: {
                        name: 'Target Mod',
                        description: 'D',
                    },
                    other_mod: {
                        name: 'Other Mod',
                        description: 'O',
                    },
                },
                excludes: [modId],
            }),
        );
        workspace.write(`${modId}/mod.info`, `id=${modId}`);
        workspace.write(`other_mod/mod.info`, `id=other_mod`);

        // 2. Run delete command
        const result = await workspace.run('delete', [modId]);

        try {
            workspace.assertSuccess(result);
            workspace.assertStdout(result, `Deleting mod '${modId}' directory`);
            workspace.assertStdout(
                result,
                `Deleting mod '${modId}' from project.json`,
            );

            // 3. Verify filesystem
            expect(workspace.exists(modId)).toBe(false);
            expect(workspace.exists('other_mod')).toBe(true);

            // 4. Verify project.json update
            const config = workspace.readJson('project.json');
            expect(config.mods[modId]).toBeUndefined();
            expect(config.mods['other_mod']).toBeDefined();
            expect(config.excludes).not.toContain(modId);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });

    it('should fail if not in a project directory', async () => {
        const result = await workspace.run('delete', ['any']);
        workspace.assertFailure(result);
        workspace.assertStderr(
            result,
            'You must execute this command within a project directory',
        );
    });

    it('should log error if mod directory is missing but still try to delete from config', async () => {
        const modId = 'missing_dir';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'P', visibility: 'public', tags: [] },
                mods: {
                    [modId]: { name: 'M', description: 'D' },
                },
                excludes: [],
            }),
        );

        const result = await workspace.run('delete', [modId]);

        // As found in implementation, it logs error but doesn't exit(1) unless it throws
        workspace.assertSuccess(result);
        workspace.assertStderr(result, `Mod '${modId}' directory not found`);

        const config = workspace.readJson('project.json');
        expect(config.mods[modId]).toBeUndefined();
    });

    it('should log error if mod is missing from config but still try to delete directory', async () => {
        const modId = 'missing_config';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'P', visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
            }),
        );
        workspace.write(`${modId}/mod.info`, `id=${modId}`);

        const result = await workspace.run('delete', [modId]);

        workspace.assertSuccess(result);
        workspace.assertStderr(
            result,
            `Mod '${modId}' not found in project.json`,
        );

        expect(workspace.exists(modId)).toBe(false);
    });
});
