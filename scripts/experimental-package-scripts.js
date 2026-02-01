const fs = require('fs');
const path = require('path');

/**
 * Configure your custom scripts here.
 * These will be added to the project's package.json.
 */
const PROJECT_SCRIPTS = {
    'experimental:setup:vanilla': 'mkdir .tmp & mklink /J "%CD%\\.tmp\\vanilla" "%ProgramFiles(x86)%\\Steam\\steamapps\\common\\ProjectZomboid\\media\\lua"'
};

/**
 * Configure your custom mod scripts here.
 * {modId} will be replaced with the actual mod id.
 */
const MOD_SCRIPTS = {
    'experimental:setup:nonsteam:{modId}': 'mklink /J "C:\\ZomboidClient1\\mods\\{modId}" "%CD%\\{modId}"'
};

/**
 * Add experimental project scripts to package.json
 * @param {string} projectDir 
 */
function addProjectScripts(projectDir) {
    const packagePath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(packagePath)) return;

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    pkg.scripts = pkg.scripts || {};

    for (const [name, script] of Object.entries(PROJECT_SCRIPTS)) {
        pkg.scripts[name] = script;
    }

    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 4) + '\n', 'utf8');
}

/**
 * Add experimental mod scripts to package.json
 * @param {string} projectDir 
 * @param {string} modId 
 */
function addModScripts(projectDir, modId) {
    const packagePath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(packagePath)) return;

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    pkg.scripts = pkg.scripts || {};

    for (const [name, script] of Object.entries(MOD_SCRIPTS)) {
        const scriptName = name.replace(/{modId}/g, modId);
        const scriptContent = script.replace(/{modId}/g, modId);
        pkg.scripts[scriptName] = scriptContent;
    }

    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 4) + '\n', 'utf8');
}

/**
 * Remove experimental mod scripts from package.json
 * @param {string} projectDir 
 * @param {string} modId 
 */
function removeModScripts(projectDir, modId) {
    const packagePath = path.join(projectDir, 'package.json');
    if (!fs.existsSync(packagePath)) return;

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    if (!pkg.scripts) return;

    for (const name of Object.keys(MOD_SCRIPTS)) {
        const scriptName = name.replace(/{modId}/g, modId);
        delete pkg.scripts[scriptName];
    }

    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 4) + '\n', 'utf8');
}

module.exports = {
    addProjectScripts,
    addModScripts,
    removeModScripts
};
