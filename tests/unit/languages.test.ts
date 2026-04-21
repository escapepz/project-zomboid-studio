import { describe, it, expect } from 'vitest';
import { Languages } from '../../src/lib/languages';

describe('Languages constant', () => {
    it('should contain English', () => {
        expect(Languages.EN).toBeDefined();
        expect(Languages.EN.name).toBe('English');
    });

    it('should have correct charset for Russian', () => {
        expect(Languages.RU.charset).toBe('windows-1251');
    });

    it('should have utf-8 for Chinese', () => {
        expect(Languages.CN.charset).toBe('utf-8');
    });
});
