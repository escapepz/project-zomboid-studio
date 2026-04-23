# pzstudio CLI Reference

This document reflects the current implementation in `src/lib/cli.ts` and the command handlers in `src/lib/commands/`.

## Overview

`pzstudio` is a TypeScript CLI for Project Zomboid mod scaffolding and project maintenance.

Implemented commands:

- `add`
- `build`
- `clean`
- `delete`
- `help`
- `lang`
- `migrate`
- `modinfo`
- `new`
- `outdir`
- `rename`
- `update`
- `watch`

## Global Behavior

### Entry point

- Command: `pzstudio`
- Main entry file: [`src/index.ts`](./src/index.ts)
- CLI dispatcher: [`src/lib/cli.ts`](./src/lib/cli.ts)

### Global flags

These flags are handled by the CLI parser:

- `--help`
  - Shows general help with no command.
  - Shows help for a specific command when used with a command name.
- `--version`
  - Prints the package version and exits.
- `--verbose`
  - Enables verbose logging before the command runs.

### Argument parsing

- The first non-flag token is the command name (always treated as a raw string).
- Remaining tokens are passed as positional arguments.
- For most commands, positional values are type-coerced by the parser:
  - numeric strings become numbers
  - `true` and `false` become booleans
  - everything else remains a string
- Note: `help` lookups use raw string tokens to ensure numeric or boolean-like command names can be looked up.

### Command completion

- Most commands print `Command [<name>] completed.` when they finish successfully.
- `build`, `clean`, `help`, and `modinfo` skip that generic completion message because they already produce their own output.

## Common Project Rules

- `new` must be run outside a project directory.
- `add`, `build`, `clean`, `delete`, `rename`, `lang`, `modinfo`, and `watch` require an existing project directory.
- `migrate` can run with or without a project; it always checks the global config and only processes `project.json` when one exists in the current directory.
- `update` does not require a project directory.
- `outdir` updates the global config stored under the CLI config path, not the project config.

## Command Summary

| Command | Purpose | Requires project dir | Status |
| --- | --- | --- | --- |
| `add` | Add a mod to an existing project | Yes | Implemented |
| `build` | Build workshop output | Yes | Implemented |
| `clean` | Remove build output | Yes | Implemented |
| `delete` | Remove a mod from a project | Yes | Implemented |
| `help` | Show help text | No | Implemented |
| `lang` | Translation helper | Yes | Stub |
| `migrate` | Upgrade legacy config and sync `mod.info` data | No | Implemented |
| `modinfo` | Generate `mod.info` files | Yes | Implemented |
| `new` | Create a new project | No, must be outside a project | Implemented |
| `outdir` | Set global output directory | No | Implemented |
| `rename` | Rename a mod | Yes | Implemented |
| `update` | Refresh template caches | No | Implemented |
| `watch` | Watch and sync output | Yes | Stub |

## `pzstudio help`

Displays general help or command-specific help.

### Usage

```bash
pzstudio help
pzstudio help <command>
pzstudio --help
pzstudio <command> --help
```

### Behavior

- With no command, prints the full command list.
- With a known command, prints that command's registered help text.
- With an unknown command, throws `Unknown command [<command>]`.

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
  - Used for the workshop title and the default mod name.
- `<modId>`
  - Optional.
  - If omitted, it is derived from `projectTitle` and normalized into a filesystem-friendly id.

### Flags

- `--offline`
  - Skip remote refresh and use cached or legacy template data.
- `--force-update`
  - Force refresh of cached templates.
- `--symlinks`
  - Use directory junctions when scaffolding template folders, if supported.

### Preconditions

- Must not run inside an existing project directory.
- Fails if the target project folder already exists.

### Behavior

- Resolves the project, mod, workshop, and language templates.
- Prefers local overrides in the current working directory:
  - `.template-mod`
  - `.template-workshop`
- Falls back to the global template configuration when local overrides are absent.
- Creates:
  - `project.json`
  - `<modId>/`
  - `workshop/`
  - `.template-mod`
  - `.template-language`
  - `.libraries` when present in the project template
