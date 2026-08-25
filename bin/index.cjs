#!/usr/bin/env node

const { Command } = require('commander');
const { spawn } = require('child_process');
const prompts = require('prompts');
const fs = require('fs');
const path = require('path');
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
        console.log(`Gagal membuka aplikasi: ${error.message}`);
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
// MENU TUTOR / HELP KUSTOM
// ==========================================
function showHelp() {
    console.log(`
Zap CLI - App Launcher
=======================
Cara pakai:

  [Aplikasi]
  zap scan                Memindai semua aplikasi di laptop
  zap add <nama> <path>   Tambah aplikasi manual
  zap list                Lihat daftar aplikasi
  zap alias               Buat shortcut (contoh: zap -> jadi z)
  zap delete              Hapus aplikasi dari daftar

  [Grup / Workspace]
  zap addgroup <nama> <app1> <app2>   Buat grup (contoh: zap addgroup work chrome vscode)
  zap groups               Lihat daftar grup
  zap delgroup <nama>      Hapus grup

  [Buka Aplikasi / Grup]
  zap <nama>               Buka aplikasi/grup (contoh: zap work atau zap chrome)
  zap <sebagian_nama>      Cari aplikasi mirip (contoh: zap chr -> Chrome)
`);
}

// 1. ADD
program.command('add <name> <path>')
  .description('Menambahkan aplikasi baru ke launcher')
  .action((name, path) => {
    const db = loadDb();
    db[name.toLowerCase()] = { name: name, path: path, shortcut: null };
    saveDb(db);
    console.log(`software "${name}" added successfully`);
  });

// 2. ALIAS (Autocomplete)
program.command('alias')
  .description('Menambahkan nama panggilan (shortcut) untuk aplikasi')
  .action(async () => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log('Belum ada aplikasi terdaftar.');
    
    const choices = apps.map(key => ({ title: `${db[key].name} (Path: ${db[key].path})`, value: key }));
    const appResponse = await prompts({ type: 'autocomplete', name: 'selectedApp', message: 'Ketik sebagian nama aplikasi', choices: choices });
    if (!appResponse.selectedApp) return console.log('Dibatalkan.');

    const shortcutResponse = await prompts({ type: 'text', name: 'shortcut', message: `Masukkan shortcut untuk ${db[appResponse.selectedApp].name}:` });
    if (!shortcutResponse.shortcut) return console.log('Dibatalkan.');

    db[appResponse.selectedApp].shortcut = shortcutResponse.shortcut.toLowerCase();
    saveDb(db);
    console.log(`\nShortcut "${shortcutResponse.shortcut}" berhasil ditambahkan.`);
  });

// 3. LIST
program.command('list')
  .description('Melihat daftar aplikasi yang sudah terdaftar')
  .action(() => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log('Belum ada aplikasi. Gunakan zap add atau zap scan');
    
    const withShortcut = [];
    const withoutShortcut = [];
    apps.forEach(key => { db[key].shortcut ? withShortcut.push(db[key]) : withoutShortcut.push(db[key]); });
    
    console.log('ini yang ada shorcut\n');
    withShortcut.length > 0 ? withShortcut.forEach(a => console.log(`> ${a.name} (Shortcut: ${a.shortcut})`)) : console.log('(Belum ada)');
    console.log('\n---\n');
    console.log('ini yang tidak ada shorcut\n');
    withoutShortcut.length > 0 ? withoutShortcut.forEach(a => console.log(`> ${a.name}`)) : console.log('(Semua sudah punya shortcut)');
  });

// 4. UPDATE
program.command('update <name> <new_path>')
  .description('Memperbarui path aplikasi')
  .action((name, new_path) => {
    const db = loadDb();
    const key = name.toLowerCase();
    if (!db[key]) return console.log(`Aplikasi "${name}" tidak ditemukan.`);
    db[key].path = new_path;
    saveDb(db);
    console.log(`Path untuk "${name}" diperbarui.`);
  });

// 5. DELETE (Autocomplete)
program.command('delete')
  .description('Menghapus aplikasi dari daftar')
  .action(async () => {
    const db = loadDb();
    const apps = sortApps(db);
    if (apps.length === 0) return console.log('Tidak ada aplikasi untuk dihapus.');
    
    const choices = apps.map(key => ({ title: `${db[key].name} (Path: ${db[key].path})`, value: key }));
    choices.push({ title: 'Batal', value: 'exit' });
    
    const response = await prompts({ type: 'autocomplete', name: 'selectedApp', message: 'Ketik nama aplikasi yang ingin dihapus', choices: choices });
    if (response.selectedApp && response.selectedApp !== 'exit') {
      const appName = db[response.selectedApp].name;
      delete db[response.selectedApp];
      saveDb(db);
      console.log(`Aplikasi "${appName}" dihapus.`);
    } else {
      console.log('Dibatalkan.');
    }
  });

