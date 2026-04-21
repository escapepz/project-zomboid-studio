# Changelog

All notable changes to the **Project Zomboid Studio** VSCode extension will be documented in this file.

## [2.242170.0] - 2026-04-21


## [2.242131.3-alpha] - 2026-03-02

### Changed

- Split templates into separate Git repositories for better modularity and maintenance.
- Added `.template-legacy` for backwards compatibility.

### Fixed

- Fixed `new` command failing when modId parameter is empty string by using logical OR operator instead of nullish coalescing, allowing proper fallback to projectTitle.

## [2.242131.2-alpha] - 2026-03-01

### Added

- Initial standalone release as a separate workspace package.
- All CLI commands available as VS Code commands: build, clean, update, watch, new, add, delete, rename, lang.

### Changed

- Decoupled from CLI branch — the extension is now versioned and released independently.
- Extension imports CLI functionality via the `pzstudio` workspace package API.

## [2.242131.1-alpha] - 2026-02-02

### Added

- **Standardized Logging System**: Integrated local timestamps (`YYYY-MM-DD HH:mm:ss`) and bracketed labels (`[INFO]`, `[WARN]`, `[ERROR]`) across both CLI and VS Code extension.
- **Log Clearing**: Added automatic clearing of the VS Code output channel at the start of every command execution.
- **Enhanced Build Feedback**: Added explicit log messages for directory cleaning tasks during the build process to verify removal of target workshop folders.
- **Completion Messages**: Standardized "Command completed" messages for all CLI commands.

### Changed

- **CLI Readability**: Improved vertical line padding for better separation between consecutive command runs.
- **Logger Architecture**: Standardized timestamp and label generation in the core logger to fix redundant prefixing in VS Code.

### Fixed

- **VS Code Sync**: Resolved an issue where redundant log prefixes were shown in the VS Code output channel.
- **Process Visibility**: Fixed missing "done" feedback for several CLI commands (e.g., `update`, `add`).

## [2.242131.0-alpha] - 2026-02-01

### Added

- **Project Zomboid b42.13.1 MP** compatibility.
- Integrated **VS Code Extension** support with dedicated commands for building, watching, and project management.
- Dual-branch build system:
    - **Main Branch**: Production-ready workshop structure.
    - **Dev Branch**: Unlisted suffix-based workshop structure for safe multiplayer testing.
- Automated documentation and guide installation (`.docs` and `.guides` submodules).
- Unix-compatible mod ID formatting (automatically sanitizes spaces and special characters for cross-platform compatibility).
- `AGENTS.md` for better developer onboarding and project architecture overview.
- Support for `mod.info` deployment in version-specific folders (`{modId}/42.13.1/mod.info`).
- JSON Schema for `project.json` to provide autocompletion and validation in VS Code.

### Changed

- Refactored build output to support the new Project Zomboid 42.13.1 folder structure.
- Updated project configuration to move `buildDate` to a separate file, preventing unnecessary `package.json` churn.
- Standardized file paths across CLI and VS Code extension to ensure reliable template copying.

### Fixed

- Resolved path resolution issues when running the bundled CLI from within the VS Code extension.
- Improved error handling and logging consistency between CLI and VS Code output channels.

---

_Based on the original [Project Zomboid Studio](https://github.com/Konijima/project-zomboid-studio)._