- Sets `project.json.workshop.title` to the project title.
- Adds the new mod entry to `project.json.mods`.
- Runs experimental hooks:
  - `addProject`
  - `addMod`

### Output

- Logs the created project path on success.

## `pzstudio add`

Add a mod to an existing project.

### Usage

```bash
pzstudio add <modName>
pzstudio add <modName> <modId>
```

### Arguments

- `<modName>`
  - Required.
  - Stored as the mod name in `project.json`.
- `<modId>`
  - Optional.
  - If omitted, it is derived from `modName`.

### Flags

- `--offline`
  - Skip remote refresh and use cached or legacy template data.
- `--force-update`
  - Force refresh of cached templates.
- `--symlinks`
  - Use directory junctions when scaffolding template folders, if supported.
- `--verbose`
  - Enable diagnostic output.

### Preconditions

- Must run inside a project directory.
- Fails if the mod id already exists in `project.json` or as a folder on disk.

### Behavior

- Prefers a project-local `.template-mod` folder when it exists and is non-empty.
- Otherwise resolves the mod template from the global template configuration.
- Scaffolds the mod folder under the project root.
- Seeds `<project>/.template-mod` when a remote template was used and no local template existed.
- Adds the mod entry to `project.json` with:
  - `name: <modName>`
  - `description: ''`
- Runs experimental hook:
  - `addMod`

### Output

- Logs `Added mod '<modName>' with id '<modId>'` on success.

## `pzstudio build`

Build the project into the configured output directory.

### Usage

```bash
pzstudio build
pzstudio build --production
pzstudio build --development
pzstudio build --verbose
```

### Flags

- `--production`
  - Builds the main workshop output.
- `--development`
  - Builds the development `dev_branch` output.
- `--verbose`
  - Enable diagnostic output.

### Preconditions

- Must run inside a project directory.
- `project.json` must be readable.
- `project.json.outdir` must be configured.

### Behavior

- With no target flags, builds the main workshop output.
- `--production` also builds the main workshop output.
- `--development` builds the `dev_branch` output.
- The two target flags are mutually exclusive.

### Main output

- Output directory: `<outdir>/<workshop.title>/`
- Copies the workshop template into the output root.
- Copies each enabled mod into `Contents/mods/<modId>/`.
- Generates `mod.info` according to `project.json.mods[modId].build.modInfo`.
- Copies `workshop/preview.png` to the output root when present.
- Generates `workshop.txt`.

### Development output

- Output directory: `<outdir>/<workshop.title> - dev_branch/`
- Mod ids are suffixed with `_dev`.
- Generated `mod.info` ids use the `_dev` suffix.
- `workshop.txt` omits the `id=` field.
- Workshop visibility is forced to `unlisted`.

### `mod.info` generation

Per mod, the effective `build.modInfo` value is:

- `skip`
  - Do not generate `mod.info`.
- `auto-if-missing`
  - Generate only if `mod.info` does not already exist.
- any other value
  - Generates `mod.info`.

The build command currently treats an omitted `build.modInfo` as `auto-if-missing`.

### Output

- Prints copy and generation logs while building.
- Ends with a build duration summary.

## `pzstudio clean`

Remove generated build output for the current project.

### Usage

```bash
pzstudio clean
```

### Preconditions

- Must run inside a project directory.
- At least one build output directory must exist.

### Behavior

- Removes the main output directory.
- Removes the development output directory if it exists.
- Throws if neither output directory is found.

### Output

- Logs which output directories were removed.
- Prints a completion time when successful.

## `pzstudio delete`

Remove a mod from the project.

### Usage

```bash
pzstudio delete <modId>
pzstudio delete <modId> --verbose
```

### Preconditions

- Must run inside a project directory.

### Behavior

- Deletes `<project>/<modId>/` if it exists.
- Removes the mod from `project.json`.
- Removes the mod id from `project.json.excludes`.
- Runs experimental hook:
  - `removeMod`

### Output

