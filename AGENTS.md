# AGENTS.md - Project Zomboid Studio

## Build & Commands

- **Build**: `pnpm run build` - Compiles TypeScript to JavaScript in dist/
- **Clean**: `pnpm run clean` - Removes dist/ directory
- **Watch**: `pnpm run watch` - Watches for TypeScript changes and recompiles
- **Test**: `pnpm run test` - Runs Vitest unit tests (80+ tests)

## Architecture

- **Language**: TypeScript (target: ESNext, module: CommonJS, strict mode enabled)
- **Project Type**: CLI tool for creating/managing Project Zomboid Lua mods
- **Entry**: `src/index.ts` → `src/lib/cli.ts` dispatches to command handlers
- **Structure**: `src/lib/` contains CLI infrastructure (args, logger, helpers) + `src/lib/commands/` for command implementations
- **Core Modules**:
    - `src/lib/validation.ts`: Runtime schema validation for project and config files.
    - `src/lib/migration.ts`: Safely upgrades legacy file formats.
    - `src/lib/templateManager.ts`: Resolves and caches project templates from GitHub.
- **Dependencies**: terminal-kit (UI), chokidar (file watching), download (file downloads), del-cli (file deletion), vitest (testing)
- **Output**: CommonJS module exported to dist/, binary executable at `./dist/index.js`

## Code Style Guidelines

- **Imports**: ES6 imports, tsconfig has esModuleInterop enabled, json modules resolvable
- **Naming**: camelCase for functions/variables, PascalCase for types, command handlers suffixed with `Cmd`
- **Types**: Strict mode enabled (noImplicitAny, strictFunctionTypes), some features disabled (strictNullChecks: false)
- **Error Handling**: 
    - Use `ValidationContext` for bulk reporting of input errors.
    - Use `logger.error()` for terminal failures, `logger.verbose()` for diagnostics.
    - Propagate errors to main CLI loop for non-zero exit handling.
- **Async**: Use async/await for command handlers
- **Conventions**: 
    - One command per file in `src/lib/commands/`.
    - Commands must register their help text via `addHelp()`.
    - `watchCmd` is currently stubbed as "Not implemented yet!".
- **Line Length**: Follow TypeScript best practices
