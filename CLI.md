# pzstudio CLI Reference

This document describes the `pzstudio` command-line interface based on the current implementation in `src/`.

## Overview

`pzstudio` is a TypeScript CLI for creating and maintaining Project Zomboid Lua mod projects.

It supports:

- project scaffolding
- adding, deleting, renaming, and building mods
- output directory configuration
- template cache refresh
- migration of legacy config formats
- help and version output

## Global Behavior

### Entry point

- Command: `pzstudio`
- Main entry file: `src/index.ts`
- The CLI is dispatched from `src/lib/cli.ts`

### Common flags

- `--help`
  - Shows general help when used alone.
  - Shows command-specific help when used with a command name.
- `--version`
  - Prints the package version and exits.
- `--verbose`
  - Enables diagnostic logging for commands that support verbose output.

### Argument parsing rules

- The first non-flag token after `pzstudio` is treated as the command name.
- Remaining tokens are treated as positional arguments.
- Positional values are auto-parsed:
  - numeric strings become numbers
  - `true` / `false` become booleans
  - everything else stays a string
- `--offline` and `--force-update` flags control template resolution.
- `--symlinks` flag enables directory junctions for template folders.
- **Template resolution**: The source of truth for template locations is the global `config.json` at `~/.pzstudio/config.json` (or hardcoded defaults). Certain commands support local overrides:
  - `new` checks the current working directory for `.template-mod` and `.template-workshop`.
  - `add` checks the project root for `.template-mod`.
- **CLI Flags**: `--template` is **NOT supported** as a CLI flag. All template configuration must be done via the global `config.json` or by using the local override folders mentioned above.

### Working directory rules

- Some commands must run inside an existing project directory.
- `new` must run outside a project directory.
- `build`, `clean`, `add`, `delete`, `rename`, and `migrate` require a project directory.

## Command Summary

| Command | Purpose | Requires project dir | Main outputs |
| --- | --- | --- | --- |
| `add` | Add a mod to an existing project | Yes | New mod folder, updated `project.json` |
| `build` | Build workshop output | Yes | Output directory under configured `outdir` |
| `clean` | Remove built output | Yes | Deletes built workshop folder |
| `delete` | Remove a mod from a project | Yes | Deletes mod folder and config entry |
| `help` | Show help text | No | Console output only |
| `lang` | Translation helper | Yes | Stub (Not implemented yet) |
| `migrate` | Upgrade legacy config formats | No for global config, yes for project sync | Updates `config.json` and/or `project.json` |
| `new` | Create a new project | No, must be outside a project | New project folder and scaffolding |
| `outdir` | Set global output directory | No | Updates global `config.json` |
| `rename` | Rename a mod | Yes | Renames mod folder, rewrites references, updates `project.json` |
| `update` | Refresh template caches | No | Updates cached templates |
| `watch` | Watch and sync output | Yes | Stub (Not implemented yet) |

## `pzstudio help`

Show general help or command help.

### Usage

```bash
pzstudio help
pzstudio help <command>
pzstudio --help
pzstudio <command> --help
```

### Arguments

- `<command>` optional command name such as `build`, `new`, or `add`

### Output

- Without a command, prints the full command list.
- With a command, prints the help text registered for that command.
- Unknown commands raise `Unknown command [<command>]`.

## `pzstudio new`

Create a new project directory and scaffold the base files.

### Usage

```bash
pzstudio new <projectTitle>
pzstudio new <projectTitle> <modId>
```

### Arguments

- `<projectTitle>`
  - Required.
  - Used as the display title for the project and workshop.
- `<modId>`
  - Optional.
  - If omitted, it is generated from `projectTitle`.
  - The generated ID is normalized into a filesystem-friendly lowercase style.

### Flags

- `--offline`
  - Bypass network updates and use local cache or legacy templates.
- `--force-update`
  - Force refresh of cached templates from remote sources.
- `--symlinks`
  - Use directory junctions for template folders (if supported).
- `--verbose`
  - Print diagnostic output.

### Preconditions

- Must not be run inside an existing project directory.
- Fails if the target project folder already exists.

### Files created or updated

Inside the new project folder:

- `project.json`
- `<modId>/`
- `.template-mod`
- `.template-language`
- `.libraries` if the template provides it
- `workshop/`

### Behavior details

- Resolves templates based on these priority rules:
  1.  **CWD Overrides**: Uses local `.template-mod` or `.template-workshop` folders in the current working directory (parent of the new project) if they exist and are non-empty.
  2.  **Global Configuration**: Otherwise, resolves the template from the global `config.json` at `~/.pzstudio/config.json`.
  3.  **Hardcoded Defaults**: If no global config entry exists, uses official PZStudio template repositories.
