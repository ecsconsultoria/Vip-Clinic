/**
 * Sistema de Notificações
 * Envia confirmações por Email e gera links WhatsApp
 */

const { getDatabase } = require('../database');

// Configurações padrão (fallback se banco de dados não estiver disponível)
let SALON_CONFIG = {
  name: process.env.COMPANY_NAME || 'Vip Clinic',
  phone: process.env.COMPANY_PHONE || '5511961672313',
  email: process.env.COMPANY_EMAIL || 'contato@vipclinic.com.br',
  address: process.env.COMPANY_ADDRESS || 'Rua Exemplo, 123 - São Paulo, SP',
  instagram: process.env.COMPANY_INSTAGRAM || '@vipclinic'
};

/**
 * Carrega configurações do banco de dados
 */
const loadSalonConfig = () => {
  const db = getDatabase();
  if (!db) return Promise.resolve(SALON_CONFIG);

  return new Promise((resolve) => {
    db.get('SELECT * FROM company_settings WHERE id = 1', (err, settings) => {
      if (!err && settings) {
        SALON_CONFIG = {
          name: settings.name,
          phone: settings.phone,
          email: settings.email,
          address: settings.address || SALON_CONFIG.address,
          instagram: settings.instagram
        };
      }
      resolve(SALON_CONFIG);
    });
  });
};

/**
 * Formata serviço para exibição
 */
const formatServiceName = (service) => {
  const names = {
    'manicure': 'Manicure',
    'pedicure': 'Pedicure',
    'cilios': 'Cílios',
    'combo_mani_pedi': 'Combo Manicure + Pedicure',
    'combo_completo': 'Combo Completo (Manicure + Pedicure + Cílios)'
  };
  return names[service] || service;
};

/**
 * Formata data de YYYY-MM-DD para DD/MM/YYYY
 */
const formatDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Formata data para português (ex: "Quarta-feira, 31 de Dezembro de 2025")
 */
const formatDateLong = (dateStr) => {
  const date = new Date(dateStr + 'T12:00:00');
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Sao_Paulo'
  };
  return date.toLocaleDateString('pt-BR', options);
};

/**
 * Gera mensagem WhatsApp para o CLIENTE
 */
const generateClientWhatsAppMessage = (appointment) => {
  const serviceName = formatServiceName(appointment.service);
  const dateFormatted = formatDate(appointment.appointment_date);
  const dateLong = formatDateLong(appointment.appointment_date);
  
  const message = `✅ *AGENDAMENTO CONFIRMADO!*

Olá *${appointment.client_name}*! 👋

Seu agendamento foi confirmado com sucesso! 🎉

📋 *DETALHES:*
💅 Serviço: ${serviceName}
📅 Data: ${dateLong}
🕐 Horário: ${appointment.appointment_time}
💰 Valor: R$ ${appointment.service_price.toFixed(2)}

📍 *Local:*
${SALON_CONFIG.name}
${SALON_CONFIG.address}

⚠️ *IMPORTANTE:*
• Chegue com 5 minutos de antecedência
• Em caso de atraso, avise-nos
• Cancelamentos devem ser feitos com 24h de antecedência

📞 Dúvidas? Entre em contato: ${SALON_CONFIG.phone}

Nos vemos em breve! ✨
_${SALON_CONFIG.name}_`;

  return encodeURIComponent(message);
};

/**
 * Gera mensagem WhatsApp para o SALÃO
 */
const generateSalonWhatsAppMessage = (appointment) => {
  const serviceName = formatServiceName(appointment.service);
  const dateFormatted = formatDate(appointment.appointment_date);
  
  const message = `🔔 *NOVO AGENDAMENTO!*

📋 *CLIENTE:*
👤 Nome: ${appointment.client_name}
📱 Tel: ${appointment.client_phone}
${appointment.client_email ? `📧 Email: ${appointment.client_email}` : ''}

💅 *SERVIÇO:*
${serviceName}

📅 *DATA E HORA:*
${dateFormatted} às ${appointment.appointment_time}

💰 *VALOR:*
R$ ${appointment.service_price.toFixed(2)}

${appointment.notes ? `📝 *Observações:*\n${appointment.notes}` : ''}

🆔 ID: ${appointment.id}`;

  return encodeURIComponent(message);
};

/**
 * Gera link WhatsApp para CLIENTE
 */
const generateClientWhatsAppLink = (appointment) => {
  const message = generateClientWhatsAppMessage(appointment);
  const clientPhone = appointment.client_phone.replace(/\D/g, '');
  return `https://wa.me/55${clientPhone}?text=${message}`;
};

/**
 * Gera link WhatsApp para SALÃO
 */
