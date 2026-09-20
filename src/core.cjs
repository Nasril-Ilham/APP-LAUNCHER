const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const prompts = require('prompts');
const { loadDb, saveDb, loadGroups, saveGroups } = require('./db.cjs');
const { getT } = require('./lang/index.cjs');

// ==========================================
// FUNGSI BANTU PARSER (Untuk perintah add)
// ==========================================

function splitCommandLine(input) {
    const value = String(input || '');
    const tokens = [];
    let current = '';
    let quote = null;

    for (let i = 0; i < value.length; i++) {
        const ch = value[i];

        if (ch === '"' || ch === "'") {
            if (quote === ch) {
                quote = null;
            } else if (!quote) {
                quote = ch;
            } else {
                current += ch;
            }
            continue;
        }

        if ((ch === ' ' || ch === '\t') && !quote) {
            if (current) {
                tokens.push(current);
                current = '';
            }
            continue;
        }

        current += ch;
    }

    if (current) tokens.push(current);
    return tokens.map(token => token.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1'));
}

function parseLaunchCommand(input) {
    const tokens = splitCommandLine(input);
    if (tokens.length === 0) return { command: '', args: [] };
    return { command: tokens[0], args: tokens.slice(1) };
}

function isWindowsPathLaunch(input) {
    const value = String(input || '').trim();
    if (!value) return false;

    const directMatch = /^(?:[a-zA-Z]:[\\/]|\\\\|\.{1,2}[\\/]).*\.(lnk|exe|bat|cmd|msi)$/i.test(value);
    if (directMatch) return true;

    const quotedMatch = /^"(.+)"$|^'(.+)'$/.exec(value);
    if (quotedMatch) {
        const candidate = (quotedMatch[1] || quotedMatch[2] || '').trim();
        return /^(?:[a-zA-Z]:[\\/]|\\\\|\.{1,2}[\\/]).*\.(lnk|exe|bat|cmd|msi)$/i.test(candidate);
    }

    const tokens = splitCommandLine(value);
    if (tokens.length !== 1) return false;

    const pathToken = tokens[0].replace(/^"|"$/g, '');
    return /^(?:[a-zA-Z]:[\\/]|\\\\|\.{1,2}[\\/])/.test(pathToken)
        && /\.(lnk|exe|bat|cmd|msi)$/i.test(pathToken);
}

function isUrlLike(input) {
    const value = String(input || '').trim();
    return /^(https?:|mailto:|ftp:|file:|www\.)/i.test(value) || value.includes('://');
}

// Fungsi ini akan memulihkan tanda kutip yang dibuang oleh terminal saat mengetik "run add"
function quoteCommandArg(arg) {
    if (arg === undefined || arg === null) return '';
    const value = String(arg);
    if (value === '') return '';

    // Tangani flags seperti --profile-directory=Profile 5
    if (value.startsWith('--') && value.includes('=')) {
        const eqIndex = value.indexOf('=');
        const flag = value.substring(0, eqIndex);
        const val = value.substring(eqIndex + 1);
        if (val.includes(' ')) return `"${flag}=${val}"`;
        return value;
    }

    // Tangani path yang ada spasi seperti C:\Program Files\...
    if (value.includes(' ')) return `"${value}"`;

    return value;
}


// ==========================================
// FUNGSI NATIVE UNTUK MEMBUKA APLIKASI
// ==========================================
function launchApp(appPath) {
    const rawCommand = typeof appPath === 'string' ? appPath.trim() : '';
    if (!rawCommand) {
        console.log(chalk.yellow('No app path provided.'));
        return;
    }

    try {
        if (process.platform === 'win32') {
            const startsWithQuote = rawCommand.startsWith('"') || rawCommand.startsWith("'");
            const command = startsWithQuote || isUrlLike(rawCommand)
                ? rawCommand
                : `"${rawCommand}"`;
            const child = exec(`start "" ${command}`, {
                detached: true,
                windowsHide: true
            }, (error) => {
                if (error) console.log(chalk.red(`Gagal membuka aplikasi: ${error.message}`));
            });
            child.unref();
            return;
        }

        // Untuk Mac dan Linux
        const launcher = process.platform === 'darwin' ? 'open' : 'xdg-open';
        const escapedCommand = rawCommand.replace(/"/g, '\\"');
        const child = exec(`${launcher} "${escapedCommand}"`, {
            detached: true
        }, (error) => {
            if (error) console.log(chalk.red(`Error: ${error.message}`));
        });
        child.unref();
    } catch (error) {
        console.log(chalk.red(`Error: ${error.message}`));
    }
}


// ==========================================
// FUNGSI BANTU SCAN FOLDER (LINTAS OS)
// ==========================================
function scanDirectory(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    let files;
    try {
        files = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return fileList;
    }
    
    const ignoreKeywords = [
        'uninstall', 'unins', 'readme', 'help', 'documentation', 'setup', 'update', 'updater',
        'node', 'npm', 'npx', 'python', 'pip', 'git', 'cmd', 'powershell', 'pwsh',
        'mysql', 'postgres', 'psql', 'redis', 'mongo', 'nginx', 'apache', 'httpd',
        'server', 'service', 'daemon', 'cli', 'console', 'terminal', 'runtime',
        'vc_redist', 'redist', 'installer', 'crashpad', 'handler'
    ];
    
    let allowedExts = [];
    if (process.platform === 'win32') {
        allowedExts = ['.lnk', '.exe'];
    } else if (process.platform === 'darwin') {
        allowedExts = ['.app'];
    } else {
        allowedExts = ['.desktop'];
    }

    for (const entry of files) {
        const file = entry.name;
        const filePath = path.join(dir, file);
        const isDir = entry.isDirectory();
        const lowerCaseFile = file.toLowerCase();
        const fileExt = path.extname(lowerCaseFile);
        const isJunk = ignoreKeywords.some(keyword => lowerCaseFile.includes(keyword));

        if (process.platform === 'darwin' && isDir && fileExt === '.app') {
            if (!isJunk) {
                fileList.push({ name: file.replace('.app', '').toLowerCase(), path: filePath });
            }
        } else if (!isDir && allowedExts.includes(fileExt)) {
            if (!isJunk) {
                const appName = file.replace(fileExt, '').toLowerCase();
                fileList.push({ name: appName, path: filePath });
            }
        } else if (isDir && fileExt !== '.app') {
            scanDirectory(filePath, fileList);
        }
    }
    return fileList;
}


// ==========================================
// FUNGSI SORTIR & CARI APLIKASI
// ==========================================
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

function findAppKey(db, inputKey) {
    if (db[inputKey]) return inputKey;
    return Object.keys(db).find(key => db[key].shortcut === inputKey);
}

function findGroupKey(groups, inputKey) {
    return Object.keys(groups).find(key => key.toLowerCase() === String(inputKey || '').toLowerCase());
}


// ==========================================
// LOGIKA PANGGIL LANGSUNG (ONE-SHOT & FUZZY)
// ==========================================
async function handleAppLaunch(inputKey) {
    const T = getT();
    const db = loadDb();
    const groups = loadGroups();
    
    const groupKey = findGroupKey(groups, inputKey);
    if (groupKey) {
        if (groups[groupKey].length === 0) return console.log(chalk.yellow(T.group_empty(groupKey)));
        console.log(chalk.cyan(T.opening_group(groupKey)));
        groups[groupKey].forEach(appKey => {
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


// ==========================================
// EXPORT MODULES
// ==========================================
module.exports = {
    splitCommandLine,
    parseLaunchCommand,
    isWindowsPathLaunch,
    isUrlLike,
    launchApp,
    scanDirectory,
    sortApps,
    findApp,
    findAppKey,
    findGroupKey,
    handleAppLaunch,
    quoteCommandArg
};