import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import * as cp from 'child_process';

vi.mock('child_process');

describe('Advanced Build Features (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        vi.spyOn(cp, 'spawnSync').mockReturnValue({
            status: 0,
            stdout: Buffer.from(''),
            stderr: Buffer.from(''),
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        workspace.cleanup();
    });

    it('should respect .pzstudioignore and project.json excludes', async () => {
        const title = 'Advanced Project';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title, visibility: 'public', tags: [] },
                mods: {
                    mod1: { name: 'M1', description: 'D1' },
                },
                excludes: ['excluded_by_config.txt'],
                outdir: 'out',
            }),
        );

        // Create mod directory and files
        const modPath = path.join(workspace.dir, 'mod1');
        fs.mkdirSync(modPath, { recursive: true });

        fs.writeFileSync(path.join(modPath, 'included.txt'), 'include');
        fs.writeFileSync(
            path.join(modPath, 'excluded_by_config.txt'),
            'exclude',
        );
        fs.writeFileSync(
            path.join(modPath, 'excluded_by_ignore.txt'),
            'exclude',
        );

        // Create .pzstudioignore inside mod1
        fs.writeFileSync(
            path.join(modPath, '.pzstudioignore'),
            'excluded_by_ignore.txt\n.git\n',
        );

        // Run build
        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        const outPath = path.join(
            workspace.dir,
            'out',
            title,
            'Contents',
            'mods',
            'mod1',
        );

        expect(fs.existsSync(path.join(outPath, 'included.txt'))).toBe(true);
        expect(
            fs.existsSync(path.join(outPath, 'excluded_by_config.txt')),
        ).toBe(false);
        expect(
            fs.existsSync(path.join(outPath, 'excluded_by_ignore.txt')),
        ).toBe(false);
    }, 60000);

    it('should handle nested directory structures', async () => {
        const title = 'Nested Project';
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title, visibility: 'public', tags: [] },
                mods: {
                    mod: {
                        name: 'M',
                        description: 'D',
                        build: { modInfo: 'skip' },
                    },
                },
                excludes: [],
                outdir: 'out',
            }),
        );

        const modPath = path.join(workspace.dir, 'mod');
        const nestedDir = path.join(modPath, 'media', 'lua', 'client');
        fs.mkdirSync(nestedDir, { recursive: true });
        fs.writeFileSync(path.join(nestedDir, 'script.lua'), 'print("hi")');

        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        const outScript = path.join(
            workspace.dir,
            'out',
            title,
            'Contents',
            'mods',
            'mod',
            'media',
            'lua',
            'client',
            'script.lua',
        );
        expect(fs.existsSync(outScript)).toBe(true);
        expect(fs.readFileSync(outScript, 'utf8')).toBe('print("hi")');
    }, 60000);
});
