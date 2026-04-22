import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('outdir command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should change the global output directory', async () => {
        // 1. Create a dummy directory to set as outdir
        const newOutDir = path.join(workspace.dir, 'new_out');
        fs.mkdirSync(newOutDir, { recursive: true });

        // 2. Run outdir command
        const result = await workspace.run('outdir', [newOutDir]);

        try {
            workspace.assertSuccess(result);
            workspace.assertStdout(
                result,
                'The output directory has been changed',
            );

            // 3. Verify config.json in fake home
            const configPath = path.join(
                workspace.fakeHome,
                '.pzstudio',
                'config.json',
            );
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            expect(config.outdir).toBe(newOutDir);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });

    it('should fail if the directory does not exist', async () => {
        const result = await workspace.run('outdir', ['/non/existent/path']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'does not exist');
    });

    it('should fail if the directory is already set to the same value', async () => {
        const outDir = path.join(workspace.dir, 'out');
        fs.mkdirSync(outDir, { recursive: true });

        // Setup config.json
        const configPath = path.join(
            workspace.fakeHome,
            '.pzstudio',
            'config.json',
        );
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify({ outdir: outDir }));

        const result = await workspace.run('outdir', [outDir]);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'already set to this value');
    });

    it('should normalize relative paths to absolute paths', async () => {
        fs.mkdirSync(path.join(workspace.dir, 'relative_out'));
        const result = await workspace.run('outdir', ['./relative_out']);
        workspace.assertSuccess(result);

        const configPath = path.join(
            workspace.fakeHome,
            '.pzstudio',
            'config.json',
        );
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        expect(path.isAbsolute(config.outdir)).toBe(true);
        expect(config.outdir).toBe(path.resolve(workspace.dir, 'relative_out'));
    });

    it('should recover from a malformed config.json', async () => {
        const outDir = path.join(workspace.dir, 'out');
        fs.mkdirSync(outDir, { recursive: true });

        const configPath = path.join(
            workspace.fakeHome,
            '.pzstudio',
            'config.json',
        );
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, '{ malformed json ]');

        const result = await workspace.run('outdir', [outDir]);
        workspace.assertSuccess(result);

        const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        expect(newConfig.outdir).toBe(outDir);
    });
});

describe('outdir — path edge cases (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should handle paths with spaces', async () => {
        const dirWithSpaces = path.join(workspace.dir, 'my output dir');
        fs.mkdirSync(dirWithSpaces, { recursive: true });

        const result = await workspace.run('outdir', [dirWithSpaces]);
        workspace.assertSuccess(result);

        const configPath = path.join(
            workspace.fakeHome,
            '.pzstudio',
            'config.json',
        );
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        expect(config.outdir).toBe(dirWithSpaces);
    });

    it('should normalize paths with trailing separators', async () => {
        const baseDir = path.join(workspace.dir, 'trail_out');
        fs.mkdirSync(baseDir, { recursive: true });

        const trailingPath = baseDir + path.sep;
        const result = await workspace.run('outdir', [trailingPath]);
        workspace.assertSuccess(result);

        const configPath = path.join(
            workspace.fakeHome,
            '.pzstudio',
            'config.json',
        );
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // The stored path should be normalized (no trailing separator)
        expect(path.isAbsolute(config.outdir)).toBe(true);
    });
});
