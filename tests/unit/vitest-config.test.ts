import { describe, it, expect } from 'vitest';
import config from '../../vitest.config';

describe('Vitest Configuration', () => {
    it('should have correct test environment and globals', () => {
        expect(config.test.environment).toBe('node');
        expect(config.test.globals).toBe(true);
    });

    it('should include correct test files', () => {
        expect(config.test.include).toContain('tests/**/*.test.ts');
    });

    it('should define coverage boundaries for deterministic modules', () => {
        expect(config.test.coverage.include).toContain('src/lib/args.ts');
        expect(config.test.coverage.include).toContain('src/lib/expect.ts');
        expect(config.test.coverage.include).toContain('src/lib/helper.ts');
    });
});
