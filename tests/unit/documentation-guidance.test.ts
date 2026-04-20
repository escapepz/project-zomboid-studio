import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Documentation Guidance', () => {
    const readmePath = path.resolve(__dirname, '../../README.md');

    it('should exist', () => {
        expect(fs.existsSync(readmePath)).toBe(true);
    });

    it('should name standard quality commands', () => {
        const content = fs.readFileSync(readmePath, 'utf8');
        expect(content).toContain('npm run lint');
        expect(content).toContain('npm run test');
    });

    it('should mention the coverage boundary', () => {
        const content = fs.readFileSync(readmePath, 'utf8');
        expect(content).toContain('deterministic library logic');
        expect(content).toContain('Manual verification remains required');
    });
});
