# PlugCondo — Documentação do Projeto
> **Status:** MVP em desenvolvimento | **Última atualização:** 2026-05-12

---

## 1. Visão Geral

**PlugCondo** é um SaaS mobile-first para gestão de recarga de veículos elétricos em condomínios residenciais no Brasil. O app resolve o caos organizacional que surge quando condomínios instalam carregadores mas não têm um sistema para reservar horários, individualizar consumo, gerenciar filas e cobrar automaticamente.

**Problema:** A Lei 18.403/2026 garantiu o direito de instalar carregadores em condomínios em São Paulo. Com 394 mil veículos plug-in circulando no Brasil, quase metade depende de recarga residencial. Condomínios instalam hardware (PowerUp, Zletric Home) mas não têm software de gestão.

**Oportunidade:** Lacuna no software de gestão. Players de hardware existem, mas o software é inexistente ou precário.

---

## 2. Modelo de Negócio

| Fonte de Receita | Descrição | Valor |
|------------------|-----------|-------|
| **SaaS mensal** | Taxa por condomínio | R$ 49–99/mês |
| **Comissão em transações** | Taxa sobre cada recarga paga via app | ~5% do valor total |
| **Parceria com instaladoras** | Indicação de hardware + comissão | A definir |

**Cálculo de cobrança por recarga:**
```
custo_total = (kWh_consumido × preco_kWh_condominio) + taxa_uso_fixa

Exemplo:
- Consumo: 15 kWh
- Preço kWh: R$ 0,80
- Taxa de uso: R$ 5,00
- Total: (15 × 0,80) + 5,00 = R$ 17,00
```

---

## 3. Stack Técnica

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| **Frontend** | React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui | Gerado pelo Lovable, código limpo, PWA-ready |
| **Roteamento** | TanStack Router | File-based routing com layouts aninhados |
| **State Management** | TanStack Query (React Query) | Server state, cache, loading states |
| **Backend/DB/Auth** | **Supabase** | Auth com roles, PostgreSQL, RLS, Realtime subscriptions, Edge Functions |
| **Pagamentos** | **Mercado Pago** | API de Pagamentos com Pix (Checkout Transparente) |
| **Notificações** | In-app (Supabase Realtime) | MVP sem dependência de Firebase FCM |
| **Deploy** | Vercel (via Lovable) | Hospedagem do frontend |
| **Bundler** | Vite v7 | Build rápido |
| **Validação** | Zod | Schemas de formulários |
| **Datas** | date-fns | Manipulação de datas/horários |
| **Animações** | Framer Motion | Micro-interactions e transições |
| **Charts** | Recharts | Dashboard do síndico |
| **Ícones** | lucide-react | Ícones consistentes |
| **Toasts** | sonner | Feedback visual |

---

## 4. Arquitetura

```
┌─────────────────────────────────────────────┐
│           MOBILE APP (PWA)                  │
│    React 19 + Tailwind + shadcn/ui          │
│                                             │
│   ┌──────────────┐   ┌──────────────┐      │
│   │ MODO MORADOR │   │ MODO SÍNDICO │      │
│   │  (5 telas)   │   │  (5 telas)   │      │
│   └──────┬───────┘   └──────┬───────┘      │
└──────────┼────────────────┼────────────────┘
           │                │
           └────────┬───────┘
                    ▼
┌─────────────────────────────────────────────┐
│           SUPABASE PLATFORM                 │
│                                             │
│  ┌─────────────┐  ┌─────────────┐           │
│  │  PostgreSQL │  │   Realtime  │           │
│  │  (Dados)    │  │  (WebSocket)│           │
│  └─────────────┘  └─────────────┘           │
│                                             │
│  ┌─────────────┐  ┌─────────────┐           │
│  │    Auth     │  │   Edge      │           │
│  │  (JWT/RLS)  │  │  Functions  │           │
│  └─────────────┘  └─────────────┘           │
└─────────────────────┬───────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Mercado    │ │  In-App    │ │  Vercel    │
│ Pago (Pix) │ │Notificações│ │  (Deploy)  │
└────────────┘ └────────────┘ └────────────┘
```

