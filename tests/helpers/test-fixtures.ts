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
