// langue: script de validation 
const fs = require('fs');
const path = require('path');

const frPath = path.join(__dirname, '../src/i18n/locales/fr.json');
const enPath = path.join(__dirname, '../src/i18n/locales/en.json');

const fr = JSON.parse(fs.readFileSync(frPath));
const en = JSON.parse(fs.readFileSync(enPath));

function getKeys(obj, prefix = '') {
  return Object.keys(obj).flatMap(key => {
    const value = obj[key];
    const newPrefix = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      return getKeys(value, newPrefix);
    }

    return newPrefix;
  });
}

const frKeys = getKeys(fr);
const enKeys = getKeys(en);

const missingInEn = frKeys.filter(key => !enKeys.includes(key));
const missingInFr = enKeys.filter(key => !frKeys.includes(key));

if (missingInEn.length || missingInFr.length) {

  console.error('\n❌ Translation mismatch detected\n');

  if (missingInEn.length) {
    console.error('Missing in en.json:');
    missingInEn.forEach(k => console.error(`  - ${k}`));
  }

  if (missingInFr.length) {
    console.error('\nMissing in fr.json:');
    missingInFr.forEach(k => console.error(`  - ${k}`));
  }

  process.exit(1);
}

console.log('\n✅ i18n validation passed. All keys match.\n');