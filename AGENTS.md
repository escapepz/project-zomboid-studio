# AGENTS.md

## Commands
- **Build:** `pnpm build`
- **Lint:** `pnpm lint` (fix: `pnpm lint:fix`)
- **Format:** `pnpm format` (check: `pnpm format:check`)
- **Test all:** `pnpm test`
- **Single test:** `pnpm exec vitest run tests/unit/someFile.test.ts`
- **Test watch:** `pnpm test:watch`

On Windows 10:
- **Run any pnpm command:** `powershell -ExecutionPolicy Bypass -Command "pnpm ..."`

## Architecture
TypeScript CLI tool (`pzstudio`) for Project Zomboid Lua mod scaffolding. CommonJS module, entry point `src/index.ts`, public API at `src/api.ts`. Commands live in `src/lib/commands/` (add, build, clean, delete, new, watch, etc.). A VS Code extension lives in `packages/vscode-extension/`. Tests use Vitest in `tests/unit/`, setup in `tests/setup/vitest.setup.ts`.

## Code Style
- **TypeScript strict mode** (but `strictNullChecks: false`). Target `esnext`, module `CommonJS`.
- **Prettier:** 4-space indent, single quotes, no tabs.
- **ESLint:** `@typescript-eslint/no-explicit-any` is off; unused vars warn with `^_` ignore pattern; `no-require-imports` off.
- **Naming:** Commands are single lowercase files (e.g., `build.ts`). Helpers/utilities in `src/lib/`.
- **Imports:** Use `require()`-style (CommonJS). `esModuleInterop` and `allowSyntheticDefaultImports` enabled.
- **Dependencies:** Runtime deps are minimal (chokidar, terminal-kit). Use pnpm exclusively.
- **Error handling:** Custom errors in `src/lib/errors/`. Validation logic in `src/lib/validation.ts` and `src/lib/expect.ts`.
