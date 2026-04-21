import { describe, it, expect } from 'vitest';
import { TemplateResolutionError } from '../../src/lib/errors/TemplateResolutionError';

describe('TemplateResolutionError', () => {
    it('should set the name and message correctly', () => {
        const error = new TemplateResolutionError('custom message');
        expect(error.name).toBe('TemplateResolutionError');
        expect(error.message).toBe('custom message');
    });
});
