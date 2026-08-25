#!/usr/bin/env node

const { Command } = require('commander');
const { spawn } = require('child_process');
const prompts = require('prompts');
const fs = require('fs');
const path = require('path');
const { loadDb, saveDb } = require('../src/db');
const program = new Command();

program
  .name('zap')
  .description('CLI App Launcher for your laptop')
  .version('1.0.0');

// Fungsi native untuk membuka aplikasi menggunakan spawn
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
        const child = spawn(command, args, {
            detached: true,
            stdio: 'ignore'
        });
        child.unref();
    } catch (error) {
        console.log(`Gagal membuka aplikasi: ${error.message}`);
    }
}

// Fungsi bantu untuk memindai folder secara rekursif
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

// Fungsi khusus untuk mengurutkan
function sortApps(db) {
    return Object.keys(db).sort((a, b) => {
        const appA = db[a];
        const appB = db[b];
        
        if (appA.shortcut && !appB.shortcut) return -1;
        if (!appA.shortcut && appB.shortcut) return 1;
        
        return appA.name.localeCompare(appB.name);
    });
}

// 1. PERINTAH ADD
program.command('add <name> <path>')
  .description('Menambahkan aplikasi baru ke launcher')
  .action((name, path) => {
    const db = loadDb();
    db[name.toLowerCase()] = { name: name, path: path, shortcut: null };
    saveDb(db);
    console.log(`software "${name}" added successfully`);
  });

// 2. PERINTAH ALIAS (Autocomplete)
program.command('alias')
  .description('Menambahkan nama panggilan (shortcut) untuk aplikasi')
  .action(async () => {
    const db = loadDb();
    const apps = sortApps(db);
    
    if (apps.length === 0) {
      console.log('Belum ada aplikasi terdaftar.');
      return;
    }
    
    const choices = apps.map(key => ({
      title: `${db[key].name} (Path: ${db[key].path})`,
      value: key
    }));

    const appResponse = await prompts({
      type: 'autocomplete',
      name: 'selectedApp',
      message: 'Ketik sebagian nama aplikasi untuk mencari',
      choices: choices
    });

    if (!appResponse.selectedApp) {
      console.log('Proses dibatalkan.');
      return;
    }

    const shortcutResponse = await prompts({
      type: 'text',
      name: 'shortcut',
      message: `Masukkan shortcut untuk ${db[appResponse.selectedApp].name} (contoh: chr):`
    });

    if (!shortcutResponse.shortcut) {
      console.log('Proses dibatalkan.');
      return;
    }

    const shortcutKey = shortcutResponse.shortcut.toLowerCase();
    db[appResponse.selectedApp].shortcut = shortcutKey;
    saveDb(db);
    
    console.log(`\nShortcut "${shortcutKey}" berhasil ditambahkan.`);
    console.log(`Sekarang Anda bisa membukanya dengan mengetik: zap ${shortcutKey}`);
  });

// 3. PERINTAH LIST
program.command('list')
  .description('Melihat daftar aplikasi yang sudah terdaftar')
  .action(() => {
    const db = loadDb();
    const apps = sortApps(db);
    
    if (apps.length === 0) {
      console.log('there are no registered applications. Use: zap add <name> <path> or zap scan');
      return;
    }
    
    const withShortcut = [];
    const withoutShortcut = [];
    
    apps.forEach(key => {
        if (db[key].shortcut) {
            withShortcut.push(db[key]);
        } else {
            withoutShortcut.push(db[key]);
        }
    });
    
    console.log('ini yang ada shorcut' + '\n');
    if (withShortcut.length > 0) {
        withShortcut.forEach(app => {
            console.log(`> ${app.name} (Shortcut: ${app.shortcut}) (Path: ${app.path})`);
        });
    } else {
        console.log('(Belum ada aplikasi yang memiliki shortcut)');
    }
    
    console.log('\n---\n');
    
    console.log('ini yang tidak ada shorcut biar mudah di baca' + '\n');
    if (withoutShortcut.length > 0) {
        withoutShortcut.forEach(app => {
            console.log(`> ${app.name} (Path: ${app.path})`);
        });
    } else {
        console.log('(Semua aplikasi sudah memiliki shortcut)');
    }
  });

// 4. PERINTAH UPDATE
program.command('update <name> <new_path>')
  .description('Memperbarui path dari aplikasi yang sudah terdaftar')
  .action((name, new_path) => {
    const db = loadDb();
    const key = name.toLowerCase();
    
    if (!db[key]) {
      console.log(`Aplikasi "${name}" tidak ditemukan. Cek kembali menggunakan: zap list`);
      return;
    }
    
    db[key].path = new_path;
    saveDb(db);
    console.log(`Path untuk aplikasi "${name}" berhasil diperbarui.`);
  });

