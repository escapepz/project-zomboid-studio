---
name: Feature request
about: Suggest an idea for this project
title: '[Feature] Custom build flags per mod (skip mod.info generation, custom output options)'
labels: enhancement
assignees: ''
---

## Is your feature request related to a problem? Please describe.

Currently, `pzstudio build` and `pzstudio watch` **always** generate and overwrite `mod.info`
for every mod during the build process (see `build.ts` lines 53-60, `watch.ts` lines 152-157).

This creates a conflict for mods that **ship their own `mod.info` file directly in the mod
folder** (i.e., as a committed file in the source tree). When such a file exists, the build
pipeline silently stomps on it with the auto-generated version derived from `project.json`,
which may differ in content or structure — for example, a mod author might have a hand-crafted
`mod.info` with fields that `generateModInfoText()` doesn't support, or they might intentionally
manage versioning outside `project.json`.

There is no way today to tell the build system "this mod manages its own `mod.info`, leave it
alone."

---

## Describe the solution you'd like

Introduce **per-mod build flags** in `project.json` (the `IModConfig` interface, `project.d.ts`)
that let authors opt in or out of specific build-step behaviours.

### Proposed `IModConfig` extension

```ts
export interface IModConfig {
    // ... existing fields ...

    /**
     * Custom build flags for this mod.
     * Omitting a flag uses the default (auto) behaviour.
     */
    build?: {
        /**
         * Controls whether mod.info is auto-generated from project.json.
         *
         * - "auto"   (default) — generate mod.info from project.json as today
         * - "skip"             — never generate; use whatever file exists in the mod folder
         * - "auto-if-missing"  — generate only if mod.info is not already present in the output
         */
        modInfo?: 'auto' | 'skip' | 'auto-if-missing';
    };
}
```

### Example `project.json`

```json
{
    "mods": {
        "MyMod": {
            "name": "My Mod",
            "description": "...",
            "build": {
                "modInfo": "skip"
            }
        },
        "AnotherMod": {
            "name": "Another Mod",
            "description": "...",
            "build": {
                "modInfo": "auto-if-missing"
            }
        }
    }
}
```

### Required code changes

| File                        | Change                                                                         |
| --------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/project.d.ts`      | Add optional `build.modInfo` field to `IModConfig`                             |
| `src/lib/commands/build.ts` | Check `modConfig.build?.modInfo` before calling `writeFileSync` for `mod.info` |
| `src/lib/commands/watch.ts` | Same guard in the `project.json` change handler (lines 149-158)                |
| `src/lib/helper.ts`         | No change needed to `generateModInfoText()` itself                             |

---

## Describe alternatives you've considered

1. **Simple boolean `skipModInfo: true`** — simpler API but less flexible; doesn't cover the
   "only generate if missing" use case (useful during `watch` where the file may have been
   wiped by a prior `build`).

2. **Pre/post build hooks** — a general scripting hook system (similar to `npm` scripts) that
   would allow arbitrary manipulation after the copy phase. This is more powerful but
   significantly heavier to implement and is a separate feature.

3. **Commit `mod.info` to the versioned folder automatically** — instead of the build skipping
   generation, the `init mod` command could write `mod.info` directly into the source tree when
   `skipModInfo` is set. This was dismissed because it conflates source files with build
   artefacts.

---

## Additional context

- Affected commands: `build`, `watch`
- Affected source files: `src/lib/commands/build.ts`, `src/lib/commands/watch.ts`, `src/lib/project.d.ts`
- The flag should be silently ignored (fall back to `"auto"`) if the `build` key is absent,
  preserving backward compatibility with all existing `project.json` files.
- A `"skip"` flag on the `watch` command should also suppress the re-generation that happens
  when `project.json` itself is saved (the `else if (modId === 'project.json')` branch in
  `watch.ts` lines 141-158).
