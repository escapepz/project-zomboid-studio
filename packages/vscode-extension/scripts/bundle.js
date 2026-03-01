const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

async function run() {
    const ctx = await esbuild.context({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        outfile: 'dist/extension.js',
        external: ['vscode', 'terminal-kit'],
        format: 'cjs',
        platform: 'node',
        sourcemap: true,
        minify: !isWatch,
    });

    if (isWatch) {
        await ctx.watch();
        console.log('Watching...');
    } else {
        try {
            await ctx.rebuild();
            console.log('Build complete.');
        } catch (err) {
            console.error('Build failed:', err);
            process.exit(1);
        } finally {
            await ctx.dispose();
        }
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
