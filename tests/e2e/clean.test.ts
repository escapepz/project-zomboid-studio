import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('clean command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should clean the output directory', async () => {
        // 1. Setup project and output dir
        const title = 'My Project';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title, visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
                outdir: 'out',
            }),
        );

        const outPath = path.join(workspace.dir, 'out', title);
        fs.mkdirSync(outPath, { recursive: true });
        fs.writeFileSync(path.join(outPath, 'built_file.txt'), 'content');

        // 2. Run clean command
        const result = await workspace.run('clean');

        try {
            workspace.assertSuccess(result);
            workspace.assertStdout(result, 'Cleaning main output directory');
            workspace.assertStdout(result, 'Clean complete');

            // 3. Verify filesystem
            expect(fs.existsSync(outPath)).toBe(false);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });

    it('should fail if neither output directory exists', async () => {
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'P', visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
                outdir: 'out',
            }),
        );

        const result = await workspace.run('clean');
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'No build output found to clean');
    });

    it('should clean both main and development output directories', async () => {
        const title = 'My Project';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title, visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
                outdir: 'out',
            }),
        );

        const mainOutPath = path.join(workspace.dir, 'out', title);
        const devOutPath = path.join(
            workspace.dir,
            'out',
            `${title} - dev_branch`,
        );

        fs.mkdirSync(mainOutPath, { recursive: true });
        fs.mkdirSync(devOutPath, { recursive: true });

        const result = await workspace.run('clean');
        workspace.assertSuccess(result);

        expect(fs.existsSync(mainOutPath)).toBe(false);
        expect(fs.existsSync(devOutPath)).toBe(false);
    });

    it('should succeed if only development output directory exists', async () => {
        const title = 'My Project';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title, visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
                outdir: 'out',
            }),
        );

        const devOutPath = path.join(
            workspace.dir,
            'out',
            `${title} - dev_branch`,
        );
        fs.mkdirSync(devOutPath, { recursive: true });

        const result = await workspace.run('clean');
        workspace.assertSuccess(result);
        expect(fs.existsSync(devOutPath)).toBe(false);
    });

    it('should fail if not in a project directory', async () => {
        const result = await workspace.run('clean');
        workspace.assertFailure(result);
        workspace.assertStderr(
            result,
            'You must execute this command within a project directory',
        );
    });
});
