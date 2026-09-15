const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'apps.json');
const groupsPath = path.join(__dirname, '..', 'data', 'groups.json');
const configPath = path.join(__dirname, '..', 'data', 'config.json');

function ensureFileExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '{}', 'utf-8');
    }
}

function parseJson(data, filePath) {
    try {
        return JSON.parse(data);
    } catch (error) {
        throw new Error(`Invalid JSON in ${path.basename(filePath)}: ${error.message}`);
    }
}

function loadDb() {
    ensureFileExists(dbPath);
    const data = fs.readFileSync(dbPath, 'utf-8');
    return parseJson(data, dbPath);
}

function saveDb(data) {
    ensureFileExists(dbPath);
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadGroups() {
    ensureFileExists(groupsPath);
    const data = fs.readFileSync(groupsPath, 'utf-8');
    return parseJson(data, groupsPath);
}

function saveGroups(data) {
    ensureFileExists(groupsPath);
    fs.writeFileSync(groupsPath, JSON.stringify(data, null, 2), 'utf-8');
}

function loadConfig() {
    ensureFileExists(configPath);
    const data = fs.readFileSync(configPath, 'utf-8');
    let config = parseJson(data, configPath);
    if (!config.lang) config.lang = 'id'; // Default Indonesia
    return config;
}

function saveConfig(data) {
    ensureFileExists(configPath);
    fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = { loadDb, saveDb, loadGroups, saveGroups, loadConfig, saveConfig };