// Vitest setup file for environment cleanup and shared test configuration
import { vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Initialize global state for the fake home directory.
(globalThis as any).__PZSTUDIO_FAKE_HOME = undefined;

// Use vi.mock for both 'os' and 'node:os'.
// We use a factory that refers to globalThis to avoid closure issues.
// We must use vi.hoisted to ensure the mock can access shared state if needed,
// but for simple globalThis access it's fine.
vi.mock('os', async (importOriginal) => {
    const original = await importOriginal<typeof import('os')>();
    return {
        ...original,
        // We MUST mock both the property and the function if it's destructured
        homedir: () =>
            (globalThis as any).__PZSTUDIO_FAKE_HOME || original.homedir(),
    };
});

vi.mock('node:os', async (importOriginal) => {
    const original = await importOriginal<typeof import('os')>();
    return {
        ...original,
        homedir: () =>
            (globalThis as any).__PZSTUDIO_FAKE_HOME || original.homedir(),
    };
});

// Also keep the direct overwrite as a secondary safety measure for modules
// that might have bypassed vi.mock (e.g. through some complex require chains)
const originalHomedir = os.homedir;
os.homedir = () =>
    (globalThis as any).__PZSTUDIO_FAKE_HOME || originalHomedir();

const getFakeHome = () => (globalThis as any).__PZSTUDIO_FAKE_HOME;
const setFakeHome = (p: string | undefined) => {
    (globalThis as any).__PZSTUDIO_FAKE_HOME = p;
};

beforeEach(() => {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'pzstudio-home-'));
    setFakeHome(tempHome);
});

afterEach(() => {
    const tempHome = getFakeHome();
    if (tempHome && tempHome.includes('pzstudio-home-')) {
        try {
            fs.rmSync(tempHome, { recursive: true, force: true });
        } catch (_e) {
            // Ignore cleanup errors
        }
    }
    setFakeHome(undefined);
});

export { getFakeHome, setFakeHome };
