// Middleware langue globale
const { DEFAULT_LANG, SUPPORTED_LANGUAGES } = require('../i18n');

module.exports = (req, res, next) => {

  let lang = req.headers['accept-language'];

  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    lang = DEFAULT_LANG;
  }

  req.lang = lang;

  next();
};