- Logs separate messages for folder deletion and config deletion.
- Logs an error if the mod folder or config entry is missing.

## `pzstudio rename`

Rename a mod directory and update references inside the project.

### Usage

```bash
pzstudio rename <oldModId> <newModId>
```

### Preconditions

- Must run inside a project directory.
- `<oldModId>` must exist in `project.json`.
- `<newModId>` must not already exist in `project.json` or on disk.

### Behavior

- Copies the old mod folder to the new id.
- Deletes the old mod folder.
- Rewrites file contents under the renamed mod folder, replacing occurrences of `<oldModId>` with `<newModId>`.
- Updates `project.json`.
- Runs experimental hook:
  - `renameMod`

### Output

- Logs every file it rewrites.

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

### Flags

- `--verbose`
  - Enable diagnostic output.

### Preconditions

- The target directory must already exist.

### Behavior

- Updates the global CLI config.
- Throws if the configured output directory already matches the requested value.

### Output

- Confirms the updated path on success.

## `pzstudio update`

Refresh the global template caches.

### Usage

```bash
pzstudio update
pzstudio update --verbose
```

### Flags

- `--verbose`
  - Enable diagnostic output.

### Behavior

- Refreshes these template categories:
  - `project`
  - `mod`
  - `workshop`
  - `language`
- Forces a remote refresh for each category.

### Output

- Reports per-category success or failure.
- Prints a final summary of the refresh result.

## `pzstudio migrate`

Upgrade legacy config files and sync `mod.info` data into `project.json`.

### Usage

```bash
pzstudio migrate
```

### Behavior

- Checks the global config and upgrades it if needed.
- Checks `project.json` in the current directory and upgrades it if needed.
- For each mod, reads `mod.info` from the mod root or supported branch folders.
- Imports missing fields from `mod.info` into `project.json`.
- Does not overwrite existing `project.json` values.
- Ignores the `id` field from `mod.info` because the mod id is already the key in `project.json`.

### Output

- Reports whether each file was migrated or already up to date.
- Ends with `Migration complete.`

## `pzstudio modinfo`

Generate `mod.info` files in the source tree.

### Usage

```bash
pzstudio modinfo generate
pzstudio modinfo generate <modId>
pzstudio modinfo generate --verbose
```

### Flags

- `--verbose`
  - Enable diagnostic output.

### Behavior

- Only the `generate` action is implemented.
- With no mod id, generates `mod.info` for all eligible mods.
- With a mod id, generates `mod.info` only for that mod.
- Skips mods whose `build.modInfo` value is `skip`.
- Uses `resolveModInfoTargets()` to decide which mod folders are valid output targets.

### Output

- Logs generation or skip messages per mod.

## `pzstudio lang`

Translation language helper.

### Usage

```bash
pzstudio lang <lang>
pzstudio lang <lang> <toLang>
```

### Status

- Not implemented yet.

## `pzstudio watch`

Watch the project and keep the output directory synced.

### Usage

```bash
pzstudio watch
```

### Status

- Not implemented yet.

## File Layout Cheatsheet

### Project root

Typical project contents after `new`:

- `project.json`
- `workshop/`
- `<modId>/`
- `.template-mod/`
- `.template-language/`
- `.libraries/` when provided by the template

### Main build output

- `<outdir>/<workshop.title>/`
  - `Contents/mods/<modId>/`
  - `mod.info`
  - `workshop.txt`
  - `preview.png` when present

### Development build output

- `<outdir>/<workshop.title> - dev_branch/`
  - `Contents/mods/<modId>_dev/`
  - `mod.info`
  - `workshop.txt`
  - `preview.png` when present

## Notes

- `build` treats an omitted `build.modInfo` as `auto-if-missing`.
- `new` can use local `.template-mod` and `.template-workshop` folders from the current working directory when they exist and are non-empty.
- `add` uses a local `.template-mod` in the project root if present; otherwise it resolves a template and seeds the local folder.
- `migrate` is safe to run repeatedly.
- `lang` and `watch` are registered in help, but both currently throw `Not implemented yet!`.
