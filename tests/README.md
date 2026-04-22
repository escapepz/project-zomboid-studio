# Project Zomboid Studio Tests

This directory contains the test suite for Project Zomboid Studio.

## Structure

- `helpers/`: Shared test utilities and fixtures.
  - `test-fixtures.ts`: Unit test helpers and static project fixtures.
  - `e2e-fixtures.ts`: End-to-end test workspace and CLI invocation helpers.
- `unit/`: Unit tests for pure logic, parsing, and validation.
- `e2e/`: End-to-end tests organized by command.
- `setup/`: Vitest global setup configuration.

## End-to-End (E2E) Testing

E2E tests exercise the full CLI flow by invoking `runCLI()` against isolated temporary workspaces. This validates command routing, filesystem effects, and user-visible outcomes.

### Writing E2E Tests

1. Create a new test file in `tests/e2e/` (e.g., `new.test.ts`).
2. Use `createE2EWorkspace()` to get an isolated environment.
3. Use `workspace.run('command', ['args'])` to execute CLI commands.
4. Use `workspace.assertSuccess(result)` and `workspace.exists('file')` to verify outcomes.
5. Always call `workspace.cleanup()` in `afterEach`.

Example:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createE2EWorkspace, E2ETestWorkspace } from '../helpers/e2e-fixtures';

describe('new command', () => {
    let workspace: E2ETestWorkspace;

    beforeEach(() => {
        workspace = createE2EWorkspace();
    });

    afterEach(() => {
        workspace.cleanup();
    });

    it('should create a new project', async () => {
        const result = await workspace.run('new', ['My Project', 'Author']);
        workspace.assertSuccess(result);
        expect(workspace.exists('project.json')).toBe(true);
    });
});
```

## Running Tests

```bash
pnpm test          # Run all tests
pnpm test:watch    # Run in watch mode
```
