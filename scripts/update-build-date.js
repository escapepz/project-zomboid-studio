const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');
const distPath = path.join(__dirname, '../dist');
const buildPath = path.join(distPath, 'build.json');

// Ensure dist directory exists
if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
}

// Update buildDate to today's ISO date
const today = new Date().toISOString();
const buildInfo = {
    buildDate: today
};

fs.writeFileSync(buildPath, JSON.stringify(buildInfo, null, 4) + '\n', 'utf8');
console.log(`Updated buildDate to ${today} in ${buildPath}`);

// Copy pzstudio.cmd to dist
const cmdSource = path.join(__dirname, '../pzstudio.cmd');
const cmdDest = path.join(distPath, 'pzstudio.cmd');
if (fs.existsSync(cmdSource)) {
    fs.copyFileSync(cmdSource, cmdDest);
    console.log(`Copied pzstudio.cmd to ${cmdDest}`);
}
