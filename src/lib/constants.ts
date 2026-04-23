import { TemplateCategory, ITemplateConfig } from './project';

export const DEFAULT_TEMPLATES: Record<TemplateCategory, ITemplateConfig> = {
    project: {
        url: 'https://github.com/escapepz/pzstudio-template-project.git',
        ref: '42.17.0',
    },
    mod: {
        url: 'https://github.com/escapepz/pzstudio-template-mod.git',
        ref: '42.17.0',
    },
    workshop: {
        url: 'https://github.com/escapepz/pzstudio-template-workshop.git',
        ref: '42.0',
    },
    language: {
        url: 'https://github.com/escapepz/pzstudio-template-language.git',
        ref: '42.13.1',
    },
};
