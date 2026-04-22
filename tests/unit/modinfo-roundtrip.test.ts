import { describe, it, expect } from 'vitest';
import { parseModInfoText, generateModInfoText } from '../../src/lib/helper';
import { IProjectConfig } from '../../src/lib/project';

describe('mod.info lossless round-trip', () => {
    it('should round-trip all supported fields losslessly', () => {
        const originalModInfo = `
id=test_mod
name=Test Mod
description=Line 1\\nLine 2
author=Antigravity
modversion=1.2.3
poster=poster.png
poster=screenshot1.png
icon=icon.png
require=Base,ModA,ModB
incompatible=ModC
loadModAfter=ModD
loadModBefore=ModE
pack=mypack
tiledef=mytiles 123
category=Items
url=https://example.com
versionMin=41.0
versionMax=42.0
unknown_field=some value
`.trim();

        const parsed = parseModInfoText(originalModInfo);

        const projectConfig: IProjectConfig = {
            workshop: { title: 'T', visibility: 'public', tags: [] },
            mods: {
                test_mod: parsed as any,
            },
        };

        const generated = generateModInfoText('test_mod', projectConfig);

        // Check if all fields are present.
        // Note: Order might differ, so we check line by line (sorted)
        const originalLines = originalModInfo
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l)
            .sort();
        const generatedLines = generated
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l)
            .sort();

        // Wait, my parseModInfoText preserves unknown fields.
        // But generateModInfoText only writes KNOWN fields.
        // I should update generateModInfoText to also write unknown fields if we want lossless round-trip.

        expect(generatedLines).toEqual(originalLines);
    });
});
