import { describe, it, expect, beforeEach } from 'vitest';
import {
    ValidationContext,
    validateProject,
    validateConfig,
    validateOutdirField,
    validateTemplatesField,
    validateUseSymlinksField,
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

        it('should report error for missing workshop.title', () => {
            validateProject({ workshop: {} }, context);
            expect(context.hasErrors()).toBe(true);
            const errors = context.getErrors();
            expect(errors.some((e) => e.location.endsWith('title'))).toBe(true);
        });

        it('should report error for invalid visibility', () => {
            const config = {
                workshop: {
                    title: 'Test',
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
                workshop: {
                    title: 'Test',
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
                workshop: {
                    title: 'Test',
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
                workshop: { title: 'Test', visibility: 'public', tags: [] },
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

        it('should pass for valid project with minimal settings', () => {
            const config = {
                workshop: {
                    title: 'Test',
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
        it('should report error for templates field in project.json', () => {
            const config = {
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: {},
                templates: {
                    mod: { url: 'user/repo' },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('templates')),
            ).toBe(true);
            expect(
                context
                    .getErrors()
                    .find((e) => e.location.includes('templates'))?.problem,
            ).toContain('no longer supported');
        });

        it('should report error for non-string pack entry', () => {
            const config = {
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                        pack: [{ name: 'legacy' }],
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context.getErrors().some((e) => e.location.includes('pack')),
            ).toBe(true);
        });

        it('should report error for non-string tiledef entry', () => {
            const config = {
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                        tiledef: [{ name: 'legacy', fileNumber: 123 }],
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context.getErrors().some((e) => e.location.includes('tiledef')),
            ).toBe(true);
        });

        it('should pass for valid string array pack and tiledef', () => {
            const config = {
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                        pack: ['pack1', 'pack2'],
                        tiledef: ['tile1 123', 'tile2 456'],
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(false);
        });

        it('should pass when build.modInfo is absent (omission is a valid default)', () => {
            const config = {
                workshop: {
                    title: 'Test',
                    visibility: 'public',
                    tags: ['Building'],
                },
                mods: {
                    mod1: { name: 'Mod 1', description: 'Desc' },
                    mod2: { name: 'Mod 2', description: 'Desc', build: {} },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(false);
        });

        it('should report error when build.modInfo is a non-string (e.g. number)', () => {
            const config = {
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                        build: { modInfo: 42 },
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('build.modInfo')),
            ).toBe(true);
        });

        it('should report error when build.modInfo is an object', () => {
            const config = {
                workshop: { title: 'Test', visibility: 'public', tags: [] },
                mods: {
                    mod1: {
                        name: 'Mod 1',
                        description: 'Desc',
                        build: { modInfo: { mode: 'auto' } },
                    },
                },
            };
            validateProject(config, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('build.modInfo')),
            ).toBe(true);
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

        it('should report error for invalid useSymlinks type', () => {
            validateConfig({ useSymlinks: 'yes' }, context);
            expect(context.hasErrors()).toBe(true);
            expect(
                context
                    .getErrors()
                    .some((e) => e.location.includes('useSymlinks')),
            ).toBe(true);
        });

        it('should pass for valid useSymlinks boolean', () => {
            validateConfig({ useSymlinks: true }, context);
            expect(context.hasErrors()).toBe(false);
        });
    });

    describe('validateOutdirField', () => {
        it('should report error for non-string', () => {
            validateOutdirField(123, context);
            expect(context.hasErrors()).toBe(true);
        });
    });

    describe('validateTemplatesField', () => {
        it('should report error for non-object', () => {
            validateTemplatesField('invalid', context);
            expect(context.hasErrors()).toBe(true);
        });

        it('should report error for invalid url', () => {
            validateTemplatesField({ mod: { url: 123 } }, context);
            expect(context.hasErrors()).toBe(true);
        });
    });

    describe('validateUseSymlinksField', () => {
        it('should report error for non-boolean', () => {
            validateUseSymlinksField('yes', context);
            expect(context.hasErrors()).toBe(true);
        });
    });
});
