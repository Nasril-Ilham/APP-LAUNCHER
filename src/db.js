const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'apps.json');
const groupsPath = path.join(__dirname, '..', 'data', 'groups.json');

function ensureFileExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', 'utf-8');
    }
}

function loadDb() {
    ensureFileExists(dbPath);
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
}

function saveDb(data) {
    ensureFileExists(dbPath);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadGroups() {
    ensureFileExists(groupsPath);
    const data = fs.readFileSync(groupsPath, 'utf-8');
    return JSON.parse(data);
}

function saveGroups(data) {
    ensureFileExists(groupsPath);
    fs.writeFileSync(groupsPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { loadDb, saveDb, loadGroups, saveGroups };