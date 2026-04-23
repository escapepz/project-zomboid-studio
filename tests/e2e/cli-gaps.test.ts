import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import * as child_process from 'child_process';

vi.mock('child_process', async (importOriginal) => {
    const original = await importOriginal<typeof import('child_process')>();
    return {
        ...original,
        spawnSync: vi.fn(),
    };
});

describe('CLI Gaps e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        vi.clearAllMocks();
    });

    afterEach(() => {
        workspace.cleanup();
        vi.restoreAllMocks();
    });

    describe('Gap 5: help for unknown commands', () => {
        it('should throw an error for an unknown command in help', async () => {
            const result = await workspace.run('help', ['nonexistent']);
            workspace.assertFailure(result);
            workspace.assertStderr(result, 'Unknown command [nonexistent]');
        });

        it('should throw an error for an unknown command with --help', async () => {
            const result = await workspace.run('nonexistent', ['--help']);
            workspace.assertFailure(result);
            workspace.assertStderr(result, 'Unknown command [nonexistent]');
        });
    });
});
