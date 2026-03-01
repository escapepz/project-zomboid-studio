---
name: Feature request
about: Suggest an idea for this project
title: '[Feature] Standalone VSCode extension releases independent of b42.x branch updates'
labels: enhancement
assignees: ''
---

## Is your feature request related to a problem? Please describe.

The `vscode-extension` branch holds all VSCode-specific code (`src/extension.ts`, `.vscodeignore`,
`scripts/bundle.js`, the `@vscode/vsce` devDependency, `vsce:package` npm script, etc.) on top
of the `b42.13.1` base.

Because the extension lives **on its own long-running branch** that continuously diverges from
`b42.13.1`, every time `b42.13.1` receives new commits (CLI features, template changes, schema
updates, etc.) a full **rebase or merge** of those changes into `vscode-extension` is required
before the extension can be updated and published.

This creates real friction:

- A one-line extension fix (icon, command label, marketplace description, etc.) requires
  pulling in all pending `b42.13.1` changes, resolving potential conflicts, and re-bundling.
- The two lifecycles are **tightly coupled** even though the extension is mostly a thin UI
  wrapper around the CLI — it only calls `runCLI(command, args)` and proxies the result to a
  VSCode output channel.
- The `package.json` on `vscode-extension` already diverges significantly from `b42.13.1`
  (different `version`, `displayName`, `main`, `engines`, `contributes`, `categories`,
  `publisher`, etc.), so merge conflicts in that single file are frequent.

---

## Describe the solution you'd like

Decouple the extension from the main CLI branch so each can be released independently without
breaking the shared folder structure.

### Option A — Extension as a separate workspace package (recommended)

Move the VSCode extension code into its own sub-package (e.g. `packages/vscode-extension/`)
using the existing `pnpm-workspace.yaml` workspace approach already present in the repo.

```
project-zomboid-studio/
├── packages/
│   └── vscode-extension/       ← isolated extension package
│       ├── package.json        ← vscode-only deps: @vscode/vsce, @types/vscode
│       ├── src/
│       │   └── extension.ts
│       ├── scripts/
│       │   └── bundle.js
│       └── .vscodeignore
├── src/                        ← CLI code unchanged, no VSCode deps
├── package.json                ← CLI-only, no displayName / contributes / engines.vscode
└── pnpm-workspace.yaml         ← add packages/vscode-extension to workspace
```

**The extension package** declares the CLI package as a **workspace dependency**:

```json
// packages/vscode-extension/package.json
{
    "name": "pzstudio-vscode",
    "dependencies": {
        "pzstudio": "workspace:*"
    }
}
```

This means:

- `b42.13.1` (CLI) and the extension can be **versioned and tagged independently**.
- Merging CLI updates into the extension reduces to bumping the workspace dep version — no
  source file conflicts.
- The extension `package.json` no longer collides with the CLI `package.json`.

### Option B — `vscode-extension` branch tracks only extension-specific files

Keep the branch model but make `vscode-extension` a **true overlay** branch that only adds
files not touched by `b42.13.1`. All shared files (`src/lib/`, `src/index.ts`, templates, etc.)
remain as-is from `b42.13.1`. Only extension-specific files live exclusively on this branch:

```
+ packages/vscode-extension/   (or a top-level extension/ folder)
+ .vscodeignore
+ scripts/bundle.js            (renamed to scripts/bundle-extension.js)
```

`package.json` is **not modified** on `vscode-extension`; instead the extension package has its
own separate `package.json`. This eliminates the main conflict surface.

---

## Describe alternatives you've considered

1. **Keep the current branch model but enforce a rebase policy** — document that
   `vscode-extension` must be rebased on every `b42.x` tag before publishing. This solves
   nothing structurally; the problem still exists for quick extension-only fixes.

2. **Separate repository for the extension** — clean but loses the ability to use workspace
   linking. Shared code (helper functions, etc.) would require a published npm package as the
   intermediary, which is heavier to maintain.

3. **Inline extension code into `src/` on a feature flag** — e.g., `if (isVSCode)` guards.
   This pollutes the CLI codebase with VSCode concerns and makes the CLI bundle larger for all
   CLI-only users.

---

## Additional context

- Affected branches: `vscode-extension`, `b42.13.1`
- Affected files (extension-specific, currently duplicated/conflicting): `package.json`,
  `src/extension.ts`, `scripts/bundle.js`, `.vscodeignore`, `CHANGELOG.md`, `LICENSE.txt`
- The repo already has `pnpm-workspace.yaml`, making Option A low-effort to scaffold.
- The goal is: **publishing a VSCode extension patch should never require touching CLI code**,
  and **a CLI update should never block an extension release**.
- Versioning suggestion: CLI keeps `MAJOR.MINOR.PATCH` aligned to the PZ build (e.g. `2.2.x`
  for `b42.13.1`); extension uses its own independent semver (e.g. `1.x.y`) visible in the
  Marketplace.
