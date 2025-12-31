const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const XLSX = require('xlsx');

// Middleware simples de autenticação
const checkAuth = (req, res, next) => {
  const password = req.query.password || req.body.password || req.cookies.admin_auth;
  const db = getDatabase();
  
  db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, (err, row) => {
    if (err || !row) {
      return res.status(500).render('admin-login', { error: 'Erro ao verificar senha' });
    }
    
    if (password !== row.value) {
      return res.status(401).render('admin-login', { error: 'Senha incorreta' });
    }
    
    next();
  });
};

// GET - Rota raiz admin - redireciona para dashboard ou login
router.get('/', (req, res) => {
  const password = req.query.password || req.cookies.admin_auth;
  const db = getDatabase();
  
  db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, (err, row) => {
    if (err || !row || password !== row.value) {
      res.redirect('/admin/login');
    } else {
      res.redirect('/admin/dashboard');
    }
  });
});

// GET - Página de login admin
router.get('/login', (req, res) => {
  res.render('admin-login', { error: null });
});

// POST - Validar senha
router.post('/login', (req, res) => {
  const { password } = req.body;
  const db = getDatabase();
  
  db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, (err, row) => {
    if (err || !row) {
      return res.render('admin-login', { error: 'Erro ao verificar senha' });
    }
    
    if (password !== row.value) {
      return res.render('admin-login', { error: 'Senha incorreta' });
    }
    
    // Cookie sem secure em desenvolvimento (permite HTTP)
    res.cookie('admin_auth', password, { 
      httpOnly: true, 
      secure: false, // Alterado para permitir acesso via HTTP (mobile)
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000 
    });
    res.redirect('/admin/dashboard');
  });
});

// GET - Dashboard (requer autenticação)
router.get('/dashboard', checkAuth, (req, res) => {
  const db = getDatabase();
  let responded = false;
  
  // Capturar senha para passar ao template
  const adminPassword = req.query.password || req.body.password || req.cookies.admin_auth;
  
  // Timeout de 10 segundos
  const timeout = setTimeout(() => {
    if (!responded) {
      responded = true;
      console.error('Timeout ao carregar dashboard');
      return res.render('admin-dashboard', { 
        appointments: [], 
        stats: { total: 0, confirmed: 0, cancelled: 0, completed: 0 },
        dailySummary: [],
        adminPassword: adminPassword,
        error: 'Timeout ao carregar dados'
      });
    }
  }, 10000);
  
  db.all(
    `SELECT a.*, p.name as professional_name 
     FROM appointments a
     LEFT JOIN professionals p ON a.professional_id = p.id
     WHERE appointment_date >= date('now')
     ORDER BY appointment_date ASC, appointment_time ASC`,
    (err, appointments) => {
      clearTimeout(timeout);
      
      if (responded) return;
      responded = true;
      
      if (err) {
        console.error('Erro ao carregar appointments:', err);
        return res.render('admin-dashboard', { 
          appointments: [], 
          stats: { total: 0, confirmed: 0, cancelled: 0, completed: 0, totalEntrada: 0 },
          dailySummary: [],
          adminPassword: adminPassword,
          error: 'Erro ao carregar agendamentos'
        });
      }
      
      // Calcular estatísticas
      const completedAppointments = appointments.filter(a => a.status === 'completed');
      const totalEntrada = completedAppointments.reduce((sum, a) => sum + (a.service_price || 0), 0);
      
      const stats = {
        total: appointments.length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        initiated: appointments.filter(a => a.status === 'initiated').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
        completed: completedAppointments.length,
        totalEntrada: totalEntrada.toFixed(2)
      };

      // Agrupar agendamentos por data com valores
      const appointmentsByDate = {};
      appointments.forEach(apt => {
        const date = apt.appointment_date;
        if (!appointmentsByDate[date]) {
          appointmentsByDate[date] = {
            date: date,
            total: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
            totalValue: 0,
            completedValue: 0,
            appointments: []
          };
        }
        
        appointmentsByDate[date].total++;
        appointmentsByDate[date].appointments.push(apt);
        appointmentsByDate[date].totalValue += (apt.service_price || 0);
        
        if (apt.status === 'confirmed') appointmentsByDate[date].confirmed++;
        if (apt.status === 'cancelled') appointmentsByDate[date].cancelled++;
        if (apt.status === 'completed') {
          appointmentsByDate[date].completed++;
          appointmentsByDate[date].completedValue += (apt.service_price || 0);
        }
      });

      // Converter para array e ordenar por data
      const dailySummary = Object.values(appointmentsByDate).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      res.render('admin-dashboard', { 
        appointments, 
        stats, 
        dailySummary, 
        adminPassword: adminPassword,
        error: null 
      });
    }
  );
});

