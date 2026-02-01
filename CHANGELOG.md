# Changelog

All notable changes to the **Project Zomboid Studio** extension will be documented in this file.

## [2.2.0-b42.13.1-alpha] - 2026-02-01

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
*Based on the original [Project Zomboid Studio](https://github.com/Konijima/project-zomboid-studio).*
