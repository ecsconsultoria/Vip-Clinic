# 🎨 Sistema de Configuração Multi-Empresa

## 📋 Visão Geral

O sistema agora suporta **configuração dinâmica por cliente**, permitindo que você venda para múltiplas empresas sem alterar código. As configurações são gerenciadas por:

1. **Variáveis de Ambiente** (.env) - Configuração inicial ao fazer deploy
2. **Banco de Dados** (company_settings) - Configurações editáveis pelo admin
3. **Fallback Automático** - Usa valores padrão se nenhuma configuração for encontrada

---

## 🚀 Como Configurar para um Novo Cliente

### **Opção 1: Usando Variáveis de Ambiente (Recomendado para Deploy)**

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` com os dados do cliente:
   ```env
   COMPANY_NAME=Salão da Maria
   COMPANY_PHONE=5511987654321
   COMPANY_EMAIL=contato@salaodamaria.com
   COMPANY_INSTAGRAM=@salaodamaria
   COMPANY_TAGLINE=Beleza e bem-estar
   ```

3. Reinicie o servidor:
   ```bash
   npm start
   ```

### **Opção 2: Editando Diretamente no Banco de Dados**

Execute este SQL no banco `data/appointments.db`:

```sql
UPDATE company_settings 
SET 
  name = 'Salão da Maria',
  phone = '5511987654321',
  email = 'contato@salaodamaria.com',
  instagram = '@salaodamaria',
  tagline = 'Beleza e bem-estar'
WHERE id = 1;
```

---

## 🌐 Deploy no Render (Múltiplos Clientes)

### **Cliente 1: Vip & Bella**
```
Nome do Serviço: vip-bella-booking
Variáveis de Ambiente:
  COMPANY_NAME=Vip & Bella
  COMPANY_PHONE=5511961672313
  COMPANY_EMAIL=contato@vipebella.com.br
  COMPANY_INSTAGRAM=@vipebella
```

### **Cliente 2: Salão da Maria**
```
Nome do Serviço: salao-maria-booking
Variáveis de Ambiente:
  COMPANY_NAME=Salão da Maria
  COMPANY_PHONE=5511987654321
  COMPANY_EMAIL=contato@salaodamaria.com
  COMPANY_INSTAGRAM=@salaodamaria
```

**Passos no Render:**
1. Crie um novo Web Service
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente (Environment Variables)
4. Deploy automático!

---

## 📊 Estrutura do Banco de Dados

### Tabela: `company_settings`

| Campo          | Tipo    | Descrição                        | Padrão              |
|----------------|---------|----------------------------------|---------------------|
| `id`           | INTEGER | Sempre 1 (único registro)        | 1                   |
| `name`         | TEXT    | Nome da empresa                  | Vip & Bella         |
| `phone`        | TEXT    | Telefone (DDI+DDD+número)        | 5511961672313       |
| `email`        | TEXT    | Email de contato                 | contato@...         |
| `instagram`    | TEXT    | Instagram handle                 | @vipebella          |
| `tagline`      | TEXT    | Frase de marketing               | Agende seu serviço  |
| `logo_url`     | TEXT    | URL do logo (futuro)             | NULL                |
| `primary_color`| TEXT    | Cor primária (hex)               | #e91e63             |

---

## 🎯 Como Funciona

### **1. Ordem de Prioridade**
```
Banco de Dados > Variáveis .env > Valores Padrão
```

### **2. Disponibilidade nas Views**
Todas as views EJS têm acesso automático à variável `company`:

```html
<h1><%= company.name %></h1>
<title><%= company.name %> - Agendamento</title>
<p>Telefone: <%= company.phone %></p>
<p>Email: <%= company.email %></p>
<p><%= company.tagline %></p>
```

### **3. Uso no Backend**
```javascript
const { loadSalonConfig } = require('./utils/notifications');

// Carregar configurações
const config = await loadSalonConfig();
console.log(config.name); // "Vip & Bella"
console.log(config.phone); // "5511961672313"
```

---

## 🔧 Arquivos Modificados

| Arquivo                           | Mudança                                     |
|-----------------------------------|---------------------------------------------|
| `src/database.js`                 | ✅ Criada tabela `company_settings`        |
| `src/middleware/loadSettings.js`  | ✅ Middleware para carregar configurações  |
| `src/server.js`                   | ✅ Integrado middleware e dotenv           |
| `src/utils/notifications.js`      | ✅ Carrega config do banco                 |
| `views/*.ejs`                     | ✅ Substituído "Vip & Bella" por `<%= company.name %>` |
| `.env.example`                    | ✅ Template de configuração                |

---

## 💡 Próximos Passos (Opcional)

### **1. Painel Admin para Editar Configurações**
Adicione rota em `src/routes/admin.js`:

```javascript
// GET /admin/settings
router.get('/settings', checkAuth, (req, res) => {
  db.get('SELECT * FROM company_settings WHERE id = 1', (err, settings) => {
    res.render('admin-settings', { settings });
  });
});

// POST /admin/settings
router.post('/settings', checkAuth, (req, res) => {
  const { name, phone, email, instagram, tagline } = req.body;
  db.run(
    `UPDATE company_settings SET name=?, phone=?, email=?, instagram=?, tagline=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`,
    [name, phone, email, instagram, tagline],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});
```

### **2. Upload de Logo**
Integre com Cloudinary ou similar para upload de imagens.

### **3. Personalização de Cores**
Use `company.primary_color` no CSS para temas personalizados.

---

## ✅ Checklist de Deploy

Para cada novo cliente:

- [ ] Criar repositório no GitHub (ou usar mesmo repo)
- [ ] Configurar variáveis de ambiente no Render
- [ ] Fazer deploy e verificar logs
- [ ] Testar página de agendamento (nome correto?)
- [ ] Testar painel admin (nome correto?)
- [ ] Verificar mensagens WhatsApp (nome da empresa)
- [ ] Configurar domínio customizado (opcional)

---

## 🆘 Suporte

**Erro comum:** "Cannot read property 'name' of undefined"
- **Causa:** Middleware não foi carregado
- **Solução:** Verifique se `app.use(loadCompanySettings)` está em `server.js` antes das rotas

**Configurações não aparecem:**
- Verifique se o banco foi inicializado: `SELECT * FROM company_settings;`
- Confirme que as variáveis .env estão corretas
- Reinicie o servidor após mudanças

---

## 📞 Exemplo Prático

**Antes (hardcoded):**
```html
<h1>Vip & Bella</h1>
```

**Depois (dinâmico):**
```html
<h1><%= company.name %></h1>
```

**Resultado para Cliente 1:**
```html
<h1>Vip & Bella</h1>
```

**Resultado para Cliente 2:**
```html
<h1>Salão da Maria</h1>
```

---

🎉 **Sistema pronto para múltiplos clientes sem alterar código!**
