import { describe, it, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('Global CLI Error Handling (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should fail with exit code 1 for unknown command', async () => {
        const result = await workspace.run('not-a-command');
        workspace.assertFailure(result, 1);
        workspace.assertStderr(result, 'Unknown command [not-a-command]');
    });

    it('should fail when a required argument is missing', async () => {
        // Create a project so we get past the project directory check
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'T', visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
                outdir: 'out',
            }),
        );

        // 'add' requires at least one argument (modName)
        const result = await workspace.run('add');
        workspace.assertFailure(result, 1);
        workspace.assertStderr(
            result,
            "Expected param [modName] to be 'string'",
        );
    });

    it('should fail when an invalid argument type is provided', async () => {
        // 'outdir' requires 1 argument
        const result = await workspace.run('outdir');
        workspace.assertFailure(result, 1);
        workspace.assertStderr(
            result,
            "Expected param [newOutDir] to be 'string'",
        );
    });

    it('should show help for a command with --help flag', async () => {
        const result = await workspace.run('build', ['--help']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Usages:');
        workspace.assertStdout(result, 'pzstudio build');
    });
});