// GET - Página de Relatório (Resumo por Data)
router.get('/relatorio', checkAuth, (req, res) => {
  const db = getDatabase();
  const adminPassword = req.query.password || req.body.password || req.cookies.admin_auth;
  
  db.all(
    `SELECT * FROM appointments 
     WHERE appointment_date >= date('now')
     ORDER BY appointment_date ASC, appointment_time ASC`,
    (err, appointments) => {
      if (err) {
        console.error('Erro ao carregar appointments para relatório:', err);
        return res.render('admin-relatorio', { 
          dailySummary: [],
          adminPassword: adminPassword,
          error: 'Erro ao carregar agendamentos'
        });
      }
      
      // Agrupar agendamentos por data com valores
      const appointmentsByDate = {};
      appointments.forEach(apt => {
        const date = apt.appointment_date;
        if (!appointmentsByDate[date]) {
          appointmentsByDate[date] = {
            date: date,
            total: 0,
            confirmed: 0,
            cancelled: 0,
            completed: 0,
            totalValue: 0,
            completedValue: 0,
            appointments: []
          };
        }
        
        appointmentsByDate[date].total++;
        appointmentsByDate[date].appointments.push(apt);
        appointmentsByDate[date].totalValue += (apt.service_price || 0);
        
        if (apt.status === 'confirmed') appointmentsByDate[date].confirmed++;
        if (apt.status === 'cancelled') appointmentsByDate[date].cancelled++;
        if (apt.status === 'completed') {
          appointmentsByDate[date].completed++;
          appointmentsByDate[date].completedValue += (apt.service_price || 0);
        }
      });

      // Converter para array e ordenar por data
      const dailySummary = Object.values(appointmentsByDate).sort((a, b) => 
        a.date.localeCompare(b.date)
      );

      res.render('admin-relatorio', { 
        dailySummary, 
        adminPassword: adminPassword,
        error: null 
      });
    }
  );
});

