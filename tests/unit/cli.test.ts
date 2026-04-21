import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runCLI } from '../../src/lib/cli';
import * as helper from '../../src/lib/helper';
import * as args from '../../src/lib/args';
import * as logger from '../../src/lib/logger';
import fs from 'fs';

vi.mock('../../src/lib/helper');
vi.mock('../../src/lib/args', () => ({
    processArgs: vi.fn(() => []),
    cmd: vi.fn(),
    splitArgs: vi.fn(() => ({ positionals: [], flags: [] })),
    parseArgType: vi.fn((a) => a),
}));
vi.mock('../../src/lib/logger');
vi.mock('fs');
vi.mock('../../src/lib/commands/build', () => ({
    buildCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/add', () => ({
    addCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/clean', () => ({
    cleanCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/delete', () => ({
    deleteCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/help', () => ({
    helpCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/lang', () => ({
    langCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/new', () => ({
    newCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/outdir', () => ({
    outdirCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/rename', () => ({
    renameCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/update', () => ({
    updateCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/watch', () => ({
    watchCmd: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../src/lib/commands/migrate', () => ({
    migrateCmd: vi.fn(() => Promise.resolve()),
}));

describe('CLI Error Paths', () => {
    let exitSpy: any;

    beforeEach(() => {
        vi.resetAllMocks();
        exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
            throw new Error('process.exit');
        });
        vi.spyOn(logger, 'error').mockImplementation(() => {});
        vi.spyOn(logger, 'warn').mockImplementation(() => {});
        vi.spyOn(logger, 'log').mockImplementation(() => {});
        vi.spyOn(logger, 'info').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should exit with error if a command fails', async () => {
        vi.mocked(args.cmd).mockReturnValue('build');
        const { buildCmd } = await import('../../src/lib/commands/build');
        vi.mocked(buildCmd).mockRejectedValue(new Error('Command failed'));

        await expect(runCLI()).rejects.toThrow('process.exit');
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle unknown command', async () => {
        vi.mocked(args.cmd).mockReturnValue('unknown');

        await expect(runCLI()).rejects.toThrow('process.exit');
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(logger.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should exit with error on project validation failure', async () => {
        vi.mocked(args.cmd).mockReturnValue('build');
        const { buildCmd } = await import('../../src/lib/commands/build');
        vi.mocked(buildCmd).mockImplementation(async () => {
            helper.readProjectConfig();
        });

        // We'll mock readProjectConfig to simulate what happens in helper.ts
        vi.mocked(helper.readProjectConfig).mockImplementation(() => {
            logger.error(
                'Validation failed for project.json:\n[project.json:title] Field "title" must be a string\n   → Add a descriptive title for your project',
            );
            process.exit(1);
            return undefined;
        });

        await expect(runCLI()).rejects.toThrow('process.exit');
        expect(exitSpy).toHaveBeenCalledWith(1);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Validation failed for project.json'),
        );
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('title'),
        );
    });

    it('should warn on legacy project shape', async () => {
        vi.mocked(args.cmd).mockReturnValue('build');
        const { buildCmd } = await import('../../src/lib/commands/build');
        vi.mocked(buildCmd).mockImplementation(async () => {
            helper.readProjectConfig();
        });

        vi.mocked(helper.readProjectConfig).mockImplementation(() => {
            logger.warn(
                '[LEGACY] project.json is using a legacy shape: missing "workshop.excludes"',
            );
            logger.warn(
                "Please run 'pzstudio migrate' to upgrade your project file.",
            );
            return {
                title: 'Legacy',
                authors: 'Author',
                workshop: { visibility: 'public', tags: [] },
                mods: {},
            } as any;
        });

        await runCLI();
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('[LEGACY]'),
        );
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('pzstudio migrate'),
        );
    });

    it('should handle SIGINT gracefully', async () => {
        // We can't easily trigger process.emit('SIGINT') in vitest without affecting the runner,
        // but we can check if the listener is registered.
        const onSpy = vi.spyOn(process, 'on');
        await runCLI('help');
        expect(onSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });
});
