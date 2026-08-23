#!/usr/bin/env node

const { Command } = require('commander');
const { spawn } = require('child_process');
const prompts = require('prompts');
const { loadDb, saveDb } = require('../src/db');
const program = new Command();

program
  .name('zap')
  .description('CLI App Launcher for your laptop')
  .version('1.0.0');

// Fungsi native untuk membuka aplikasi menggunakan spawn (lebih aman)
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
        
        // Lepaskan child process agar tidak terikat ke terminal
        child.unref();
    } catch (error) {
        console.log(`Gagal membuka aplikasi: ${error.message}`);
    }
}

// 1. PERINTAH ADD (Menambahkan aplikasi)
// Contoh: zap add chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
program.command('add <name> <path>')
  .description('Menambahkan aplikasi baru ke launcher')
  .action((name, path) => {
    const db = loadDb();
    
    db[name.toLowerCase()] = { 
        name: name, 
        path: path, 
        shortcut: null 
    };
    
    saveDb(db);
    console.log(`software "${name}" added successfully`);
  });

// 2. PERINTAH ALIAS (Menambahkan shortcut ke aplikasi)
// Contoh: zap alias figma fig
program.command('alias <name> <shortcut>')
  .description('Menambahkan nama panggilan (shortcut) untuk aplikasi')
  .action((name, shortcut) => {
    const db = loadDb();
    const key = name.toLowerCase();
    const shortcutKey = shortcut.toLowerCase();
    
    if (!db[key]) {
      console.log(`Aplikasi "${name}" tidak ditemukan. Cek kembali menggunakan: zap list`);
      return;
    }
    
    db[key].shortcut = shortcutKey;
    saveDb(db);
    console.log(`Shortcut "${shortcutKey}" berhasil ditambahkan untuk aplikasi "${name}".`);
    console.log(`Sekarang Anda bisa membukanya dengan mengetik: zap ${shortcutKey}`);
  });

// 3. PERINTAH LIST (Melihat daftar aplikasi)
// Contoh: zap list
program.command('list')
  .description('Melihat daftar aplikasi yang sudah terdaftar')
  .action(() => {
    const db = loadDb();
    const apps = Object.keys(db);
    
    if (apps.length === 0) {
      console.log('there are no registered applications. Use: zap add <name> <path>');
      return;
    }
    
    console.log('Daftar Aplikasi Terdaftar:' + '\n');
    apps.forEach(key => {
      const app = db[key];
      const shortcutText = app.shortcut ? ` (Shortcut: ${app.shortcut})` : '';
      console.log(`> ${app.name}${shortcutText} (Path: ${app.path})`);
    });
  });

// 4. PERINTAH UPDATE (Memperbarui path aplikasi)
// Contoh: zap update figma "C:\Users\zeanl\AppData\Local\Figma\Figma.exe"
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

// 5. PERINTAH DELETE (Menghapus aplikasi secara interaktif)
// Contoh: zap delete
program.command('delete')
  .description('Menghapus aplikasi dari daftar secara interaktif')
  .action(async () => {
    const db = loadDb();
    const apps = Object.keys(db);
    
    if (apps.length === 0) {
      console.log('Tidak ada aplikasi terdaftar untuk dihapus.');
      return;
    }
    
    // Membuat format pilihan untuk menu interaktif
    const choices = apps.map(key => ({
      title: `${db[key].name} (Path: ${db[key].path})`,
      value: key
    }));

    // Menambahkan opsi batal di akhir daftar
    choices.push({
      title: 'Batal',
      value: 'exit'
    });
    
    // Menampilkan menu pilihan panah atas/bawah
    const response = await prompts({
      type: 'select',
      name: 'selectedApp',
      message: 'Pilih aplikasi yang ingin dihapus (Gunakan panah atas/bawah, lalu Enter)' + '\n',
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

// 6. LOGIKA PANGGIL LANGSUNG (Memungkinkan syntax: zap figma atau zap fig)
const args = process.argv.slice(2);
const knownCommands = ['add', 'alias', 'list', 'update', 'delete', '-h', '--help', '-V', '--version'];

if (args.length > 0 && !knownCommands.includes(args[0])) {
    const db = loadDb();
    const inputKey = args[0].toLowerCase();
    
    // Cari aplikasi berdasarkan nama asli
    let app = db[inputKey];
    
    // Jika tidak ketemu berdasarkan nama, cari berdasarkan shortcut
    if (!app) {
        app = Object.values(db).find(a => a.shortcut === inputKey);
    }
    
    if (app) {
      console.log(` Membuka ${app.name}...`);
      launchApp(app.path);
      process.exit(0); // Keluar langsung tanpa error setelah membuka
    } else {
      console.log(`Aplikasi atau shortcut "${args[0]}" tidak ditemukan. Coba ketik: zap list`);
      process.exit(1); // Keluar dengan status error
    }
}

program.parse(process.argv);