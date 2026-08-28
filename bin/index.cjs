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

// Fungsi bantu scan folder (Lintas OS)
function scanDirectory(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    const ignoreKeywords = ['uninstall', 'unins', 'readme', 'help', 'documentation', 'setup'];
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        const isDir = fs.statSync(filePath).isDirectory();
        
        if (isDir) {
            if (process.platform === 'darwin' && file.endsWith('.app')) {
                const appName = file.replace('.app', '').toLowerCase();
                fileList.push({ name: appName, path: filePath });
            } else if (!file.endsWith('.app')) {
                scanDirectory(filePath, fileList);
            }
        } else {
            if (process.platform === 'linux' && file.endsWith('.desktop')) {
                const appName = file.replace('.desktop', '').toLowerCase();
                fileList.push({ name: appName, path: filePath });
            } else if (process.platform === 'win32' && file.endsWith('.lnk')) {
                const lowerCaseFile = file.toLowerCase();
                const isJunk = ignoreKeywords.some(keyword => lowerCaseFile.includes(keyword));
                if (!isJunk) {
                    const appName = file.replace('.lnk', '').toLowerCase();
                    fileList.push({ name: appName, path: filePath });
                }
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
  ${chalk.bold.white('run scan')}                  ${chalk.gray('Memindai semua aplikasi di laptop (Support Windows, Mac, Linux)')}
  ${chalk.bold.white('run add <nama> <path>')}     ${chalk.gray('Tambah aplikasi manual')}
  ${chalk.bold.white('run list')}                  ${chalk.gray('Lihat daftar aplikasi')}
  ${chalk.bold.white('run info <nama>')}           ${chalk.gray('Lihat detail lokasi file aplikasi')}
  ${chalk.bold.white('run edit <nama>')}           ${chalk.gray('Ubah nama, path, atau shortcut aplikasi')}
  ${chalk.bold.white('run delete')}                ${chalk.gray('Hapus aplikasi dari daftar')}
  ${chalk.bold.white('run clear')}                 ${chalk.gray('Kosongkan database aplikasi (Reset)')}

  ${chalk.magenta.bold('[Grup / Workspace]')}
  ${chalk.bold.white('run addgroup <nama> <app1> <app2>')}    ${chalk.gray('Buat grup baru')}
  ${chalk.bold.white('run addto <nama> <app1> <app2>')}       ${chalk.gray('Tambah aplikasi ke grup yang sudah ada')}
  ${chalk.bold.white('run delfrom <nama> <app1>')}            ${chalk.gray('Hapus 1 aplikasi dari dalam grup')}
  ${chalk.bold.white('run groups')}                           ${chalk.gray('Lihat daftar grup')}
  ${chalk.bold.white('run delgroup <nama>')}                  ${chalk.gray('Hapus seluruh grup')}

  ${chalk.magenta.bold('[Buka Aplikasi / Grup]')}
  ${chalk.bold.white('run or open <nama>')}               ${chalk.gray('Buka aplikasi/grup (contoh: run work atau run chrome)')}
  ${chalk.bold.white('run or open <sebagian_nama>')}      ${chalk.gray('Cari aplikasi mirip (contoh: run chr -> Chrome)')}
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

// 2. INFO
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

// 3. EDIT (Gabungan dari Update dan Alias)
program.command('edit <name>')
  .description('Mengubah nama, path, atau shortcut aplikasi')
  .action(async (name) => {
    const db = loadDb();
    const key = name.toLowerCase();
    const app = findApp(db, key);
    
    if (!app) return console.log(chalk.red(`Aplikasi "${name}" tidak ditemukan.`));

    const editResponse = await prompts({
      type: 'select',
      name: 'field',
      message: 'Mau ubah apa?',
      choices: [
        { title: 'Nama Aplikasi', value: 'name' },
        { title: 'Path / Lokasi File', value: 'path' },
        { title: 'Shortcut', value: 'shortcut' },
        { title: 'Batal', value: 'exit' }
      ]
    });

    if (!editResponse.field || editResponse.field === 'exit') return console.log(chalk.yellow('Dibatalkan.'));

    const newValueResponse = await prompts({
      type: 'text',
      name: 'value',
      message: `Masukkan ${editResponse.field} baru:`,
      initial: app[editResponse.field] || ''
    });

    if (!newValueResponse.value) return console.log(chalk.yellow('Dibatalkan.'));

    if (editResponse.field === 'name') {
      const newKey = newValueResponse.value.toLowerCase();
      delete db[key]; // Hapus key lama
      db[newKey] = { ...app, name: newValueResponse.value }; // Masukkan dengan key baru
    } else {
      app[editResponse.field] = editResponse.field === 'shortcut' ? newValueResponse.value.toLowerCase() : newValueResponse.value;
    }

    saveDb(db);
    console.log(chalk.green(`Berhasil memperbarui ${editResponse.field} untuk "${app.name}".`));
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

// 5. DELETE (Autocomplete tanpa Path)
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

// 6. CLEAR (Reset Database)
program.command('clear')
  .description('Mengosongkan database aplikasi (Grup tetap aman)')
  .action(async () => {
    const confirmResponse = await prompts({
      type: 'confirm',
      name: 'value',
      message: 'Yakin mau menghapus SEMUA aplikasi dari database?',
      initial: false
    });

    if (confirmResponse.value) {
      saveDb({});
      console.log(chalk.green('Database aplikasi berhasil dikosongkan. Silakan jalankan "zap scan" lagi.'));
    } else {
      console.log(chalk.yellow('Dibatalkan.'));
    }
  });

// 7. SCAN (Lintas OS)
program.command('scan')
  .description('Otomatis memindai aplikasi dari sistem operasi')
  .action(() => {
    let scanPaths = [];
    if (process.platform === 'win32') {
        scanPaths.push(path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
        scanPaths.push(path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
    } else if (process.platform === 'darwin') {
        scanPaths.push('/Applications');
        scanPaths.push(path.join(process.env.HOME, 'Applications'));
    } else {
        scanPaths.push('/usr/share/applications');
        scanPaths.push(path.join(process.env.HOME, '.local/share/applications'));
    }

    let scannedApps = [];
    scanPaths.forEach(p => {
        scannedApps = scanDirectory(p, scannedApps);
    });

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
// FITUR GRUP
// ==========================================

// 8. ADDGROUP
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
  });

// 9. ADDTO
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

// 10. DELFROM (Hapus 1 aplikasi dari grup)
program.command('delfrom <group_name> <app_name>')
  .description('Menghapus 1 aplikasi dari grup. Contoh: zap delfrom edit pinterest')
  .action((groupName, appName) => {
    const groups = loadGroups();
    if (!groups[groupName]) return console.log(chalk.red(`Grup "${groupName}" tidak ditemukan.`));
    
    const appKey = appName.toLowerCase();
    if (!groups[groupName].includes(appKey)) return console.log(chalk.red(`Aplikasi "${appName}" tidak ada di grup "${groupName}".`));

    groups[groupName] = groups[groupName].filter(app => app !== appKey);
    saveGroups(groups);
    console.log(chalk.green(`Aplikasi "${appName}" berhasil dihapus dari grup "${groupName}".`));
  });

// 11. GROUPS
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

// 12. DELGROUP
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
const knownCommands = ['add', 'addgroup', 'addto', 'edit', 'list', 'groups', 'delfrom', 'delgroup', 'info', 'delete', 'clear', 'scan', 'help', '-h', '--help', '-V', '--version'];

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
        const inputKey = args.join(' ').toLowerCase();
        
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
        
        let app = findApp(db, inputKey);
        
        if (app) {
          console.log(chalk.green(` Membuka ${app.name}...`));
          launchApp(app.path);
          process.exit(0);
        } else {
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