---

## 5. Banco de Dados (Schema)

### 5.1 Enums

```sql
CREATE TYPE public.user_role AS ENUM ('morador', 'sindico');
CREATE TYPE public.charger_status AS ENUM ('disponivel', 'ocupado', 'manutencao');
CREATE TYPE public.reservation_status AS ENUM ('agendada', 'ativa', 'concluida', 'cancelada');
CREATE TYPE public.payment_status AS ENUM ('pendente', 'pago', 'reembolsado');
```

### 5.2 Tabelas

#### `condominios`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Identificador único |
| nome | TEXT | Nome do condomínio |
| endereco | TEXT | Endereço completo |
| cnpj | TEXT | CNPJ |
| qtd_unidades | INT | Quantidade de unidades |
| preco_kwh | NUMERIC(10,4) | Preço do kWh (default: 0,95) |
| taxa_uso | NUMERIC(10,2) | Taxa fixa de uso (default: 5,00) |
| created_at | TIMESTAMPTZ | Data de criação |

#### `perfis`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | FK para auth.users |
| nome | TEXT | Nome completo |
| email | TEXT | Email |
| telefone | TEXT | Telefone |
| cpf | TEXT | CPF |
| avatar_url | TEXT | URL do avatar |
| role | user_role | 'morador' ou 'sindico' |
| condominio_id | UUID FK | Condomínio vinculado |
| unidade | TEXT | Apartamento (ex: "A-101") |
| veiculo_marca | TEXT | Marca do veículo |
| veiculo_modelo | TEXT | Modelo do veículo |
| veiculo_placa | TEXT | Placa do veículo |
| aprovado | BOOLEAN | Cadastro aprovado (default: true) |
| status_aprovacao | ENUM | 'pendente', 'aprovado', 'rejeitado' |
| created_at | TIMESTAMPTZ | Data de criação |

#### `carregadores`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Identificador único |
| condominio_id | UUID FK | Condomínio dono |
| nome | TEXT | Nome do carregador |
| localizacao | TEXT | Localização física |
| potencia_kw | NUMERIC(6,2) | Potência em kW (default: 7,4) |
| status | charger_status | disponivel / ocupado / manutencao |
| created_at | TIMESTAMPTZ | Data de criação |

#### `reservas`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Identificador único |
| carregador_id | UUID FK | Carregador reservado |
| perfil_id | UUID FK | Morador que reservou |
| data | DATE | Data da reserva |
| hora_inicio | TIME | Horário de início |
| hora_fim | TIME | Horário de término |
| status | reservation_status | agendada / ativa / concluida / cancelada |
| kwh_consumido | NUMERIC(10,3) | kWh realmente consumidos |
| custo_total | NUMERIC(10,2) | Valor total cobrado |
| created_at | TIMESTAMPTZ | Data de criação |

#### `fila_espera`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Identificador único |
| carregador_id | UUID FK | Carregador desejado |
| perfil_id | UUID FK | Morador na fila |
| posicao | INT | Posição na fila |
| hora_entrada | TIMESTAMPTZ | Quando entrou na fila |
| notificado | BOOLEAN | Já foi notificado? |
| created_at | TIMESTAMPTZ | Data de criação |

#### `transacoes`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Identificador único |
| reserva_id | UUID FK | Reserva vinculada |
| perfil_id | UUID FK | Morador pagante |
| valor_energia | NUMERIC(10,2) | Valor da energia consumida |
| valor_taxa | NUMERIC(10,2) | Valor da taxa de uso |
| valor_total | NUMERIC(10,2) | Valor total |
| status_pagamento | payment_status | pendente / pago / reembolsado |
| pix_txid | TEXT | ID da transação Pix |
| created_at | TIMESTAMPTZ | Data de criação |

#### `notifications` (in-app)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID PK | Identificador único |
| perfil_id | UUID FK | Destinatário |
| titulo | TEXT | Título da notificação |
| mensagem | TEXT | Corpo da mensagem |
| lida | BOOLEAN | Já foi lida? |
| tipo | TEXT | Tipo: 'fila', 'reserva', 'aprovacao', etc. |
| created_at | TIMESTAMPTZ | Data de criação |

