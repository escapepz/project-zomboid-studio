const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Update buildDate to today's ISO date
const today = new Date().toISOString();
pkg.buildDate = today;

fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 4) + '\n', 'utf8');
console.log(`Updated buildDate to ${today}`);