// 5. PERINTAH DELETE (Autocomplete)
program.command('delete')
  .description('Menghapus aplikasi dari daftar secara interaktif')
  .action(async () => {
    const db = loadDb();
    const apps = sortApps(db);
    
    if (apps.length === 0) {
      console.log('Tidak ada aplikasi terdaftar untuk dihapus.');
      return;
    }
    
    const choices = apps.map(key => ({
      title: `${db[key].name} (Path: ${db[key].path})`,
      value: key
    }));

    choices.push({
      title: 'Batal dan Keluar',
      value: 'exit'
    });
    
    const response = await prompts({
      type: 'autocomplete',
      name: 'selectedApp',
      message: 'Ketik sebagian nama aplikasi yang ingin dihapus',
      choices: choices
    });
    
    if (response.selectedApp && response.selectedApp !== 'exit') {
      const appName = db[response.selectedApp].name;
      delete db[response.selectedApp];
      saveDb(db);
      console.log(`Aplikasi "${appName}" berhasil dihapus.`);
    } else {
      console.log('Proses penghapusan dibatalkan.');
    }
  });

// 6. PERINTAH SCAN
program.command('scan')
  .description('Otomatis memindai dan mendaftarkan aplikasi dari Windows Start Menu')
  .action(() => {
    const systemStartMenu = path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const userStartMenu = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');

    let scannedApps = [];
    
    if (fs.existsSync(systemStartMenu)) {
        scannedApps = scanDirectory(systemStartMenu, scannedApps);
    }
    if (fs.existsSync(userStartMenu)) {
        scannedApps = scanDirectory(userStartMenu, scannedApps);
    }

    if (scannedApps.length === 0) {
        console.log('Tidak ada aplikasi yang ditemukan saat pemindaian.');
        return;
    }

    const db = loadDb();
    let newCount = 0;

    scannedApps.forEach(app => {
        if (!db[app.name]) {
            db[app.name] = { 
                name: app.name, 
                path: app.path, 
                shortcut: null 
            };
            newCount++;
        }
    });

    saveDb(db);
    console.log(`Scan selesai. ${newCount} aplikasi baru berhasil ditambahkan ke database.`);
    console.log(`Total aplikasi terdaftar saat ini: ${Object.keys(db).length}.`);
  });

// 7. LOGIKA PANGGIL LANGSUNG DENGAN FUZZY SEARCH
const args = process.argv.slice(2);
const knownCommands = ['add', 'alias', 'list', 'update', 'delete', 'scan', '-h', '--help', '-V', '--version'];

// Bungkus dalam async function agar bisa menggunakan await
(async () => {
    if (args.length > 0 && !knownCommands.includes(args[0])) {
        const db = loadDb();
        const inputKey = args[0].toLowerCase();
        
        // Cari aplikasi berdasarkan nama asli atau shortcut (Exact Match)
        let app = db[inputKey];
        if (!app) {
            app = Object.values(db).find(a => a.shortcut === inputKey);
        }
        
        // Jika ketemu persis, langsung buka
        if (app) {
          console.log(` Membuka ${app.name}...`);
          launchApp(app.path);
          process.exit(0);
        } 
        // Jika tidak ketemu persis, cari yang mirip (Fuzzy Search)
        else {
          const matches = Object.values(db).filter(a => a.name.toLowerCase().includes(inputKey));
          
          if (matches.length === 1) {
            console.log(`Mungkin maksud Anda ${matches[0].name}? Membuka...`);
            launchApp(matches[0].path);
            process.exit(0);
          } else if (matches.length > 1) {
            const choices = matches.map(a => ({
              title: `${a.name} (Shortcut: ${a.shortcut || '-'})`,
              value: a.path
            }));
            
            const response = await prompts({
              type: 'autocomplete',
              name: 'selectedApp',
              message: `Ditemukan ${matches.length} aplikasi yang cocok. Pilih yang dimaksud:`,
              choices: choices
            });
            
            if (response.selectedApp) {
              launchApp(response.selectedApp);
            }
            process.exit(0);
          } else {
            console.log(`Aplikasi atau shortcut "${args[0]}" tidak ditemukan. Coba ketik: zap list`);
            process.exit(1);
          }
        }
    } else {
        // Jika perintahnya knownCommands (seperti zap list), jalankan Commander
        program.parse(process.argv);
    }
})();