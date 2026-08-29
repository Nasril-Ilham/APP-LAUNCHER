const chalk = require('chalk');
const { loadConfig } = require('./db.cjs');

const banner = `
 ${chalk.bold.cyan('██╗      █████╗ ██╗   ██╗███╗   ██╗ ██████╗██╗  ██╗███████╗██████╗ ')}
 ${chalk.bold.cyan('██║     ██╔══██╗██║   ██║████╗  ██║██╔════╝██║  ██║██╔════╝██╔══██╗')}
 ${chalk.bold.cyan('██║     ███████║██║   ██║██╔██╗ ██║██║     ███████║█████╗  ██████╔╝')}
 ${chalk.bold.cyan('██║     ██╔══██║██║   ██║██║╚██╗██║██║     ██╔══██║██╔══╝  ██╔══██╗')}
 ${chalk.bold.cyan('███████╗██║  ██║╚██████╔╝██║ ╚████║╚██████╗██║  ██║███████╗██║  ██║')}
 ${chalk.bold.cyan('╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝')}
`;

function showBanner() {
    console.log(banner);
    console.log(chalk.bold.white(` Type 'run help' for usage instructions.\n`));
}

function showHelp() {
    const config = loadConfig();
    const lang = config.lang || 'id';
    
    if (lang === 'en') {
        console.log(` ${chalk.bold.green('Usage:')}\n`);
        console.log(`  ${chalk.magenta.bold('[Apps]')}`)
        console.log(`  ${chalk.bold.white('run scan')}                  ${chalk.gray('Scan all applications')}`)
        console.log(`  ${chalk.bold.white('run add <name> <path>')}     ${chalk.gray('Add application manually')}`)
        console.log(`  ${chalk.bold.white('run list')}                  ${chalk.gray('View list of applications')}`)
        console.log(`  ${chalk.bold.white('run info <name>')}           ${chalk.gray('View app details')}`)
        console.log(`  ${chalk.bold.white('run edit <name>')}           ${chalk.gray('Edit name, path, or shortcut')}`)
        console.log(`  ${chalk.bold.white('run delete')}                ${chalk.gray('Remove application')}`)
        console.log(`  ${chalk.bold.white('run clear')}                 ${chalk.gray('Clear application database')}\n`)
        console.log(`  ${chalk.magenta.bold('[Group / Workspace]')}`)
        console.log(`  ${chalk.bold.white('run addgroup <name> <app1>')}   ${chalk.gray('Create a new group')}`)
        console.log(`  ${chalk.bold.white('run addto <name> <app1>')}      ${chalk.gray('Add app to existing group')}`)
        console.log(`  ${chalk.bold.white('run delfrom <name> <app1>')}   ${chalk.gray('Remove app from group')}`)
        console.log(`  ${chalk.bold.white('run groups')}                  ${chalk.gray('View groups')}`)
        console.log(`  ${chalk.bold.white('run delgroup <name>')}         ${chalk.gray('Delete group')}\n`)
        console.log(`  ${chalk.magenta.bold('[Open App / Group]')}`)
        console.log(`  ${chalk.bold.white('run or open <name>')}               ${chalk.gray('Open app/group (e.g., run work)')}`)
        console.log(`  ${chalk.bold.white('run or open<partial_name>')}        ${chalk.gray('Fuzzy search (e.g., run chr -> Chrome)')}\n`)
        console.log(`  ${chalk.magenta.bold('[Settings]')}`)
        console.log(`  ${chalk.bold.white('run lang id')}                   ${chalk.gray('Change language to Indonesian')}`)
        console.log(`  ${chalk.bold.white('run lang en')}                   ${chalk.gray('Change language to English')}\n`)
    } else {
        console.log(` ${chalk.bold.green('Cara pakai:')}\n`);
        console.log(`  ${chalk.magenta.bold('[Aplikasi]')}`)
        console.log(`  ${chalk.bold.white('run scan')}                  ${chalk.gray('Memindai semua aplikasi')}`)
        console.log(`  ${chalk.bold.white('run add <nama> <path>')}     ${chalk.gray('Tambah aplikasi manual')}`)
        console.log(`  ${chalk.bold.white('run list')}                  ${chalk.gray('Lihat daftar aplikasi')}`)
        console.log(`  ${chalk.bold.white('run info <nama>')}           ${chalk.gray('Lihat detail aplikasi')}`)
        console.log(`  ${chalk.bold.white('run edit <nama>')}           ${chalk.gray('Ubah nama, path, atau shortcut')}`)
        console.log(`  ${chalk.bold.white('run delete')}                ${chalk.gray('Hapus aplikasi')}`)
        console.log(`  ${chalk.bold.white('run clear')}                 ${chalk.gray('Kosongkan database (Reset)')}\n`)
        console.log(`  ${chalk.magenta.bold('[Grup / Workspace]')}`)
        console.log(`  ${chalk.bold.white('run addgroup <nama> <app1>')}    ${chalk.gray('Buat grup baru')}`)
        console.log(`  ${chalk.bold.white('run addto <nama> <app1>')}       ${chalk.gray('Tambah app ke grup')}`)
        console.log(`  ${chalk.bold.white('run delfrom <nama> <app1>')}     ${chalk.gray('Hapus app dari grup')}`)
        console.log(`  ${chalk.bold.white('run groups')}                     ${chalk.gray('Lihat daftar grup')}`)
        console.log(`  ${chalk.bold.white('run delgroup <nama>')}            ${chalk.gray('Hapus seluruh grup')}\n`)
        console.log(`  ${chalk.magenta.bold('[Buka Aplikasi / Grup]')}`)
        console.log(`  ${chalk.bold.white('run atau open <nama>')}               ${chalk.gray('Buka aplikasi/grup')}`)
        console.log(`  ${chalk.bold.white('run atau open <sebagian_nama>')}      ${chalk.gray('Cari aplikasi mirip')}\n`)
        console.log(`  ${chalk.magenta.bold('[Pengaturan]')}`)
        console.log(`  ${chalk.bold.white('run lang id')}                   ${chalk.gray('Ganti bahasa ke Indonesia')}`)
        console.log(`  ${chalk.bold.white('run lang en')}                   ${chalk.gray('Ganti bahasa ke Inggris')}\n`)
    }
}

module.exports = { showBanner, showHelp };