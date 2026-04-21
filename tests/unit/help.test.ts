import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addHelp, getHelp, getAvailableCommands } from '../../src/lib/help';

describe('help helper', () => {
    beforeEach(() => {
        // Since help.ts uses a global registry, we might want to check it incrementally
    });

    it('should register and retrieve help text', () => {
        addHelp('test-cmd', 'Test help text');
        expect(getHelp('test-cmd')).toBe('Test help text');
    });

    it('should return undefined for non-existent commands', () => {
        expect(getHelp('non-existent')).toBeUndefined();
    });

    it('should list available commands', () => {
        addHelp('cmd1', 'Help 1');
        addHelp('cmd2', 'Help 2');
        const commands = getAvailableCommands();
        expect(commands).toContain('cmd1');
        expect(commands).toContain('cmd2');
    });
});
