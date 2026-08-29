const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const prompts = require('prompts');
const { loadDb, saveDb, loadGroups, saveGroups } = require('./db.cjs');
const { getT } = require('./lang/index.cjs');

function launchApp(appPath) {
    let command, args = [];
    if (process.platform === 'win32') { command = 'cmd'; args = ['/c', 'start', '""', appPath]; }
    else if (process.platform === 'darwin') { command = 'open'; args = [appPath]; }
    else { command = 'xdg-open'; args = [appPath]; }
    
    try {
        const child = spawn(command, args, { detached: true, stdio: 'ignore' });
        child.unref();
    } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
    }
}

function scanDirectory(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    const ignoreKeywords = ['uninstall', 'unins', 'readme', 'help', 'documentation', 'setup'];
    for (const file of files) {
        const filePath = path.join(dir, file);
        const isDir = fs.statSync(filePath).isDirectory();
        if (isDir) {
            if (process.platform === 'darwin' && file.endsWith('.app')) {
                fileList.push({ name: file.replace('.app', '').toLowerCase(), path: filePath });
            } else if (!file.endsWith('.app')) {
                scanDirectory(filePath, fileList);
            }
        } else {
            if (process.platform === 'linux' && file.endsWith('.desktop')) {
                fileList.push({ name: file.replace('.desktop', '').toLowerCase(), path: filePath });
            } else if (process.platform === 'win32' && file.endsWith('.lnk')) {
                const isJunk = ignoreKeywords.some(kw => file.toLowerCase().includes(kw));
                if (!isJunk) fileList.push({ name: file.replace('.lnk', '').toLowerCase(), path: filePath });
            }
        }
    }
    return fileList;
}

function sortApps(db) {
    return Object.keys(db).sort((a, b) => {
        if (db[a].shortcut && !db[b].shortcut) return -1;
        if (!db[a].shortcut && db[b].shortcut) return 1;
        return db[a].name.localeCompare(db[b].name);
    });
}

function findApp(db, inputKey) {
    return db[inputKey] || Object.values(db).find(a => a.shortcut === inputKey);
}

async function handleAppLaunch(inputKey) {
    const T = getT();
    const db = loadDb();
    const groups = loadGroups();
    
    if (groups[inputKey]) {
        if (groups[inputKey].length === 0) return console.log(chalk.yellow(T.group_empty(inputKey)));
        console.log(chalk.cyan(T.opening_group(inputKey)));
        groups[inputKey].forEach(appKey => {
            const app = db[appKey];
            if (app) { console.log(chalk.green(T.opening(app.name))); launchApp(app.path); }
            else { console.log(chalk.red(T.group_app_skip(appKey))); }
        });
        return;
    }
    
    let app = findApp(db, inputKey);
    if (app) {
        console.log(chalk.green(T.opening(app.name)));
        launchApp(app.path);
    } else {
        const matches = Object.values(db).filter(a => a.name.toLowerCase().includes(inputKey));
        if (matches.length === 1) {
            console.log(chalk.cyan(T.fuzzy_guess(matches[0].name)));
            launchApp(matches[0].path);
        } else if (matches.length > 1) {
            const choices = matches.map(a => ({ title: `${a.name} (${a.shortcut || '-'})`, value: a.path }));
            const response = await prompts({ type: 'autocomplete', name: 'selectedApp', message: T.fuzzy_found(matches.length), choices });
            if (response.selectedApp) launchApp(response.selectedApp);
        } else {
            console.log(chalk.red(T.not_found_generic(inputKey)));
            console.log(chalk.gray(T.type_help));
        }
    }
}

module.exports = { launchApp, scanDirectory, sortApps, findApp, handleAppLaunch };