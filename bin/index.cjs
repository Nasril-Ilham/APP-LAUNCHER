#!/usr/bin/env node

const { Command } = require('commander');
const prompts = require('prompts');
const chalk = require('chalk');
const path = require('path');
const { loadDb, saveDb, loadGroups, saveGroups, loadConfig, saveConfig } = require('../src/db.cjs');
const { loadTranslations, getT } = require('../src/lang/index.cjs');
const { launchApp, scanDirectory, sortApps, findApp, handleAppLaunch, quoteCommandArg } = require('../src/core.cjs');
const { showBanner, showHelp } = require('../src/help.cjs');

const program = new Command();
program.name('run').description('CLI App Launcher').version('1.0.0');

loadTranslations(); // Muat bahasa saat script dimulai
const T = getT();

// --- COMMANDS ---


program.command('add <name> [args...]')
  .allowUnknownOption(true) // Abaikan error --profile-directory
  .action((name) => {
    const db = loadDb();
    // Ambil teks mentah apa adanya tanpa diubah oleh quoteCommandArg
    const rawPath = process.argv.slice(4).join(' ');
    db[name.toLowerCase()] = { name, path: rawPath, shortcut: null };
    saveDb(db);
    console.log(chalk.green(T.add_success(name)));
  });

program.command('info [name...]').action((nameArr) => {
    const name = nameArr.join(' ');
    const app = findApp(loadDb(), name.toLowerCase());
    if (!app) return console.log(chalk.red(T.app_not_found(name)));
    console.log(chalk.bold.cyan(`\n${T.detail_app}`));
    console.log(chalk.green(`  ${T.name}     : ${app.name}`));
    console.log(chalk.green(`  Shortcut : ${app.shortcut || '-'}`));
    console.log(chalk.green(`  ${T.path}     : ${app.path}\n`));
});


program.command('edit [name...]').action(async (nameArr) => {
    const db = loadDb();
    const apps = sortApps(db);
    let key, app;

    if (nameArr && nameArr.length > 0) {
        const name = nameArr.join(' ');
        key = name.toLowerCase();
        app = findApp(db, key);
        if (!app) return console.log(chalk.red(T.app_not_found(name)));
    } else {
        if (apps.length === 0) return console.log(chalk.yellow(T.no_apps_list));
        const choices = apps.map(k => ({ 
            title: `${db[k].name} ${db[k].shortcut ? chalk.gray(`(${db[k].shortcut})`) : ''}`, 
            value: k 
        }));
        const res = await prompts({ type: 'autocomplete', name: 'selectedApp', message: T.edit_prompt, choices: choices });
        if (!res.selectedApp) return console.log(chalk.yellow(T.cancelled));
        key = res.selectedApp;
        app = db[key];
    }

    
    const editRes = await prompts({ type: 'select', name: 'field', message: T.edit_what, choices: [
        { title: T.opt_name, value: 'name' }, { title: T.opt_path, value: 'path' }, { title: T.opt_shortcut, value: 'shortcut' }, { title: T.opt_cancel, value: 'exit' }
    ]});
    if (!editRes.field || editRes.field === 'exit') return console.log(chalk.yellow(T.cancelled));

    let fieldText = editRes.field === 'name' ? T.name : editRes.field === 'path' ? T.path : T.opt_shortcut;
    const newValRes = await prompts({ type: 'text', name: 'value', message: T.enter_new(fieldText), initial: app[editRes.field] || '' });
    if (!newValRes.value) return console.log(chalk.yellow(T.cancelled));

    if (editRes.field === 'name') {
        delete db[key];
        db[newValRes.value.toLowerCase()] = { ...app, name: newValRes.value };
    } else {
        app[editRes.field] = editRes.field === 'shortcut' ? newValRes.value.toLowerCase() : newValRes.value;
    }
    saveDb(db);
    console.log(chalk.green(T.edit_success(fieldText, app.name)));
});

program.command('list').action(() => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log(chalk.yellow(T.no_apps_list));
    const withSc = [], noSc = [];
    apps.forEach(k => db[k].shortcut ? withSc.push(db[k]) : noSc.push(db[k]));
    console.log(chalk.bold.cyan(T.list_with_sc + '\n'));
    withSc.length > 0 ? withSc.forEach(a => console.log(chalk.green(`> ${a.name} (${a.shortcut})`))) : console.log(chalk.gray(T.list_none));
    console.log(chalk.gray('\n---\n'));
    console.log(chalk.bold.cyan(T.list_no_sc + '\n'));
    noSc.length > 0 ? noSc.forEach(a => console.log(`> ${a.name}`)) : console.log(chalk.gray(T.list_all_sc));
});

program.command('delete').action(async () => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log(chalk.yellow(T.no_apps_delete));
    const choices = apps.map(k => ({ title: `${db[k].name} (${db[k].shortcut || '-'})`, value: k }));
    choices.push({ title: T.opt_cancel, value: 'exit' });
    const res = await prompts({ type: 'autocomplete', name: 'v', message: T.delete_prompt, choices });
    if (res.v && res.v !== 'exit') { console.log(chalk.red(T.delete_success(db[res.v].name))); delete db[res.v]; saveDb(db); }
    else console.log(chalk.yellow(T.cancelled));
});