const generateSalonWhatsAppLink = (appointment) => {
  const message = generateSalonWhatsAppMessage(appointment);
  return `https://wa.me/${SALON_CONFIG.phone}?text=${message}`;
};

/**
 * Envia email de confirmação para o CLIENTE
 * NOTA: Requer configuração de SMTP
 */
const sendClientEmail = async (appointment) => {
  // TODO: Implementar quando tiver servidor SMTP configurado
  console.log('📧 Email para cliente (não implementado ainda):', appointment.client_email);
  
  /* EXEMPLO DE IMPLEMENTAÇÃO COM NODEMAILER:
  
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail', // ou outro serviço
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { background: #25D366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Agendamento Confirmado!</h1>
        </div>
        <div class="content">
          <h2>Olá, ${appointment.client_name}!</h2>
          <p>Seu agendamento foi confirmado com sucesso! 🎉</p>
          
          <h3>Detalhes do Agendamento:</h3>
          <ul>
            <li><strong>Serviço:</strong> ${formatServiceName(appointment.service)}</li>
            <li><strong>Data:</strong> ${formatDateLong(appointment.appointment_date)}</li>
            <li><strong>Horário:</strong> ${appointment.appointment_time}</li>
            <li><strong>Valor:</strong> R$ ${appointment.service_price.toFixed(2)}</li>
          </ul>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="${generateClientWhatsAppLink(appointment)}" class="button">
              📱 Abrir no WhatsApp
            </a>
          </p>
          
          <p><strong>Local:</strong><br>
          ${SALON_CONFIG.name}<br>
          ${SALON_CONFIG.address}</p>
          
          <hr>
          <p style="font-size: 12px; color: #666;">
            Código do agendamento: ${appointment.id}<br>
            Em caso de dúvidas, entre em contato pelo WhatsApp: ${SALON_CONFIG.phone}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await transporter.sendMail({
    from: `"${SALON_CONFIG.name}" <${SALON_CONFIG.email}>`,
    to: appointment.client_email,
    subject: `✅ Agendamento Confirmado - ${SALON_CONFIG.name}`,
    html: emailHTML
  });
  */
  
  return true;
};

/**
 * Notifica CLIENTE sobre novo agendamento
 */
const notifyClient = async (appointment) => {
  console.log('📱 Gerando notificação para cliente...');
  
  const whatsappLink = generateClientWhatsAppLink(appointment);
  
  // Tentar enviar email se configurado
  if (appointment.client_email) {
    try {
      await sendClientEmail(appointment);
    } catch (error) {
      console.error('Erro ao enviar email para cliente:', error.message);
    }
  }
  
  return {
    whatsappLink,
    message: 'Confirmação gerada com sucesso!'
  };
};

/**
 * Notifica SALÃO sobre novo agendamento
 */
const notifySalon = async (appointment) => {
  console.log('🔔 Notificação para o salão...');
  
  const whatsappLink = generateSalonWhatsAppLink(appointment);
  
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              🔔 NOVO AGENDAMENTO RECEBIDO!                 ║
╠════════════════════════════════════════════════════════════╣
║ Cliente: ${appointment.client_name.padEnd(48)}║
║ Serviço: ${formatServiceName(appointment.service).padEnd(48)}║
║ Data/Hora: ${formatDate(appointment.appointment_date)} às ${appointment.appointment_time}${' '.repeat(28)}║
║ Telefone: ${appointment.client_phone.padEnd(47)}║
╠════════════════════════════════════════════════════════════╣
║ 📱 Link WhatsApp:                                          ║
║ ${whatsappLink.substring(0, 58)}║
╚════════════════════════════════════════════════════════════╝
  `);
  
  return {
    whatsappLink,
    message: 'Notificação do salão gerada'
  };
};

/**
 * Processa notificações completas (cliente + salão)
 */
const sendBookingNotifications = async (appointment) => {
  console.log('═══════════════════════════════════════════');
  console.log('📨 PROCESSANDO NOTIFICAÇÕES DE AGENDAMENTO');
  console.log('═══════════════════════════════════════════');
  
  try {
    // Notificar cliente
    const clientNotification = await notifyClient(appointment);
    
    // Notificar salão
    const salonNotification = await notifySalon(appointment);
    
    console.log('✅ Todas as notificações processadas com sucesso!');
    
    return {
      success: true,
      client: clientNotification,
      salon: salonNotification
    };
  } catch (error) {
    console.error('❌ Erro ao processar notificações:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendBookingNotifications,
  notifyClient,
  notifySalon,
  generateClientWhatsAppLink,
  generateSalonWhatsAppLink,
  loadSalonConfig,
  SALON_CONFIG
};
