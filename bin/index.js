#!/usr/bin/env node

const { Command } = require('commander');
const { exec } = require('child_process');
const { loadDb, saveDb } = require('../src/db');
const program = new Command();

program
  .name('zap')
  .description('CLI App Launcher for your laptop')
  .version('1.0.0');

// Fungsi native untuk membuka aplikasi di berbagai OS
function launchApp(appPath) {
    let cmd = '';
    if (process.platform === 'win32') {
        cmd = `start "" "${appPath}"`;
    } else if (process.platform === 'darwin') {
        cmd = `open "${appPath}"`;
    } else {
        cmd = `xdg-open "${appPath}"`;
    }

    exec(cmd, (error) => {
        if (error) {
            console.log(`Gagal membuka aplikasi: ${error.message}`);
        }
    });
}

// 1. PERINTAH ADD (Menambahkan aplikasi)
// Contoh: zap add chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
program.command('add <name> <path>')
  .description('Menambahkan aplikasi baru ke launcher')
  .action((name, path) => {
    const db = loadDb();
    
    // Simpan ke database. Kita buat namanya jadi huruf kecil semua agar mudah dicari
    db[name.toLowerCase()] = { 
        name: name, 
        path: path, 
        shortcut: null 
    };
    
    saveDb(db);
    console.log(`software "${name}" added successfully`);
  });

// 2. PERINTAH LIST (Melihat daftar aplikasi)
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
      console.log(`> ${app.name} (Path: ${app.path})`);
    });
  });

// 3. PERINTAH OPEN (Membuka aplikasi)
// Contoh: zap open chrome
program.command('open <name>')
  .description('Membuka aplikasi berdasarkan nama')
  .action((name) => {
    const db = loadDb();
    const app = db[name.toLowerCase()];
    
    if (!app) {
      console.log(`Aplikasi "${name}" tidak ditemukan. Coba ketik: zap list`);
      return;
    }
    
    console.log(` Membuka ${app.name}...`);
    // Menggunakan native child_process agar otomatis jalan di Windows/Mac/Linux
    launchApp(app.path);
  });

program.parse();