- Copies or links the resolved templates into the new project:
  - Project template into the project root.
  - Mod template into `<project>/<modId>`.
  - Workshop template into `<project>/workshop`.
  - Shared template folders (like `.template-mod` and `.template-language`) into the project root.
- Sets:
  - `project.json.workshop.title = <projectTitle>`
  - `project.json.mods[<modId>] = { name: <projectTitle>, description: '' }`
- Runs experimental hooks:
  - `addProject`
  - `addMod`

### Output

- Logs the project creation path on success.

## `pzstudio add`

Add a new mod to an existing project.

### Usage

```bash
pzstudio add <modName>
pzstudio add <modName> <modId>
```

### Arguments

- `<modName>`
  - Required.
  - Human-readable name stored in config.
- `<modId>`
  - Optional.
  - If omitted, it is generated from `<modName>`.

### Flags

- `--offline`
  - Bypass network updates and use local cache or legacy templates.
- `--force-update`
  - Force refresh of cached templates from remote sources.
- `--symlinks`
  - Use directory junctions for template folders (if supported).
- `--verbose`
  - Print diagnostic output.

### Preconditions

- Must be run inside a project directory.
- Fails if the mod ID already exists in `project.json` or as a folder on disk.

### Files created or updated

- `<project>/<modId>/`
- `project.json`
- `<project>/.template-mod` may be seeded if a remote template was used and no local template existed.

### Behavior details

- Resolves the mod template based on these priority rules:
  1.  **Project-Local Override**: Uses the local `.template-mod` folder in the current project root if it exists and is non-empty.
  2.  **Global Configuration**: Otherwise, resolves the mod template from the global `config.json`.
  3.  **Hardcoded Defaults**: Falls back to the official PZStudio mod template.
- Copies template files into the new mod folder.
- Adds the mod to `project.json` with:
  - `name: <modName>`
  - `description: ''`
- Runs experimental hook:
  - `addMod`

### Output

- Logs `Added mod '<modName>' with id '<modId>'` on success.

## `pzstudio build`

Build the workshop output for the project.

### Usage

```bash
pzstudio build
pzstudio build --production
pzstudio build --development
pzstudio build --verbose
```

### Flags

- `--production`
  - Builds only the main workshop output.
- `--development`
  - Builds only the dev_branch workshop output.
- `--verbose`
  - Enable diagnostic output.

### Preconditions

- Must be run inside a project directory.
- `project.json` must resolve successfully.
- `project.json.outdir` (or global `config.json.outdir`) must be configured.

### Output layout

The build writes into the configured output directory:

- Main workshop output:
  - `<outdir>/<workshop.title>/`
- Dev branch workshop output:
  - `<outdir>/<workshop.title> - dev_branch/`

### Main build behavior

If no target flag is supplied, `build` produces the main workshop output.

If `--production` is supplied, it also produces the main workshop output.

Output contents:

- workshop template copied into the output root
- each project mod copied into `Contents/mods/<modId>/`
- `mod.info` generated per mod unless disabled by config
- `preview.png` copied from `<project>/workshop/preview.png` when present
- `workshop.txt` generated in the output root

### Development build behavior

If `--development` is supplied, it produces a dev branch build with these differences:

- mod IDs are suffixed with `_dev`
- `mod.info` IDs use the `_dev` suffix
- workshop visibility is forced to `unlisted`
- workshop title gets ` - dev_branch`
- `workshop.txt` omits the `id=` field

### `mod.info` generation

Per mod, `build` checks `project.json.mods[modId].build.modInfo`:

- `skip`
  - do not generate `mod.info`
- `auto-if-missing`
  - generate only if `mod.info` is absent
- `auto`
  - always generate `mod.info`
- omitted
  - treated as `skip`

If the field is omitted in `project.json`, the command prints a breaking-change warning because the default changed from `auto` to `skip`.

### Conflicting flags

- `--production` and `--development` cannot be used together.

### Output

- Prints per-file copy/generation logs.
- Finishes with a build duration summary.

## `pzstudio clean`

Delete the built workshop output for the main workshop target.

### Usage

```bash
pzstudio clean
```

### Preconditions

- Must be run inside a project directory.
- The target output directory must already exist.

### Files affected

- Deletes `<outdir>/<workshop.title>/`

### Output

- Prints a cleaning message and a completion time when successful.
- Throws if the output folder does not exist.

## `pzstudio delete`

Remove a mod from the project.

### Usage

```bash
pzstudio delete <modId>
pzstudio delete <modId> --verbose
```

### Arguments

- `<modId>`
  - Required.

### Preconditions

- Must be run inside a project directory.

### Files affected

- Deletes `<project>/<modId>/` if it exists.
- Removes the mod entry from `project.json`.
- Removes the mod ID from `project.json.excludes`.

### Behavior details

- If the mod folder is missing, it logs an error but still tries to update `project.json`.
- Runs experimental hook:
  - `removeMod`

