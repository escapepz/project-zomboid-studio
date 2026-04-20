import { describe, it, expect } from 'vitest';
// @ts-expect-error - ESLint config is JS without types
import config from '../../eslint.config.js';

describe('ESLint Configuration', () => {
    it('should be an array of configuration objects', () => {
        expect(Array.isArray(config)).toBe(true);
        expect(config.length).toBeGreaterThan(0);
    });

    it('should contain ignore patterns', () => {
        const ignoreConfig = config.find((c: any) => c.ignores);
        expect(ignoreConfig).toBeDefined();
        expect(ignoreConfig.ignores).toContain('dist/');
        expect(ignoreConfig.ignores).toContain('node_modules/');
    });

    it('should target src and tests files', () => {
        const srcConfig = config.find(
            (c: any) => c.files && c.files.includes('src/**/*.ts'),
        );
        const testConfig = config.find(
            (c: any) => c.files && c.files.includes('tests/**/*.ts'),
        );

        expect(srcConfig).toBeDefined();
        expect(testConfig).toBeDefined();
    });
});