### 5.3 Índices

```sql
CREATE INDEX idx_perfis_condominio ON public.perfis(condominio_id);
CREATE INDEX idx_carregadores_condominio ON public.carregadores(condominio_id);
CREATE INDEX idx_reservas_perfil ON public.reservas(perfil_id);
CREATE INDEX idx_reservas_carregador_data ON public.reservas(carregador_id, data);
CREATE INDEX idx_fila_carregador ON public.fila_espera(carregador_id);
CREATE INDEX idx_transacoes_perfil ON public.transacoes(perfil_id);
```

### 5.4 RLS Policies (Row Level Security)

| Tabela | Política | Regra |
|--------|----------|-------|
| condominios | auth read | Qualquer autenticado pode ler (para signup) |
| condominios | sindico update | Só síndico do próprio condomínio pode editar |
| perfis | read | Próprio perfil OU síndico do mesmo condomínio |
| perfis | insert | Apenas próprio perfil |
| perfis | update | Próprio perfil OU síndico do mesmo condomínio |
| carregadores | read | Apenas do mesmo condomínio |
| carregadores | manage | Só síndico do mesmo condomínio |
| reservas | read | Própria reserva OU síndico do condomínio |
| reservas | create | Apenas próprio perfil |
| reservas | update/delete | Próprio perfil OU síndico |
| fila_espera | read | Do mesmo condomínio |
| fila_espera | join | Apenas próprio perfil |
| fila_espera | leave | Próprio perfil OU síndico |
| transacoes | read | Própria transação OU síndico |
| transacoes | create | Apenas próprio perfil |
| notifications | read | Apenas próprias notificações |

### 5.5 Triggers

#### Auto-criação de perfil no cadastro
```sql
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE default_condo UUID;
BEGIN
  SELECT id INTO default_condo FROM public.condominios ORDER BY created_at LIMIT 1;
  INSERT INTO public.perfis (id, nome, email, telefone, cpf, role, condominio_id, unidade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cpf',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'morador'),
    default_condo,
    NEW.raw_user_meta_data->>'unidade'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### Triggers de notificações in-app
- Quando `perfis.status_aprovacao` muda para 'aprovado' → notificação de boas-vindas
- Quando `reservas.status` muda para 'ativa' → notificação de confirmação
- Quando `reservas.status` muda para 'concluida' → notificação com valor total
- Quando `fila_espera.notificado` muda para true → notificação de vez na fila

### 5.6 Realtime

Tabelas habilitadas para atualizações em tempo real:
- `carregadores` — status muda em tempo real
- `fila_espera` — posição na fila atualiza ao vivo
- `reservas` — novas reservas aparecem instantaneamente
- `notifications` — notificações chegam em tempo real

---

## 6. Telas e Fluxos

### 6.1 Fluxo de Entrada

```
[ / ] Landing
    ├── "Sou Morador" → /register (role=morador)
    ├── "Sou Síndico" → /register (role=sindico)
    ├── Login → /login
    └── Cadastro → /register

[ após login ] _authenticated.tsx
    ├── status_aprovacao = 'aprovado' → rotas normais
    ├── status_aprovacao = 'pendente' → /pendente (tela de análise)
    └── status_aprovacao = 'rejeitado' → /pendente (motivo + contato síndico)
