# 🎯 Gerenciamento de Vagas por Horário e Serviço

## 📋 Visão Geral

Sistema completo para o administrador configurar quantas vagas (atendimentos simultâneos) estarão disponíveis para cada serviço em cada horário.

## ✨ Funcionalidades

### Para o Administrador

1. **Acesso ao Gerenciamento**
   - No painel admin, clique em "🎯 Gerenciar Vagas"
   - Visualize todas as configurações atuais

2. **Configurar Vagas**
   - Selecione o serviço (Manicure, Pedicure, Cílios, etc)
   - Selecione o horário
   - Defina a quantidade de vagas (0 a 20)
   - Clique em "💾 Salvar Configuração"

3. **Aplicar em Lote**
   - Selecione o serviço
   - Defina a quantidade de vagas
   - Clique em "⚡ Aplicar para Todos os Horários"
   - Confirme a ação

4. **Visualizar Configurações**
   - Filtre por serviço específico ou veja todos
   - Configurações agrupadas por serviço
   - Indicadores visuais:
     - 🚫 Vermelho: 0 vagas (bloqueado)
     - 🟠 Laranja: 1-2 vagas
     - 🟢 Verde: 3+ vagas

5. **Remover Configurações**
   - Clique em "🗑️ Remover" na configuração desejada
   - O horário voltará ao padrão (1 vaga)

### Para o Cliente

- O sistema verifica automaticamente a disponibilidade
- Horários lotados não aparecem ou mostram mensagem
- Experiência transparente sem complexidade técnica

## 🔧 Como Funciona

### Regras de Capacidade

1. **Padrão**: 1 vaga por horário (quando não configurado)
2. **Capacidade 0**: Bloqueia completamente o serviço naquele horário
3. **Capacidade 1+**: Permite múltiplos agendamentos simultâneos
4. **Verificação em Tempo Real**: Sistema conta agendamentos confirmados vs. capacidade

### Exemplos Práticos

#### Exemplo 1: Alta Demanda
```
Serviço: Manicure
Horário: 14:00
Capacidade: 3 vagas
```
- Até 3 clientes podem agendar manicure às 14h
- Sistema bloqueia automaticamente após 3 agendamentos

#### Exemplo 2: Serviço Exclusivo
```
Serviço: Cílios
Horário: 15:00
Capacidade: 1 vaga
```
- Apenas 1 cliente pode agendar cílios às 15h
- Tradicional agendamento individual

#### Exemplo 3: Bloqueio Total
```
Serviço: Pedicure
Horário: 10:00
Capacidade: 0 vagas
```
- Pedicure não disponível às 10h (bloqueado)
- Clientes não conseguem agendar

## 🗄️ Estrutura do Banco de Dados

### Tabela: service_capacity

```sql
CREATE TABLE service_capacity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service_name TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  capacity INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(service_name, time_slot)
)
```

### Campos

- **service_name**: Nome do serviço (manicure, pedicure, cilios, etc)
- **time_slot**: Horário (formato HH:MM, ex: 14:00)
- **capacity**: Número de vagas disponíveis (0-20)
- **created_at**: Data/hora de criação
- **updated_at**: Data/hora da última atualização

## 🔌 APIs Disponíveis

### 1. Listar Todas as Configurações
```http
GET /admin/api/service-capacity
```

**Resposta:**
```json
[
  {
    "id": 1,
    "service_name": "manicure",
    "time_slot": "14:00",
    "capacity": 3,
    "created_at": "2025-12-30 10:00:00",
    "updated_at": "2025-12-30 10:00:00"
  }
]
```

### 2. Obter Capacidade Específica
```http
GET /admin/api/service-capacity/:service/:time
```

**Exemplo:**
```http
GET /admin/api/service-capacity/manicure/14:00
```

### 3. Configurar Capacidade
```http
POST /admin/api/service-capacity
Content-Type: application/json

{
  "service_name": "manicure",
  "time_slot": "14:00",
  "capacity": 3
}
```

### 4. Configuração em Lote
```http
POST /admin/api/service-capacity/batch
Content-Type: application/json

{
  "service_name": "manicure",
  "time_slots": ["14:00", "15:00", "16:00"],
  "capacity": 3
}
```

### 5. Remover Configuração
```http
DELETE /admin/api/service-capacity/:id
```

### 6. Verificar Disponibilidade (Público)
```http
GET /api/booking/check-availability/:service/:date/:time
```

**Exemplo:**
```http
GET /api/booking/check-availability/manicure/2025-12-31/14:00
```

**Resposta:**
```json
{
  "available": true,
  "slots": 2,
  "maxCapacity": 3,
  "booked": 1,
  "message": "2 vagas disponíveis"
}
```

## 🎨 Interface do Usuário

### Dashboard Admin

1. **Modal de Gerenciamento**
   - Formulário intuitivo com dropdowns
   - Validação em tempo real
   - Feedback visual de sucesso/erro

2. **Lista de Configurações**
   - Agrupadas por serviço
   - Cores indicativas de status
   - Ações rápidas (remover)

3. **Filtros**
   - Filtre por serviço específico
   - Visualização organizada

## 🔒 Segurança

- Todas as rotas de gerenciamento requerem autenticação admin
- Middleware `checkAuth` protege endpoints sensíveis
- Validação de dados no backend
- Proteção contra valores negativos ou inválidos

## 📊 Casos de Uso Recomendados

### Salão Pequeno (1-2 profissionais)
```
Todos os serviços: 1 vaga por horário
```

### Salão Médio (3-4 profissionais)
```
Manicure/Pedicure: 2-3 vagas por horário
Cílios: 1 vaga por horário (mais demorado)
```

### Salão Grande (5+ profissionais)
```
Manicure: 4-5 vagas
Pedicure: 3-4 vagas
Cílios: 2 vagas
Horários de pico: capacidade máxima
Horários baixos: capacidade reduzida
```

## 🚀 Próximos Passos

### Já Implementado ✅
- [x] Tabela de capacidade no banco
- [x] APIs completas de gerenciamento
- [x] Interface admin completa
- [x] Validação em tempo real
- [x] Verificação ao agendar
- [x] Estilização responsiva

### Melhorias Futuras (Opcionais)
- [ ] Capacidade diferente por dia da semana
- [ ] Histórico de alterações de capacidade
- [ ] Dashboard com gráficos de ocupação
- [ ] Alertas quando horários estiverem 80% cheios
- [ ] Capacidade por profissional específico
- [ ] Exportação de relatórios

## 📱 Compatibilidade

- ✅ Desktop
- ✅ Tablet
- ✅ Mobile
- ✅ Todos os navegadores modernos

## 🐛 Tratamento de Erros

O sistema possui tratamento robusto:

1. **Banco de dados indisponível**: Usa capacidade padrão (1 vaga)
2. **Configuração não encontrada**: Assume 1 vaga
3. **Erros de rede**: Feedback claro ao usuário
4. **Validações**: Impede valores inválidos

## 💡 Dicas de Uso

1. **Configure gradualmente**: Comece com capacidades conservadoras
2. **Monitore a demanda**: Ajuste baseado em padrões reais
3. **Horários de pico**: Aumente a capacidade em horários populares
4. **Serviços demorados**: Mantenha capacidade baixa (cílios, por exemplo)
5. **Use bloqueio (0 vagas)**: Para horários de almoço ou fechamento

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs do servidor
- Consulte a documentação da API
- Teste em ambiente de desenvolvimento primeiro

---

**Desenvolvido com ❤️ para Anne Beauty Booking System**
