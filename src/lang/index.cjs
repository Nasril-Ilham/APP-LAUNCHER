// import { loadConfig } from '../db.cjs';
const id = require('./id.cjs');
const en = require('./en.cjs');
const { loadConfig } = require('../db.cjs');

let T = {};

function loadTranslations() {
    const config = loadConfig();
    const lang = config.lang || 'id';
    T = (lang === 'en') ? en : id;
}

function getT() {
    return T;
}

module.exports = { loadTranslations, getT };