```

### 6.2 MODO MORADOR (5 telas)

| Rota | Nome | Funcionalidade |
|------|------|----------------|
| `/morador/home` | Home | Saudação, próxima reserva, status dos carregadores, atalhos rápidos |
| `/morador/reservar` | Reservar | Passo a passo: data → horário → carregador → resumo → Pix |
| `/morador/reservas` | Minhas Reservas | Lista de futuras e passadas, cancelamento |
| `/morador/fila` | Fila de Espera | Entrar/sair da fila, ver posição em tempo real |
| `/morador/perfil` | Perfil | Dados pessoais, veículo, histórico de pagamentos, configurações |

**Bottom Navigation do Morador:**
- 🏠 Home | 📅 Reservar | 📋 Minhas Reservas | ⏳ Fila | 👤 Perfil

### 6.3 MODO SÍNDICO (5 telas)

| Rota | Nome | Funcionalidade |
|------|------|----------------|
| `/sindico/dashboard` | Dashboard | Cards: receita, kWh, ocupação, alertas |
| `/sindico/carregadores` | Carregadores | CRUD de carregadores, status, manutenção |
| `/sindico/moradores` | Moradores | Aprovar/rejeitar cadastros, lista de moradores |
| `/sindico/reservas` | Reservas | Todas as reservas do condomínio, cancelar |
| `/sindico/financeiro` | Financeiro | Receitas, transações, resumo por período |

**Bottom Navigation do Síndico:**
- 📊 Dashboard | 🔌 Carregadores | 👥 Moradores | 📅 Reservas | 💰 Financeiro

### 6.4 Telas Compartilhadas

| Rota | Descrição |
|------|-----------|
| `/login` | Login com email/senha |
| `/register` | Cadastro com dados pessoais, veículo e escolha de role |
| `/notificacoes` | Lista de notificações in-app com filtros "Todas"/"Não lidas", ícones por tipo, pull-to-refresh |
| `/pendente` | Tela de espera de aprovação (status: pendente/rejeitado) |

---

## 7. Regras de Negócio

### 7.1 Reservas
- **Máximo 2 reservas futuras** ativas por morador
- **Duração padrão:** 2 horas (configurável pelo síndico)
- **Grace period:** 15 minutos de tolerância no início. Se não iniciar, reserva é cancelada automaticamente
- **Horário de funcionamento:** Configurável (default: 07:00–23:00)
- **Reserva só é confirmada após pagamento do Pix**

### 7.2 Fila Inteligente
1. Morador entra na fila de um carregador ocupado
2. Quando carregador libera (reserva termina ou é cancelada):
   a. Verifica se há alguém na `fila_espera`
   b. Notifica o 1º da fila (notificação in-app + badge)
   c. Dá 10 minutos para confirmar que vai usar
   d. Se confirmar → cria reserva automática de 1 hora
   e. Se não confirmar → remove da fila e passa para o próximo
3. Posição na fila atualizada em tempo real via Supabase Realtime

### 7.3 Cobrança
```
custo_total = (kWh_consumido × preco_kWh_condominio) + taxa_uso_fixa

Exemplo:
- 15 kWh × R$ 0,80 = R$ 12,00
- Taxa de uso = R$ 5,00
- Total = R$ 17,00
```

### 7.4 Cancelamento
- Morador pode cancelar reserva futura
- Política de reembolso: a definir (parcial/total)
- Síndico pode cancelar qualquer reserva com motivo

---

## 8. Pagamentos (Mercado Pago)

### 8.1 Configuração

| Variável | Valor |
|----------|-------|
| `MERCADO_PAGO_ACCESS_TOKEN` | `TEST-4082543166993492-051119-f4a62f00949adb8529105887aab4a9fe-3395952518` |
| `MERCADO_PAGO_PUBLIC_KEY` | `TEST-72ce1179-432d-4077-9a3b-d95eda652aa2` |
| `MERCADO_PAGO_WEBHOOK_SECRET` | *(a configurar)* |

### 8.2 Fluxo de Pagamento

```
1. Morador confirma reserva
2. Frontend chama Edge Function: create-pix-payment
3. Edge Function chama Mercado Pago API (POST /v1/payments)
4. Mercado Pago retorna: QR Code + código copia-e-cola
5. Frontend exibe QR e código com contador regressivo
6. Morador paga via app do banco
7. Mercado Pago envia webhook para /functions/v1/mercado-pago-webhook
8. Edge Function processa webhook:
   - Atualiza transacao.status_pagamento = 'pago'
   - Atualiza reserva.status = 'ativa'
   - Atualiza carregador.status = 'ocupado'
   - Cria notificação in-app: "Pagamento confirmado!"
