const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');

/**
 * Copy a folder recursively
 * @param {string} from The source folder
 * @param {string} to The destination folder
 */
function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    const files = fs.readdirSync(from);
    for (const file of files) {
        const current = fs.lstatSync(path.join(from, file));
        if (current.isDirectory()) {
            copyFolderSync(path.join(from, file), path.join(to, file));
        } else if (current.isSymbolicLink()) {
            const symlink = fs.readlinkSync(path.join(from, file));
            fs.writeFileSync(path.join(to, file), symlink);
        } else {
            fs.copyFileSync(path.join(from, file), path.join(to, file));
        }
    }
}

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

            // Copy templates from monorepo root
            const templates = [
                '.template-language',
                '.template-mod',
                '.template-mod-simple',
                '.template-project',
                '.template-workshop',
            ];

            for (const template of templates) {
                const from = path.join(
                    __dirname,
                    '../../../',
                    '.template-legacy/',
                    template,
                );
                const to = path.join(
                    __dirname,
                    '../',
                    '.template-legacy/',
                    template,
                );

                if (fs.existsSync(from)) {
                    console.log(`Syncing ${template}...`);
                    copyFolderSync(from, to);
                }
            }
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
