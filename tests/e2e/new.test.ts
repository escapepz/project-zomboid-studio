import path from 'path';
import fs from 'fs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('new command e2e', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should create a new project with valid title and author', async () => {
        const result = await workspace.run('new', [
            'Test Project',
            'Test Author',
        ]);

        try {
            workspace.assertSuccess(result);
            workspace.assertStdout(
                result,
                "The project 'Test Project' has been created",
            );

            const projectDir = 'test_author';
            expect(
                workspace.exists(path.join(projectDir, 'project.json')),
            ).toBe(true);
            const config = workspace.readJson(
                path.join(projectDir, 'project.json'),
            );
            expect(config.workshop.title).toBe('Test Project');
            expect(config.mods.test_author.name).toBe('Test Project');
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    }, 60000);

    it('should fail if title is missing', async () => {
        const result = await workspace.run('new', []);
        workspace.assertFailure(result);
        workspace.assertStderr(
            result,
            "Expected param [projectTitle] to be 'string', but got 'undefined'",
        );
    });

    it('should fail if already in a project directory', async () => {
        // Create a valid project.json to avoid validation exit
        workspace.write(
            'project.json',
            JSON.stringify({
                workshop: {
                    title: 'Existing',
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    test: {
                        name: 'Test',
                        description: 'Description',
                    },
                },
            }),
        );

        const result = await workspace.run('new', [
            'Another Project',
            'Author',
        ]);
        workspace.assertFailure(result);
        workspace.assertStderr(
            result,
            'You cannot execute this command within a project directory',
        );
    });

    it('should propagate .libraries from the project template', async () => {
        const legacyProjectTemplatePath = path.join(
            workspace.fakeHome,
            '.pzstudio',
            '.template-legacy',
            '.template-project',
        );
        const legacyTemplateLibPath = path.join(
            legacyProjectTemplatePath,
            '.libraries',
            'my-lib',
        );
        fs.mkdirSync(legacyTemplateLibPath, { recursive: true });
        fs.writeFileSync(
            path.join(legacyTemplateLibPath, 'lib.lua'),
            'print("hello")',
        );

        const result = await workspace.run('new', [
            'Library Project',
            'lib_proj',
            '--offline',
        ]);

        workspace.assertSuccess(result);
        expect(
            workspace.exists(
                path.join('lib_proj', '.libraries', 'my-lib', 'lib.lua'),
            ),
        ).toBe(true);
    });

    it('should create a project with auto-derived modId when modId is omitted', async () => {
        const result = await workspace.run('new', ['My Auto Project']);

        try {
            workspace.assertSuccess(result);
            workspace.assertStdout(
                result,
                "The project 'My Auto Project' has been created",
            );

            // formatTitleToId('My Auto Project') → 'my_auto_project'
            const derivedModId = 'my_auto_project';
            expect(
                workspace.exists(path.join(derivedModId, 'project.json')),
            ).toBe(true);
            const config = workspace.readJson(
                path.join(derivedModId, 'project.json'),
            );
            expect(config.workshop.title).toBe('My Auto Project');
            expect(config.mods[derivedModId]).toBeDefined();
            expect(config.mods[derivedModId].name).toBe('My Auto Project');
        } catch (e) {
            console.log('STDOUT:', result.stdout.join('\n'));
            console.log('STDERR:', result.stderr.join('\n'));
            throw e;
        }
    }, 60000);
});
