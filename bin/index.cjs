#!/usr/bin/env node

const { Command } = require('commander');
const { spawn } = require('child_process');
const prompts = require('prompts');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { loadDb, saveDb, loadGroups, saveGroups } = require('../src/db');
const program = new Command();

program
  .name('zap')
  .description('CLI App Launcher for your laptop')
  .version('1.0.0');

// Fungsi native untuk membuka aplikasi
function launchApp(appPath) {
    let command;
    let args = [];
    
    if (process.platform === 'win32') {
        command = 'cmd';
        args = ['/c', 'start', '""', appPath];
    } else if (process.platform === 'darwin') {
        command = 'open';
        args = [appPath];
    } else {
        command = 'xdg-open';
        args = [appPath];
    }
    
    try {
        const child = spawn(command, args, { detached: true, stdio: 'ignore' });
        child.unref();
    } catch (error) {
        console.log(chalk.red(`Gagal membuka aplikasi: ${error.message}`));
    }
}

// Fungsi bantu scan folder
function scanDirectory(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    const ignoreKeywords = ['uninstall', 'unins', 'readme', 'help', 'documentation', 'setup'];
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            scanDirectory(filePath, fileList);
        } else if (file.endsWith('.lnk')) {
            const lowerCaseFile = file.toLowerCase();
            const isJunk = ignoreKeywords.some(keyword => lowerCaseFile.includes(keyword));
            if (!isJunk) {
                const appName = file.replace('.lnk', '').toLowerCase();
                fileList.push({ name: appName, path: filePath });
            }
        }
    }
    return fileList;
}

// Fungsi sortir aplikasi
function sortApps(db) {
    return Object.keys(db).sort((a, b) => {
        const appA = db[a];
        const appB = db[b];
        if (appA.shortcut && !appB.shortcut) return -1;
        if (!appA.shortcut && appB.shortcut) return 1;
        return appA.name.localeCompare(appB.name);
    });
}

// Fungsi cari aplikasi
function findApp(db, inputKey) {
    let app = db[inputKey];
    if (!app) {
        app = Object.values(db).find(a => a.shortcut === inputKey);
    }
    return app;
}

// ==========================================
// MENU TUTOR / HELP KUSTOM (DENGAN WARNA)
// ==========================================
function showHelp() {
    console.log(`
 ${chalk.bold.white('App Launcher')}
 ${chalk.white('=======================')}
 ${chalk.bold.green('Cara pakai:')}

  ${chalk.magenta.bold('[Aplikasi]')}
  ${chalk.bold.white('zap scan')}                ${chalk.gray('Memindai semua aplikasi di laptop')}
  ${chalk.bold.white('zap add <nama> <path>')}   ${chalk.gray('Tambah aplikasi manual')}
  ${chalk.bold.white('zap list')}                ${chalk.gray('Lihat daftar aplikasi')}
  ${chalk.bold.white('zap info <nama>')}         ${chalk.gray('Lihat detail lokasi file aplikasi')}
  ${chalk.bold.white('zap alias')}               ${chalk.gray('Buat shortcut (contoh: zap -> jadi z)')}
  ${chalk.bold.white('zap delete')}              ${chalk.gray('Hapus aplikasi dari daftar')}

  ${chalk.magenta.bold('[Grup / Workspace]')}
  ${chalk.bold.white('zap addgroup <nama> <app1> <app2>')}   ${chalk.gray('Buat grup baru (contoh: zap addgroup work chrome vscode)')}
  ${chalk.bold.white('zap addto <nama> <app1> <app2>')}      ${chalk.gray('Tambah aplikasi ke grup yang sudah ada (contoh: zap addto edit magnific)')}
  ${chalk.bold.white('zap groups')}                          ${chalk.gray('Lihat daftar grup')}
  ${chalk.bold.white('zap delgroup <nama>')}                 ${chalk.gray('Hapus grup')}

  ${chalk.magenta.bold('[Buka Aplikasi / Grup]')}
  ${chalk.bold.white('zap or open <nama>')}               ${chalk.gray('Buka aplikasi/grup (contoh: zap work atau zap chrome)')}
  ${chalk.bold.white('zap or open <sebagian_nama>')}      ${chalk.gray('Cari aplikasi mirip (contoh: zap chr -> Chrome)')}
`);
}

