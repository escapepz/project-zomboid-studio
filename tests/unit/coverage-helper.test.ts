import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// We need to use doMock to control basename(__dirname) behavior inside helper.ts
// and to mock the experimental scripts file.

describe('Helper Coverage Gaps', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('workingDir should return __dirname when running from dist', async () => {
        let capturedDirname: string = '';
        vi.doMock('path', async (importOriginal) => {
            const actual = await importOriginal<typeof import('path')>();
            return {
                ...actual,
                basename: (p: string) => {
                    if (p.includes('lib') || p.includes('src')) {
                        capturedDirname = p;
                        return 'dist';
                    }
                    return actual.basename(p);
                },
            };
        });

        const { workingDir } = await import('../../src/lib/helper');
        const dir = workingDir();

        expect(dir).toBe(capturedDirname);
        expect(dir).toBeDefined();
    });

    it('updateExperimentalScripts should use dist path and handle missing functions', async () => {
        vi.doMock('fs', async (importOriginal) => {
            const actual = await importOriginal<typeof import('fs')>();
            return {
                ...actual,
                existsSync: vi.fn().mockReturnValue(true),
            };
        });

        vi.doMock('path', async (importOriginal) => {
            const actual = await importOriginal<typeof import('path')>();
            return {
                ...actual,
                basename: (p: string) => {
                    if (p.includes('lib') || p.includes('src')) return 'dist';
                    return actual.basename(p);
                },
            };
        });

        const { updateExperimentalScripts } =
            await import('../../src/lib/helper');

        // This should not throw even if the require fails (it's caught)
        updateExperimentalScripts('addProject', '/some/dir');
    });

    it('updateExperimentalScripts should handle script with missing functions', async () => {
        const tempScriptPath = path.resolve(
            process.cwd(),
            'temp-empty-script.js',
        );
        const scriptContent = 'module.exports = {};'; // Empty exports

        const fsReal = await vi.importActual<typeof import('fs')>('fs');
        fsReal.writeFileSync(tempScriptPath, scriptContent);

        try {
            vi.doMock('path', async (importOriginal) => {
                const actual = await importOriginal<typeof import('path')>();
                return {
                    ...actual,
                    basename: () => 'lib',
                    resolve: () => tempScriptPath,
                };
            });

            vi.doMock('fs', async (importOriginal) => {
                const actual = await importOriginal<typeof import('fs')>();
                return {
                    ...actual,
                    existsSync: (p: string) =>
                        p === tempScriptPath || actual.existsSync(p),
                };
            });

            const { updateExperimentalScripts } =
                await import('../../src/lib/helper');

            // Call all actions to cover the 'if' branches being false
            updateExperimentalScripts('addProject', '/dir');
            updateExperimentalScripts('addMod', '/dir', 'mod1');
            updateExperimentalScripts('removeMod', '/dir', 'mod1');
            // renameMod with modId but no newModId — covers the falsy `&& newModId` branch (helper.ts:699)
            updateExperimentalScripts('renameMod', '/dir', 'mod1', undefined);
        } finally {
            if (fsReal.existsSync(tempScriptPath)) {
                fsReal.unlinkSync(tempScriptPath);
            }
        }
    });

    it('updateExperimentalScripts should call script functions when they exist', async () => {
        // We use a real file to ensure require() finds it, as mocking absolute paths can be tricky
        const tempScriptPath = path.resolve(
            process.cwd(),
            'temp-experimental-script.js',
        );
        const scriptContent = `
            module.exports = {
                addProjectScripts: (dir) => { global.test_addProjectDir = dir; },
                addModScripts: (dir, id) => { global.test_addModDir = dir; global.test_addModId = id; },
                removeModScripts: (dir, id) => { global.test_removeModDir = dir; global.test_removeModId = id; },
                renameModScripts: (dir, oldId, newId) => { global.test_renameModDir = dir; global.test_renameOldId = oldId; global.test_renameNewId = newId; }
            };
        `;

        // Use real fs to write the file
        const fsReal = await vi.importActual<typeof import('fs')>('fs');
        fsReal.writeFileSync(tempScriptPath, scriptContent);

        try {
            vi.doMock('path', async (importOriginal) => {
                const actual = await importOriginal<typeof import('path')>();
                return {
                    ...actual,
                    basename: () => 'lib', // Force non-dist branch
                    resolve: () => tempScriptPath,
                };
            });

            vi.doMock('fs', async (importOriginal) => {
                const actual = await importOriginal<typeof import('fs')>();
                return {
                    ...actual,
                    existsSync: (p: string) =>
                        p === tempScriptPath || actual.existsSync(p),
                };
            });

            const { updateExperimentalScripts } =
                await import('../../src/lib/helper');

            updateExperimentalScripts('addProject', '/dir');
            expect((global as any).test_addProjectDir).toBe('/dir');

            updateExperimentalScripts('addMod', '/dir', 'mod1');
            expect((global as any).test_addModDir).toBe('/dir');
            expect((global as any).test_addModId).toBe('mod1');

            updateExperimentalScripts('removeMod', '/dir', 'mod1');
            expect((global as any).test_removeModDir).toBe('/dir');
            expect((global as any).test_removeModId).toBe('mod1');

            updateExperimentalScripts('renameMod', '/dir', 'oldMod', 'newMod');
            expect((global as any).test_renameModDir).toBe('/dir');
            expect((global as any).test_renameOldId).toBe('oldMod');
            expect((global as any).test_renameNewId).toBe('newMod');
        } finally {
            if (fsReal.existsSync(tempScriptPath)) {
                fsReal.unlinkSync(tempScriptPath);
            }
            delete (global as any).test_addProjectDir;
            delete (global as any).test_addModDir;
            delete (global as any).test_addModId;
            delete (global as any).test_removeModDir;
            delete (global as any).test_removeModId;
            delete (global as any).test_renameModDir;
            delete (global as any).test_renameOldId;
            delete (global as any).test_renameNewId;
        }
    });
});
