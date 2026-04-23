import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addCmd } from '../../src/lib/commands/add';
import { newCmd } from '../../src/lib/commands/new';
import * as helper from '../../src/lib/helper';
import * as templateManager from '../../src/lib/templateManager';
import fs from 'fs';
import path from 'path';

vi.mock('../../src/lib/helper', () => ({
    projectDir: vi.fn(() => 'D:/project'),
    readProjectConfig: vi.fn(),
    resolveProjectConfig: vi.fn(),
    formatTitleToId: vi.fn((t) => t?.toLowerCase()),
    updateProjectConfig: vi.fn(),
    updateExperimentalScripts: vi.fn(),
    getOutDir: vi.fn(() => 'D:/out'),
}));
vi.mock('../../src/lib/templateManager');
vi.mock('fs');
vi.mock('../../src/lib/logger');
vi.mock('../../src/lib/cli', () => ({
    extractFlag: vi.fn(() => undefined),
    hasFlag: vi.fn(() => false),
}));
vi.mock('../../src/lib/args', () => ({
    processArgs: vi.fn(() => []),
    cmd: vi.fn(),
    splitArgs: vi.fn(() => ({ positionals: [], flags: [] })),
    parseArgType: vi.fn((a) => a),
    arg: vi.fn(),
}));

describe('Local Template Cache (US2)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(helper.projectDir).mockReturnValue('D:/project');
        vi.mocked(templateManager.readGlobalConfig).mockReturnValue({
            useSymlinks: true,
            templates: {},
        } as any);
    });

    it('should use local .template-mod if present in addCmd', async () => {
        vi.mocked(helper.resolveProjectConfig).mockReturnValue({
            mods: {},
        } as any);
        vi.mocked(fs.existsSync).mockImplementation((p: any) =>
            p.includes('.template-mod'),
        );
        vi.mocked(fs.readdirSync).mockImplementation(
            () => ['manifest.json'] as any,
        );

        await addCmd('MyMod', 'mymod');

        expect(templateManager.resolveTemplateDir).not.toHaveBeenCalledWith(
            'mod',
            expect.anything(),
            expect.anything(),
            expect.anything(),
        );
        expect(templateManager.scaffoldProject).toHaveBeenCalledWith(
            expect.stringContaining('.template-mod'),
            expect.stringContaining('mymod'),
            expect.anything(),
            expect.anything(),
            expect.anything(),
        );
    });

    it('should use CWD templates in newCmd', async () => {
        vi.mocked(helper.resolveProjectConfig).mockReturnValue(undefined);
        vi.mocked(helper.readProjectConfig).mockReturnValue({
            workshop: { title: 'old' },
            mods: {},
        } as any);
        vi.mocked(templateManager.resolveTemplateDir).mockReturnValue(
            'D:/mock-template-project',
        );
        vi.mocked(fs.existsSync).mockImplementation((p: any) =>
            p.includes('.template-mod'),
        );
        vi.mocked(fs.readdirSync).mockImplementation(
            () => ['manifest.json'] as any,
        );

        await newCmd('NewProject', 'newproj');

        expect(templateManager.resolveTemplateDir).not.toHaveBeenCalledWith(
            'mod',
            expect.anything(),
            expect.anything(),
            expect.anything(),
        );
    });
});