9. Se expirar: transacao.status = 'cancelado', reserva cancelada
```

### 8.3 Modo Sandbox
- Pagamentos são simulados no ambiente de teste
- Para simular pagamento aprovado: usar API de testes do Mercado Pago
- Não envolve dinheiro real durante desenvolvimento

---

## 9. Notificações (In-App)

### 9.1 Decisão de Arquitetura

**Escolha:** Notificações in-app (sem Firebase FCM no MVP)

**Motivo:**
- Funciona 100% no preview do Lovable
- Sem dependência de secrets do Firebase
- Sem Service Worker complexo
- MVP testável imediatamente
- Fácil evoluir para FCM push depois

**Limitação:** Não notifica quando o app está fechado (aceitável para MVP)

### 9.2 Eventos que Geram Notificações

| Evento | Título | Mensagem | Destinatário |
|--------|--------|----------|--------------|
| Cadastro aprovado | Bem-vindo ao PlugCondo! | Seu cadastro foi aprovado pelo síndico. | Morador |
| Reserva confirmada | Reserva confirmada | Sua reserva para o Carregador X foi confirmada. | Morador |
| Reserva ativa | Hora de recarregar! | Sua reserva começou. Dirija-se ao Carregador X. | Morador |
| Reserva concluída | Recarga finalizada | Você consumiu X kWh. Total: R$ XX,XX | Morador |
| Vez na fila | Sua vez chegou! | O Carregador X está liberado. Você tem 10 minutos. | Morador |
| Novo morador pendente | Novo morador | [Nome] solicitou acesso ao condomínio. | Síndico |
| Manutenção agendada | Manutenção | O Carregador X será desligado para manutenção. | Todos |

### 9.3 UI de Notificações
- **Ícone de sino** no header com badge vermelho mostrando contagem de não lidas
- **Página `/notificacoes`** com lista cronológica
- **Filtros:** Abas "Todas" e "Não lidas" com contagem
- **Ícones por tipo:** Clock (fila), Zap (reserva), CheckCircle (aprovacao)
- **Pull-to-refresh:** Atualiza lista ao arrastar para baixo
- **Indicador não lida:** Borda azul à esquerda, opacity reduzido para lidas
- **Realtime:** novas notificações aparecem instantaneamente
- **Marcar como lida:** ao clicar na notificação

---

## 10. Edge Functions (Supabase)

### 10.1 Edge Functions Implementadas

| Function | Descrição | Gatilho | Status |
|----------|-----------|---------|--------|
| `create-pix-payment` | Gera QR Code Pix via Mercado Pago, valida reserva do usuário | Chamada pelo frontend | ✅ Implementada |
| `mercado-pago-webhook` | Recebe webhooks do Mercado Pago, atualiza status reserva/carregador, cria notificação, processa fila | Endpoint HTTP | ✅ Implementada |
| `process-queue` | Notifica primeiro da fila quando carregador libera, atualiza posições | Trigger DB / Cron | ✅ Implementada |
| `calculate-reservation-cost` | Calcula custo baseado em kWh consumido (ou estimation), atualiza reserva e transação | Trigger DB | ✅ Implementada |
| `check-reservation-grace-period` | Cancela reservas não iniciadas após 15 min, processa fila, cria notificação | Cron (a cada 5 min) | ✅ Implementada |

### 10.2 Cron Jobs

```sql
-- Verificar grace period a cada 5 minutos
SELECT cron.schedule('check-grace-period', '*/5 * * * *', 
  'SELECT check_reservation_grace_period()');
```

---

## 11. Seed de Dados (Demo)

```sql
-- Condomínio demo
INSERT INTO public.condominios (id, nome, endereco, cnpj, qtd_unidades, preco_kwh, taxa_uso)
VALUES ('11111111-1111-1111-1111-111111111111', 'Edifício Vista Verde', 
        'Av. Paulista, 1500 - São Paulo, SP', '12.345.678/0001-90', 48, 0.95, 5.00);

