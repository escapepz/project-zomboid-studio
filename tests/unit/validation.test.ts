import { describe, it, expect, beforeEach } from 'vitest';
import {
    ValidationContext,
    validateProject,
    validateConfig,
} from '../../src/lib/validation';

describe('Validation', () => {
    let context: ValidationContext;

    beforeEach(() => {
        context = new ValidationContext('test.json');
    });

    describe('validateProject', () => {
        it('should report error for non-object root', () => {
            validateProject(null, context);
            expect(context.hasErrors()).toBe(true);
            expect(context.getErrors()[0].problem).toContain(
                'Root must be a plain object',
            );
        });

        it('should report error for missing title', () => {
            validateProject({}, context);
            expect(context.hasErrors()).toBe(true);
            const errors = context.getErrors();
            expect(errors.some((e) => e.location.endsWith('title'))).toBe(true);
        });

        it('should report error for invalid visibility', () => {
            const config = {
                title: 'Test',
                authors: 'Author',
                workshop: {
                    visibility: 'invalid',
                    tags: [],
                },
                mods: {},
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('workshop.visibility')),
            ).toBe(true);
        });

        it('should pass for valid minimal project', () => {
            const config = {
                title: 'Test',
                authors: 'Author',
                workshop: {
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(false);
        });

        it('should report error for invalid workshop id', () => {
            const config = {
                title: 'Test',
                authors: 'Author',
                workshop: {
                    id: 'not-a-number',
                    visibility: 'public',
                    tags: [],
                },
                mods: {},
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('workshop.id')),
            ).toBe(true);
        });

        it('should report error for invalid mod poster', () => {
            const config = {
                title: 'Test',
                authors: 'Author',
                workshop: { visibility: 'public', tags: [] },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                        poster: 123,
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('mods.mod1.poster')),
            ).toBe(true);
        });

        it('should pass for valid project with authors array', () => {
            const config = {
                title: 'Test',
                authors: ['Author 1', 'Author 2'],
                workshop: {
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(false);
        });
    });

    describe('validateConfig', () => {
        it('should report error for invalid outdir type', () => {
            validateConfig({ outdir: 123 }, context);
            expect(context.hasErrors()).toBe(true);
            expect(context.getErrors()[0].location).toContain('outdir');
        });

        it('should report error for invalid template url', () => {
            validateConfig(
                {
                    templates: {
                        mod: { url: 123 },
                    },
                },
                context,
            );
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('templates.mod.url')),
            ).toBe(true);
        });

        it('should pass for empty config', () => {
            validateConfig({}, context);
            expect(context.hasErrors()).toBe(false);
        });
    });
});
