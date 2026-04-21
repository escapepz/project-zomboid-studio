import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCmd } from '../../src/lib/commands/build';
import { addCmd } from '../../src/lib/commands/add';
import { cleanCmd } from '../../src/lib/commands/clean';
import { deleteCmd } from '../../src/lib/commands/delete';
import { helpCmd } from '../../src/lib/commands/help';
import { watchCmd } from '../../src/lib/commands/watch';
import { migrateCmd } from '../../src/lib/commands/migrate';
import fs from 'fs';
import * as helper from '../../src/lib/helper';
import * as logger from '../../src/lib/logger';
import * as templateManager from '../../src/lib/templateManager';
import * as migrationMod from '../../src/lib/migration';

vi.mock('fs', () => {
    const mocks = {
        existsSync: vi.fn(),
        rmSync: vi.fn(),
        mkdirSync: vi.fn(),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        readdirSync: vi.fn(),
        lstatSync: vi.fn(),
    };
    return {
        ...mocks,
        default: mocks,
    };
});
vi.mock('../../src/lib/helper');
vi.mock('../../src/lib/logger');
vi.mock('../../src/lib/templateManager');
vi.mock('../../src/lib/migration', () => ({
    migration: {
        checkConfig: vi.fn(),
        checkProject: vi.fn(),
        upgradeConfig: vi.fn(),
        upgradeProject: vi.fn(),
    },
}));

describe('Commands', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('buildCmd', () => {
        it('should throw error if not in project directory', async () => {
            vi.mocked(helper.readProjectConfig).mockReturnValue(undefined);
            await expect(buildCmd()).rejects.toThrow(
                'You must execute this command within a project directory!',
            );
        });
    });

    describe('addCmd', () => {
        it('should throw error if not in project directory', async () => {
            vi.mocked(helper.readProjectConfig).mockReturnValue(undefined);
            await expect(async () => addCmd('test')).rejects.toThrow(
                'You must execute this command within a project directory!',
            );
        });
    });

    describe('cleanCmd', () => {
        it('should call helper.getOutDir and clean it', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(helper.readProjectConfig).mockReturnValue({
                title: 'TestProject',
            } as any);
            vi.mocked(helper.getOutDir).mockReturnValue('./out');
            await cleanCmd();
            expect(helper.getOutDir).toHaveBeenCalled();
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining('Cleaning'),
            );
        });
    });

    describe('deleteCmd', () => {
        it('should throw error if not in project directory', async () => {
            vi.mocked(helper.readProjectConfig).mockReturnValue(undefined);
            await expect(async () => deleteCmd('modid')).rejects.toThrow(
                'You must execute this command within a project directory!',
            );
        });
    });

    describe('helpCmd', () => {
        it('should log help message', async () => {
            await helpCmd();
            expect(logger.log).toHaveBeenCalled();
        });
    });

    describe('watchCmd', () => {
        it('should throw "Not implemented yet!"', async () => {
            vi.mocked(helper.readProjectConfig).mockReturnValue({
                title: 'TestProject',
            } as any);
            await expect(watchCmd()).rejects.toThrow('Not implemented yet!');
        });
    });

    describe('migrateCmd', () => {
        it('should report "already up to date" if no changes needed', async () => {
            vi.mocked(templateManager.readGlobalConfig).mockReturnValue({
                templates: {},
            } as any);
            vi.mocked(helper.readProjectConfig).mockReturnValue(undefined); // No project.json
            vi.mocked(migrationMod.migration.checkConfig).mockReturnValue({
                needsMigration: false,
            });

            await migrateCmd();

            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining('Checking for legacy file shapes'),
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining('config.json is already up to date'),
            );
            expect(logger.log).toHaveBeenCalledWith(
                expect.stringContaining('No project.json found'),
            );
        });
    });
});
