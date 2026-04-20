import { describe, it, expect } from 'vitest';
import { parseArgType, cmd, args, arg, processArgs } from '../../src/lib/args';

describe('Args Library', () => {
    describe('parseArgType', () => {
        it('should parse numbers', () => {
            expect(parseArgType('123')).toBe(123);
            expect(parseArgType('12.3')).toBe(12.3);
        });

        it('should parse booleans', () => {
            expect(parseArgType('true')).toBe(true);
            expect(parseArgType('false')).toBe(false);
            expect(parseArgType('TRUE')).toBe(true);
        });

        it('should parse strings', () => {
            expect(parseArgType('hello')).toBe('hello');
        });

        it('should return undefined for falsy inputs', () => {
            expect(parseArgType('')).toBeUndefined();
            expect(parseArgType(null)).toBeUndefined();
        });
    });

    describe('CLI path helpers', () => {
        const mockArgv = ['node', 'pzstudio.js', 'new', 'my-project', '--flag'];

        it('should extract correct command', () => {
            expect(cmd(mockArgv)).toBe('new');
        });

        it('should extract correct args', () => {
            const parsedArgs = args(mockArgv);
            expect(parsedArgs).toHaveLength(2);
            expect(parsedArgs[0]).toBe('my-project');
            expect(parsedArgs[1]).toBe('--flag');
        });

        it('should extract specific arg', () => {
            expect(arg(0, mockArgv)).toBe('my-project');
            expect(arg(1, mockArgv)).toBe('--flag');
        });

        it('should return process args starting from index 2', () => {
            expect(processArgs(mockArgv)).toEqual([
                'new',
                'my-project',
                '--flag',
            ]);
        });
    });
});
