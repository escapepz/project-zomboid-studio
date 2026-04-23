/**
 * Shared state for the fake home directory used in tests.
 * Uses globalThis to ensure the state is shared across all modules and mocks.
 */

/**
 * Returns the current fake home directory path.
 */
export function getFakeHome(): string | undefined {
    return (globalThis as any).__PZSTUDIO_FAKE_HOME;
}

/**
 * Sets the current fake home directory path.
 * @param path The path to use as the fake home, or undefined to use the real one.
 */
export function setFakeHome(path: string | undefined): void {
    (globalThis as any).__PZSTUDIO_FAKE_HOME = path;
}
