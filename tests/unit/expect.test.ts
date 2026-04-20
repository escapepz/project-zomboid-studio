import { describe, it, expect as vitestExpect } from 'vitest';
import { expect as validateExpect } from '../../src/lib/expect';

describe('Expect Library', () => {
    it('should validate strings', () => {
        vitestExpect(() =>
            validateExpect('test', 'hello', 'string'),
        ).not.toThrow();
        vitestExpect(() => validateExpect('test', 123, 'string')).toThrow();
    });

    it('should validate numbers', () => {
        vitestExpect(() => validateExpect('test', 123, 'number')).not.toThrow();
        vitestExpect(() => validateExpect('test', '123', 'number')).toThrow();
    });

    it('should validate booleans', () => {
        vitestExpect(() =>
            validateExpect('test', true, 'boolean'),
        ).not.toThrow();
        vitestExpect(() => validateExpect('test', 'true', 'boolean')).toThrow();
    });

    it('should validate union types with undefined', () => {
        vitestExpect(() =>
            validateExpect('test', 'hello', 'string|undefined'),
        ).not.toThrow();
        vitestExpect(() =>
            validateExpect('test', undefined, 'string|undefined'),
        ).not.toThrow();
        vitestExpect(() =>
            validateExpect('test', 123, 'string|undefined'),
        ).toThrow();
    });
});