// 1. ADD
program.command('add <name> <path>')
  .description('Menambahkan aplikasi baru ke launcher')
  .action((name, path) => {
    const db = loadDb();
    db[name.toLowerCase()] = { name: name, path: path, shortcut: null };
    saveDb(db);
    console.log(chalk.green(`software "${name}" added successfully`));
  });

// 2. INFO (Melihat path aplikasi)
program.command('info <name>')
  .description('Melihat detail lokasi file aplikasi')
  .action((name) => {
    const db = loadDb();
    const key = name.toLowerCase();
    const app = findApp(db, key);
    
    if (!app) return console.log(chalk.red(`Aplikasi "${name}" tidak ditemukan.`));
    
    console.log(chalk.bold.cyan(`\nDetail Aplikasi:`));
    console.log(chalk.green(`  Nama     : ${app.name}`));
    console.log(chalk.green(`  Shortcut : ${app.shortcut || '-'}`));
    console.log(chalk.green(`  Path     : ${app.path}\n`));
  });

// 3. ALIAS (Autocomplete tanpa Path)
program.command('alias')
  .description('Menambahkan nama panggilan (shortcut) untuk aplikasi')
  .action(async () => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log(chalk.yellow('Belum ada aplikasi terdaftar.'));
    
    const choices = apps.map(key => ({ 
      title: `${db[key].name} ${db[key].shortcut ? chalk.gray(`(${db[key].shortcut})`) : ''}`, 
      value: key 
    }));
    
    const appResponse = await prompts({ type: 'autocomplete', name: 'selectedApp', message: 'Ketik sebagian nama aplikasi', choices: choices });
    if (!appResponse.selectedApp) return console.log(chalk.yellow('Dibatalkan.'));

    const shortcutResponse = await prompts({ type: 'text', name: 'shortcut', message: `Masukkan shortcut untuk ${db[appResponse.selectedApp].name}:` });
    if (!shortcutResponse.shortcut) return console.log(chalk.yellow('Dibatalkan.'));

    db[appResponse.selectedApp].shortcut = shortcutResponse.shortcut.toLowerCase();
    saveDb(db);
    console.log(chalk.green(`\nShortcut "${shortcutResponse.shortcut}" berhasil ditambahkan.`));
  });

// 4. LIST (Tanpa Path)
program.command('list')
  .description('Melihat daftar aplikasi yang sudah terdaftar')
  .action(() => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log(chalk.yellow('Belum ada aplikasi. Gunakan zap add atau zap scan'));
    
    const withShortcut = [];
    const withoutShortcut = [];
    apps.forEach(key => { db[key].shortcut ? withShortcut.push(db[key]) : withoutShortcut.push(db[key]); });
    
    console.log(chalk.bold.cyan('ini yang ada shorcut\n'));
    withShortcut.length > 0 ? withShortcut.forEach(a => console.log(chalk.green(`> ${a.name} ${chalk.gray(`(${a.shortcut})`)}`))) : console.log(chalk.gray('(Belum ada)'));
    console.log(chalk.gray('\n---\n'));
    console.log(chalk.bold.cyan('ini yang tidak ada shorcut\n'));
    withoutShortcut.length > 0 ? withoutShortcut.forEach(a => console.log(`> ${a.name}`)) : console.log(chalk.gray('(Semua sudah punya shortcut)'));
  });

// 5. UPDATE
program.command('update <name> <new_path>')
  .description('Memperbarui path aplikasi')
  .action((name, new_path) => {
    const db = loadDb();
    const key = name.toLowerCase();
    if (!db[key]) return console.log(chalk.red(`Aplikasi "${name}" tidak ditemukan.`));
    db[key].path = new_path;
    saveDb(db);
    console.log(chalk.green(`Path untuk "${name}" diperbarui.`));
  });

