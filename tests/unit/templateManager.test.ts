import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIgnoreFilter } from '../../src/lib/templateManager';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('templateManager - createIgnoreFilter', () => {
    let tmpRoot: string;

    beforeEach(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), 'pzstudio-test-'));
    });

    afterEach(() => {
        rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('T006 - filters literal files correctly based on .pzstudioignore', () => {
        writeFileSync(join(tmpRoot, '.pzstudioignore'), 'ignored-file.txt\n');
        writeFileSync(join(tmpRoot, 'ignored-file.txt'), 'test');
        writeFileSync(join(tmpRoot, 'kept-file.txt'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'ignored-file.txt'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'kept-file.txt'), '')).toBe(true);
    });

    it('T006 - filters literal folders correctly based on .pzstudioignore', () => {
        writeFileSync(join(tmpRoot, '.pzstudioignore'), 'ignored-folder\n');
        mkdirSync(join(tmpRoot, 'ignored-folder'));
        writeFileSync(join(tmpRoot, 'ignored-folder', 'file.txt'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'ignored-folder'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'ignored-folder', 'file.txt'), '')).toBe(
            false,
        );

        mkdirSync(join(tmpRoot, 'kept-folder'));
        expect(filter(join(tmpRoot, 'kept-folder'), '')).toBe(true);
    });

    it('T008 - non-matching literals, whitespace handling', () => {
        writeFileSync(
            join(tmpRoot, '.pzstudioignore'),
            '  spaced-file.txt  \n\n',
        );
        writeFileSync(join(tmpRoot, 'spaced-file.txt'), 'test');
        writeFileSync(join(tmpRoot, 'other-file.txt'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'spaced-file.txt'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'other-file.txt'), '')).toBe(true);
    });

    it('T008 - folder-prefix matching with explicit trailing slash', () => {
        writeFileSync(join(tmpRoot, '.pzstudioignore'), 'my-folder/\n');
        mkdirSync(join(tmpRoot, 'my-folder'));
        writeFileSync(join(tmpRoot, 'my-folder', 'file.txt'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'my-folder'), '')).toBe(false);
        expect(filter(join(tmpRoot, 'my-folder', 'file.txt'), '')).toBe(false);
    });

    it('T008 - long-path stability', () => {
        writeFileSync(join(tmpRoot, '.pzstudioignore'), 'deep/nested/folder\n');
        mkdirSync(join(tmpRoot, 'deep'));
        mkdirSync(join(tmpRoot, 'deep', 'nested'));
        mkdirSync(join(tmpRoot, 'deep', 'nested', 'folder'));
        writeFileSync(
            join(tmpRoot, 'deep', 'nested', 'folder', 'file.txt'),
            'test',
        );

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, 'deep'), '')).toBe(true);
        expect(filter(join(tmpRoot, 'deep', 'nested'), '')).toBe(true);
        expect(filter(join(tmpRoot, 'deep', 'nested', 'folder'), '')).toBe(
            false,
        );
        expect(
            filter(join(tmpRoot, 'deep', 'nested', 'folder', 'file.txt'), ''),
        ).toBe(false);
    });

    it('T010 - built-in exclusions', () => {
        mkdirSync(join(tmpRoot, '.git'));
        writeFileSync(join(tmpRoot, '.git', 'config'), 'test');
        writeFileSync(join(tmpRoot, '.gitmodules'), 'test');
        writeFileSync(join(tmpRoot, '.gitkeep'), 'test');
        mkdirSync(join(tmpRoot, '.github'));
        writeFileSync(join(tmpRoot, '.github', 'workflows.yml'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        expect(filter(join(tmpRoot, '.git'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.git', 'config'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.gitmodules'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.gitkeep'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.github'), '')).toBe(false);
        expect(filter(join(tmpRoot, '.github', 'workflows.yml'), '')).toBe(
            false,
        );
    });

    it('T010 - nested .pzstudioignore resolves to closest', () => {
        writeFileSync(join(tmpRoot, '.pzstudioignore'), 'root-ignored\n');
        mkdirSync(join(tmpRoot, 'subfolder'));
        writeFileSync(
            join(tmpRoot, 'subfolder', '.pzstudioignore'),
            'sub-ignored\n',
        );

        writeFileSync(join(tmpRoot, 'root-ignored'), 'test');
        writeFileSync(join(tmpRoot, 'subfolder', 'root-ignored'), 'test');
        writeFileSync(join(tmpRoot, 'subfolder', 'sub-ignored'), 'test');

        const filter = createIgnoreFilter(tmpRoot);

        // At root
        expect(filter(join(tmpRoot, 'root-ignored'), '')).toBe(false);
        // At subfolder (since subfolder/.pzstudioignore doesn't ignore 'root-ignored')
        expect(filter(join(tmpRoot, 'subfolder', 'root-ignored'), '')).toBe(
            true,
        );
        // At subfolder, ignored by subfolder
        expect(filter(join(tmpRoot, 'subfolder', 'sub-ignored'), '')).toBe(
            false,
        );
    });
});
