import { describe, it, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('Not Implemented Commands (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should report not implemented for watch command', async () => {
        // Need a project.json for watch to reach its implementation
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'T', visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
            }),
        );

        const result = await workspace.run('watch');
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'Not implemented yet');
    });

    it('should report not implemented for lang command', async () => {
        const result = await workspace.run('lang', ['en']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'Not implemented yet');
    });
});