// 6. SCAN
program.command('scan')
  .description('Otomatis memindai aplikasi dari Windows Start Menu')
  .action(() => {
    const systemStartMenu = path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const userStartMenu = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    let scannedApps = [];
    if (fs.existsSync(systemStartMenu)) scannedApps = scanDirectory(systemStartMenu, scannedApps);
    if (fs.existsSync(userStartMenu)) scannedApps = scanDirectory(userStartMenu, scannedApps);
    if (scannedApps.length === 0) return console.log('Tidak ada aplikasi ditemukan.');

    const db = loadDb();
    let newCount = 0;
    scannedApps.forEach(app => {
        if (!db[app.name]) {
            db[app.name] = { name: app.name, path: app.path, shortcut: null };
            newCount++;
        }
    });
    saveDb(db);
    console.log(`Scan selesai. ${newCount} aplikasi baru ditambahkan. Total: ${Object.keys(db).length}.`);
  });

// ==========================================
// FITUR GRUP (SIMPLIFIED)
// ==========================================

// 7. ADDGROUP
program.command('addgroup <group_name> <apps...>')
  .description('Membuat/menambah aplikasi ke grup. Contoh: zap addgroup work chrome vscode')
  .action((groupName, apps) => {
    const groups = loadGroups();
    if (!groups[groupName]) groups[groupName] = [];
    
    const db = loadDb();
    let addedCount = 0;
    
    apps.forEach(appName => {
        const key = appName.toLowerCase();
        const app = findApp(db, key);
        if (!app) return console.log(`Aplikasi "${appName}" tidak ditemukan di database. Aborting.`);
        
        if (!groups[groupName].includes(key)) {
            groups[groupName].push(key);
            addedCount++;
        }
    });

    saveGroups(groups);
    console.log(`Berhasil menambahkan ${addedCount} aplikasi ke grup "${groupName}".`);
    console.log(`Buka grup dengan mengetik: zap ${groupName}`);
  });

// 8. GROUPS (List Grup)
program.command('groups')
  .description('Melihat daftar grup dan isinya')
  .action(() => {
    const groups = loadGroups();
    const keys = Object.keys(groups);
    if (keys.length === 0) return console.log('Belum ada grup terdaftar.');
    
    const db = loadDb();
    keys.forEach(g => {
      console.log(`\n> ${g}:`);
      if (groups[g].length === 0) {
          console.log('  (kosong)');
      } else {
          groups[g].forEach(appKey => {
              const app = db[appKey];
              console.log(`  - ${app ? app.name : appKey + ' (NOT FOUND)'}`);
          });
      }
    });
  });

// 9. DELGROUP
program.command('delgroup <group_name>')
  .description('Menghapus grup')
  .action((groupName) => {
    const groups = loadGroups();
    if (!groups[groupName]) return console.log(`Grup "${groupName}" tidak ditemukan.`);
    delete groups[groupName];
    saveGroups(groups);
    console.log(`Grup "${groupName}" berhasil dihapus.`);
  });

// ==========================================
// LOGIKA PANGGIL LANGSUNG DENGAN FUZZY SEARCH & GRUP
// ==========================================
const args = process.argv.slice(2);
const knownCommands = ['add', 'addgroup', 'alias', 'list', 'groups', 'delgroup', 'update', 'delete', 'scan', 'help', '-h', '--help', '-V', '--version'];

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
            if (appsToRun.length === 0) return console.log(`Grup "${inputKey}" kosong.`);
            
            console.log(`Menjalankan grup ${inputKey}...`);
            appsToRun.forEach(appKey => {
              const app = db[appKey];
              if (app) {
                console.log(` Membuka ${app.name}...`);
                launchApp(app.path);
              } else {
                console.log(` Aplikasi "${appKey}" tidak ditemukan di database, dilewati.`);
              }
            });
            process.exit(0);
        }
        
        // 2. Jika bukan grup, cari aplikasi (Exact Match)
        let app = findApp(db, inputKey);
        
        if (app) {
          console.log(` Membuka ${app.name}...`);
          launchApp(app.path);
          process.exit(0);
        } 
        // 3. Jika tidak ketemu persis, cari yang mirip (Fuzzy Search)
        else {
          const matches = Object.values(db).filter(a => a.name.toLowerCase().includes(inputKey));
          
          if (matches.length === 1) {
            console.log(`Mungkin maksud Anda ${matches[0].name}? Membuka...`);
            launchApp(matches[0].path);
            process.exit(0);
          } else if (matches.length > 1) {
            const choices = matches.map(a => ({ title: `${a.name} (Shortcut: ${a.shortcut || '-'})`, value: a.path }));
            const response = await prompts({ type: 'autocomplete', name: 'selectedApp', message: `Ditemukan ${matches.length} aplikasi yang cocok:`, choices: choices });
            if (response.selectedApp) launchApp(response.selectedApp);
            process.exit(0);
          } else {
            console.log(`Aplikasi, shortcut, atau grup "${args[0]}" tidak ditemukan.`);
            console.log(`Ketik "zap help" untuk melihat cara pakai.`);
            process.exit(1);
          }
        }
    } else {
        program.parse(process.argv);
    }
})();