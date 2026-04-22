import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import cp from 'child_process';

vi.mock('child_process', async (importOriginal) => {
    const original = await importOriginal<typeof import('child_process')>();
    return {
        ...original,
        spawnSync: vi.fn().mockReturnValue({
            status: 0,
            stdout: Buffer.from(''),
            stderr: Buffer.from(''),
        }),
    };
});

describe('CLI CWD Sensitivity (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should find project.json from a subdirectory', async () => {
        // 1. Setup project in root
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'CWD Test', visibility: 'public', tags: [] },
                mods: { main: { name: 'M', description: 'D' } },
                excludes: [],
                outdir: 'out',
            }),
        );

        // Create the mod directory so build doesn't fail
        fs.mkdirSync(path.join(workspace.dir, 'main'), { recursive: true });

        // 2. Create a subdirectory and change into it
        const subDir = path.join(workspace.dir, 'lua', 'client');
        fs.mkdirSync(subDir, { recursive: true });

        // 3. Run build from subdirectory
        const result = await workspace.run('build', [], subDir);

        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Build complete');

        // Verify output exists relative to project root (which is parent of subDir)
        const outPath = path.join(workspace.dir, 'out', 'CWD Test');
        expect(fs.existsSync(outPath)).toBe(true);
    }, 60000);

    it('should fail if project.json is not in parent hierarchy', async () => {
        // Create a directory that is NOT part of a project
        const outsideDir = path.join(workspace.dir, 'outside');
        fs.mkdirSync(outsideDir, { recursive: true });

        const result = await workspace.run('build', [], outsideDir);
        workspace.assertFailure(result);
        workspace.assertStderr(
            result,
            'You must execute this command within a project directory',
        );
    });
});
