// Variáveis
const MIN_DATE_DAYS_AHEAD = 0; // Mínimo de dias no futuro para agendamentos (0 = permite hoje)
const MAX_DISPLAY_DAYS = 30;   // Máximo de dias para exibir
const COMPANY_PHONE = '5511961672313'; // Sem formatação

document.addEventListener('DOMContentLoaded', () => {
  setupDatePicker();
  setupDateChangeListener();
  setupPhoneMask();
});

// Máscara para telefone (11) 99999-9999
function setupPhoneMask() {
  const phoneInput = document.getElementById('clientPhone');
  
  phoneInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
    
    if (value.length > 11) {
      value = value.slice(0, 11);
    }
    
    // Aplicar máscara
    if (value.length === 0) {
      e.target.value = '';
    } else if (value.length <= 2) {
      e.target.value = `(${value}`;
    } else if (value.length <= 7) {
      e.target.value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else {
      e.target.value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    }
  });
  
  // Validar ao sair do campo
  phoneInput.addEventListener('blur', (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length !== 11) {
      e.target.classList.add('error');
    } else {
      e.target.classList.remove('error');
    }
  });
}

function setupDatePicker() {
  const dateInput = document.getElementById('appointmentDate');
  const today = new Date();
  
  // Calcular data mínima (próximo dia útil)
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + MIN_DATE_DAYS_AHEAD);
  
  // Calcular data máxima (30 dias no futuro)
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_DISPLAY_DAYS);
  
  // Formatar datas para input (YYYY-MM-DD)
  dateInput.min = formatDateForInput(minDate);
  dateInput.max = formatDateForInput(maxDate);
  
  // Buscar datas disponíveis
  loadAvailableDates();
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadAvailableDates() {
  // Timeout de 10 segundos
  const timeoutId = setTimeout(() => {
    console.warn('Timeout ao carregar datas - prosseguindo com datas padrão');
  }, 10000);
  
  fetch('/api/booking/available-dates', { timeout: 8000 })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(dates => {
      clearTimeout(timeoutId);
      console.log('Datas disponíveis carregadas:', dates);
      // As datas estão carregadas no banco de dados
      // Se nenhuma data estiver lá, usamos todas as datas futuras como disponíveis
      if (dates.length === 0) {
        console.log('Nenhuma restrição de data encontrada. Todos os dias são disponíveis.');
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.warn('Erro ao carregar datas (continuando com padrão):', error);
      // O sistema continua funcionando mesmo se houver erro ao carregar datas
    });
}

function setupDateChangeListener() {
  const dateInput = document.getElementById('appointmentDate');
  const timeSelect = document.getElementById('appointmentTime');
  
  dateInput.addEventListener('change', (e) => {
    const selectedDate = e.target.value;
    if (selectedDate) {
      loadAvailableTimeSlots(selectedDate);
    }
  });
}

function loadAvailableTimeSlots(date) {
  const timeSelect = document.getElementById('appointmentTime');
  timeSelect.innerHTML = '<option value="">Carregando horários...</option>';
  
  // Timeout de 30 segundos (mais generoso para Render)
  const timeoutId = setTimeout(() => {
    console.warn('Timeout ao carregar horários - usando horários padrão');
    loadDefaultTimeSlots(timeSelect);
  }, 30000);
  
  fetch(`/api/booking/available-times/${date}`, { timeout: 25000 })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(slots => {
      clearTimeout(timeoutId);
      timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
      
      if (!slots || slots.length === 0) {
        console.log('Nenhum horário retornado - usando padrão');
        loadDefaultTimeSlots(timeSelect);
        return;
      }
      
      let optionsAdded = 0;
      slots.forEach(slot => {
        // Verificar se o horário está disponível (booked < max_appointments ou não está bloqueado)
        if ((!slot.booked || slot.booked < 1) && !slot.is_unavailable) {
          const option = document.createElement('option');
          option.value = slot.start_time;
          option.textContent = `${slot.start_time} - ${slot.end_time}`;
          timeSelect.appendChild(option);
          optionsAdded++;
        }
      });
      
      if (optionsAdded === 0) {
        timeSelect.innerHTML = '<option value="">Nenhum horário disponível neste dia</option>';
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.error('Erro ao carregar horários:', error);
      console.log('Carregando horários padrão como fallback');
      loadDefaultTimeSlots(timeSelect);
    });
}

function loadDefaultTimeSlots(timeSelect) {
  // Horários padrão completos (09:00 - 18:00)
  const defaultTimes = [
    { start: '09:00', end: '10:00' },
    { start: '10:00', end: '11:00' },
    { start: '11:00', end: '12:00' },
    { start: '12:00', end: '13:00' },
    { start: '13:00', end: '14:00' },
    { start: '14:00', end: '15:00' },
    { start: '15:00', end: '16:00' },
    { start: '16:00', end: '17:00' },
    { start: '17:00', end: '18:00' }
  ];
  
  timeSelect.innerHTML = '<option value="">Selecione um horário</option>';
  
  defaultTimes.forEach(time => {
    const option = document.createElement('option');
    option.value = time.start;
    option.textContent = `${time.start} - ${time.end}`;
    timeSelect.appendChild(option);
  });
}

let isSubmitting = false; // Flag para evitar múltiplas submissões

document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Prevenir múltiplas submissões
  if (isSubmitting) {
    console.log('⚠️ Submissão já em andamento, ignorando...');
    return;
  }
  
  const formData = {
    client_name: document.getElementById('clientName').value,
    client_phone: document.getElementById('clientPhone').value,
    client_email: document.getElementById('clientEmail').value,
    service: document.getElementById('service').value,
    appointment_date: document.getElementById('appointmentDate').value,
    appointment_time: document.getElementById('appointmentTime').value,
    notes: document.getElementById('notes').value
  };
  
  // Validações
  if (!formData.client_name.trim()) {
    alert('Por favor, insira seu nome completo');
    return;
  }
  
  if (!formData.client_phone.trim()) {
    alert('Por favor, insira seu telefone/WhatsApp');
    return;
  }
  
  if (!formData.appointment_date || !formData.appointment_time) {
    alert('Por favor, selecione data e hora');
    return;
  }
  
  // Marcar como submitting
  isSubmitting = true;
  
  // Mostrar spinner
  document.getElementById('loadingSpinner').style.display = 'block';
  document.getElementById('bookingForm').style.display = 'none';
  
  // Criar controller e timeout FORA do try para acessar no catch
  const controller = new AbortController();
  let timeoutId = null;
  
  try {
    // Configurar timeout de 40 segundos
    timeoutId = setTimeout(() => {
      console.error('Timeout na requisição de agendamento');
      controller.abort();
    }, 40000);
    
    console.log('Enviando agendamento:', formData);
    
    const response = await fetch('/api/booking/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('Resposta recebida:', response.status);
    
    if (!response.ok) {
      isSubmitting = false; // Resetar flag em caso de erro HTTP
      const errorData = await response.json().catch(() => ({}));
      
      console.log('❌ Erro recebido do servidor:', errorData);
      
      // Se for erro de duplicata, mostrar mensagem especial
      if (errorData.duplicate) {
        throw new Error(errorData.error || 'Agendamento duplicado');
      }
      
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ Resposta JSON de sucesso:', data);
    
    if (data.success && data.appointment_id) {
      // Redirecionar para página de confirmação
      console.log('Redirecionando para confirmação');
      isSubmitting = false; // Resetar antes de redirecionar
      window.location.href = `/client/confirmation/${data.appointment_id}`;
    } else {
      isSubmitting = false; // Resetar flag
      throw new Error(data.error || 'Erro desconhecido');
    }
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);
    isSubmitting = false; // Resetar flag
    console.error('Erro ao processar agendamento:', error);
    
    let errorMessage = 'Erro ao processar agendamento. ';
    
    // Tratamento especial para duplicatas
    if (error.message.includes('já tem um agendamento')) {
      errorMessage = '⚠️ ' + error.message;
      alert(errorMessage);
      // Limpar apenas o horário para facilitar escolha de outro
      const timeField = document.getElementById('appointmentTime') || document.getElementById('time');
      if (timeField) timeField.value = '';
    } else if (error.name === 'AbortError') {
      errorMessage = '⏱️ A requisição demorou muito. Verifique sua conexão e tente novamente.';
      alert(errorMessage);
    } else if (error.message.includes('lotado')) {
      errorMessage = '🚫 ' + error.message;
      alert(errorMessage);
      // Limpar horário quando lotado
      const timeField = document.getElementById('appointmentTime') || document.getElementById('time');
      if (timeField) timeField.value = '';
    } else if (error.message.includes('HTTP')) {
      errorMessage = '❌ ' + error.message + '. Tente novamente.';
      alert(errorMessage);
    } else {
      errorMessage = '❌ ' + (error.message || 'Tente novamente ou contate o suporte.');
      alert(errorMessage);
    }
    
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('bookingForm').style.display = 'block';
  }
});
