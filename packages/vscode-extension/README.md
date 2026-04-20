# Project Zomboid Studio (VS Code)

[![Version](https://img.shields.io/badge/version-2.242170.0-blue.svg)](https://github.com/escapepz/project-zomboid-studio)
[![Project Zomboid](https://img.shields.io/badge/Project%20Zomboid-42.17.0-orange.svg)](https://projectzomboid.com/)
[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/escapepz/project-zomboid-studio)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-_.svg?style=flat&color=6a0dad&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI%2BPHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01eiIvPjxwYXRoIGQ9Ik0yIDE3bDEwIDUgMTAtNXBNMiAxMmwxMCA1IDEwLTUiLz48L3N2Zz4%3D&logoColor=ffffff)](https://deepwiki.com/escapepz/project-zomboid-studio)

**Project Zomboid Studio** is a powerful environment designed to streamline the creation, management, and building of Lua mods for Project Zomboid. This extension brings the capabilities of the PZ Studio CLI directly into VS Code, providing a seamless workflow for modders.

## 🚀 Features

- **Instant Project Creation**: Initialize a full modding project structure with templates in seconds.
- **Multi-Mod Support**: Manage multiple mods within a single project workspace.
- **Automated Building**: Build your workshop-ready folders with one click, including `mod.info` generation and dual-branch support (Main & Dev Branch).
- **Live Sync**: Watch mode to automatically update your workshop directory as you save files.
- **In-Place Documentation**: Automatically clones the latest modding docs and guides into your project.
- **Integrated Output Logging**: Standardized timestamps and labels (`[INFO]`, `[WARN]`, `[ERROR]`) in the VS Code output channel for easier troubleshooting.
- **Clean execution**: Automatic log clearing at the start of command execution.
- **Version Compatibility**: Optimized for **Project Zomboid b42.17.0** and later versions.

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
