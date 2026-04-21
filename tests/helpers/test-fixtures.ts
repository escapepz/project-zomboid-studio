import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Creates a temporary directory for testing filesystem operations.
 * @returns The absolute path to the temporary directory.
 */
export function createTempDir(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pzstudio-test-'));
    return tempDir;
}

/**
 * Recursively deletes a directory.
 * @param dirPath The path to the directory to delete.
 */
export function deleteDir(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
}

/**
 * Creates a mock file with content.
 * @param filePath The path where the file should be created.
 * @param content The content of the file.
 */
export function createMockFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

export const FIXTURES = {
    PROJECT: {
        MINIMAL: JSON.stringify(
            {
                title: 'Minimal Project',
                authors: 'Author',
                workshop: {
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    testmod: {
                        name: 'Test Mod',
                        description: 'Description',
                    },
                },
            },
            null,
            2,
        ),
        LEGACY: JSON.stringify(
            {
                title: 'Legacy Project',
                authors: ['Author 1'],
                workshop: {
                    visibility: 'private',
                    tags: ['Interface'],
                    // missing excludes
                },
                mods: {
                    legacymod: {
                        name: 'Legacy Mod',
                        description: 'Legacy Description',
                        // missing build.modInfo
                    },
                },
            },
            null,
            2,
        ),
        MALFORMED: '{ "title": "Malformed", "authors": [ }',
        INVALID_TYPES: JSON.stringify(
            {
                title: 123, // should be string
                authors: { name: 'Author' }, // should be string or string[]
                workshop: 'public', // should be object
                mods: [], // should be object
            },
            null,
            2,
        ),
    },
    CONFIG: {
        MINIMAL: '{}',
        LEGACY: JSON.stringify(
            {
                outdir: './output',
                // missing useSymlinks
            },
            null,
            2,
        ),
        MALFORMED: 'not json',
    },
    MOD_INFO: {
        LEGACY: `name=Legacy Mod
id=legacymod
description=Legacy Description
poster=poster.png`,
    },
    ROUND_TRIP: {
        PROJECT: JSON.stringify(
            {
                title: 'Round Trip Project',
                authors: ['Author 1'],
                workshop: {
                    id: 12345,
                    visibility: 'public',
                    tags: ['Building'],
                    excludes: ['mod2'],
                },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc 1',
                        poster: 'poster.png',
                        icon: 'icon.png',
                        build: {
                            modInfo: 'auto',
                        },
                    },
                },
                unknownField: 'preserve me',
            },
            null,
            2,
        ),
        CONFIG: JSON.stringify(
            {
                outdir: './workshop',
                useSymlinks: true,
                unknownGlobalField: 'keep this too',
            },
            null,
            2,
        ),
    },
};
