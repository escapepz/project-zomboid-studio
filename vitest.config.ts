import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['./tests/setup/vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'src/lib/args.ts',
                'src/lib/expect.ts',
                'src/lib/helper.ts',
            ],
        },
    },
});
