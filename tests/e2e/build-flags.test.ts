import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

/** Minimal valid project fixture used across build flag tests */
function writeMinimalProject(
    workspace: E2ETestWorkspace,
    {
        title = 'Flag Project',
        modId = 'flag_mod',
        modInfoMode = 'auto' as 'auto' | 'skip' | 'auto-if-missing',
        outdir = 'out',
        extraMods = {} as Record<string, object>,
        excludes = [] as string[],
    } = {},
) {
    workspace.write(
        'project.json',
        JSON.stringify({
            workshop: { title, visibility: 'public', tags: [] },
            mods: {
                [modId]: {
                    name: 'Flag Mod',
                    description: 'D',
                    build: { modInfo: modInfoMode },
                },
                ...extraMods,
            },
            excludes,
            outdir,
        }),
    );

    // Each listed mod needs a source directory so scaffoldProject can copy it
    const allModIds = [modId, ...Object.keys(extraMods)];
    for (const id of allModIds) {
        workspace.write(`${id}/placeholder.txt`, `mod ${id}`);
    }
}

describe('build --production flag (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should build main workshop output with explicit --production flag', async () => {
        const title = 'Prod Project';
        writeMinimalProject(workspace, { title, outdir: 'out' });

        const result = await workspace.run('build', ['--production']);
        workspace.assertSuccess(result);

        const expectedDir = path.join(workspace.dir, 'out', title);
        expect(fs.existsSync(expectedDir)).toBe(true);
        expect(fs.existsSync(path.join(expectedDir, 'workshop.txt'))).toBe(
            true,
        );
    });
});

describe('build --development flag (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should build dev_branch output directory with --development flag', async () => {
        const title = 'Dev Project';
        writeMinimalProject(workspace, { title, outdir: 'out' });

        const result = await workspace.run('build', ['--development']);
        workspace.assertSuccess(result);

        // Dev branch goes to "{title} - dev_branch/"
        const devDir = path.join(workspace.dir, 'out', `${title} - dev_branch`);
        expect(fs.existsSync(devDir)).toBe(true);
        expect(fs.existsSync(path.join(devDir, 'workshop.txt'))).toBe(true);
    });

    it('should not create main workshop output when only --development is specified', async () => {
        const title = 'Dev Only';
        writeMinimalProject(workspace, { title, outdir: 'out' });

        const result = await workspace.run('build', ['--development']);
        workspace.assertSuccess(result);

        // Main dir must NOT exist
        const mainDir = path.join(workspace.dir, 'out', title);
        expect(fs.existsSync(mainDir)).toBe(false);
    });

    it('should suffix mod IDs with _dev in workshop.txt for dev_branch build', async () => {
        const title = 'Dev Suffix';
        const modId = 'my_mod';
        writeMinimalProject(workspace, { title, modId, outdir: 'out' });

        const result = await workspace.run('build', ['--development']);
        workspace.assertSuccess(result);

        const devDir = path.join(workspace.dir, 'out', `${title} - dev_branch`);
        // Mod directory should use the _dev-suffixed name
        const devModDir = path.join(devDir, 'Contents', 'mods', `${modId}_dev`);
        expect(fs.existsSync(devModDir)).toBe(true);
    });
});

describe('build --production --development conflict (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should fail with an error when both --production and --development are given', async () => {
        writeMinimalProject(workspace, { outdir: 'out' });

        const result = await workspace.run('build', [
            '--production',
            '--development',
        ]);
        workspace.assertFailure(result, 1);
        workspace.assertStderr(
            result,
            'Use either --production or --development, not both',
        );
    });
});

