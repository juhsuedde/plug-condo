  <h1>PlugCondo</h1>
  <p>Gestão inteligente de recarga de veículos elétricos para condomínios</p>
</div>

## Sobre

O **PlugCondo** é um SaaS mobile-first que resolve o caos organizacional de condomínios que instalaram carregadores para veículos elétricos, mas não têm um sistema para gerenciar reservas, individualizar consumo, administrar filas e cobrar automaticamente.

Com o crescimento acelerado de veículos plug-in no Brasil (~394 mil unidades) e leis como a **Lei 18.403/2026 de São Paulo** que garante o direito de instalação, os condomínios precisam de software — não apenas de hardware.

**Modelo de negócio:** SaaS mensal (R\$ 49–99/mês por condomínio) + comissão ~5% sobre recargas.

## Funcionalidades

### Morador
- **Reservas** — Agende horários de recarga em slots de 30 min com calendário visual
- **Pagamento via Pix** — QR Code gerado automaticamente pelo Mercado Pago
- **Fila de espera** — Entre na fila quando não há vagas e seja notificado automaticamente
- **Histórico** — Acompanhe suas reservas, consumo em kWh e gastos
- **Perfil** — Gerencie veículo, dados pessoais e forma de pagamento

### Síndico / Administrador
- **Dashboard** — Receita, kWh consumido, reservas do dia, fila, gráfico 7 dias
- **CRUD de carregadores** — Adicione, edite e monitore pontos de recarga
- **Aprovação de moradores** — Fluxo de aprovação/rejeição com motivo
- **Gestão de reservas** — Calendário 14 dias com visão completa do condomínio
- **Financeiro** — Receita semanal/mensal/anual, conciliação, exportação CSV, repasse
- **Monitor de energia** — Consumo em tempo real por ponto de recarga
- **Compliance** — Score SAVE + checklist Lei 18.403/2026
- **Configurações** — Tarifas, horários de funcionamento, regras de reserva
- **Onboarding** — Wizard de 5 passos para configuração inicial

### Geral
- Notificações em tempo real com filtros e pull-to-refresh
- Autenticação com Supabase + JWT
- Controle de acesso por papel (morador / síndico)
- Status de aprovação pendente

## Tech Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Framework** | React + TypeScript | 19.2 |
| **Bundler** | Vite | 7.3 |
| **Roteamento** | TanStack Router | 1.168 |
| **SSR/Backend** | TanStack Start | 1.167 |
| **Serverless** | Nitro | 3.0 (beta) |
| **State** | TanStack Query | 5.83 |
| **Estilos** | Tailwind CSS v4 + shadcn/ui + Radix UI | — |
| **Banco / Auth** | Supabase (PostgreSQL + RLS + Realtime) | — |
| **Pagamentos** | Mercado Pago (Pix) | — |
| **Edge Functions** | Deno (esm.sh) | — |
| **Validação** | Zod + react-hook-form | — |
| **Datas** | date-fns | 4.1 |
| **Animação** | Framer Motion | 12.38 |
| **Gráficos** | Recharts | 2.15 |
| **Ícones** | lucide-react | 0.575 |
| **Deploy** | Vercel (TanStack Start preset) | — |

## Primeiros Passos

### Pré-requisitos

