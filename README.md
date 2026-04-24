# Project Zomboid Studio

[![Version](https://img.shields.io/badge/version-2.242170.0-blue.svg)](https://github.com/escapepz/project-zomboid-studio)
[![Project Zomboid](https://img.shields.io/badge/Project%20Zomboid-42.17.0-orange.svg)](https://projectzomboid.com/)
[![CodeQL](https://github.com/escapepz/project-zomboid-studio/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/escapepz/project-zomboid-studio/actions/workflows/github-code-scanning/codeql)
[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/escapepz/project-zomboid-studio)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-_.svg?style=flat&color=6a0dad&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI%2BPHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01eiIvPjxwYXRoIGQ9Ik0yIDE3bDEwIDUgMTAtNXBNMiAxMmwxMCA1IDEwLTUiLz48L3N2Zz4%3D&logoColor=ffffff)](https://deepwiki.com/escapepz/project-zomboid-studio)

Original project repository:
**[Konijima/project-zomboid-studio](https://github.com/Konijima/project-zomboid-studio)**

This is a CLI tool for creating and maintaining Lua mods for Project Zomboid with ease. Visit the link above for:

- Project Zomboid Legacy support (Build 41)

## Key Changes in This Branch

- **Compatibility in this branch: Project Zomboid b42.17.0 MP**
- Added AGENTS.md with build commands, architecture overview, and code style guidelines
- Updated mod ID formatting to be Unix-compatible (Windows and Linux):
    - Spaces converted to underscores: "Teleportal Prototype" → `teleportal_prototype`
    - Special characters removed: "My-Cool Mod!" → `my_cool_mod`
    - Maintains camelCase without conversion: "TeleportalPrototype" → `teleportalprototype`
- Reworked scaffolding to rely on cached templates with explicit refresh via `--force-update` or `pzstudio update`
- Removed the legacy `installLibraries()` fallback from intended scaffolding behavior in favor of template-driven project creation
- Added `.pzstudioignore` filtering for scaffold and build flows, with built-in maintenance exclusions such as `**/.gitkeep`
- **Build 42 Layout Support (NEW)**:
    - Added `pzstudio modinfo generate` command to author `mod.info` files directly in your source tree.
    - Supports Build 42 nested layouts: generates into `common`, `42`, or version-specific branch folders containing `lua`.
    - Automatically ignores root-level `mod.info` for projects using the new nested layout.
    - Respects `build.modInfo` project configuration to skip or automate metadata generation.
- Updated mod.info output path to respect branch-based layouts in both source and workshop builds.
- Enhanced build command to create dual workshop outputs:
    - **Main workshop**: `{projectTitle}` with standard mod IDs and configured visibility.
    - **Dev branch workshop**: `{projectTitle} - dev_branch` with `_dev` suffix on mod IDs.
    - Each mod in dev branch has its ID field prefixed in the generated metadata.
    - Dev branch workshop always sets visibility to `unlisted` regardless of project.json settings.
    - Dev branch workshop title appends ` - dev_branch` suffix: `title={projectTitle} - dev_branch`.
    - Dev branch workshop.txt has no `id=` field (excluded automatically).
- **Robust I/O Validation & Migration**:
    - Implemented runtime validation for `project.json` and `config.json` with descriptive Where-What-Why error reporting.
    - Added `pzstudio migrate` command to safely upgrade legacy configuration files while preserving unknown fields.
    - Expanded `IModConfig` with support for `pack`, `tiledef`, `url`, `versionMin`, and `versionMax`.
    - Added `--verbose` mode for detailed diagnostic logging across all commands.
    - Stubbed experimental `watch` command as "Not implemented yet!" to avoid instability.
- Updated documentation to reference original project repository

### 4. Quality Workflows

Maintain code quality using the following commands:

```bash
# Run linting
pnpm run lint

# Run linting and fix auto-fixable issues
pnpm run lint:fix

# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage
```

The automated test suite currently covers deterministic library logic including argument parsing, expectation validation, and shared helper utilities. Manual verification remains required for terminal UI, file watching, and integration-heavy command flows.

---

## 🛠️ Building from Source

This project is a TypeScript CLI tool. While it uses some workspace features, you can build it directly from the root.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [pnpm](https://pnpm.io/)

### 1. Install Dependencies

From the project root, run:

```bash
pnpm install
```

### 2. Build the CLI Tool

```bash
pnpm run build
```

### 3. Run Quality Checks

```bash
pnpm run lint
pnpm run test
```

## Build the VS Code Extension

After the CLI project is built, you can build the extension:

```bash
pnpm --filter pzstudio build
```

The extension bundle will be available at `packages/vscode-extension/dist/extension.js`.

### Package for Marketplace

To generate a `.vsix` file for local installation or publishing:

```bash
pnpm --filter pzstudio vsce:package
```