describe('build modInfo: auto-if-missing (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should skip mod.info generation when it already exists in the mod source', async () => {
        const title = 'AutoIfMissing Project';
        const modId = 'aim_mod';

        writeMinimalProject(workspace, {
            title,
            modId,
            modInfoMode: 'auto-if-missing',
            outdir: 'out',
        });

        // Pre-populate mod.info in the mod source so it gets copied and then detected
        workspace.write(`${modId}/mod.info`, `id=${modId}\nname=Pre-existing`);

        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        // The build should log the "already exists" skip message
        workspace.assertStdout(result, 'Skipping');
        workspace.assertStdout(result, 'auto-if-missing');

        // The pre-existing mod.info content should be preserved (not regenerated)
        const modInfoPath = path.join(
            workspace.dir,
            'out',
            title,
            'Contents',
            'mods',
            modId,
            'mod.info',
        );
        expect(fs.existsSync(modInfoPath)).toBe(true);
        const content = fs.readFileSync(modInfoPath, 'utf8');
        expect(content).toContain('Pre-existing');
    });

    it('should generate mod.info when it does not exist and modInfo is auto-if-missing', async () => {
        const title = 'AutoIfMissing Generate';
        const modId = 'aim_gen_mod';

        writeMinimalProject(workspace, {
            title,
            modId,
            modInfoMode: 'auto-if-missing',
            outdir: 'out',
        });
        // No mod.info in source — should be generated

        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        const modInfoPath = path.join(
            workspace.dir,
            'out',
            title,
            'Contents',
            'mods',
            modId,
            'mod.info',
        );
        expect(fs.existsSync(modInfoPath)).toBe(true);
    });
});

describe('build missing workshop/preview.png warning (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should emit a warning when workshop/preview.png is missing', async () => {
        const title = 'No Preview';
        writeMinimalProject(workspace, { title, outdir: 'out' });
        // Intentionally NOT creating workshop/preview.png

        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        workspace.assertStderr(result, "No workshop 'preview.png' found");
    });

    it('should NOT warn when workshop/preview.png is present', async () => {
        const title = 'Has Preview';
        writeMinimalProject(workspace, { title, outdir: 'out' });
        workspace.write('workshop/preview.png', 'fake png data');

        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        const hasWarning = result.stderr.some((line) =>
            line.includes("No workshop 'preview.png' found"),
        );
        expect(hasWarning).toBe(false);
    });
});

describe('build excludes array filters entire mods (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should not include excluded mods in the build output', async () => {
        const title = 'Exclude Test';
        const includedMod = 'included_mod';
        const excludedMod = 'excluded_mod';

        writeMinimalProject(workspace, {
            title,
            modId: includedMod,
            outdir: 'out',
            extraMods: {
                [excludedMod]: { name: 'Excluded', description: 'D' },
            },
            excludes: [excludedMod],
        });

        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        const modsDir = path.join(
            workspace.dir,
            'out',
            title,
            'Contents',
            'mods',
        );

        // Included mod should be present
        expect(fs.existsSync(path.join(modsDir, includedMod))).toBe(true);

        // Excluded mod must NOT appear in output
        expect(fs.existsSync(path.join(modsDir, excludedMod))).toBe(false);
    });
});

describe('build --verbose success-path (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should emit diagnostic output lines when --verbose is passed', async () => {
        const title = 'Verbose Project';
        writeMinimalProject(workspace, { title, outdir: 'out' });

        const result = await workspace.run('build', ['--verbose']);
        workspace.assertSuccess(result);

        workspace.assertStdout(result, 'Project root:');
        workspace.assertStdout(result, 'Output root:');
    });
});

describe('build.modInfo default-warning (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should emit a [BREAKING CHANGE] warning when build.modInfo is omitted', async () => {
        const title = 'No ModInfo Config';
        const modId = 'no_modinfo_mod';

        // Write project.json without build.modInfo to trigger the default-warning
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: { title, visibility: 'public', tags: [] },
                mods: {
                    [modId]: {
                        name: 'No ModInfo Mod',
                        description: 'D',
                    },
                },
                excludes: [],
                outdir: 'out',
            }),
        );
        workspace.write(`${modId}/placeholder.txt`, `mod ${modId}`);

        const result = await workspace.run('build');
        workspace.assertSuccess(result);

        workspace.assertStderr(result, '[MIGRATION]');
    });
});