program.command('clear').action(async () => {
    const res = await prompts({ type: 'confirm', name: 'v', message: T.clear_prompt, initial: false });
    if (res.v) { saveDb({}); console.log(chalk.green(T.clear_success)); } else console.log(chalk.yellow(T.cancelled));
});

program.command('scan').action(() => {
    let paths = [];
    if (process.platform === 'win32') {
        paths.push(path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
        paths.push(path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
    } else if (process.platform === 'darwin') {
        paths.push('/Applications'); paths.push(path.join(process.env.HOME, 'Applications'));
    } else {
        paths.push('/usr/share/applications'); paths.push(path.join(process.env.HOME, '.local/share/applications'));
    }
    let scanned = [];
    paths.forEach(p => scanned = scanDirectory(p, scanned));
    if (scanned.length === 0) return console.log(chalk.red(T.scan_none));
    const db = loadDb();
    let count = 0;
    scanned.forEach(a => { if (!db[a.name]) { db[a.name] = { name: a.name, path: a.path, shortcut: null }; count++; } });
    saveDb(db);
    console.log(chalk.green(T.scan_success(count, Object.keys(db).length)));
});

program.command('addgroup <group_name> <apps...>').action((gn, apps) => {
    const groups = loadGroups();
    if (groups[gn]) return console.log(chalk.red(T.grp_exists(gn)));
    groups[gn] = [];
    const db = loadDb();
    let count = 0;
    apps.forEach(an => { const app = findApp(db, an.toLowerCase()); if (!app) return console.log(chalk.red(T.app_not_in_db(an))); if (!groups[gn].includes(an.toLowerCase())) { groups[gn].push(an.toLowerCase()); count++; } });
    saveGroups(groups);
    console.log(chalk.green(T.grp_create_success(gn, count)));
});

program.command('addto <group_name> <apps...>').action((gn, apps) => {
    const groups = loadGroups();
    if (!groups[gn]) return console.log(chalk.red(T.grp_not_found(gn)));
    const db = loadDb();
    let count = 0;
    apps.forEach(an => { const app = findApp(db, an.toLowerCase()); if (!app) return console.log(chalk.red(T.app_not_in_db(an))); if (!groups[gn].includes(an.toLowerCase())) { groups[gn].push(an.toLowerCase()); count++; } else console.log(chalk.yellow(T.app_already_in_grp(an, gn))); });
    saveGroups(groups);
    console.log(chalk.green(T.grp_add_success(count, gn)));
});


program.command('delfrom <group_name> [app_name...]').action((gn, anArr) => {
    const an = anArr.join(' ');
    const groups = loadGroups();
    if (!groups[gn]) return console.log(chalk.red(T.grp_not_found(gn)));
    if (!groups[gn].includes(an.toLowerCase())) return console.log(chalk.red(T.app_not_in_grp(an, gn)));
    groups[gn] = groups[gn].filter(a => a !== an.toLowerCase());
    saveGroups(groups);
    console.log(chalk.green(T.grp_rm_success(an, gn)));
});

program.command('groups').action(() => {
    const groups = loadGroups();
    if (Object.keys(groups).length === 0) return console.log(chalk.yellow(T.no_groups));
    const db = loadDb();
    Object.keys(groups).forEach(g => {
        console.log(chalk.bold.cyan(`\n> ${g}:`));
        groups[g].length === 0 ? console.log(chalk.gray(T.grp_empty_list)) : groups[g].forEach(ak => console.log(`  - ${db[ak] ? chalk.green(db[ak].name) : chalk.red(ak)}`));
    });
});

program.command('delgroup <group_name>').action((gn) => {
    const groups = loadGroups();
    if (!groups[gn]) return console.log(chalk.red(T.grp_not_found(gn)));
    delete groups[gn]; saveGroups(groups);
    console.log(chalk.red(T.grp_delete_success(gn)));
});

program.command('lang <language>').action((l) => {
    l = l.toLowerCase();
    if (l !== 'id' && l !== 'en') return console.log(chalk.red(T.lang_invalid));
    const cfg = loadConfig(); cfg.lang = l; saveConfig(cfg);
    console.log(chalk.green(l === 'en' ? T.lang_success_en : T.lang_success_id));
});

// --- MAIN EXECUTION ---
(async () => {
    const args = process.argv.slice(2);
    const known = ['add', 'addgroup', 'addto', 'edit', 'list', 'groups', 'delfrom', 'delgroup', 'info', 'delete', 'clear', 'scan', 'lang', 'help', '-h', '--help', '-V', '--version'];
    
    // Jika tidak ada argumen sama sekali (cuma ketik 'run')
    if (args.length === 0) {
        showBanner();
        showHelp();
        process.exit(0);
    }

    // Jika ketik 'run help'
    if (args[0] === 'help' || args[0] === '-h' || args[0] === '--help') {
        showHelp();
        process.exit(0);
    }
    
    // Jika bukan perintah yang dikenal, coba cari aplikasi/grup
    if (!known.includes(args[0])) {
        await handleAppLaunch(args.join(' ').toLowerCase());
        process.exit(0);
    } else {
        program.parse(process.argv);
    }
})();