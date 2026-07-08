# ATSeller

Plataforma SaaS multi-tenant de vendas automatizadas por agentes de IA via WhatsApp.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Flow Builder | @xyflow/react |
| Backend | Node.js + Express |
| Banco de dados | PostgreSQL (Docker) |
| Auth | JWT (access token + refresh token httpOnly cookie) |
| WhatsApp | UazAPI |
| IA / Agentes | OpenAI GPT-4o |
| Embeddings (RAG) | OpenAI text-embedding-3-small |

## Pré-requisitos

- Node.js 20+
- Docker Desktop com integração WSL2 ativada
- Conta OpenAI com créditos
- Instância UazAPI (cloud ou self-hosted)

## Setup

### 1. Clone e instale dependências

```bash
git clone <repo>
cd atseller
npm install          # instala dependências raiz (orchestration scripts)
npm run install:all  # instala backend + frontend
```

### 2. Configure variáveis de ambiente

```bash
cp backend/.env.example backend/.env
# Edite backend/.env com suas credenciais
```

Variáveis obrigatórias para funcionar:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL (padrão: `postgresql://atseller:atseller123@localhost:5433/atseller`) |
| `JWT_SECRET` | String aleatória longa para assinar tokens |
| `JWT_REFRESH_SECRET` | String aleatória longa para refresh tokens |
| `OPENAI_API_KEY` | Chave da API OpenAI (GPT-4o + embeddings) |
| `UAZAPI_BASE_URL` | URL da instância UazAPI |
| `UAZAPI_API_KEY` | Chave de API UazAPI |
| `WEBHOOK_BASE_URL` | URL pública do backend (necessária para webhooks WhatsApp) |

> **Dica:** em desenvolvimento, use [ngrok](https://ngrok.com) para expor o backend:
> `ngrok http 3001` → copie a URL HTTPS para `WEBHOOK_BASE_URL`

### 3. Suba a infraestrutura

```bash
docker compose up -d   # PostgreSQL na porta 5433
```

### 4. Execute as migrations

```bash
npm run db:migrate
```

### 5. Popule com dados de demonstração (opcional)

```bash
npm run db:seed
```

Cria a empresa **Vision Motors** com dados realistas: 3 agentes configurados, fluxo ativo, 100 leads e 60 conversas com 500+ mensagens.

Credenciais após o seed:

| Usuário | Senha | Role |
|---|---|---|
| admin@atseller.io | Admin@123 | Platform Admin |
| gestor@visionmotors.com.br | Gestor@123 | Gestor |
| op1@visionmotors.com.br | Operador@123 | Operador |
| op2@visionmotors.com.br | Operador@123 | Operador |

### 6. Inicie o servidor de desenvolvimento

```bash
npm run dev          # backend (porta 3001) + frontend (porta 5173) simultaneamente
```

Acesse: [http://localhost:5173](http://localhost:5173)

## Scripts disponíveis

```bash
npm run dev            # inicia backend + frontend em modo desenvolvimento
npm run dev:backend    # só o backend (porta 3001)
npm run dev:frontend   # só o frontend (porta 5173)
npm run db:migrate     # executa migrations do banco
npm run db:seed        # popula com dados Vision Motors
npm run db:seed-admin  # cria apenas o admin da plataforma
```

## Estrutura do projeto

```
atseller/
├── backend/
│   ├── src/
│   │   ├── controllers/   # lógica de negócio por recurso
│   │   ├── database/      # migrate.js, seed.js, connection.js
│   │   ├── engine/        # motor de fluxos (flowRunner, agentRunner, toolRunner)
│   │   ├── middleware/     # auth JWT, RBAC, auditoria
│   │   ├── routes/        # Express routers
│   │   └── services/      # uazapi, sseManager, messageQueue, embeddings
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/    # UI primitivos (Button, Badge, Modal, EmptyState...)
│       ├── contexts/      # AuthContext
│       ├── hooks/         # useAgents, useConversations, useLeads, useWhatsApp...
│       ├── layouts/       # AppLayout (sidebar + topbar)
│       └── pages/         # uma página por rota
├── docker-compose.yml
└── package.json           # scripts de orquestração
```

## Funcionalidades

- **Auth** — Login com JWT, refresh token httpOnly, recuperação de senha
- **Multi-tenancy** — Isolamento completo por empresa em todas as queries
- **RBAC** — 3 roles: `platform_admin`, `gestor`, `operador`
- **WhatsApp** — Conexão via UazAPI com QR Code, status em tempo real via SSE
- **Agentes de IA** — GPT-4o com RAG (base de conhecimento), delay humanizado, 6 ferramentas
- **Flow Builder** — Canvas visual com @xyflow/react para construir fluxos de atendimento
- **Conversas** — CRM de atendimento com handoff humano ↔ IA em tempo real
- **CRM** — Pipeline Kanban com drag-and-drop, 6 estágios, leads criados automaticamente pelos agentes
- **Dashboard** — 8 métricas com delta, 4 gráficos Recharts, seletor de período, auto-refresh
- **Seed** — Dados de demo "Vision Motors" prontos para apresentação

## Notas de segurança

- Todos os endpoints autenticados requerem JWT válido no header `Authorization: Bearer <token>`
- O `company_id` é sempre extraído do token — nunca do body da requisição
- Uploads de documentos limitados a 20MB, tipos: PDF, DOCX, TXT
- Confirmação explícita antes de todas as ações destrutivas