// 6. DELETE (Autocomplete tanpa Path)
program.command('delete')
  .description('Menghapus aplikasi dari daftar')
  .action(async () => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log(chalk.yellow('Tidak ada aplikasi untuk dihapus.'));
    
    const choices = apps.map(key => ({ 
      title: `${db[key].name} ${db[key].shortcut ? chalk.gray(`(${db[key].shortcut})`) : ''}`, 
      value: key 
    }));
    choices.push({ title: 'Batal', value: 'exit' });
    
    const response = await prompts({ type: 'autocomplete', name: 'selectedApp', message: 'Ketik nama aplikasi yang ingin dihapus', choices: choices });
    if (response.selectedApp && response.selectedApp !== 'exit') {
      const appName = db[response.selectedApp].name;
      delete db[response.selectedApp];
      saveDb(db);
      console.log(chalk.red(`Aplikasi "${appName}" dihapus.`));
    } else {
      console.log(chalk.yellow('Dibatalkan.'));
    }
  });

// 7. SCAN
program.command('scan')
  .description('Otomatis memindai aplikasi dari Windows Start Menu')
  .action(() => {
    const systemStartMenu = path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const userStartMenu = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    let scannedApps = [];
    if (fs.existsSync(systemStartMenu)) scannedApps = scanDirectory(systemStartMenu, scannedApps);
    if (fs.existsSync(userStartMenu)) scannedApps = scanDirectory(userStartMenu, scannedApps);
    if (scannedApps.length === 0) return console.log(chalk.red('Tidak ada aplikasi ditemukan.'));

    const db = loadDb();
    let newCount = 0;
    scannedApps.forEach(app => {
        if (!db[app.name]) {
            db[app.name] = { name: app.name, path: app.path, shortcut: null };
            newCount++;
        }
    });
    saveDb(db);
    console.log(chalk.green(`Scan selesai. ${newCount} aplikasi baru ditambahkan. Total: ${Object.keys(db).length}.`));
  });

// ==========================================
// FITUR GRUP (SIMPLIFIED)
// ==========================================

// 8. ADDGROUP (Untuk membuat grup baru)
program.command('addgroup <group_name> <apps...>')
  .description('Membuat grup baru. Contoh: zap addgroup work chrome vscode')
  .action((groupName, apps) => {
    const groups = loadGroups();
    if (groups[groupName]) return console.log(chalk.red(`Grup "${groupName}" sudah ada. Gunakan "zap addto ${groupName} <app>" untuk menambah aplikasi.`));
    
    groups[groupName] = [];
    const db = loadDb();
    let addedCount = 0;
    
    apps.forEach(appName => {
        const key = appName.toLowerCase();
        const app = findApp(db, key);
        if (!app) return console.log(chalk.red(`Aplikasi "${appName}" tidak ditemukan di database. Aborting.`));
        
        if (!groups[groupName].includes(key)) {
            groups[groupName].push(key);
            addedCount++;
        }
    });

    saveGroups(groups);
    console.log(chalk.green(`Berhasil membuat grup "${groupName}" dengan ${addedCount} aplikasi.`));
    console.log(chalk.cyan(`Buka grup dengan mengetik: zap ${groupName}`));
  });

// 9. ADDTO (Untuk menambahkan aplikasi ke grup yang sudah ada)
program.command('addto <group_name> <apps...>')
  .description('Menambah aplikasi ke grup yang sudah ada. Contoh: zap addto edit magnific')
  .action((groupName, apps) => {
    const groups = loadGroups();
    if (!groups[groupName]) return console.log(chalk.red(`Grup "${groupName}" tidak ditemukan. Buat dulu dengan zap addgroup.`));
    
    const db = loadDb();
    let addedCount = 0;
    
    apps.forEach(appName => {
        const key = appName.toLowerCase();
        const app = findApp(db, key);
        if (!app) return console.log(chalk.red(`Aplikasi "${appName}" tidak ditemukan di database. Aborting.`));
        
        if (!groups[groupName].includes(key)) {
            groups[groupName].push(key);
            addedCount++;
        } else {
            console.log(chalk.yellow(`Aplikasi "${appName}" sudah ada di grup "${groupName}".`));
        }
    });

    saveGroups(groups);
    console.log(chalk.green(`Berhasil menambahkan ${addedCount} aplikasi ke grup "${groupName}".`));
  });

