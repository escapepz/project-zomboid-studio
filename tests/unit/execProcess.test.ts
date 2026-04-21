import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execProcessAsync } from '../../src/lib/execProcess';
import { fork } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process');
vi.mock('../../src/lib/logger');
vi.mock('../../src/lib/helper', () => ({
    workingDir: () => 'D:/work',
}));

describe('execProcessAsync', () => {
    it('should resolve with stdout on success', async () => {
        const mockChild: any = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();

        vi.mocked(fork).mockReturnValue(mockChild);

        const promise = execProcessAsync('test', 'param1');

        mockChild.stdout.emit('data', 'success output');
        mockChild.emit('close', 0);

        const result = await promise;
        expect(result).toBe('success output');
    });

    it('should reject with stderr on failure', async () => {
        const mockChild: any = new EventEmitter();
        mockChild.stdout = new EventEmitter();
        mockChild.stderr = new EventEmitter();

        vi.mocked(fork).mockReturnValue(mockChild);

        const promise = execProcessAsync('test', 'param1');

        mockChild.stderr.emit('data', 'error message');
        mockChild.emit('close', 1);

        await expect(promise).rejects.toThrow('error message');
    });
});
