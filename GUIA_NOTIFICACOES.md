# 📱 Sistema de Notificações - Guia Completo

## 🎯 Como Funciona

Quando um cliente faz um agendamento:

1. **✅ Agendamento Confirmado** no banco de dados
2. **📱 Link WhatsApp Gerado** automaticamente
3. **🔔 Terminal mostra** detalhes do novo agendamento
4. **💬 Cliente recebe** botão para salvar confirmação no WhatsApp
5. **📧 (Opcional) Email** pode ser enviado

---

## 🚀 Implementação Atual

### ✅ O Que Já Está Funcionando:

1. **Link WhatsApp Automático**
   - Cliente vê botão "Abrir Confirmação no WhatsApp"
   - Mensagem pré-formatada com todos os detalhes
   - Salva no próprio WhatsApp do cliente

2. **Notificação no Terminal**
   - Admin vê box bonito no console
   - Todos os detalhes do agendamento
   - Link WhatsApp para contatar cliente

3. **Página de Confirmação**
   - Mostra todos os detalhes
   - Botão WhatsApp destacado
   - Opção de novo agendamento

---

## 📋 Personalização

### 1. Editar Informações do Salão

Abra: `src/utils/notifications.js`

```javascript
const SALON_CONFIG = {
  name: 'Vip & Bella',                    // ← Nome do seu salão
  phone: '5511961672313',                 // ← Seu WhatsApp (DDI+DDD+Número)
  email: 'contato@vipebella.com.br',      // ← Email do salão
  address: 'Rua Exemplo, 123 - SP',       // ← Endereço
  instagram: '@vipebella'                 // ← Instagram
};
```

### 2. Personalizar Mensagem WhatsApp

No mesmo arquivo, edite a função `generateClientWhatsAppMessage`:

```javascript
const message = `✅ *AGENDAMENTO CONFIRMADO!*

Olá *${appointment.client_name}*! 👋

// ← PERSONALIZE AQUI
Seu agendamento foi confirmado! 🎉

// ... resto da mensagem
`;
```

---

## 📧 Adicionar Email (Opcional)

### Opção 1: Gmail Gratuito

1. **Instalar nodemailer:**
```bash
npm install nodemailer
```

2. **Criar senha de app no Gmail:**
   - Ir em: https://myaccount.google.com/apppasswords
   - Criar senha para "nodemailer"
   - Copiar a senha gerada

3. **Criar arquivo `.env` na raiz:**
```env
EMAIL_USER=seuemail@gmail.com
EMAIL_PASSWORD=sua_senha_app_aqui
```

4. **Descomentar código em `notifications.js`:**
   - Linha 127: remover `/*` e `*/`
   - A seção de envio de email ficará ativa

### Opção 2: SendGrid (Profissional)

```bash
npm install @sendgrid/mail
```

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: appointment.client_email,
  from: 'noreply@seusalao.com.br',
  subject: '✅ Agendamento Confirmado',
  html: emailHTML
};

await sgMail.send(msg);
```

**Grátis até 100 emails/dia**

### Opção 3: Mailgun, Amazon SES, etc.

Similares ao SendGrid, consulte documentação específica.

---

## 🔔 Notificações Push (Futuro)

Para notificar o salão em tempo real:

### 1. Telegram Bot (Grátis)
```bash
npm install node-telegram-bot-api
```

```javascript
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

// Enviar quando houver novo agendamento
bot.sendMessage(process.env.CHAT_ID, `
🔔 Novo Agendamento!
Cliente: ${appointment.client_name}
Data: ${formattedDate}
Horário: ${appointment.appointment_time}
`);
```

### 2. Discord Webhook (Grátis)
```javascript
const webhook = 'https://discord.com/api/webhooks/...';

fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: '🔔 **Novo Agendamento!**',
    embeds: [{
      title: appointment.client_name,
      description: `${serviceName}\n${formattedDate} às ${appointment.appointment_time}`,
      color: 3447003
    }]
  })
});
```

---

## 💡 Boas Práticas

### Para o Cliente:
- ✅ Link WhatsApp com mensagem formatada
- ✅ Email com todos os detalhes (se configurado)
- ✅ Página de confirmação clara
- ✅ Código do agendamento para referência

### Para o Salão:
- ✅ Notificação no terminal (veja ao rodar servidor)
- ✅ Email cópia (se configurado)
- ✅ Dashboard mostra todos agendamentos
- ⚠️ **IMPORTANTE:** Verifique o terminal regularmente!

---

## 🎨 Customizar Mensagens

### Exemplo: Adicionar Política de Cancelamento

Em `notifications.js`, linha ~55:

```javascript
⚠️ *IMPORTANTE:*
• Chegue com 5 minutos de antecedência
• Cancelamentos: até 24h de antecedência
• Atrasos acima de 15min: reagendamento necessário
• Taxa de não comparecimento: R$ 30,00
```

### Exemplo: Adicionar Promoção

```javascript
🎁 *PROMOÇÃO:*
Na sua 5ª visita, ganhe 20% de desconto!
Indique uma amiga e ganhe R$ 10 de crédito!
```

---

## 🚨 Solução de Problemas

### "Notificação não aparece no terminal"
- ✅ Verifique se reiniciou o servidor
- ✅ Terminal deve estar aberto e visível
- ✅ Procure por "NOVO AGENDAMENTO RECEBIDO"

### "Link WhatsApp não funciona"
- ✅ Verifique telefone em `SALON_CONFIG`
- ✅ Formato: `5511999999999` (sem espaços, parênteses ou hífens)
- ✅ Deve ter DDI (55) + DDD + Número

### "Email não envia"
- ⚠️ Email está comentado por padrão
- ✅ Precisa configurar SMTP (veja seção Email)
- ✅ Verificar credenciais no `.env`

---

## 📊 Próximos Passos (Melhorias)

### Curto Prazo (Fácil):
- [ ] Telegram Bot para salão
- [ ] Discord Webhook
- [ ] SMS via Twilio

### Médio Prazo (Requer config):
- [ ] Email automático completo
- [ ] Lembrete 24h antes (WhatsApp ou Email)
- [ ] Pesquisa de satisfação pós-atendimento

### Longo Prazo (Complexo):
- [ ] WhatsApp Business API oficial
- [ ] App Mobile com Push Notifications
- [ ] Integração com Google Calendar

---

## 💰 Custos Estimados

| Método | Custo | Taxa de Abertura |
|--------|-------|------------------|
| WhatsApp Link | **Grátis** | ~95% |
| Email (Gmail) | **Grátis** | ~20% |
| Email (SendGrid) | Grátis até 100/dia | ~20% |
| SMS (Twilio) | R$ 0,10/msg | ~98% |
| WhatsApp Business API | R$ 150-500/mês | ~95% |
| Telegram Bot | **Grátis** | ~90% |

**Recomendação:** Comece com WhatsApp Link (grátis) + Email opcional

---

## 📞 Suporte

Dúvidas sobre configuração? Verifique:
- `src/utils/notifications.js` - Código principal
- `src/routes/booking.js` - Integração
- `views/client-confirmation.ejs` - Interface

**Logs úteis no terminal:**
```
📨 PROCESSANDO NOTIFICAÇÕES DE AGENDAMENTO
🔔 NOVO AGENDAMENTO RECEBIDO!
✅ Notificações processadas
```
