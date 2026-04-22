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

    describe('Gap 4: extractFlag edge cases', () => {
        it('should return undefined if a flag is followed by another flag', async () => {
            // new <projectTitle> --template --offline
            const result = await workspace.run('new', [
                'MyProject',
                '--template',
                '--offline',
            ]);

            // If it treated '--offline' as the template URL, it would fail to clone it (if online)
            // or fail to find it in cache (if offline).
            // But since we fixed it, it should treat '--template' as missing value and use default.
            workspace.assertSuccess(result);
            workspace.assertStdout(
                result,
                "The project 'MyProject' has been created",
            );
        });
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

    describe('Gap 3: template parsing variants', () => {
        it('should pass correct ref to git clone for @tag variant', async () => {
            const spawnSpy = vi
                .mocked(child_process.spawnSync)
                .mockReturnValue({
                    status: 0,
                    stdout: Buffer.from(''),
                    stderr: Buffer.from(''),
                } as any);

            await workspace.run('new', [
                'TaggedProject',
                '--template',
                'user/repo@v1.0.0',
            ]);

            // Find the call to git clone
            const cloneCall = spawnSpy.mock.calls.find(
                (call) => call[0] === 'git' && call[1].includes('clone'),
            );

            expect(cloneCall).toBeDefined();
            const args = cloneCall![1] as string[];
            expect(args).toContain('-b');
            expect(args).toContain('v1.0.0');
            expect(args).toContain('https://github.com/user/repo.git');
        });

        it('should pass correct ref to git clone for #branch variant', async () => {
            const spawnSpy = vi
                .mocked(child_process.spawnSync)
                .mockReturnValue({
                    status: 0,
                    stdout: Buffer.from(''),
                    stderr: Buffer.from(''),
                } as any);

            await workspace.run('new', [
                'BranchedProject',
                '--template',
                'user/repo#develop',
            ]);

            const cloneCall = spawnSpy.mock.calls.find(
                (call) => call[0] === 'git' && call[1].includes('clone'),
            );

            expect(cloneCall).toBeDefined();
            const args = cloneCall![1] as string[];
            expect(args).toContain('-b');
            expect(args).toContain('develop');
            expect(args).toContain('https://github.com/user/repo.git');
        });

        it('should pass correct ref to git clone for full URL with @tag', async () => {
            const spawnSpy = vi
                .mocked(child_process.spawnSync)
                .mockReturnValue({
                    status: 0,
                    stdout: Buffer.from(''),
                    stderr: Buffer.from(''),
                } as any);

            await workspace.run('new', [
                'FullUrlProject',
                '--template',
                'https://github.com/user/repo.git@v2.0.0',
            ]);

            const cloneCall = spawnSpy.mock.calls.find(
                (call) => call[0] === 'git' && call[1].includes('clone'),
            );

            expect(cloneCall).toBeDefined();
            const args = cloneCall![1] as string[];
            expect(args).toContain('-b');
            expect(args).toContain('v2.0.0');
            expect(args).toContain('https://github.com/user/repo.git');
        });
    });
});
