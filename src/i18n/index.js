const path = require('path');
const fs = require('fs');

const DEFAULT_LANG = 'fr';
const SUPPORTED_LANGUAGES = ['fr', 'en'];

const localesPath = path.join(__dirname, 'locales');
const fr = JSON.parse(fs.readFileSync(path.join(localesPath, 'fr.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(localesPath, 'en.json'), 'utf8'));

const translations = { fr, en };

function t(lang, key) {
  const dict = translations[lang] || translations[DEFAULT_LANG];
  return dict[key] || key;
}

module.exports = { DEFAULT_LANG, SUPPORTED_LANGUAGES, t, translations };