// 10. GROUPS (List Grup)
program.command('groups')
  .description('Melihat daftar grup dan isinya')
  .action(() => {
    const groups = loadGroups();
    const keys = Object.keys(groups);
    if (keys.length === 0) return console.log(chalk.yellow('Belum ada grup terdaftar.'));
    
    const db = loadDb();
    keys.forEach(g => {
      console.log(chalk.bold.cyan(`\n> ${g}:`));
      if (groups[g].length === 0) {
          console.log(chalk.gray('  (kosong)'));
      } else {
          groups[g].forEach(appKey => {
              const app = db[appKey];
              console.log(`  - ${app ? chalk.green(app.name) : chalk.red(appKey + ' (NOT FOUND)')}`);
          });
      }
    });
  });

// 11. DELGROUP
program.command('delgroup <group_name>')
  .description('Menghapus grup')
  .action((groupName) => {
    const groups = loadGroups();
    if (!groups[groupName]) return console.log(chalk.red(`Grup "${groupName}" tidak ditemukan.`));
    delete groups[groupName];
    saveGroups(groups);
    console.log(chalk.red(`Grup "${groupName}" berhasil dihapus.`));
  });

// ==========================================
// LOGIKA PANGGIL LANGSUNG DENGAN FUZZY SEARCH & GRUP
// ==========================================
const args = process.argv.slice(2);
const knownCommands = ['add', 'addgroup', 'addto', 'alias', 'list', 'groups', 'delgroup', 'info', 'update', 'delete', 'scan', 'help', '-h', '--help', '-V', '--version'];

(async () => {
    if (args.length === 0) {
        showHelp();
        process.exit(0);
    }

    if (args[0] === 'help' || args[0] === '-h' || args[0] === '--help') {
        showHelp();
        process.exit(0);
    }

    if (!knownCommands.includes(args[0])) {
        const db = loadDb();
        const groups = loadGroups();
        const inputKey = args[0].toLowerCase();
        
        // 1. Cek dulu apakah input adalah nama GRUP
        if (groups[inputKey]) {
            const appsToRun = groups[inputKey];
            if (appsToRun.length === 0) return console.log(chalk.yellow(`Grup "${inputKey}" kosong.`));
            
            console.log(chalk.cyan(`Menjalankan grup ${inputKey}...`));
            appsToRun.forEach(appKey => {
              const app = db[appKey];
              if (app) {
                console.log(chalk.green(` Membuka ${app.name}...`));
                launchApp(app.path);
              } else {
                console.log(chalk.red(` Aplikasi "${appKey}" tidak ditemukan di database, dilewati.`));
              }
            });
            process.exit(0);
        }
        
        // 2. Jika bukan grup, cari aplikasi (Exact Match)
        let app = findApp(db, inputKey);
        
        if (app) {
          console.log(chalk.green(` Membuka ${app.name}...`));
          launchApp(app.path);
          process.exit(0);
        } 
        // 3. Jika tidak ketemu persis, cari yang mirip (Fuzzy Search)
        else {
          const matches = Object.values(db).filter(a => a.name.toLowerCase().includes(inputKey));
          
          if (matches.length === 1) {
            console.log(chalk.cyan(`Mungkin maksud Anda ${matches[0].name}? Membuka...`));
            launchApp(matches[0].path);
            process.exit(0);
          } else if (matches.length > 1) {
            const choices = matches.map(a => ({ title: `${a.name} (Shortcut: ${a.shortcut || '-'})`, value: a.path }));
            const response = await prompts({ type: 'autocomplete', name: 'selectedApp', message: `Ditemukan ${matches.length} aplikasi yang cocok:`, choices: choices });
            if (response.selectedApp) launchApp(response.selectedApp);
            process.exit(0);
          } else {
            console.log(chalk.red(`Aplikasi, shortcut, atau grup "${args[0]}" tidak ditemukan.`));
            console.log(chalk.gray(`Ketik "zap help" untuk melihat cara pakai.`));
            process.exit(1);
          }
        }
    } else {
        program.parse(process.argv);
    }
})();