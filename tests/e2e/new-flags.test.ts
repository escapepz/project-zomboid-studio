import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import * as cp from 'child_process';

vi.mock('child_process');

beforeEach(() => {
    vi.spyOn(cp, 'spawnSync').mockImplementation((command, args) => {
        if (command === 'git') {
            const argsList = args as string[];
            if (argsList[0] === 'clone') {
                const dest = argsList[argsList.length - 1];
                fs.mkdirSync(dest, { recursive: true });
                fs.mkdirSync(path.join(dest, '.git'), { recursive: true });
                fs.writeFileSync(
                    path.join(dest, 'project.json'),
                    JSON.stringify({
                        workshop: {
                            title: 'M',
                            visibility: 'public',
                            tags: [],
                        },
                        mods: { mod: { name: 'M', description: 'D' } },
                    }),
                );
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
    vi.clearAllMocks();
});

describe('new — templates (E2E Mocked)', () => {
    let workspace: E2ETestWorkspace;
    beforeEach(() => {
        workspace = createE2EWorkspace();
    });
    afterEach(() => {
        workspace.cleanup();
    });

    it('should refresh the template cache when --force-update is provided', async () => {
        // Run once to populate cache (mocked clone)
        await workspace.run('new', ['P1', 'p1', '--force-update']);
        // Run again with force-update to trigger fetch (mocked fetch)
        const result2 = await workspace.run('new', [
            'P2',
            'p2',
            '--force-update',
        ]);
        workspace.assertSuccess(result2);
        const calls = vi.mocked(cp.spawnSync).mock.calls;
        expect(
            calls.some(
                (c) =>
                    c[0] === 'git' &&
                    (c[1][0] === 'fetch' || c[1][0] === 'reset'),
            ),
        ).toBe(true);
    });

    it('should fail when force-update refresh fails and re-clone fails', async () => {
        // Set a custom template in global config to avoid legacy fallback
        const customUrl = 'https://github.com/custom/project.git';
        workspace.writeGlobalConfig({
            templates: { project: { url: customUrl } },
        });

        vi.mocked(cp.spawnSync).mockImplementation((command, args) => {
            if (
                command === 'git' &&
                (args[0] === 'fetch' || args[0] === 'clone')
            ) {
                return { status: 1, stderr: Buffer.from('fatal') } as any;
            }
            return { status: 0 } as any;
        });

        // Populate an "invalid" cache to force refresh/re-clone
        const cacheDir = path.join(
            workspace.fakeHome,
            '.pzstudio',
            'templates',
            'custom',
            'project',
        );
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.mkdirSync(path.join(cacheDir, '.git'), { recursive: true });

        const result = await workspace.run('new', ['P', 'p', '--force-update']);
        workspace.assertFailure(result);
    });
});

describe('new — basic (E2E)', () => {
    let workspace: E2ETestWorkspace;
    beforeEach(() => {
        workspace = createE2EWorkspace();
    });
    afterEach(() => {
        workspace.cleanup();
    });

    it('should create a project using legacy templates when --offline is passed', async () => {
        const result = await workspace.run('new', [
            'Offline Project',
            'offline_proj',
            '--offline',
        ]);
        workspace.assertSuccess(result);
        expect(workspace.exists('offline_proj/project.json')).toBe(true);
    }, 60000);

    it('should fail when the project directory already exists on disk', async () => {
        fs.mkdirSync(path.join(workspace.dir, 'my_project'), {
            recursive: true,
        });
        const result = await workspace.run('new', [
            'My Project',
            'my_project',
            '--offline',
        ]);
        workspace.assertFailure(result, 1);
        workspace.assertStderr(result, 'already exists');
    }, 60000);

    it('should not list --template in help output', async () => {
        const result = await workspace.run('new', ['--help']);
        workspace.assertSuccess(result);
        workspace.assertStdoutNotMatch(result, /--template/);
    });
});
