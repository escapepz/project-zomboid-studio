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

        it('should consume value for a value flag like --template foo', () => {
            const result = splitArgs(['--template', 'lua']);
            expect(result.flags).toEqual(['--template', 'lua']);
            expect(result.positionals).toEqual([]);
        });

        it('should not consume the next token if it is another flag', () => {
            const result = splitArgs(['--template', '--verbose']);
            expect(result.flags).toEqual(['--template', '--verbose']);
            expect(result.positionals).toEqual([]);
        });

        it('should handle mixed positionals and flags', () => {
            const result = splitArgs([
                'my-project',
                '--verbose',
                '--template',
                'lua',
                'extra',
            ]);
            expect(result.positionals).toEqual(['my-project', 'extra']);
            expect(result.flags).toEqual(['--verbose', '--template', 'lua']);
        });

        it('should return empty arrays for empty input', () => {
            const result = splitArgs([]);
            expect(result.positionals).toEqual([]);
            expect(result.flags).toEqual([]);
        });
    });
});
