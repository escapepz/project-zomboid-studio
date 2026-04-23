import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import { setVerbose } from '../../src/lib/logger';
import fs from 'fs';
import path from 'path';

vi.mock('child_process', async (importOriginal) => {
    const original = await importOriginal<typeof import('child_process')>();
    return {
        ...original,
        spawnSync: (command: string, args?: readonly string[], opts?: any) => {
            if (command === 'git') {
                const argsList = (args ?? []) as string[];
                if (argsList[0] === 'clone') {
                    const dest = argsList[argsList.length - 1];
                    // Mock success: create a .git dir and a dummy file
                    fs.mkdirSync(dest, { recursive: true });
                    fs.mkdirSync(path.join(dest, '.git'), { recursive: true });
                    fs.writeFileSync(path.join(dest, 'project.json'), '{}');
                    return { status: 0 } as any;
                }
                return { status: 0 } as any;
            }
            return original.spawnSync(command, args as any, opts);
        },
    };
});

describe('Global --verbose flag behavior (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
        setVerbose(false);
    });

    it('should emit verbose output for new command', async () => {
        const result = await workspace.run('new', [
            'Verbose Proj',
            'vproj',
            '--offline',
            '--verbose',
        ]);

        try {
            workspace.assertSuccess(result);

            // Assert verbose output is present
            const hasVerbose = result.stdout.some(
                (line) =>
                    line.includes('Executing command [new]') ||
                    line.includes('Project Dir:'),
            );
            expect(hasVerbose).toBe(true);
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    });

    it('should emit verbose output for add command', async () => {
        // Setup minimal project
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'T', visibility: 'public', tags: [] },
                mods: {},
                excludes: [],
            }),
        );

        const result = await workspace.run('add', [
            'Verbose Mod',
            'vmod',
            '--offline',
            '--verbose',
        ]);
        workspace.assertSuccess(result);

        const hasVerbose = result.stdout.some(
            (line) =>
                line.includes('Executing command [add]') ||
                line.includes('Project Dir:'),
        );
        expect(hasVerbose).toBe(true);
    });

    it('should emit verbose output for delete command', async () => {
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'T', visibility: 'public', tags: [] },
                mods: { vmod: { name: 'V', description: 'D' } },
                excludes: [],
            }),
        );
        fs.mkdirSync(path.join(workspace.dir, 'vmod'), { recursive: true });

        const result = await workspace.run('delete', ['vmod', '--verbose']);
        workspace.assertSuccess(result);

        const hasVerbose = result.stdout.some(
            (line) =>
                line.includes('Executing command [delete]') ||
                line.includes('Project Dir:'),
        );
        expect(hasVerbose).toBe(true);
    });

    it('should emit verbose output for build command', async () => {
        // Setup a minimal valid project for building
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'T', visibility: 'public', tags: [] },
                mods: {
                    vmod: {
                        name: 'V',
                        description: 'D',
                        build: { modInfo: 'skip' },
                    },
                },
                excludes: [],
                outdir: 'out',
            }),
        );
        fs.mkdirSync(path.join(workspace.dir, 'vmod'), { recursive: true });
        fs.writeFileSync(
            path.join(workspace.dir, 'vmod', 'placeholder.txt'),
            'mod content',
        );

        const result = await workspace.run('build', ['--verbose']);
        workspace.assertSuccess(result);

        const hasVerbose = result.stdout.some(
            (line) =>
                line.includes('Project root:') || line.includes('Output root:'),
        );
        expect(hasVerbose).toBe(true);
    });

    it('should emit verbose output for outdir command', async () => {
        // Create a dummy outdir
        const outDirPath = path.join(workspace.dir, 'dummy_out');
        fs.mkdirSync(outDirPath, { recursive: true });

        const result = await workspace.run('outdir', [outDirPath, '--verbose']);
        workspace.assertSuccess(result);

        const hasVerbose = result.stdout.some(
            (line) =>
                line.includes('Changing outdir to:') ||
                line.includes('Resolved outdir path:'),
        );
        expect(hasVerbose).toBe(true);
    });

    it('should emit verbose output for update command', async () => {
        const result = await workspace.run('update', ['--verbose']);
        workspace.assertSuccess(result);

        const hasVerbose = result.stdout.some((line) =>
            line.includes('Requesting template resolution for category:'),
        );
        expect(hasVerbose).toBe(true);
    });

    it('should emit verbose output for modinfo command', async () => {
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title: 'T', visibility: 'public', tags: [] },
                mods: {
                    vmod: {
                        name: 'V',
                        description: 'D',
                        build: { modInfo: 'skip' },
                    },
                },
                excludes: [],
            }),
        );
        fs.mkdirSync(path.join(workspace.dir, 'vmod'), { recursive: true });

        const result = await workspace.run('modinfo', [
            'generate',
            '--verbose',
        ]);
        workspace.assertSuccess(result);

        const hasVerbose = result.stdout.some(
            (line) =>
                line.includes('Eligible mods for mod.info:') ||
                line.includes('is configured to skip mod.info generation.'),
        );
        expect(hasVerbose).toBe(true);
    });
});
