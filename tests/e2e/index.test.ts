import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { version } from '../../package.json';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import { setVerbose } from '../../src/lib/logger';

describe('CLI Global Behavior (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should show version with --version flag', async () => {
        const result = await workspace.run(undefined, ['--version']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, `v${version}`);
    });

    it('should show help by default when no command is provided', async () => {
        const result = await workspace.run();
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'add');
    });

    it('should show help with --help flag', async () => {
        const result = await workspace.run(undefined, ['--help']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'add');
    });

    it('should handle unknown commands with exit code 1', async () => {
        const result = await workspace.run('unknown-command');
        workspace.assertFailure(result, 1);
        workspace.assertStderr(result, 'Unknown command [unknown-command]');
    });

    it('should emit verbose/diagnostic output when --verbose flag is given', async () => {
        // Use build in an empty directory — it will fail, but verbose messages
        // are emitted before the project-check throws, so we can still assert them.
        const result = await workspace.run('build', ['--verbose']);

        // Regardless of exit code the verbose messages go to stdout via the mock logger
        const hasVerbose = result.stdout.some(
            (line) =>
                line.includes('Project Dir:') ||
                line.includes('Executing command') ||
                line.includes('production=') ||
                line.includes('Targets:'),
        );
        expect(hasVerbose).toBe(true);

        // Cleanup verbose state so it does not bleed into subsequent tests
        setVerbose(false);
    });
});
