import path from 'path';
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
});
