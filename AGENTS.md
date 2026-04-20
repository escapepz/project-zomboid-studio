# AGENTS.md - Project Zomboid Studio

## Build & Commands

- **Build**: `pnpm run build` - Compiles TypeScript to JavaScript in dist/
- **Clean**: `pnpm run clean` - Removes dist/ directory
- **Watch**: `pnpm run watch` - Watches for TypeScript changes and recompiles
- **No tests available** - Project is CLI tooling without test suite

## Architecture

- **Language**: TypeScript (target: ESNext, module: CommonJS, strict mode enabled)
- **Project Type**: CLI tool for creating/managing Project Zomboid Lua mods
- **Entry**: `src/index.ts` → `src/lib/cli.ts` dispatches to command handlers
- **Structure**: `src/lib/` contains CLI infrastructure (args, logger, helpers) + `src/lib/commands/` for command implementations
- **Dependencies**: terminal-kit (UI), chokidar (file watching), download (file downloads), del-cli (file deletion)
- **Output**: CommonJS module exported to dist/, binary executable at `./dist/index.js`

## Code Style Guidelines

- **Imports**: ES6 imports, tsconfig has esModuleInterop enabled, json modules resolvable
- **Naming**: camelCase for functions/variables, PascalCase for types, command handlers suffixed with `Cmd`
- **Types**: Strict mode enabled (noImplicitAny, strictFunctionTypes), some features disabled (strictNullChecks: false)
- **Error Handling**: Use try-catch in main CLI loop, propagate errors to logger functions (error(), warn(), info())
- **Async**: Use async/await for command handlers
- **Conventions**: One command per file in src/lib/commands/, logger functions imported from lib/logger
- **Line Length**: No specific limit mentioned, follow TypeScript best practices
