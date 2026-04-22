import { describe, it, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('update command (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should refresh template caches', async () => {
        // We run it with a long timeout because it performs network operations
        const result = await workspace.run('update');

        // Even if some fail due to network/github rate limits,
        // the command itself should report what happened.
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Refreshing global template caches');
        workspace.assertStdout(result, "Updating 'project' templates");
    }, 60000);
});
