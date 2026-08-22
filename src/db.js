const fs = require('fs');
const path = require('path');

// Tentukan lokasi file database JSON (di folder data/apps.json)
const dbPath = path.join(__dirname, '..', 'data', 'apps.json');

// Fungsi untuk memastikan folder dan file ada. Jika tidak ada, buatkan.
function ensureDbExists() {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, '{}', 'utf-8');
    }
}

// Fungsi untuk membaca data dari JSON
function loadDb() {
    ensureDbExists();
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
}

// Fungsi untuk menyimpan data ke JSON
function saveDb(data) {
    ensureDbExists();
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { loadDb, saveDb };