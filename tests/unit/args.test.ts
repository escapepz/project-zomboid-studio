import { describe, it, expect } from 'vitest';
import {
    parseArgType,
    cmd,
    args,
    arg,
    processArgs,
    splitArgs,
} from '../../src/lib/args';

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

        it('should stringify non-string, non-number truthy values', () => {
            expect(parseArgType({})).toBe('[object Object]');
            expect(parseArgType(['a'])).toBe('a');
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

    describe('splitArgs', () => {
        it('should separate a normal positional argument', () => {
            const result = splitArgs(['my-project']);
            expect(result.positionals).toEqual(['my-project']);
            expect(result.flags).toEqual([]);
        });

        it('should separate a plain flag like --verbose', () => {
            const result = splitArgs(['--verbose']);
            expect(result.flags).toEqual(['--verbose']);
            expect(result.positionals).toEqual([]);
        });

        it('should treat --verbose as a plain flag and following word as positional', () => {
            const result = splitArgs(['--verbose', 'lua']);
            expect(result.flags).toEqual(['--verbose']);
            expect(result.positionals).toEqual(['lua']);
        });

        it('should not consume the next token even if it is not a flag', () => {
            const result = splitArgs(['--verbose', '--force-update']);
            expect(result.flags).toEqual(['--verbose', '--force-update']);
            expect(result.positionals).toEqual([]);
        });

        it('should handle mixed positionals and flags correctly', () => {
            const result = splitArgs([
                'my-project',
                '--verbose',
                '--force-update',
                'lua',
                'extra',
            ]);
            expect(result.positionals).toEqual(['my-project', 'lua', 'extra']);
            expect(result.flags).toEqual(['--verbose', '--force-update']);
        });

        it('should return empty arrays for empty input', () => {
            const result = splitArgs([]);
            expect(result.positionals).toEqual([]);
            expect(result.flags).toEqual([]);
        });
    });
});
