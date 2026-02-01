const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const isWatch = process.argv.includes('--watch');

async function run() {
    const extensionCtx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        outfile: 'dist/extension.js',
        external: ['vscode', 'terminal-kit'],
        format: 'cjs',
        platform: 'node',
        sourcemap: true,
        minify: !isWatch,
    });

    const cliCtx = await esbuild.context({
        entryPoints: ['src/index.ts'],
        bundle: true,
        outfile: 'dist/index.js',
        external: ['terminal-kit'],
        format: 'cjs',
        platform: 'node',
        sourcemap: true,
        minify: !isWatch,
    });

    if (isWatch) {
        await Promise.all([extensionCtx.watch(), cliCtx.watch()]);
        console.log('Watching...');
    } else {
        try {
            await Promise.all([extensionCtx.rebuild(), cliCtx.rebuild()]);
            console.log('Build complete.');
        } catch (err) {
            console.error('Build failed:', err);
            process.exit(1);
        } finally {
            await extensionCtx.dispose();
            await cliCtx.dispose();
        }
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
