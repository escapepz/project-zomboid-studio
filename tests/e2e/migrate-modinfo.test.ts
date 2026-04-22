import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('migrate mod.info e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should sync missing fields from mod.info into project.json', async () => {
        // 1. Setup project.json with a mod
        const project = {
            workshop: {
                title: 'Test Project',
                visibility: 'public',
                tags: ['Building'],
            },
            mods: {
                test_mod: {
                    name: 'Test Mod',
                    description: 'Description from project.json',
                },
            },
        };
        workspace.write('project.json', JSON.stringify(project));

        // 2. Setup mod.info with additional fields
        const modInfo = `
id=test_mod
name=Test Mod (Updated)
description=Description from mod.info
author=Antigravity
modversion=1.2.3
require=Base,OtherMod
category=Items
url=https://example.com
`.trim();
        workspace.write('test_mod/mod.info', modInfo);

        // 3. Run migrate
        const result = await workspace.run('migrate');
        workspace.assertSuccess(result);
        workspace.assertStdout(
            result,
            'Synced data from test_mod/mod.info into project.json',
        );

        // 4. Verify project.json
        const upgraded = workspace.readJson('project.json');
        const mod = upgraded.mods.test_mod;

        // Existing fields should NOT be overwritten if they exist?
        // Wait, my implementation says: if (modConfig[key] === undefined) { modConfig[key] = value; }
        // So name and description should remain 'Test Mod' and 'Description from project.json'.
        expect(mod.name).toBe('Test Mod');
        expect(mod.description).toBe('Description from project.json');

        // New fields should be imported
        expect(mod.author).toBe('Antigravity');
        expect(mod.modversion).toBe('1.2.3');
        expect(mod.require).toEqual(['Base', 'OtherMod']);
        expect(mod.category).toBe('Items');
        expect(mod.url).toBe('https://example.com');
    });

    it('should not modify project.json if it is already in sync with mod.info', async () => {
        const project = {
            workshop: {
                title: 'Test Project',
                visibility: 'public',
                tags: ['Building'],
            },
            mods: {
                test_mod: {
                    name: 'Test Mod',
                    description: 'Desc',
                    author: 'Antigravity',
                    build: { modInfo: 'skip' },
                },
            },
        };
        workspace.write('project.json', JSON.stringify(project));

        const modInfo = `
id=test_mod
name=Test Mod
description=Desc
author=Antigravity
`.trim();
        workspace.write('test_mod/mod.info', modInfo);

        const result = await workspace.run('migrate');
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'project.json is already up to date');
    });
});
