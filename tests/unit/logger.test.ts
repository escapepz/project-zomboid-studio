import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    setVerbose,
    isVerbose,
    verbose,
    log,
    info,
    warn,
    error,
    setLogger,
} from '../../src/lib/logger';

vi.mock('terminal-kit', () => {
    return {
        terminal: {
            white: (msg: string) => console.log(msg),
            brightCyan: (msg: string) => console.log(msg),
            yellow: (msg: string) => console.log(msg),
            red: (msg: string) => console.error(msg),
            gray: (msg: string) => console.log(msg),
        },
    };
});

describe('Logger', () => {
    let mockLogger: any;

    beforeEach(() => {
        setVerbose(false);
        mockLogger = {
            log: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            verbose: vi.fn(),
        };
        setLogger(mockLogger);
    });

    it('should respect verbose flag', () => {
        verbose('test');
        expect(mockLogger.verbose).not.toHaveBeenCalled();

        setVerbose(true);
        verbose('test');
        expect(mockLogger.verbose).toHaveBeenCalledWith('test');
    });

    it('should log normally', () => {
        log('test log');
        expect(mockLogger.log).toHaveBeenCalledWith('test log');
    });

    it('should log info', () => {
        info('test info');
        expect(mockLogger.info).toHaveBeenCalledWith('test info');
    });

    it('should log warn', () => {
        warn('test warn');
        expect(mockLogger.warn).toHaveBeenCalledWith('test warn');
    });

    it('should log error', () => {
        const err = new Error('test error');
        error(err);
        expect(mockLogger.error).toHaveBeenCalledWith(err);
    });
});
