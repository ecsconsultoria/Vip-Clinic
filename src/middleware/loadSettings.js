const { getDatabase } = require('../database');

/**
 * Middleware para carregar configurações da empresa
 * Disponibiliza os dados em res.locals.company para todas as views
 */
const loadCompanySettings = (req, res, next) => {
  const db = getDatabase();
  
  if (!db) {
    console.warn('⚠️ Banco de dados não inicializado, usando configurações padrão');
    res.locals.company = getDefaultSettings();
    return next();
  }

  db.get('SELECT * FROM company_settings WHERE id = 1', (err, settings) => {
    if (err) {
      console.error('Erro ao carregar configurações da empresa:', err);
      res.locals.company = getDefaultSettings();
    } else if (!settings) {
      console.log('Nenhuma configuração encontrada, usando padrões');
      res.locals.company = getDefaultSettings();
    } else {
      res.locals.company = settings;
    }
    next();
  });
};

/**
 * Retorna configurações padrão (fallback)
 */
function getDefaultSettings() {
  return {
    name: process.env.COMPANY_NAME || 'Vip & Bella',
    phone: process.env.COMPANY_PHONE || '5511961672313',
    email: process.env.COMPANY_EMAIL || 'contato@vipebella.com.br',
    instagram: process.env.COMPANY_INSTAGRAM || '@vipebella',
    tagline: process.env.COMPANY_TAGLINE || 'Agende seu serviço',
    logo_url: process.env.COMPANY_LOGO_URL || null,
    primary_color: process.env.COMPANY_PRIMARY_COLOR || '#e91e63'
  };
}

module.exports = { loadCompanySettings };
