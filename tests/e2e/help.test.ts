import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('help command (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should show general help when called without arguments', async () => {
        const result = await workspace.run('help');
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Available commands:');
        workspace.assertStdout(result, 'add');
    });

    it('should show specific help for a command', async () => {
        const result = await workspace.run('help', ['build']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Usages:');
        workspace.assertStdout(result, 'pzstudio build');
    });

    it('should show help for help command itself', async () => {
        const result = await workspace.run('help', ['help']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'pzstudio help <command>');
    });

    it('should fail for an unknown command (no entry in help registry)', async () => {
        const result = await workspace.run('help', ['nonexistent-command']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'Unknown command [nonexistent-command]');
    });
});

describe('help — per-command help blocks (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    const registeredCommands = [
        'add',
        'build',
        'clean',
        'delete',
        'help',
        'lang',
        'migrate',
        'new',
        'outdir',
        'rename',
        'update',
        'watch',
    ];

    for (const cmd of registeredCommands) {
        it(`should return help text for '${cmd}' command`, async () => {
            const result = await workspace.run('help', [cmd]);
            workspace.assertSuccess(result);

            // Every registered help block includes 'pzstudio <cmd>' or 'Usage' text
            const hasContent = result.stdout.some(
                (line) =>
                    line.includes(`pzstudio ${cmd}`) ||
                    line.includes('Usage') ||
                    line.includes('Usages'),
            );
            expect(hasContent).toBe(true);
        });
    }
});

describe('help — odd input shapes (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should fail for a numeric string argument (no matching help entry)', async () => {
        // '123' is a valid string arg but has no matching help entry
        const result = await workspace.run('help', ['123']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'Unknown command [123]');
    });

    it('should fail for a boolean-like string argument', async () => {
        // 'true' is a valid string arg but has no matching help entry
        const result = await workspace.run('help', ['true']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'Unknown command [true]');
    });

    it('should succeed and show general help when called via --help flag with no command', async () => {
        const result = await workspace.run(undefined, ['--help']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'Available commands:');
    });

    it('should show command-specific help when --help flag is used with a command', async () => {
        const result = await workspace.run('add', ['--help']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'pzstudio add');
    });

    it('should only use the first positional arg and ignore extra args', async () => {
        // help receives command.params[0] only; extra args are ignored
        const result = await workspace.run('help', ['build', 'extra', 'args']);
        workspace.assertSuccess(result);
        workspace.assertStdout(result, 'pzstudio build');
    });

    it('should list all registered commands in general help output', async () => {
        const result = await workspace.run('help');
        workspace.assertSuccess(result);

        const expectedCommands = [
            'add',
            'build',
            'clean',
            'delete',
            'help',
            'lang',
            'new',
            'outdir',
            'rename',
            'update',
            'watch',
        ];

        for (const cmd of expectedCommands) {
            const found = result.stdout.some((line) => line.includes(cmd));
            expect(found, `Expected general help to list '${cmd}'`).toBe(true);
        }
    });
});

describe('help — registry behavior for unknown commands (E2E)', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should fail for an unregistered command name', async () => {
        const result = await workspace.run('help', ['nonexistent']);
        workspace.assertFailure(result);
        workspace.assertStderr(result, 'Unknown command [nonexistent]');
    });

    it('should produce non-undefined output for every registered command', async () => {
        const registeredCommands = [
            'add',
            'build',
            'clean',
            'delete',
            'help',
            'lang',
            'migrate',
            'new',
            'outdir',
            'rename',
            'update',
            'watch',
        ];

        for (const cmd of registeredCommands) {
            const result = await workspace.run('help', [cmd]);
            workspace.assertSuccess(result);

            // The output should NOT contain an undefined line — every registered
            // command must return actual help text from the registry
            const hasOnlyUndefined = result.stdout.every(
                (line) =>
                    line === undefined ||
                    line === '' ||
                    line === '\n' ||
                    (typeof line === 'string' && line.trim() === ''),
            );
            expect(
                hasOnlyUndefined,
                `Expected 'help ${cmd}' to produce real help text, not empty/undefined`,
            ).toBe(false);
        }
    });

    it('should produce distinct help text for different commands', async () => {
        const resultAdd = await workspace.run('help', ['add']);
        const resultBuild = await workspace.run('help', ['build']);
        workspace.assertSuccess(resultAdd);
        workspace.assertSuccess(resultBuild);

        const addText = resultAdd.stdout
            .filter((l) => typeof l === 'string')
            .join('\n');
        const buildText = resultBuild.stdout
            .filter((l) => typeof l === 'string')
            .join('\n');

        expect(addText).not.toBe(buildText);
    });
});