-- Carregadores demo
INSERT INTO public.carregadores (condominio_id, nome, localizacao, potencia_kw, status) VALUES
('11111111-1111-1111-1111-111111111111', 'Carregador A1', 'Garagem -1, Vaga 12', 7.4, 'disponivel'),
('11111111-1111-1111-1111-111111111111', 'Carregador A2', 'Garagem -1, Vaga 13', 7.4, 'ocupado'),
('11111111-1111-1111-1111-111111111111', 'Carregador B1', 'Garagem -2, Vaga 28', 11.0, 'disponivel'),
('11111111-1111-1111-1111-111111111111', 'Carregador B2', 'Garagem -2, Vaga 29', 22.0, 'manutencao');
```

---

## 12. Roadmap

### ✅ Fase 1 — MVP (Concluído / Em andamento)
- [x] Tela de escolha de persona (Morador/Síndico)
- [x] Auth (cadastro/login) com Supabase
- [x] Banco de dados completo com RLS
- [x] Home do morador
- [x] Fluxo de reserva com calendário e horários
- [x] Fila de espera com posição em tempo real
- [x] Dashboard do síndico
- [x] CRUD de carregadores
- [x] Lista de moradores e reservas
- [x] Financeiro (resumo básico)
- [x] Notificações in-app
- [x] Perfil do morador

### 🔄 Fase 2 — Pagamentos & Automação (Concluído)
- [x] Integração Mercado Pago (Pix real)
- [x] Edge Function: create-pix-payment
- [x] Webhook: mercado-pago-webhook
- [x] Cálculo automático de custo (calculate-reservation-cost)
- [x] Grace period automático (check-reservation-grace-period)
- [ ] Limite de 2 reservas futuras

### 🔄 Fase 3 — Fila Inteligente (Concluído)
- [x] Edge Function: process-queue
- [x] Notificação automática quando carregador libera
- [x] Confirmação de 10 minutos na fila
- [x] Reordenação automática da fila

### 📋 Fase 4 — Gestão Avançada (Em desenvolvimento)
- [x] Aprovação de moradores (workflow completo - página pendente.tsx)
- [ ] Configurações do condomínio (preço kWh, taxa, horários)
- [ ] Exportação CSV/PDF de relatórios
- [ ] Gráficos no dashboard (Recharts)
- [ ] Calendário visual para síndico
- [ ] Política de cancelamento e reembolso

### 📋 Fase 5 — Escala (Futuro)
- [ ] Firebase Cloud Messaging (push real)
- [ ] Múltiplos veículos por morador
- [ ] Integração com hardware de medição (kWh real)
- [ ] Sistema de crédito pré-pago
- [ ] White-label para instaladoras
- [ ] App nativo (React Native / Capacitor)

---

## 13. Repositório

- **GitHub:** [github.com/juhsuedde/plug-condo](https://github.com/juhsuedde/plug-condo)
- **Plataforma:** Lovable (lovable.dev)
- **Deploy:** Vercel

---

## 14. Variáveis de Ambiente

```env
# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
SUPABASE_SERVICE_ROLE_KEY=xxxx

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=TEST-4082543166993492-051119-f4a62f00949adb8529105887aab4a9fe-3395952518
MERCADO_PAGO_PUBLIC_KEY=TEST-72ce1179-432d-4077-9a3b-d95eda652aa2
MERCADO_PAGO_WEBHOOK_SECRET=xxxx
```

---

## 15. Design System

| Elemento | Especificação |
|----------|--------------|
| **Cores primárias** | Deep teal (#0D9488), warm coral (#F97316) |
| **Backgrounds** | Soft gray (#F8FAFC, #F1F5F9), cards white |
| **Border radius** | 16px cards, 24px bottom sheets, 9999px pills |
| **Tipografia** | Inter, bold headlines 24-32px, body 14-16px |
| **Sombras** | Soft drop shadows (0 4px 20px rgba(0,0,0,0.06)) |
| **Bottom nav** | 4-5 itens, active state com pill background |
| **Mobile-first** | Max-width 430px, touch-friendly (min 48px) |

---

*Documento gerado em 2026-05-12. PlugCondo — Charge smart. Live better.*
