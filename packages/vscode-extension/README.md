# Project Zomboid Studio (VS Code)

[![Version](https://img.shields.io/badge/version-2.242131.3-blue.svg)](https://github.com/escapepz/project-zomboid-studio)
[![Project Zomboid](https://img.shields.io/badge/Project%20Zomboid-b42.13.1-orange.svg)](https://projectzomboid.com/)

**Project Zomboid Studio** is a powerful environment designed to streamline the creation, management, and building of Lua mods for Project Zomboid. This extension brings the capabilities of the PZ Studio CLI directly into VS Code, providing a seamless workflow for modders.

## 🚀 Features

- **Instant Project Creation**: Initialize a full modding project structure with templates in seconds.
- **Multi-Mod Support**: Manage multiple mods within a single project workspace.
- **Automated Building**: Build your workshop-ready folders with one click, including `mod.info` generation and dual-branch support (Main & Dev Branch).
- **Live Sync**: Watch mode to automatically update your workshop directory as you save files.
- **In-Place Documentation**: Automatically clones the latest modding docs and guides into your project.
- **Integrated Output Logging**: Standardized timestamps and labels (`[INFO]`, `[WARN]`, `[ERROR]`) in the VS Code output channel for easier troubleshooting.
- **Clean execution**: Automatic log clearing at the start of command execution.
- **Version Compatibility**: Optimized for **Project Zomboid b42.13.1** and later versions.

## 🛠 Commands

Access these commands via the **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command                  | Description                                          |
| :----------------------- | :--------------------------------------------------- |
| `PZStudio: New Project`  | Create a new project with a simple mod template.     |
| `PZStudio: Add Mod`      | Add a new mod to the current project.                |
| `PZStudio: Build`        | Build the project and deploy to the Workshop folder. |
| `PZStudio: Watch`        | Watch for changes and build incrementally.           |
| `PZStudio: Clean`        | Clean the output directories.                        |
| `PZStudio: New Language` | Add a new translation template to a mod.             |
| `PZStudio: Rename Mod`   | Safely rename an existing mod.                       |
| `PZStudio: Delete Mod`   | Remove a mod from the project.                       |
| `PZStudio: Update`       | Sync libraries and documentation.                    |

## 📂 Project Structure

A typical PZ Studio project looks like this:

```text
my-project/
├── .docs/                  # Cloned modding documentation
├── .libraries/             # Umbrella Lua libraries for IDE support
├── my_mod/                 # Your mod's Lua source and assets
│   ├── media/
│   └── mod.info            # Managed by PZ Studio
├── project.json            # Project-wide configuration
└── workshop/               # Workshop assets (preview.png, etc.)
```

## 📦 Automated Workshop Deployment

When you run the **Build** command, PZ Studio creates two versions of your mod in your Zomboid Workshop folder:

1.  **Main Workshop**: The production-ready mod.
2.  **Dev Branch**: An unlisted version with the `_dev` suffix, allowing you to test changes in multiplayer without affecting your live subscribers.

## 📝 Requirements

- **Node.js**: Required to run the underlying engine.
- **Git**: Required for cloning documentation and libraries.

## 🔗 Links

- **Marketplace**: [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=escapepz.pzstudio)
- **Repository**: [GitHub](https://github.com/escapepz/project-zomboid-studio)
- **Support**: [Issue Tracker](https://github.com/escapepz/project-zomboid-studio/issues)
- **License**: [Apache-2.0](LICENSE.md)

## ☕ Support

If you find this tool useful, consider supporting the developers:

- [Support escapepz on Ko-fi](https://ko-fi.com/escapepz)
- [Support konijima on Ko-fi](https://ko-fi.com/konijima)

---

_Based on the original [Project Zomboid Studio](https://github.com/Konijima/project-zomboid-studio)._