// GET - API para agendamentos futuros
router.get('/api/appointments', (req, res) => {
  const db = getDatabase();
  
  db.all(
    `SELECT * FROM appointments 
     WHERE appointment_date >= date('now')
     ORDER BY appointment_date ASC, appointment_time ASC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar agendamentos' });
      }
      res.json(rows);
    }
  );
});

// POST - Cancelar agendamento
router.post('/api/appointments/:id/cancel', checkAuth, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run(
    `UPDATE appointments SET status = 'cancelled' WHERE id = ?`,
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao cancelar agendamento' });
      }
      res.json({ success: true, message: 'Agendamento cancelado' });
    }
  );
});

// POST - Marcar como concluído
router.post('/api/appointments/:id/complete', checkAuth, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run(
    `UPDATE appointments SET status = 'completed' WHERE id = ?`,
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao marcar como concluído' });
      }
      res.json({ success: true, message: 'Agendamento marcado como concluído' });
    }
  );
});

// POST - Marcar como iniciado
router.post('/api/appointments/:id/initiate', checkAuth, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  // Validar se tem profissional atribuído
  db.get('SELECT professional_id FROM appointments WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar agendamento' });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    
    if (!row.professional_id) {
      return res.status(400).json({ 
        error: 'Não é possível iniciar o atendimento sem um profissional atribuído!' 
      });
    }
    
    // Atualizar status para initiated
    db.run(
      `UPDATE appointments SET status = 'initiated' WHERE id = ?`,
      [id],
      (err) => {
        if (err) {
          return res.status(500).json({ error: 'Erro ao iniciar atendimento' });
        }
        res.json({ success: true, message: 'Atendimento iniciado' });
      }
    );
  });
});

// GET - Gerar link de compartilhamento
router.get('/generate-link', checkAuth, (req, res) => {
  const linkId = Math.random().toString(36).substring(2, 10);
  const bookingLink = `${req.protocol}://${req.get('host')}/client/booking`;
  
  res.json({
    link: bookingLink,
    whatsapp: `https://wa.me/5511961672313?text=Olá! Agende seu serviço de manicure, pedicure e cílios: ${bookingLink}`
  });
});

// ==================== GERENCIAR HORÁRIOS INDISPONÍVEIS ====================

// GET - API para obter horários/datas indisponíveis
router.get('/api/unavailable-slots', checkAuth, (req, res) => {
  const db = getDatabase();
  
  db.all(
    `SELECT * FROM unavailable_slots 
     WHERE is_unavailable = 1
     ORDER BY date DESC, time DESC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar indisponibilidades' });
      }
      res.json(rows || []);
    }
  );
});

// POST - Bloquear horário/data
router.post('/api/unavailable-slots', checkAuth, (req, res) => {
  const db = getDatabase();
  const { date, time, reason } = req.body;

  if (!date || !time) {
    return res.status(400).json({ error: 'Data e horário obrigatórios' });
  }

  db.run(
    `INSERT OR REPLACE INTO unavailable_slots (date, time, is_unavailable, reason)
     VALUES (?, ?, 1, ?)`,
    [date, time, reason || ''],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao bloquear horário' });
      }
      res.json({ success: true, message: 'Horário bloqueado com sucesso' });
    }
  );
});

// DELETE - Desbloquear horário/data
router.delete('/api/unavailable-slots/:id', checkAuth, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run(
    `DELETE FROM unavailable_slots WHERE id = ?`,
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao desbloquear horário' });
      }
      res.json({ success: true, message: 'Horário desbloqueado' });
    }
  );
});

// POST - Bloquear data inteira
router.post('/api/unavailable-dates', checkAuth, (req, res) => {
  const db = getDatabase();
  const { date, reason } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'Data obrigatória' });
  }

  // Bloquear todos os horários do dia
  const times = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
  
  let completed = 0;
  let hasError = false;
  
  times.forEach((time, index) => {
    db.run(
      `INSERT OR REPLACE INTO unavailable_slots (date, time, is_unavailable, reason)
       VALUES (?, ?, 1, ?)`,
      [date, time, reason || 'Data bloqueada'],
      (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('Erro ao bloquear horário:', err);
          return res.status(500).json({ error: 'Erro ao bloquear data', details: err.message });
        }
        
        completed++;
        
        // Se todas as inserções foram concluídas, retorna sucesso
        if (completed === times.length && !hasError) {
          res.json({ success: true, message: 'Data bloqueada completamente' });
        }
      }
    );
  });
});

// ==================== GERENCIAR CAPACIDADE DE VAGAS ====================

// GET - Obter todas as configurações de capacidade
router.get('/api/service-capacity', checkAuth, (req, res) => {
  const db = getDatabase();
  
  db.all(
    `SELECT * FROM service_capacity 
     ORDER BY service_name, time_slot`,
    (err, rows) => {
      if (err) {
        console.error('Erro ao buscar service_capacity:', err);
        return res.status(500).json({ error: 'Erro ao buscar capacidades', details: err.message });
      }
      console.log('Service capacity carregado:', rows?.length || 0, 'registros');
      res.json(rows || []);
    }
  );
});

// GET - Obter capacidade específica
router.get('/api/service-capacity/:service/:time', checkAuth, (req, res) => {
  const db = getDatabase();
  const { service, time } = req.params;
  
  db.get(
    `SELECT * FROM service_capacity 
     WHERE service_name = ? AND time_slot = ?`,
    [service, time],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar capacidade' });
      }
      res.json(row || { capacity: 1 }); // Default 1 vaga se não configurado
    }
  );
});

// POST - Configurar capacidade para serviço e horário
router.post('/api/service-capacity', checkAuth, (req, res) => {
  const db = getDatabase();
  const { service_name, time_slot, capacity } = req.body;

  if (!service_name || !time_slot || capacity === undefined) {
    return res.status(400).json({ 
      error: 'Serviço, horário e capacidade são obrigatórios' 
    });
  }

  if (capacity < 0) {
    return res.status(400).json({ 
      error: 'Capacidade não pode ser negativa' 
    });
  }

  db.run(
    `INSERT OR REPLACE INTO service_capacity 
     (service_name, time_slot, capacity, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
    [service_name, time_slot, capacity],
    (err) => {
      if (err) {
        console.error('Erro ao configurar capacidade:', err);
        return res.status(500).json({ error: 'Erro ao configurar capacidade' });
      }
      res.json({ 
        success: true, 
        message: `Capacidade configurada: ${capacity} vagas para ${service_name} às ${time_slot}` 
      });
    }
  );
});

// POST - Configurar capacidade em lote (múltiplos horários)
router.post('/api/service-capacity/batch', checkAuth, (req, res) => {
  const db = getDatabase();
  const { service_name, time_slots, capacity } = req.body;

  if (!service_name || !time_slots || !Array.isArray(time_slots) || capacity === undefined) {
    return res.status(400).json({ 
      error: 'Serviço, horários (array) e capacidade são obrigatórios' 
    });
  }

  if (capacity < 0) {
    return res.status(400).json({ 
      error: 'Capacidade não pode ser negativa' 
    });
  }

  let completed = 0;
  let errors = 0;

  time_slots.forEach((time_slot, index) => {
    db.run(
      `INSERT OR REPLACE INTO service_capacity 
       (service_name, time_slot, capacity, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [service_name, time_slot, capacity],
      (err) => {
        if (err) {
          console.error(`Erro ao configurar capacidade para ${time_slot}:`, err);
          errors++;
        } else {
          completed++;
        }

        // Verificar se todas as operações foram concluídas
        if (completed + errors === time_slots.length) {
          if (errors > 0) {
            return res.status(500).json({ 
              success: false,
              message: `${completed} configurados, ${errors} erros` 
            });
          }
          res.json({ 
            success: true, 
            message: `${completed} horários configurados com ${capacity} vagas` 
          });
        }
      }
    );
  });
});

// DELETE - Remover configuração de capacidade
router.delete('/api/service-capacity/:id', checkAuth, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.run(
    `DELETE FROM service_capacity WHERE id = ?`,
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao remover configuração' });
      }
      res.json({ 
        success: true, 
        message: 'Configuração removida (voltará ao padrão de 1 vaga)' 
      });
    }
  );
});

// PUT - Atualizar capacidade por ID
router.put('/api/service-capacity/:id', checkAuth, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;
  const { capacity } = req.body;

  if (capacity === undefined || capacity < 0) {
    return res.status(400).json({ error: 'Capacidade inválida' });
  }

  db.run(
    `UPDATE service_capacity 
     SET capacity = ?, updated_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [capacity, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar capacidade' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Configuração não encontrada' });
      }
      
      res.json({ 
        success: true, 
        message: 'Capacidade atualizada com sucesso!' 
      });
    }
  );
});

// GET - Verificar vagas disponíveis em tempo real
router.get('/api/service-capacity/available/:service/:date/:time', (req, res) => {
  const db = getDatabase();
  const { service, date, time } = req.params;

  // Buscar capacidade configurada
  db.get(
    `SELECT capacity FROM service_capacity 
     WHERE service_name = ? AND time_slot = ?`,
    [service, time],
    (err, capacityRow) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao verificar capacidade' });
      }

      const maxCapacity = capacityRow ? capacityRow.capacity : 1;

      // Contar agendamentos confirmados neste horário
      db.get(
        `SELECT COUNT(*) as booked 
         FROM appointments 
         WHERE service = ? 
         AND appointment_date = ? 
         AND appointment_time = ? 
         AND status = 'confirmed'`,
        [service, date, time],
        (err, bookingRow) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao contar agendamentos' });
          }

          const bookedCount = bookingRow ? bookingRow.booked : 0;
          const available = maxCapacity - bookedCount;

          res.json({
            service,
            date,
            time,
            maxCapacity,
            booked: bookedCount,
            available: Math.max(0, available),
            isFull: available <= 0
          });
        }
      );
    }
  );
});

