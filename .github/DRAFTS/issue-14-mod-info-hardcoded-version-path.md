**Is your feature request related to a problem? Please describe.**

`pzstudio build` hardcodes the game-version subfolder `42.13.1` when placing `mod.info`
in the output, instead of respecting the mod's own folder structure.
It also falls back to `'auto'` when `build.modInfo` is not set, silently overwriting any
hand-crafted `mod.info` a mod author has placed in the mod folder.

```ts
// build.ts – lines 54-57 (current)
const modInfoFlag = projectConfig.mods[modId].build?.modInfo ?? 'auto'; // wrong default
const modVersionPath = join(outModsPath, '42.13.1'); // hardcoded ❌
mkdirSync(modVersionPath, { recursive: true });
const modInfoPath = join(modVersionPath, 'mod.info');
```

This produces two distinct problems:

**1 — Hardcoded version path.**
The build unconditionally creates and writes into `<mod>/42.13.1/mod.info`.
This breaks as soon as the game updates its versioned subfolder structure.
More critically, the planned **multi-version template architecture** (Milestone [3](https://github.com/escapepz/project-zomboid-studio/milestone/1) + [2](https://github.com/escapepz/project-zomboid-studio/milestone/2))
establishes that the template is the sole authority on folder structure — the build
step should consume a resolved layout, not embed any version string itself.
The correct long-term fix is to stop generating `mod.info` into a hardcoded path
and instead let the template structure (and eventually the asset resolver) dictate
where version-specific files live.

**2 — Wrong fallback default.**
The `?? 'auto'` fallback means the build always overwrites `mod.info` unless the author
explicitly opts out. The safe default is `'skip'`: respect whatever the mod folder already
provides, and let authors opt in to generation when they need it.
The same wrong default exists in `watch.ts` line 154.

---

**Describe the solution you'd like**

_Fix 1 — Stop hardcoding the version path; write `mod.info` at the mod root._

Until the asset resolver ([Milestone 2](https://github.com/escapepz/project-zomboid-studio/milestone/2)) is in place, `mod.info` should be written at the
**mod root** (`<mod>/mod.info`), matching the existing `watch.ts` behaviour (line 155-160),
rather than into a version-specific subfolder the build invents itself.
This keeps `build` and `watch` consistent and leaves versioned placement entirely to the
future resolver, which will handle the full precedence chain
(`version folder → common → root`) as defined in [Milestone 2](https://github.com/escapepz/project-zomboid-studio/milestone/2).

```ts
// build.ts – proposed (consistent with watch.ts)
const modInfoPath = join(outModsPath, 'mod.info');
```

_Fix 2 — Change the fallback default to `'skip'` in both `build.ts` and `watch.ts`:_

```ts
const modInfoFlag = projectConfig.mods[modId].build?.modInfo ?? 'skip';
```

Update the documentation in `project.d.ts` and `pzstudio.schema.json` to reflect that
`"skip"` is the implicit default, and that `"auto"` must be set explicitly.

Required changes:

| File                        | Change                                                                            |
| --------------------------- | --------------------------------------------------------------------------------- |
| `src/lib/commands/build.ts` | Remove hardcoded version subfolder; write to mod root; change default to `'skip'` |
| `src/lib/commands/watch.ts` | Change default to `'skip'` in the `project.json` change handler                   |
| `src/lib/project.d.ts`      | Update JSDoc: `"skip"` is now the default, not `"auto"`                           |
| `pzstudio.schema.json`      | Update `"default"` for `modInfo` from `"auto"` to `"skip"`                        |

---

**Describe alternatives you've considered**

- **Read the version folder name from `.template-mod/` at runtime.** This avoids a literal
  string but still leaks template structure into build logic — directly in conflict with
  [Milestone 3](https://github.com/escapepz/project-zomboid-studio/milestone/1)'s goal of decoupling templates from core. Rejected.

- **Add a `gameVersion` field to `project.json`.** Lets authors pin the game version
  explicitly. More controllable but premature; [Milestone 2](https://github.com/escapepz/project-zomboid-studio/milestone/2) plans a dedicated resolver for
  exactly this concern, and the approach would need rethinking anyway once that lands.

- **Keep `'auto'` as default, but warn when no `build` key is present.** Preserves backward
  compatibility but still silently clobbers hand-crafted files in the default case. Rejected
  because the warning would be noise for most users.

---

**Additional context**

- Affected commands: `build`, `watch`
- Affected source files: `src/lib/commands/build.ts`, `src/lib/commands/watch.ts`,
  `src/lib/project.d.ts`, `pzstudio.schema.json`
- This issue is a **prerequisite** for [Milestone 2](https://github.com/escapepz/project-zomboid-studio/milestone/2) (Versioned Asset Resolution): the build
  step must not embed any version string before the asset resolver exists to provide a
  proper contract.
- Changing the default from `'auto'` to `'skip'` is a **breaking change** for projects that
  relied on implicit auto-generation. A one-time warning log should accompany the release
  to ease migration.
