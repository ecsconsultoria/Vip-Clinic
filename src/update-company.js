// Script para atualizar o nome da empresa no banco de dados
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.join(__dirname, '../data/appointments.db');
const db = new sqlite3.Database(dbPath);

const companyName = process.env.COMPANY_NAME || 'Vip & Bella';
const companyPhone = process.env.COMPANY_PHONE || '5511961672313';
const companyEmail = process.env.COMPANY_EMAIL || 'contato@vipebella.com.br';
const companyInstagram = process.env.COMPANY_INSTAGRAM || '@vipebella';
const companyTagline = process.env.COMPANY_TAGLINE || 'Agendamento';

db.run(
  `UPDATE company_settings SET 
    name = ?, 
    phone = ?, 
    email = ?, 
    instagram = ?,
    tagline = ?,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = 1`,
  [companyName, companyPhone, companyEmail, companyInstagram, companyTagline],
  function(err) {
    if (err) {
      console.error('Erro ao atualizar configurações:', err);
    } else if (this.changes === 0) {
      // Se não atualizou nada, tenta inserir
      db.run(
        `INSERT OR REPLACE INTO company_settings (id, name, phone, email, instagram, tagline) 
         VALUES (1, ?, ?, ?, ?, ?)`,
        [companyName, companyPhone, companyEmail, companyInstagram, companyTagline],
        (err) => {
          if (err) {
            console.error('Erro ao inserir configurações:', err);
          } else {
            console.log('✅ Configurações da empresa criadas com sucesso!');
            console.log(`   Nome: ${companyName}`);
            console.log(`   Tagline: ${companyTagline}`);
          }
          db.close();
        }
      );
    } else {
      console.log('✅ Configurações da empresa atualizadas com sucesso!');
      console.log(`   Nome: ${companyName}`);
      console.log(`   Telefone: ${companyPhone}`);
      console.log(`   Email: ${companyEmail}`);
      console.log(`   Instagram: ${companyInstagram}`);
      console.log(`   Tagline: ${companyTagline}`);
      db.close();
    }
  }
);
