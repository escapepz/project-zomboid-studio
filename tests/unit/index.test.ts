import { describe, it, expect, vi } from 'vitest';
import { runCLI } from '../../src/lib/cli';

vi.mock('../../src/lib/cli', () => ({
    runCLI: vi.fn(),
}));

describe('Index Entry Point', () => {
    it('should call runCLI when imported', async () => {
        // We import the index file which should execute the side effect
        await import('../../src/index');
        expect(runCLI).toHaveBeenCalled();
    });
});
