import { describe, it, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('help command (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should show general help when called without arguments', async () => {
        const result = await workspace.run('help');
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Available commands:');
        workspace.assertStdout(result, 'add');
    });

    it('should show specific help for a command', async () => {
        const result = await workspace.run('help', ['build']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Usages:');
        workspace.assertStdout(result, 'pzstudio build');
    });

    it('should show help for help command itself', async () => {
        const result = await workspace.run('help', ['help']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'pzstudio help <command>');
    });
});
