const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config(); // Carregar variáveis de ambiente
const { initializeDatabase } = require('./database');
const { generateBookingLink } = require('./utils/linkGenerator');
const { loadCompanySettings } = require('./middleware/loadSettings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Log de respostas para debug
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    console.log('📨 RESPOSTA ENVIADA:', {
      status: res.statusCode,
      url: req.url,
      method: req.method,
      dataLength: data ? data.length : 0
    });
    originalSend.call(this, data);
  };
  
  res.json = function(data) {
    console.log('📨 JSON ENVIADO:', {
      status: res.statusCode,
      url: req.url,
      method: req.method,
      data: data
    });
    originalJson.call(this, data);
  };
  
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middleware para carregar configurações da empresa em todas as views
app.use(loadCompanySettings);

// Helpers disponíveis nas views EJS
app.locals.formatServiceName = (service) => {
  const names = {
    'manicure': 'Manicure',
    'pedicure': 'Pedicure',
    'cilios': 'Cílios',
    'combo_mani_pedi': 'Manicure + Pedicure',
    'combo_completo': 'Manicure + Pedicure + Cílios'
  };
  return names[service] || service;
};

app.locals.formatStatus = (status) => {
  const statuses = {
    'confirmed': '✅ Confirmado',
    'completed': '✔️ Concluído',
    'cancelled': '❌ Cancelado'
  };
  return statuses[status] || status;
};

// Initialize Database
initializeDatabase();

// Carregar configurações da empresa ao iniciar
const { loadSalonConfig } = require('./utils/notifications');
setTimeout(() => {
  loadSalonConfig().then(config => {
    console.log('✅ Configurações da empresa carregadas:', config.name);
  });
}, 1000);

// Routes
const bookingRoutes = require('./routes/booking');
const adminRoutes = require('./routes/admin');
const clientRoutes = require('./routes/client');

app.use('/api/booking', bookingRoutes);
app.use('/admin', adminRoutes);
app.use('/client', clientRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('index');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Erro na aplicação:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message 
  });
});

// Start Server
const server = app.listen(PORT, () => {
  const companyName = process.env.COMPANY_NAME || 'Vip & Bella';
  console.log(`🌟 ${companyName} Booking System rodando em http://localhost:${PORT}`);
  console.log(`📱 Acesse a página de admin: http://localhost:${PORT}/admin`);
});

// Aumentar timeout para operações longas
server.setTimeout(60000); // 60 segundos