- Node.js 22+
- npm
- Conta no [Supabase](https://supabase.com)
- Conta no [Mercado Pago](https://www.mercadopago.com.br)
- Conta na [Vercel](https://vercel.com) (para deploy)

### Variáveis de Ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env
```

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publicável do Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (apenas server-side) |
| `MERCADO_PAGO_ACCESS_TOKEN` | Access token do Mercado Pago |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Secret para validação de webhooks |

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento (porta 3000) |
| `npm run build` | Build de produção (Nitro para Vercel) |
| `npm run build:dev` | Build em modo desenvolvimento |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Executa ESLint |
| `npm run format` | Formata código com Prettier |

## Estrutura do Projeto

```
plug-condo/
├── src/
│   ├── router.tsx                     # Configuração TanStack Router
│   ├── start.ts                       # Instância TanStack Start
│   ├── server.ts                      # Entry point SSR
│   ├── routes/
│   │   ├── index.tsx                  # Landing page
│   │   ├── login.tsx                  # Login
│   │   ├── register.tsx              # Cadastro
│   │   ├── __root.tsx                # Root shell
│   │   ├── _authenticated.tsx        # Auth gate
│   │   └── _authenticated/
│   │       ├── pendente.tsx           # Tela de aprovação pendente
│   │       ├── notificacoes.tsx       # Notificações
│   │       ├── morador/              # Rotas do morador (5 telas)
│   │       └── sindico/              # Rotas do síndico (9 telas)
│   ├── components/
│   │   ├── ui/                        # 46 componentes shadcn/ui
│   │   ├── MobileFrame.tsx            # Frame mobile-first (max 430px)
│   │   ├── BottomNav.tsx              # Navegação inferior
│   │   └── ...
│   ├── lib/
│   │   ├── auth.tsx                   # Contexto de autenticação
│   │   ├── format.ts                  # Utilitários de formatação (BRL, kWh)
│   │   └── utils.ts                   # Utilitários gerais
│   ├── integrations/supabase/         # Clientes Supabase (browser + server)
│   └── hooks/
├── supabase/
│   ├── config.toml                    # Configuração do projeto Supabase
│   ├── migrations/                    # Migrações SQL
│   ├── seed-demo.sql                 # Dados de demonstração
│   └── functions/                     # Edge Functions em Deno
│       ├── create-pix-payment/        # Gera QR Code Pix
│       ├── mercado-pago-webhook/      # Webhook de pagamentos
│       ├── process-queue/             # Notifica próximo da fila
│       ├── calculate-reservation-cost/ # Calcula custo kWh
│       ├── check-reservation-grace-period/ # Grace period 15 min
│       └── confirm-queue-reservation/  # Confirma reserva da fila
├── vite.config.ts                     # Configuração Vite
├── vercel.json                        # Configuração Vercel
├── wrangler.jsonc                     # Configuração Cloudflare
└── package.json
```

## Edge Functions

Todas as funções em `supabase/functions/*/index.ts` rodam em **Deno** (não Node.js).

| Função | Autenticação | Propósito |
|--------|-------------|-----------|
| `create-pix-payment` | JWT | Gera QR Code Pix via Mercado Pago |
| `mercado-pago-webhook` | Pública | Recebe webhooks de pagamento |
| `process-queue` | Pública | Notifica próximo da fila |
| `calculate-reservation-cost` | Pública | Calcula custo kWh consumido |
| `check-reservation-grace-period` | Pública | Cancela reservas não iniciadas em 15 min |
| `confirm-queue-reservation` | JWT | Confirma reserva da fila |

Segredos necessários no Supabase Dashboard (Edge Functions → Secrets):
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`

## Deploy

### Vercel

1. Conecte o repositório na [Vercel](https://vercel.com)
2. O `vercel.json` já define `"framework": "tanstack-start"`
3. Adicione todas as variáveis de ambiente em **Settings → Environment Variables**
4. Faça deploy

## Arquitetura

```
Browser ──▶ TanStack Start (SSR) ──▶ Supabase (DB + Auth + Realtime)
                │
                └── Nitro (Serverless) ──▶ Edge Functions (Deno)
                                               │
                                               └── Mercado Pago API (Pix)
```

- **Autenticação:** Supabase Auth com JWT. Middleware extrai token em SSR e anexa em chamadas client-side.
- **Autorização:** RLS no PostgreSQL por papel (`user_role: morador | sindico`).
- **Tempo real:** Supabase Realtime para notificações, status de carregadores e fila.
- **Pagamentos:** Fluxo completo Pix com webhook HMAC e tratamento de grace period.

## Licença

MIT
