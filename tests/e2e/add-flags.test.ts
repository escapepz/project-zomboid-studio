import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import * as cp from 'child_process';

vi.mock('child_process');

function writeMinimalProject(workspace: E2ETestWorkspace, modId = 'test_mod') {
    workspace.write(
        'project.json',
        JSON.stringify({
            workshop: { title: 'T', visibility: 'public', tags: [] },
            mods: { [modId]: { name: 'M', description: 'D' } },
            excludes: [],
        }),
    );
    workspace.write(`${modId}/poster.png`, 'fake');
}

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

describe('add — templates (E2E Mocked)', () => {
    let workspace: E2ETestWorkspace;
    beforeEach(() => {
        workspace = createE2EWorkspace();
    });
    afterEach(() => {
        workspace.cleanup();
    });

    it('should refresh the template cache when --force-update is provided', async () => {
        writeMinimalProject(workspace);
        // Run once to populate cache (mocked clone)
        await workspace.run('add', ['M1', 'm1', '--force-update']);

        // Remove the seeded local template to force using the global cache again for the next add
        fs.rmSync(path.join(workspace.dir, '.template-mod'), {
            recursive: true,
            force: true,
        });

        // Run again with force-update to trigger fetch (mocked fetch)
        const result2 = await workspace.run('add', [
            'M2',
            'm2',
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

    it('should fail when force-update refresh fails and re-clone also fails', async () => {
        writeMinimalProject(workspace);
        // Set a custom template in global config to avoid legacy fallback
        const customUrl = 'https://github.com/custom/template.git';
        workspace.writeGlobalConfig({
            templates: { mod: { url: customUrl } },
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
            'template',
        );
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.mkdirSync(path.join(cacheDir, '.git'), { recursive: true });

        const result = await workspace.run('add', ['M', 'm', '--force-update']);
        workspace.assertFailure(result);
    });
});

describe('add — basic (E2E)', () => {
    let workspace: E2ETestWorkspace;
    beforeEach(() => {
        workspace = createE2EWorkspace();
    });
    afterEach(() => {
        workspace.cleanup();
    });

    it('should auto-format the modId from modName when only 1 argument is given', async () => {
        writeMinimalProject(workspace);
        const result = await workspace.run('add', ['My New Mod']);
        workspace.assertSuccess(result);
        expect(workspace.exists('my_new_mod')).toBe(true);
    });

    it('should use local .template-mod directory when it exists and is non-empty', async () => {
        writeMinimalProject(workspace);
        workspace.write('.template-mod/marker.txt', 'local');
        const result = await workspace.run('add', ['Local Mod', 'local_mod']);
        workspace.assertSuccess(result);
        expect(workspace.exists('local_mod/marker.txt')).toBe(true);
    });
});
