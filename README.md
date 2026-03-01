# Project Zomboid Studio

For complete documentation and usage information, please refer to the original project repository:

**[Konijima/project-zomboid-studio](https://github.com/Konijima/project-zomboid-studio)**

This is a CLI tool for creating and maintaining Lua mods for Project Zomboid with ease. Visit the link above for:

- Installation instructions
- Command reference
- Setup requirements
- VSCode extensions recommendations
- Examples and more

## Key Changes in This Branch

- **Compatibility in this branch: Project Zomboid b42.13.1 MP**
- Added AGENTS.md with build commands, architecture overview, and code style guidelines
- Updated mod ID formatting to be Unix-compatible (Windows and Linux):
    - Spaces converted to underscores: "Teleportal Prototype" → `teleportal_prototype`
    - Special characters removed: "My-Cool Mod!" → `my_cool_mod`
    - Maintains camelCase without conversion: "TeleportalPrototype" → `teleportalprototype`
- Created `installDocs()` function to clone https://github.com/escapepz/docs repository
- Created `installGuides()` function to clone https://github.com/demiurgeQuantified/PZModdingGuides repository (**Deprecated**: use `installDocs()` instead, which includes guides as a submodule)
- Integrated docs and guides installation into new project creation and project update commands
- Changed mod.info output path to version-specific directory: `{modId}/42.13.1/mod.info`
- Enhanced build command to create dual workshop outputs:
    - **Main workshop**: `{projectTitle}` with standard mod IDs and configured visibility
    - **Dev branch workshop**: `{projectTitle} - dev_branch` with `_dev` suffix on mod IDs
    - Each mod in dev branch has prefix in path and id field: `Contents/mods/{modId}_dev/42.13.1/mod.info`
    - Dev branch workshop always sets visibility to `unlisted` regardless of project.json settings
    - Dev branch workshop title appends ` - dev_branch` suffix: `title={projectTitle} - dev_branch`
    - Dev branch workshop.txt has no `id=` field (excluded automatically)
- Updated documentation to reference original project repository

## 🛠️ Building from Source

This project is a monorepo managed with **pnpm**.

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [pnpm](https://pnpm.io/)

### 1. Install Dependencies

From the project root, run:

```bash
pnpm install
```

### 2. Build the CLI Tool

First, build the main CLI project (this is required before building the extension):

```bash
pnpm build
```

### 3. Build the VS Code Extension

After the CLI project is built, you can build the extension:

```bash
pnpm --filter pzstudio-vscode build
```

The extension bundle will be available at `packages/vscode-extension/dist/extension.js`.

### 4. Package for Marketplace (Optional)

To generate a `.vsix` file for local installation or publishing:

```bash
pnpm --filter pzstudio-vscode vsce:package
```