// POST - Alterar senha do admin
router.post('/change-password', checkAuth, (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const db = getDatabase();

  // Validações
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'Todos os campos são obrigatórios' 
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ 
      success: false, 
      message: 'A nova senha e a confirmação não coincidem' 
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: 'A nova senha deve ter no mínimo 6 caracteres' 
    });
  }

  // Verificar senha atual
  db.get(`SELECT value FROM settings WHERE key = 'admin_password'`, (err, row) => {
    if (err || !row) {
      return res.status(500).json({ 
        success: false, 
        message: 'Erro ao verificar senha atual' 
      });
    }

    if (currentPassword !== row.value) {
      return res.status(401).json({ 
        success: false, 
        message: 'Senha atual incorreta' 
      });
    }

    // Atualizar senha
    db.run(
      `UPDATE settings SET value = ? WHERE key = 'admin_password'`,
      [newPassword],
      function(err) {
        if (err) {
          return res.status(500).json({ 
            success: false, 
            message: 'Erro ao atualizar senha' 
          });
        }

        // Atualizar cookie com nova senha
        res.cookie('admin_auth', newPassword, { 
          httpOnly: true, 
          secure: false, // Permite HTTP (mobile/desenvolvimento)
          sameSite: 'Lax',
          maxAge: 24 * 60 * 60 * 1000 
        });

        res.json({ 
          success: true, 
          message: 'Senha alterada com sucesso!' 
        });
      }
    );
  });
});

