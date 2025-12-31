// Script para atualizar a tagline no banco de dados
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/appointments.db');
const db = new sqlite3.Database(dbPath);

db.run(`UPDATE company_settings SET tagline = 'Agendamento' WHERE id = 1`, (err) => {
  if (err) {
    console.error('Erro ao atualizar tagline:', err);
  } else {
    console.log('✅ Tagline atualizada para "Agendamento"');
  }
  db.close();
});
