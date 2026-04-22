import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

/**
 * Module-level state that controls the mocked spawnSync behavior.
 * Tests set `mockFailSubstrings` before calling workspace.run() to
 * control which git clone operations should fail.
 */
let mockFailSubstrings: string[] = [];

vi.mock('child_process', async (importOriginal) => {
    const original = await importOriginal<typeof import('child_process')>();
    return {
        ...original,
        spawnSync: (command: string, args?: readonly string[], opts?: any) => {
            if (command === 'git') {
                const argsList = (args ?? []) as string[];
                if (argsList[0] === 'clone') {
                    const url = argsList[argsList.length - 2];
                    const dest = argsList[argsList.length - 1];

                    if (mockFailSubstrings.some((s) => url.includes(s))) {
                        return { status: 1 } as any;
                    }

                    // Mock success: create a .git dir and a dummy file
                    fs.mkdirSync(dest, { recursive: true });
                    fs.mkdirSync(path.join(dest, '.git'), {
                        recursive: true,
                    });
                    fs.writeFileSync(path.join(dest, 'project.json'), '{}');
                    return { status: 0 } as any;
                } else {
                    // Refresh operations: fetch, reset, submodule, clean
                    const cwd = opts?.cwd as string;
                    if (
                        cwd &&
                        mockFailSubstrings.some((s) => cwd.includes(s))
                    ) {
                        return { status: 1 } as any;
                    }
                    return { status: 0 } as any;
                }
            }
            return original.spawnSync(command, args as any, opts);
        },
    };
});

describe('update command (E2E) - Mocked', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        mockFailSubstrings = [];
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should successfully refresh all template caches', async () => {
        const result = await workspace.run('update');
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Refreshing global template caches');
        workspace.assertStdout(result, "Updating 'project' templates");
        workspace.assertStdout(
            result,
            'All template caches refreshed successfully!',
        );
    });

    it('should succeed with legacy fallback when some clones fail', async () => {
        mockFailSubstrings = ['template-mod'];

        const result = await workspace.run('update');
        workspace.assertSuccess(result);

        // Clone failure is logged as a warning
        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-mod.git'",
        );
        // Falls back to legacy template, so updateCmd still counts it as success
        workspace.assertStdout(
            result,
            'All template caches refreshed successfully!',
        );
    });

    it('should succeed with legacy fallback when all clones fail', async () => {
        mockFailSubstrings = ['template'];

        const result = await workspace.run('update');
        workspace.assertSuccess(result);

        // All clones fail, all fall back to legacy
        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-project.git'",
        );
        workspace.assertStderr(result, 'Falling back to offline legacy');

        // updateCmd still considers all successful because resolveTemplateDir
        // returned a valid path (the legacy fallback)
        workspace.assertStdout(
            result,
            'All template caches refreshed successfully!',
        );
    });
});

describe('update — per-category failure isolation (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        mockFailSubstrings = [];
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should warn only about project clone failure when project is the only failing category', async () => {
        mockFailSubstrings = ['template-project'];

        const result = await workspace.run('update');
        workspace.assertSuccess(result);

        // Project clone failure should be warned
        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-project.git'",
        );

        // Other categories should NOT have clone failures in stderr
        const hasModCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-mod'),
        );
        const hasWorkshopCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-workshop'),
        );
        const hasLangCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-language'),
        );
        expect(hasModCloneFail).toBe(false);
        expect(hasWorkshopCloneFail).toBe(false);
        expect(hasLangCloneFail).toBe(false);
    });

    it('should warn only about mod clone failure when mod is the only failing category', async () => {
        mockFailSubstrings = ['template-mod'];

        const result = await workspace.run('update');
        workspace.assertSuccess(result);

        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-mod.git'",
        );

        const hasProjectCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-project'),
        );
        const hasWorkshopCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-workshop'),
        );
        const hasLangCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-language'),
        );
        expect(hasProjectCloneFail).toBe(false);
        expect(hasWorkshopCloneFail).toBe(false);
        expect(hasLangCloneFail).toBe(false);
    });

    it('should warn only about workshop clone failure when workshop is the only failing category', async () => {
        mockFailSubstrings = ['template-workshop'];

        const result = await workspace.run('update');
        workspace.assertSuccess(result);

        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-workshop.git'",
        );

        const hasProjectCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-project'),
        );
        const hasModCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-mod'),
        );
        const hasLangCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-language'),
        );
        expect(hasProjectCloneFail).toBe(false);
        expect(hasModCloneFail).toBe(false);
        expect(hasLangCloneFail).toBe(false);
    });

    it('should warn only about language clone failure when language is the only failing category', async () => {
        mockFailSubstrings = ['template-language'];

        const result = await workspace.run('update');
        workspace.assertSuccess(result);

        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-language.git'",
        );

        const hasProjectCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-project'),
        );
        const hasModCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-mod'),
        );
        const hasWorkshopCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-workshop'),
        );
        expect(hasProjectCloneFail).toBe(false);
        expect(hasModCloneFail).toBe(false);
        expect(hasWorkshopCloneFail).toBe(false);
    });

    it('should warn about exactly two categories when project and language fail together', async () => {
        mockFailSubstrings = ['template-project', 'template-language'];

        const result = await workspace.run('update');
        workspace.assertSuccess(result);

        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-project.git'",
        );
        workspace.assertStderr(
            result,
            "Failed to clone template from 'https://github.com/escapepz/pzstudio-template-language.git'",
        );

        const hasModCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-mod'),
        );
        const hasWorkshopCloneFail = result.stderr.some((l) =>
            l.includes('pzstudio-template-workshop'),
        );
        expect(hasModCloneFail).toBe(false);
        expect(hasWorkshopCloneFail).toBe(false);
    });
});
