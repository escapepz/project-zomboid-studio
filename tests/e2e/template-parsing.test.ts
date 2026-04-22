import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';
import * as cp from 'child_process';

vi.mock('child_process');

let cloneCalls: { args: string[]; dest: string }[] = [];

beforeEach(() => {
    vi.spyOn(cp, 'spawnSync').mockImplementation(
        (command: string, args?: readonly string[]) => {
            if (command === 'git') {
                const argsList = (args ?? []) as string[];
                if (argsList[0] === 'clone') {
                    const dest = argsList[argsList.length - 1];
                    cloneCalls.push({ args: [...argsList], dest });

                    // Mock success: create valid template structure
                    fs.mkdirSync(dest, { recursive: true });
                    fs.mkdirSync(path.join(dest, '.git'), {
                        recursive: true,
                    });
                    fs.writeFileSync(
                        path.join(dest, 'project.json'),
                        JSON.stringify({
                            workshop: {
                                title: 'Template Project',
                                visibility: 'public',
                                tags: ['template'],
                            },
                            mods: {
                                mod: {
                                    name: 'Template Mod',
                                    description: 'Description',
                                },
                            },
                        }),
                    );
                    return { status: 0 } as any;
                }
                // Refresh operations
                return { status: 0 } as any;
            }
            return { status: 0 } as any;
        },
    );
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('--template URL parsing variants (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        cloneCalls = [];
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should parse user/repo@tag and clone with the correct ref', async () => {
        const result = await workspace.run('new', [
            'Tag Project',
            'tag_proj',
            '--template',
            'myuser/myrepo@v1.2.3',
        ]);

        workspace.assertSuccess(result);

        // parseTemplateUrl('myuser/myrepo@v1.2.3') → { url: 'myuser/myrepo', ref: 'v1.2.3' }
        // cloneRemoteTemplate expands to 'https://github.com/myuser/myrepo.git'
        // and passes '-b v1.2.3' to the clone args
        const projectClone = cloneCalls.find((c) =>
            c.args.some((a) => a.includes('myuser/myrepo')),
        );
        expect(projectClone).toBeDefined();
        expect(projectClone!.args).toContain('-b');
        const bIndex = projectClone!.args.indexOf('-b');
        expect(projectClone!.args[bIndex + 1]).toBe('v1.2.3');
    });

    it('should parse user/repo#branch and clone with the correct ref', async () => {
        const result = await workspace.run('new', [
            'Branch Project',
            'branch_proj',
            '--template',
            'myuser/myrepo#develop',
        ]);

        workspace.assertSuccess(result);

        const projectClone = cloneCalls.find((c) =>
            c.args.some((a) => a.includes('myuser/myrepo')),
        );
        expect(projectClone).toBeDefined();
        expect(projectClone!.args).toContain('-b');
        const bIndex = projectClone!.args.indexOf('-b');
        expect(projectClone!.args[bIndex + 1]).toBe('develop');
    });

    it('should parse a full URL with @tag and clone with the correct ref', async () => {
        const result = await workspace.run('new', [
            'Full URL Tag',
            'full_url_tag',
            '--template',
            'https://github.com/myuser/myrepo.git@release-2.0',
        ]);

        workspace.assertSuccess(result);

        const projectClone = cloneCalls.find((c) =>
            c.args.some((a) => a.includes('myuser/myrepo')),
        );
        expect(projectClone).toBeDefined();
        expect(projectClone!.args).toContain('-b');
        const bIndex = projectClone!.args.indexOf('-b');
        expect(projectClone!.args[bIndex + 1]).toBe('release-2.0');
    });

    it('should parse a plain user/repo without ref and clone without -b flag', async () => {
        const result = await workspace.run('new', [
            'Plain Repo',
            'plain_repo',
            '--template',
            'myuser/myrepo',
        ]);

        workspace.assertSuccess(result);

        const projectClone = cloneCalls.find((c) =>
            c.args.some((a) => a.includes('myuser/myrepo')),
        );
        expect(projectClone).toBeDefined();
        // No ref → no -b flag in the clone args
        expect(projectClone!.args).not.toContain('-b');
    });
});

describe('--template missing value edge case (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
        cloneCalls = [];
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should treat --template as absent when it is the last argument with no value', async () => {
        // extractFlag('template') returns undefined when --template is the last arg
        // so the command uses the default template instead of a custom one
        const result = await workspace.run('new', [
            'No Value Project',
            'no_value_proj',
            '--template',
        ]);

        workspace.assertSuccess(result);

        // The project should be created using the default template (not a custom one)
        expect(
            workspace.exists(path.join('no_value_proj', 'project.json')),
        ).toBe(true);

        // All clone calls should use the default escapepz URLs, not a custom one
        for (const call of cloneCalls) {
            const url = call.args.find((a) => a.includes('github.com'));
            if (url) {
                expect(url).toContain('escapepz');
            }
        }
    });

    it('should not consume --offline as the template value when it follows --template', async () => {
        // splitArgs treats --offline as a flag (starts with -), not as the value for --template
        // So extractFlag('template') returns undefined and --offline is processed normally
        const result = await workspace.run('new', [
            'Flag After Template',
            'flag_after',
            '--template',
            '--offline',
        ]);

        // Should succeed using offline/legacy templates (--offline is active, --template has no value)
        workspace.assertSuccess(result);
        expect(workspace.exists(path.join('flag_after', 'project.json'))).toBe(
            true,
        );
    });
});
