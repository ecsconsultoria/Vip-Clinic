const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../data/appointments.db');
let db;

// Migration guard to keep older databases in sync with the current model
const ensureAppointmentColumns = () => {
  db.all(`PRAGMA table_info(appointments)`, (err, columns) => {
    if (err) {
      console.error('Erro ao inspecionar tabela appointments:', err);
      return;
    }

    const columnNames = columns.map(col => col.name);

    if (!columnNames.includes('service_price')) {
      db.run(
        `ALTER TABLE appointments ADD COLUMN service_price REAL DEFAULT 0`,
        (alterErr) => {
          if (alterErr) {
            console.error('Erro ao adicionar coluna service_price:', alterErr);
          } else {
            console.log('✅ Coluna service_price adicionada à appointments');
          }
        }
      );
    }

    if (!columnNames.includes('professional_id')) {
      db.run(
        `ALTER TABLE appointments ADD COLUMN professional_id INTEGER`,
        (alterErr) => {
          if (alterErr) {
            console.error('Erro ao adicionar coluna professional_id:', alterErr);
          } else {
            console.log('✅ Coluna professional_id adicionada à appointments');
          }
        }
      );
    }
  });
};

const initializeDatabase = () => {
  // Garantir que o diretório data/ existe
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    console.log('📁 Criando diretório:', dataDir);
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Diretório criado com sucesso');
  }

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados:', err);
      return;
    }
    console.log('✅ Banco de dados conectado:', dbPath);
    
    // Configurar para melhor performance no Render
    db.configure('busyTimeout', 30000); // 30 segundos
    
    // Criar tabela de configurações (settings)
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Erro ao criar tabela settings:', err);
      } else {
        console.log('✅ Tabela settings ok');
        // Inserir senha padrão se não existir
        db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, (err, row) => {
          if (!row) {
            db.run(`INSERT INTO settings (key, value) VALUES ('admin_password', 'anne2025')`, (err) => {
              if (err) {
                console.error('Erro ao inserir senha padrão:', err);
              } else {
                console.log('✅ Senha admin padrão configurada: anne2025');
              }
            });
          }
        });
      }
    });
    
    // Desabilitar WAL mode (pode causar problemas no Render)
    db.run('PRAGMA journal_mode=DELETE;', (err) => {
      if (err) {
        console.error('Erro ao configurar journal_mode:', err);
      } else {
        console.log('✅ Journal mode configurado');
      }
    });
    
    // Melhorar sincronização
    db.run('PRAGMA synchronous=NORMAL;', (err) => {
      if (err) console.error('Erro ao configurar PRAGMA synchronous:', err);
      else console.log('✅ PRAGMA synchronous configurado');
    });
    
    createTables();
  });
  
  // Tratamento de erros
  db.on('error', (err) => {
    console.error('Erro no banco de dados:', err);
  });
};

