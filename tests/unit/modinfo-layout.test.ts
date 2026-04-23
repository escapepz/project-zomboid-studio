import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveModInfoTargets } from '../../src/lib/helper';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('modinfo layout resolution', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should identify valid branch folders containing media', () => {
        const modId = 'my_mod';
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            const pStr = String(p);
            if (pStr.includes('media')) return true;
            if (pStr.endsWith(modId)) return true;
            return false;
        });

        vi.mocked(fs.readdirSync).mockReturnValue([
            'common',
            '42',
            'other',
        ] as any);
        vi.mocked(fs.statSync).mockReturnValue({
            isDirectory: () => true,
        } as any);

        const targets = resolveModInfoTargets(modId);
        expect(targets).toHaveLength(3);
        expect(targets[0]).toContain('common');
        expect(targets[1]).toContain('42');
        expect(targets[2]).toContain('other');
    });

    it('should filter out folders without media payloads', () => {
        const modId = 'my_mod';
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            const pStr = String(p);
            if (pStr.includes(path.join('common', 'media'))) return true;
            if (pStr.endsWith(modId)) return true;
            return false;
        });

        vi.mocked(fs.readdirSync).mockReturnValue(['common', 'empty'] as any);
        vi.mocked(fs.statSync).mockReturnValue({
            isDirectory: () => true,
        } as any);

        const targets = resolveModInfoTargets(modId);
        expect(targets).toHaveLength(1);
        expect(targets[0]).toContain('common');
    });

    it('should ignore root-level mod.info implicitly by scanning subdirectories only', () => {
        const modId = 'my_mod';
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            const pStr = String(p);
            if (pStr.endsWith(path.join(modId, 'media'))) return true;
            if (pStr.endsWith(modId)) return true;
            return false;
        });

        vi.mocked(fs.readdirSync).mockReturnValue(['media'] as any);
        vi.mocked(fs.statSync).mockImplementation((p: any) => {
            const pStr = String(p);
            return {
                isDirectory: () => !pStr.endsWith('mod.info'),
            } as any;
        });
        const targets = resolveModInfoTargets(modId);
        expect(targets).toHaveLength(0);
    });

    it('should respect user-owned version folders like 42.13.1', () => {
        const modId = 'my_mod';
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            const pStr = String(p);
            if (pStr.includes(path.join('42.13.1', 'media'))) return true;
            if (pStr.endsWith(modId)) return true;
            return false;
        });

        vi.mocked(fs.readdirSync).mockReturnValue(['42.13.1'] as any);
        vi.mocked(fs.statSync).mockReturnValue({
            isDirectory: () => true,
        } as any);

        const targets = resolveModInfoTargets(modId);
        expect(targets).toHaveLength(1);
        expect(targets[0]).toContain('42.13.1');
    });
    it('should return empty array if readdirSync fails', () => {
        const modId = 'my_mod';
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockImplementation(() => {
            throw new Error('Permission denied');
        });

        const targets = resolveModInfoTargets(modId);
        expect(targets).toHaveLength(0);
    });
});