### Output

- Logs separate messages for folder deletion and config deletion.

## `pzstudio rename`

Rename a mod directory and update references inside the project.

### Usage

```bash
pzstudio rename <oldModId> <newModId>
```

### Arguments

- `<oldModId>`
  - Existing mod ID.
- `<newModId>`
  - New mod ID.

### Preconditions

- Must be run inside a project directory.
- `<oldModId>` must exist in `project.json`.
- `<newModId>` must not already exist in `project.json` or as a folder.

### Files affected

- Renames `<project>/<oldModId>` to `<project>/<newModId>`
- Rewrites file contents under the renamed mod folder, replacing occurrences of `<oldModId>` with `<newModId>`
- Updates `project.json`

### Behavior details

- Copies the old mod folder to the new ID, then deletes the old folder.
- Searches all files under the new mod directory and replaces text occurrences of the old mod ID.
- Updates the mod key in `project.json` from old ID to new ID.

### Output

- Logs each file it rewrites.

## `pzstudio outdir`

Set the global output directory path.

### Usage

```bash
pzstudio outdir <newOutDir>
```

### Arguments

- `<newOutDir>`
  - Required.
  - Relative paths are resolved to an absolute path.

### Preconditions

- The target directory must already exist.

### Files affected

- Updates the global `config.json` used by the CLI at `~/.pzstudio/config.json`.

### Behavior details

- Rejects a no-op if the configured output directory already matches the new value.

### Output

- Confirms the updated output directory path on success.

## `pzstudio update`

Refresh the global template caches used by the CLI.

### Usage

```bash
pzstudio update
```

### Behavior details

- Refreshes all template categories:
  - `project`
  - `mod`
  - `workshop`
  - `language`
- Pulls the latest changes from remote sources and resets the local cache to match.

### Files affected

- Template cache files managed by the CLI.

### Output

- Reports per-category success or failure.
- Prints a final summary indicating whether all caches refreshed successfully.

## `pzstudio migrate`

Upgrade legacy config files to the current shape and sync `mod.info` data into `project.json`.

### Usage

```bash
pzstudio migrate
```

### Files affected

- Global `config.json`
- Local `project.json`
- Per-mod `mod.info` files are read, not rewritten.

### Behavior details

- Checks the global config file and upgrades it if needed.
- Checks `project.json` and upgrades it if needed.
- For each mod in `project.json`, if a matching `mod.info` exists:
  - reads it
  - imports fields into `project.json` when the field is missing there
  - does not overwrite existing `project.json` values
- Ignores the `id` field from `mod.info` during sync because the mod ID is already the key in `project.json`.

### Output

- Reports whether each file was migrated or already up to date.
- Ends with `Migration complete.`

## `pzstudio lang`

Translation language helper. (Stub)

### Usage

```bash
pzstudio lang <lang>
pzstudio lang <lang> <toLang>
```

### Current behavior

- Throws `Not implemented yet!`

## `pzstudio watch`

Watch the project and sync the output directory. (Stub)

### Usage

```bash
pzstudio watch
```

### Current behavior

- Throws `Not implemented yet!`

## File Layout Cheatsheet

### Project root

Typical project contents after `new`:

- `project.json`
- `workshop/`
- `<modId>/`
- `.template-mod/`
- `.template-language/`
- `.libraries/` if provided by the template

### Build output

Main build:

- `<outdir>/<workshop.title>/`
  - `Contents/mods/<modId>/`
  - `mod.info`
  - `workshop.txt`
  - `preview.png` when present in the source project

Dev build:

- `<outdir>/<workshop.title> - dev_branch/`
  - `Contents/mods/<modId>_dev/`
  - `mod.info`
  - `workshop.txt`
  - `preview.png` when present in the source project

## Practical Usage Flow

1. Set the output directory with `pzstudio outdir <path>`.
2. Create a project with `pzstudio new <projectTitle>`.
3. Add extra mods with `pzstudio add <modName>`.
4. Make changes in the project folders.
5. Build output with `pzstudio build`.
6. Clean stale output with `pzstudio clean` when needed.
7. Refresh templates with `pzstudio update` if you want the latest cached templates.

## Notes and Caveats

- `lang` and `watch` are listed in help, but both are stubs right now.
- `build` has a breaking change around `build.modInfo`; missing values now behave like `skip`.
- `new` can use local `.template-mod` and `.template-workshop` folders in the current working directory when present and non-empty.
- `add` uses the local `.template-mod` folder in the project root if it exists; otherwise, it resolves from global config and seeds the local folder.
- `migrate` is safe to run repeatedly; it only upgrades when it detects an older shape.
- **Templates**: Project-level `templates` field in `project.json` is **NO LONGER supported** and will fail validation. Use global `config.json` at `~/.pzstudio/config.json` instead.

