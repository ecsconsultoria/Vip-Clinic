const express = require('express');
const router = express.Router();
const { getDatabase } = require('../database');
const { generateAppointmentId } = require('../utils/linkGenerator');
const { sendBookingNotifications, generateClientWhatsAppLink } = require('../utils/notifications');

// Funções auxiliares para formatação
const formatServiceName = (service) => {
  const names = {
    'manicure': 'Manicure',
    'pedicure': 'Pedicure',
    'cilios': 'Cílios',
    'combo_mani_pedi': 'Manicure + Pedicure',
    'combo_completo': 'Manicure + Pedicure + Cílios'
  };
  return names[service] || service;
};

const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// GET - Obter datas disponíveis
router.get('/available-dates', (req, res) => {
  try {
    const db = getDatabase();
    
    if (!db) {
      console.error('Banco de dados não inicializado');
      return res.status(503).json({ error: 'Banco de dados indisponível' });
    }
    
    db.all(
      `SELECT date FROM available_dates 
       WHERE is_active = 1 AND date >= date('now')
       ORDER BY date ASC
       LIMIT 30`,
      (err, rows) => {
        if (err) {
          console.error('Erro ao buscar datas:', err);
          return res.status(500).json({ error: 'Erro ao buscar datas' });
        }
        res.json(rows || []);
      }
    );
  } catch (error) {
    console.error('Erro na rota available-dates:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET - Obter horários disponíveis para uma data
router.get('/available-times/:date', (req, res) => {
  try {
    const db = getDatabase();
    const { date } = req.params;
    
    if (!db) {
      console.error('Banco de dados não inicializado');
      const defaultTimes = [
        { start_time: '09:00', end_time: '10:00' },
        { start_time: '10:00', end_time: '11:00' },
        { start_time: '11:00', end_time: '12:00' },
        { start_time: '12:00', end_time: '13:00' },
        { start_time: '13:00', end_time: '14:00' },
        { start_time: '14:00', end_time: '15:00' },
        { start_time: '15:00', end_time: '16:00' },
        { start_time: '16:00', end_time: '17:00' },
        { start_time: '17:00', end_time: '18:00' }
      ];
      return res.json(defaultTimes);
    }
    
    let responded = false;
    
    // Timeout de 20 segundos (mais generoso para Render)
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        console.error('Timeout ao buscar horários para data:', date);
        // Retornar horários padrão em caso de timeout
        const defaultTimes = [
          { start_time: '09:00', end_time: '10:00' },
          { start_time: '10:00', end_time: '11:00' },
          { start_time: '11:00', end_time: '12:00' },
          { start_time: '12:00', end_time: '13:00' },
          { start_time: '13:00', end_time: '14:00' },
          { start_time: '14:00', end_time: '15:00' },
          { start_time: '15:00', end_time: '16:00' },
          { start_time: '16:00', end_time: '17:00' },
          { start_time: '17:00', end_time: '18:00' }
        ];
        res.json(defaultTimes);
      }
    }, 20000);

  db.all(
    `SELECT ts.id, ts.start_time, ts.end_time,
     CASE WHEN us.id IS NOT NULL THEN 1 ELSE 0 END as is_unavailable
     FROM time_slots ts
     LEFT JOIN unavailable_slots us ON ts.start_time = us.time 
     AND us.date = ? AND us.is_unavailable = 1
     WHERE ts.is_active = 1
     ORDER BY ts.start_time ASC`,
    [date],
    (err, rows) => {
      clearTimeout(timeout);
      
      if (responded) return;
      responded = true;
      
      if (err) {
        console.error('Erro ao buscar horários:', err);
        // Retornar horários padrão em caso de erro
        const defaultTimes = [
          { start_time: '09:00', end_time: '10:00' },
          { start_time: '10:00', end_time: '11:00' },
          { start_time: '11:00', end_time: '12:00' },
          { start_time: '12:00', end_time: '13:00' },
          { start_time: '13:00', end_time: '14:00' },
          { start_time: '14:00', end_time: '15:00' },
          { start_time: '15:00', end_time: '16:00' },
          { start_time: '16:00', end_time: '17:00' },
          { start_time: '17:00', end_time: '18:00' }
        ];
        return res.json(defaultTimes);
      }
      
      if (!rows || rows.length === 0) {
        // Se não houver registros de time_slots, retornar padrão com todos horários
        const defaultTimes = [
          { start_time: '09:00', end_time: '10:00' },
          { start_time: '10:00', end_time: '11:00' },
          { start_time: '11:00', end_time: '12:00' },
          { start_time: '12:00', end_time: '13:00' },
          { start_time: '13:00', end_time: '14:00' },
          { start_time: '14:00', end_time: '15:00' },
          { start_time: '15:00', end_time: '16:00' },
          { start_time: '16:00', end_time: '17:00' },
          { start_time: '17:00', end_time: '18:00' }
        ];
        return res.json(defaultTimes);
      }
      
      // Retornar TODOS os horários disponíveis (sem filtros por dia da semana)
      // Apenas considera bloqueios manuais do admin via unavailable_slots
      res.json(rows);
    }
  );
  } catch (error) {
    console.error('Erro na rota available-times:', error);
    const defaultTimes = [
      { start_time: '10:00', end_time: '11:00' },
      { start_time: '11:00', end_time: '12:00' },
      { start_time: '12:00', end_time: '13:00' },
      { start_time: '14:00', end_time: '15:00' },
      { start_time: '15:00', end_time: '16:00' },
      { start_time: '16:00', end_time: '17:00' },
      { start_time: '17:00', end_time: '18:00' }
    ];
    res.json(defaultTimes);
  }
});

// GET - Verificar disponibilidade de serviço em horário específico
router.get('/check-availability/:service/:date/:time', (req, res) => {
  try {
    const db = getDatabase();
    const { service, date, time } = req.params;
    
    if (!db) {
      return res.json({ available: true, slots: 1 }); // Padrão otimista se DB não disponível
    }

    // Buscar capacidade configurada para este serviço e horário
    db.get(
      `SELECT capacity FROM service_capacity 
       WHERE service_name = ? AND time_slot = ?`,
      [service, time],
      (err, capacityRow) => {
        if (err) {
          console.error('Erro ao buscar capacidade:', err);
          return res.json({ available: true, slots: 1 });
        }

        const maxCapacity = capacityRow ? capacityRow.capacity : 1;

        // Se capacidade configurada é 0, bloqueado
        if (maxCapacity === 0) {
          return res.json({ 
            available: false, 
            slots: 0,
            message: 'Este serviço não está disponível neste horário' 
          });
        }

        // Contar agendamentos confirmados para este serviço, data e horário
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
              console.error('Erro ao contar agendamentos:', err);
              return res.json({ available: true, slots: 1 });
            }

            const bookedCount = bookingRow ? bookingRow.booked : 0;
            const availableSlots = maxCapacity - bookedCount;

            res.json({
              available: availableSlots > 0,
              slots: Math.max(0, availableSlots),
              maxCapacity,
              booked: bookedCount,
              message: availableSlots > 0 
                ? `${availableSlots} vaga${availableSlots > 1 ? 's' : ''} disponível${availableSlots > 1 ? 'is' : ''}`
                : 'Horário lotado para este serviço'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    res.json({ available: true, slots: 1 }); // Padrão otimista em caso de erro
  }
});

// POST - Criar novo agendamento
router.post('/create', (req, res) => {
  console.log('═══════════════════════════════════════════');
  console.log('📥 NOVA REQUISIÇÃO DE AGENDAMENTO RECEBIDA');
  console.log('═══════════════════════════════════════════');
  
  try {
    const db = getDatabase();
    
    if (!db) {
      console.error('❌ Banco de dados não inicializado');
      return res.status(503).json({ error: 'Banco de dados indisponível' });
    }
    
    const {
      client_name,
      client_phone,
      client_email,
      service,
      appointment_date,
      appointment_time,
      notes
    } = req.body;

    console.log('📋 Dados recebidos:', {
      client_name, client_phone, service, appointment_date, appointment_time
    });

    // Validar dados
    if (!client_name || !client_phone || !service || !appointment_date || !appointment_time) {
      console.error('Dados obrigatórios faltando');
      return res.status(400).json({ error: 'Dados obrigatórios faltando' });
    }

    const appointmentId = generateAppointmentId();
    let responded = false;
    
    // VERIFICAÇÃO DE DUPLICATA: Verificar se já existe agendamento idêntico
    db.get(
      `SELECT id, client_name FROM appointments 
       WHERE client_phone = ? 
       AND service = ? 
       AND appointment_date = ? 
       AND appointment_time = ? 
       AND status = 'confirmed'
       LIMIT 1`,
      [client_phone, service, appointment_date, appointment_time],
      (err, duplicateRow) => {
        if (responded) {
          console.log('⚠️ Tentativa de responder novamente - ignorando');
          return;
        }
        
        if (err) {
          console.error('Erro ao verificar duplicata:', err);
          // Continuar mesmo com erro na verificação
        }

        if (duplicateRow) {
          console.log('🚫 DUPLICATA DETECTADA! Enviando resposta...');
          console.log('Agendamento duplicado detectado:', {
            existing_id: duplicateRow.id,
            client: duplicateRow.client_name,
            phone: client_phone
          });
          
          const errorMsg = `Opa! ${duplicateRow.client_name} já tem um agendamento de ${formatServiceName(service)} neste horário (${appointment_time} em ${formatDate(appointment_date)}). Escolha outro horário ou verifique seus agendamentos existentes.`;
          
          responded = true;
          
          const responseData = { 
            error: errorMsg,
            duplicate: true,
            existing_appointment_id: duplicateRow.id
          };
          
          console.log('📤 Enviando JSON:', responseData);
          
          res.status(400)
             .set('Content-Type', 'application/json')
             .send(JSON.stringify(responseData));
          
          console.log('✅ Resposta de duplicata enviada com sucesso');
          return;
        }
        
        console.log('✓ Sem duplicata, continuando verificação...');

        // Não há duplicata, prosseguir com verificação de capacidade
        // VERIFICAÇÃO DE CAPACIDADE: Verificar se há vaga disponível
        db.get(
          `SELECT capacity FROM service_capacity 
           WHERE service_name = ? AND time_slot = ?`,
          [service, appointment_time],
          (err, capacityRow) => {
            if (responded) return; // Segurança adicional
            
            const maxCapacity = capacityRow ? capacityRow.capacity : 1;
            
            // Se capacidade é 0, bloqueado
            if (maxCapacity === 0) {
              responded = true;
              return res.status(400).json({ 
                error: 'Este serviço não está disponível neste horário' 
              });
            }

            // Verificar quantos já estão agendados
            db.get(
              `SELECT COUNT(*) as booked 
               FROM appointments 
               WHERE service = ? 
               AND appointment_date = ? 
               AND appointment_time = ? 
               AND status = 'confirmed'`,
              [service, appointment_date, appointment_time],
              (err, bookingRow) => {
                if (responded) return; // Segurança adicional
                
                const bookedCount = bookingRow ? bookingRow.booked : 0;
                const availableSlots = maxCapacity - bookedCount;

                if (availableSlots <= 0) {
                  responded = true;
                  return res.status(400).json({ 
                    error: 'Desculpe, este horário está lotado para este serviço. Por favor, escolha outro horário.' 
                  });
                }

                // Há vaga disponível, prosseguir com agendamento
                // Buscar preço do serviço
                db.get(
                  `SELECT price FROM services WHERE name = ?`,
                  [service],
                  function(err, serviceData) {
                    if (err) {
                      console.error('Erro ao buscar preço do serviço:', err);
                      serviceData = { price: 0 };
                    }
                    
                    const servicePrice = serviceData ? serviceData.price : 0;
                    
                    // Timeout de 30 segundos (mais generoso para Render)
                    const timeout = setTimeout(() => {
                      if (!responded) {
                        responded = true;
                        console.error('Timeout ao inserir agendamento');
                        return res.status(500).json({ 
                          error: 'Timeout ao processar agendamento. Tente novamente.' 
                        });
                      }
                    }, 30000);

                    db.run(
                      `INSERT INTO appointments 
                       (id, client_name, client_phone, client_email, service, service_price, appointment_date, appointment_time, notes, status, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))`,
                      [appointmentId, client_name, client_phone, client_email, service, servicePrice, appointment_date, appointment_time, notes || ''],
                      function(err) {
                        clearTimeout(timeout);
                        
                        if (responded) return;
                        responded = true;
                        
                        if (err) {
                          console.error('Erro ao inserir agendamento:', err);
                          return res.status(500).json({ 
                            error: 'Erro ao criar agendamento: ' + err.message 
                          });
                        }
                        
                        console.log('✅ Agendamento criado com sucesso:', appointmentId);
                        
                        // Preparar dados completos do agendamento para notificações
                        const appointmentData = {
                          id: appointmentId,
                          client_name,
                          client_phone,
                          client_email: client_email || '',
                          service,
                          service_price: servicePrice,
                          appointment_date,
                          appointment_time,
                          notes: notes || '',
                          status: 'confirmed'
                        };
                        
                        // Enviar notificações (não bloqueante)
                        sendBookingNotifications(appointmentData)
                          .then(notification => {
                            console.log('📨 Notificações processadas:', notification);
                          })
                          .catch(err => {
                            console.error('⚠️ Erro ao enviar notificações (não crítico):', err);
                          });
                        
                        // Gerar link WhatsApp para resposta
                        const whatsappLink = generateClientWhatsAppLink(appointmentData);
                        
                        res.json({
                          success: true,
                          appointment_id: appointmentId,
                          whatsapp_link: whatsappLink,
                          message: 'Agendamento confirmado! Clique no link do WhatsApp para salvar a confirmação.'
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Erro na rota create:', error);
    res.status(500).json({ error: 'Erro ao processar agendamento' });
  }
});

// GET - Obter detalhes do agendamento
router.get('/:id', (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  db.get(
    `SELECT * FROM appointments WHERE id = ?`,
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar agendamento' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }
      res.json(row);
    }
  );
});

module.exports = router;