// GET - Exportar agendamentos para Excel
router.get('/export-excel', checkAuth, (req, res) => {
  const db = getDatabase();
  
  const query = `
    SELECT 
      a.id,
      a.appointment_date,
      a.appointment_time,
      a.client_name,
      a.client_email,
      a.client_phone,
      a.service,
      a.service_price,
      a.status,
      a.notes,
      a.created_at,
      a.professional_id,
      p.name as professional_name
    FROM appointments a
    LEFT JOIN professionals p ON a.professional_id = p.id
    ORDER BY a.appointment_date DESC, a.appointment_time DESC
  `;
  
  db.all(query, [], (err, appointments) => {
    if (err) {
      console.error('Erro ao buscar agendamentos:', err);
      return res.status(500).send('Erro ao gerar arquivo Excel');
    }
    
    // Formatar dados para Excel
    const data = appointments.map(apt => {
      const [year, month, day] = apt.appointment_date.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      
      const serviceNames = {
        'manicure': 'Manicure',
        'pedicure': 'Pedicure',
        'cilios': 'Cílios',
        'combo_mani_pedi': 'Manicure + Pedicure',
        'combo_completo': 'Manicure + Pedicure + Cílios'
      };
      
      const statusNames = {
        'confirmed': 'Agendado',
        'initiated': 'Iniciado',
        'completed': 'Finalizado',
        'cancelled': 'Cancelado'
      };
      
      return {
        'ID': apt.id,
        'Data': formattedDate,
        'Horário': apt.appointment_time,
        'Cliente': apt.client_name,
        'Email': apt.client_email || '',
        'Telefone': apt.client_phone,
        'Serviço': serviceNames[apt.service] || apt.service,
        'Valor': `R$ ${(apt.service_price || 0).toFixed(2)}`,
        'Profissional': apt.professional_name || '',
        'Status': statusNames[apt.status] || apt.status,
        'Observações': apt.notes || '',
        'Data Criação': new Date(apt.created_at).toLocaleString('pt-BR')
      };
    });
    
    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajustar largura das colunas
    const colWidths = [
      { wch: 5 },   // ID
      { wch: 12 },  // Data
      { wch: 10 },  // Horário
      { wch: 25 },  // Cliente
      { wch: 30 },  // Email
      { wch: 15 },  // Telefone
      { wch: 25 },  // Serviço
      { wch: 12 },  // Valor
      { wch: 20 },  // Profissional
      { wch: 12 },  // Status
      { wch: 30 },  // Observações
      { wch: 20 }   // Data Criação
    ];
    ws['!cols'] = colWidths;
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Agendamentos');
    
    // Gerar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Definir headers para download
    const filename = `agendamentos_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    // Enviar arquivo
    res.send(buffer);
  });
});

// GET - Exportar relatório para Excel (Resumo por Data)
router.get('/export-relatorio', checkAuth, (req, res) => {
  const db = getDatabase();
  const { startDate, endDate } = req.query;
  
  let query = `SELECT * FROM appointments WHERE 1=1`;
  const params = [];
  
  if (startDate) {
    query += ` AND appointment_date >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND appointment_date <= ?`;
    params.push(endDate);
  }
  
  query += ` ORDER BY appointment_date ASC, appointment_time ASC`;
  
  db.all(query, params, (err, appointments) => {
    if (err) {
      console.error('Erro ao exportar relatório:', err);
      return res.status(500).send('Erro ao gerar relatório');
    }
    
    if (!appointments || appointments.length === 0) {
      return res.status(404).send('Nenhum agendamento encontrado para o período selecionado');
    }
    
    // Agrupar por data
    const appointmentsByDate = {};
    appointments.forEach(apt => {
      const date = apt.appointment_date;
      if (!appointmentsByDate[date]) {
        appointmentsByDate[date] = {
          date: date,
          appointments: [],
          total: 0,
          confirmed: 0,
          cancelled: 0,
          completed: 0,
          totalValue: 0,
          completedValue: 0
        };
      }
      
      appointmentsByDate[date].appointments.push(apt);
      appointmentsByDate[date].total++;
      appointmentsByDate[date].totalValue += (apt.service_price || 0);
      
      if (apt.status === 'confirmed') appointmentsByDate[date].confirmed++;
      if (apt.status === 'cancelled') appointmentsByDate[date].cancelled++;
      if (apt.status === 'completed') {
        appointmentsByDate[date].completed++;
        appointmentsByDate[date].completedValue += (apt.service_price || 0);
      }
    });
    
    // Preparar dados para Excel - Resumo
    const summaryData = Object.values(appointmentsByDate).sort((a, b) => 
      a.date.localeCompare(b.date)
    ).map(day => {
      const [year, month, dayNum] = day.date.split('-');
      return {
        'Data': `${dayNum}/${month}/${year}`,
        'Total Agendamentos': day.total,
        'Agendados': day.confirmed,
        'Concluídos': day.completed,
        'Cancelados': day.cancelled,
        'Valor Esperado': `R$ ${day.totalValue.toFixed(2)}`,
        'Valor Recebido': `R$ ${day.completedValue.toFixed(2)}`
      };
    });
    
    // Preparar dados detalhados
    const serviceNames = {
      'manicure': 'Manicure',
      'pedicure': 'Pedicure',
      'cilios': 'Cílios',
      'combo_mani_pedi': 'Manicure + Pedicure',
      'combo_completo': 'Manicure + Pedicure + Cílios'
    };
    
    const statusNames = {
      'confirmed': 'Agendado',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    };
    
    const detailsData = appointments.map(apt => {
      const [year, month, day] = apt.appointment_date.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      
      return {
        'Data': formattedDate,
        'Horário': apt.appointment_time,
        'Cliente': apt.client_name,
        'Telefone': apt.client_phone,
        'Email': apt.client_email || '',
        'Serviço': serviceNames[apt.service] || apt.service,
        'Valor': `R$ ${(apt.service_price || 0).toFixed(2)}`,
        'Status': statusNames[apt.status] || apt.status,
        'Observações': apt.notes || ''
      };
    });
    
    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Resumo por Data
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [
      { wch: 12 },  // Data
      { wch: 18 },  // Total
      { wch: 12 },  // Agendados
      { wch: 12 },  // Concluídos
      { wch: 12 },  // Cancelados
      { wch: 15 },  // Valor Esperado
      { wch: 15 }   // Valor Recebido
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo por Data');
    
    // Sheet 2: Detalhamento
    const wsDetails = XLSX.utils.json_to_sheet(detailsData);
    wsDetails['!cols'] = [
      { wch: 12 },  // Data
      { wch: 10 },  // Horário
      { wch: 25 },  // Cliente
      { wch: 15 },  // Telefone
      { wch: 30 },  // Email
      { wch: 25 },  // Serviço
      { wch: 12 },  // Valor
      { wch: 12 },  // Status
      { wch: 30 }   // Observações
    ];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalhamento');
    
    // Gerar buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Nome do arquivo
    const dateRange = startDate && endDate 
      ? `${startDate}_a_${endDate}` 
      : new Date().toISOString().split('T')[0];
    const filename = `relatorio_${dateRange}.xlsx`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(buffer);
  });
});

// ==================== ROTAS DE PROFISSIONAIS ====================

// GET - Listar todos os profissionais
router.get('/api/professionals', checkAuth, (req, res) => {
  const db = getDatabase();
  
  db.all(`SELECT * FROM professionals ORDER BY name ASC`, (err, professionals) => {
    if (err) {
      console.error('Erro ao buscar profissionais:', err);
      return res.status(500).json({ success: false, error: 'Erro ao buscar profissionais' });
    }
    
    res.json({ success: true, professionals });
  });
});

// POST - Criar novo profissional
router.post('/api/professionals', checkAuth, (req, res) => {
  const { name, phone, email, specialty } = req.body;
  const db = getDatabase();
  
  if (!name) {
    return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
  }
  
  db.run(
    `INSERT INTO professionals (name, phone, email, specialty, is_active) VALUES (?, ?, ?, ?, 1)`,
    [name, phone || null, email || null, specialty || null],
    function(err) {
      if (err) {
        console.error('Erro ao criar profissional:', err);
        return res.status(500).json({ success: false, error: 'Erro ao criar profissional' });
      }
      
      res.json({ success: true, id: this.lastID, message: 'Profissional cadastrado com sucesso!' });
    }
  );
});

// PUT - Atualizar profissional
router.put('/api/professionals/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const { name, phone, email, specialty, is_active } = req.body;
  const db = getDatabase();
  
  db.run(
    `UPDATE professionals SET name = ?, phone = ?, email = ?, specialty = ?, is_active = ? WHERE id = ?`,
    [name, phone || null, email || null, specialty || null, is_active, id],
    function(err) {
      if (err) {
        console.error('Erro ao atualizar profissional:', err);
        return res.status(500).json({ success: false, error: 'Erro ao atualizar profissional' });
      }
      
      res.json({ success: true, message: 'Profissional atualizado com sucesso!' });
    }
  );
});

// DELETE - Excluir profissional
router.delete('/api/professionals/:id', checkAuth, (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  
  // Verificar se há agendamentos vinculados
  db.get(`SELECT COUNT(*) as count FROM appointments WHERE professional_id = ?`, [id], (err, row) => {
    if (err) {
      console.error('Erro ao verificar agendamentos:', err);
      return res.status(500).json({ success: false, error: 'Erro ao verificar agendamentos' });
    }
    
    if (row.count > 0) {
      return res.status(400).json({ 
        success: false, 
        error: `Este profissional tem ${row.count} agendamento(s) vinculado(s). Desative ao invés de excluir.` 
      });
    }
    
    db.run(`DELETE FROM professionals WHERE id = ?`, [id], function(err) {
      if (err) {
        console.error('Erro ao excluir profissional:', err);
        return res.status(500).json({ success: false, error: 'Erro ao excluir profissional' });
      }
      
      res.json({ success: true, message: 'Profissional excluído com sucesso!' });
    });
  });
});

// Rota para atribuir profissional a um agendamento
router.post('/api/appointments/:id/assign-professional', checkAuth, (req, res) => {
  const appointmentId = req.params.id;
  const { professional_id } = req.body;
  
  const db = getDatabase();
  
  console.log(`[ASSIGN-PROFESSIONAL] Appointment: ${appointmentId}, Professional ID: ${professional_id}, Type: ${typeof professional_id}`);
  
  // Validar se o profissional existe (se fornecido)
  if (professional_id) {
    db.get('SELECT id, is_active FROM professionals WHERE id = ?', [professional_id], (err, prof) => {
      if (err) {
        console.error('Erro ao validar profissional:', err);
        return res.status(500).json({ success: false, error: 'Erro ao validar profissional' });
      }
      
      console.log(`[ASSIGN-PROFESSIONAL] Query result:`, prof);
      
      if (!prof) {
        return res.status(404).json({ success: false, error: 'Profissional não encontrado' });
      }
      
      // Aceitar is_active = 1 ou NULL (profissionais criados antes da coluna existir)
      if (prof.is_active === 0) {
        return res.status(404).json({ success: false, error: 'Profissional está inativo' });
      }
      
      // Atualizar agendamento
      updateAppointment();
    });
  } else {
    // Remover profissional (null)
    updateAppointment();
  }
  
  function updateAppointment() {
    // Atualizar apenas o profissional, SEM mudar o status automaticamente
    db.run(
      'UPDATE appointments SET professional_id = ? WHERE id = ?',
      [professional_id || null, appointmentId],
      function(err) {
        if (err) {
          console.error('Erro ao atribuir profissional:', err);
          return res.status(500).json({ success: false, error: 'Erro ao atribuir profissional' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ success: false, error: 'Agendamento não encontrado' });
        }
        
        res.json({ 
          success: true, 
          message: 'Profissional atribuído com sucesso!',
          statusChanged: false
        });
      }
    );
  }
});

module.exports = router;
