import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import { setVerbose } from '../../src/lib/logger';
import fs from 'fs';
import path from 'path';

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
});