const createTables = () => {
  db.serialize(() => {
    // Tabela de agendamentos
    db.run(`
      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_email TEXT,
        service TEXT NOT NULL,
        service_price REAL DEFAULT 0,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        status TEXT DEFAULT 'confirmed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela appointments:', err);
      else console.log('✅ Tabela appointments ok');
    });

    // Tabela de datas disponíveis
    db.run(`
      CREATE TABLE IF NOT EXISTS available_dates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        max_appointments INTEGER DEFAULT 5,
        is_active INTEGER DEFAULT 1
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela available_dates:', err);
      else console.log('✅ Tabela available_dates ok');
    });

    // Tabela de horários
    db.run(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela time_slots:', err);
      else console.log('✅ Tabela time_slots ok');
    });

    // Tabela de horários indisponíveis (controle de disponibilidade)
    db.run(`
      CREATE TABLE IF NOT EXISTS unavailable_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        time TEXT,
        is_unavailable INTEGER DEFAULT 1,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, time)
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela unavailable_slots:', err);
      else console.log('✅ Tabela unavailable_slots ok');
    });

    // Tabela de serviços e preços
    db.run(`
      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        price REAL NOT NULL,
        display_order INTEGER NOT NULL
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela services:', err);
      else console.log('✅ Tabela services ok');
    });

    // Tabela de capacidade de atendimento (slots/vagas por horário e serviço)
    db.run(`
      CREATE TABLE IF NOT EXISTS service_capacity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT NOT NULL,
        time_slot TEXT NOT NULL,
        capacity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_name, time_slot)
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela service_capacity:', err);
      else console.log('✅ Tabela service_capacity ok');
    });

    // Tabela de configurações da empresa
    db.run(`
      CREATE TABLE IF NOT EXISTS company_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL DEFAULT 'Vip & Bella',
        phone TEXT NOT NULL DEFAULT '5511961672313',
        email TEXT DEFAULT 'contato@vipebella.com.br',
        instagram TEXT DEFAULT '@vipebella',
        tagline TEXT DEFAULT 'Agende seu serviço',
        logo_url TEXT,
        primary_color TEXT DEFAULT '#e91e63',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela company_settings:', err);
      else {
        console.log('✅ Tabela company_settings ok');
        // Inserir configurações padrão se não existirem
        db.get(`SELECT id FROM company_settings WHERE id = 1`, (err, row) => {
          if (!row) {
            db.run(`INSERT INTO company_settings (id, name, phone, email, instagram, tagline) 
                    VALUES (1, ?, ?, ?, ?, ?)`,
              [
                process.env.COMPANY_NAME || 'Vip & Bella',
                process.env.COMPANY_PHONE || '5511961672313',
                process.env.COMPANY_EMAIL || 'contato@vipebella.com.br',
                process.env.COMPANY_INSTAGRAM || '@vipebella',
                process.env.COMPANY_TAGLINE || 'Agendamento'
              ],
              (err) => {
                if (err) console.error('Erro ao inserir configurações padrão:', err);
                else console.log('✅ Configurações da empresa inseridas');
              }
            );
          }
        });
      }
    });

    // Tabela de profissionais
    db.run(`
      CREATE TABLE IF NOT EXISTS professionals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        specialty TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) console.error('Erro ao criar tabela professionals:', err);
      else {
        console.log('✅ Tabela professionals ok');
        
        // Atualizar profissionais existentes sem is_active definido
        db.run(`UPDATE professionals SET is_active = 1 WHERE is_active IS NULL`, (err) => {
          if (err) console.error('Erro ao atualizar is_active:', err);
          else console.log('✅ is_active atualizado para profissionais existentes');
        });
      }
    });

    // Inserir serviços com preços (na ordem especificada)
    db.all(`SELECT COUNT(*) as count FROM services`, (err, rows) => {
      if (err) {
        console.error('Erro ao verificar services:', err);
        return;
      }

      if (rows[0].count === 0) {
        console.log('Inserindo serviços e preços...');
        const services = [
          { name: 'cilios', displayName: 'Cílios', price: 120.00, order: 1 },
          { name: 'pedicure', displayName: 'Pedicure', price: 35.00, order: 2 },
          { name: 'manicure', displayName: 'Manicure', price: 30.00, order: 3 },
          { name: 'combo_mani_pedi', displayName: 'Combo Manicure + Pedicure', price: 60.00, order: 4 }
        ];

        services.forEach(service => {
          db.run(
            `INSERT INTO services (name, price, display_order) VALUES (?, ?, ?)`,
            [service.name, service.price, service.order],
            (err) => {
              if (err && !err.message.includes('UNIQUE')) {
                console.error('Erro ao inserir serviço:', err);
              }
            }
          );
        });
        console.log('✅ Serviços e preços inseridos');
      }
    });

    // Inserir horários padrão
    db.all(`SELECT COUNT(*) as count FROM time_slots`, (err, rows) => {
      if (err) {
        console.error('Erro ao verificar time_slots:', err);
        return;
      }
      
      if (rows[0].count === 0) {
        console.log('Inserindo horários padrão...');
        // Todos os horários de 09:00-18:00 (intervalo de 1 hora)
        // Segunda a sexta: 09:00-14:00 será BLOQUEADO automaticamente
        // Segunda a sexta: 14:00-18:00 está DISPONÍVEL
        // Sábado: 10:00-18:00 está DISPONÍVEL
        const timeSlots = [
          { start: '09:00', end: '10:00' }, // Bloqueado seg-sex
          { start: '10:00', end: '11:00' }, // Bloqueado seg-sex
          { start: '11:00', end: '12:00' }, // Bloqueado seg-sex
          { start: '12:00', end: '13:00' }, // Bloqueado seg-sex
          { start: '13:00', end: '14:00' }, // Bloqueado seg-sex
          { start: '14:00', end: '15:00' }, // Disponível
          { start: '15:00', end: '16:00' }, // Disponível
          { start: '16:00', end: '17:00' }, // Disponível
          { start: '17:00', end: '18:00' }  // Disponível
        ];

        timeSlots.forEach(slot => {
          db.run(
            `INSERT INTO time_slots (start_time, end_time) VALUES (?, ?)`,
            [slot.start, slot.end],
            (err) => {
              if (err && !err.message.includes('UNIQUE')) {
                console.error('Erro ao inserir horário:', err);
              }
            }
          );
        });
        console.log('✅ Horários padrão inseridos');
      }
    });

    ensureAppointmentColumns();
  });
};

const getDatabase = () => db;

module.exports = {
  initializeDatabase,
  getDatabase
};
