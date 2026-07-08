# ATSeller — Plano de Desenvolvimento

Plataforma SaaS multi-tenant de vendas automatizadas por agentes de IA via WhatsApp.

---

## Stack Definido

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite (JS), Tailwind CSS, shadcn/ui |
| Flow Builder | @xyflow/react (React Flow) |
| Backend | Node.js + Express (JS) |
| Banco de Dados | PostgreSQL (Docker) |
| Auth | JWT (access token + refresh token em httpOnly cookie) |
| WhatsApp | UazAPI (webhooks) |
| IA / Agentes | OpenAI GPT-4o |
| Embeddings (RAG) | OpenAI text-embedding-3-small |
| Infra local | Docker Compose |

Estrutura de pastas seguindo o padrão `cria` / `map-creator`:
```
atseller/
├── backend/          # Node.js + Express
├── frontend/         # React + Vite
├── docker-compose.yml
└── package.json      # scripts de orquestração
```

---

## Fase 1 — Fundação do Projeto ✅

**Objetivo:** projeto rodando localmente com autenticação e estrutura base.

### Backend
- [x] Scaffold Express + estrutura de pastas (`routes/`, `controllers/`, `middleware/`, `database/`)
- [x] Docker Compose: PostgreSQL (porta 5433 para não conflitar)
- [x] Migration inicial: tabelas `companies`, `users`, `refresh_tokens`, `audit_logs`
- [x] JWT middleware (access token 15min + refresh token 7d em cookie httpOnly)
- [x] Endpoints de auth: `POST /auth/login`, `POST /auth/logout`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`
- [x] Middleware de multi-tenancy: extrair `company_id` do usuário autenticado e injetar em todas as queries
- [x] Middleware RBAC: validar role (`platform_admin`, `gestor`, `operador`) por rota
- [x] Auditoria automática de login/logout

### Frontend
- [x] Scaffold React + Vite + Tailwind CSS
- [x] Configuração de rotas (React Router v6)
- [x] Contexto de autenticação (`AuthContext`) com persistência de sessão
- [x] Tela de login (paleta: vermelho + branco + tons neutros)
- [x] Tela de recuperação de senha
- [x] Tela de alteração de senha
- [x] Layout base autenticado (sidebar colapsável + topbar)
- [x] Redirecionamento por role após login
- [x] Guards de rota (`ProtectedRoute` + `PublicRoute`)

### Critério de conclusão
Login funciona, sessão persiste após reload, logout limpa tokens.

> ⚠️ **Para rodar localmente:** ativar a integração WSL2 no Docker Desktop (Settings → Resources → WSL Integration → ativar sua distro Ubuntu). Após isso: `docker compose up -d && npm run db:migrate`.

---

## Fase 2 — Gestão de Empresas e Controle de Acesso ✅

**Objetivo:** admin da plataforma pode gerenciar empresas; roles funcionam corretamente.

### Backend
- [x] Schema de `companies` já criado na Fase 1 (name, slug, status, settings, blocked_at)
- [x] CRUD de empresas — `GET/POST /admin/companies`, `PUT/PATCH /admin/companies/:id`
- [x] Endpoint `POST /admin/impersonate/:userId` (gera tokens para assumir identidade)
- [x] CRUD de usuários — `GET/POST/PUT /api/users`, `PATCH /api/users/:id/reset-password`
- [x] Seed do admin da plataforma (`npm run db:seed-admin`)
- [x] Registro de auditoria em todas as ações de criação/edição

### Frontend
- [x] Tela de listagem de empresas com busca, status badge, bloquear/reativar
- [x] Modal de criação/edição de empresa com auto-geração de slug
- [x] Tela de listagem de usuários com busca, roles, status
- [x] Modal de criação/edição de usuário + modal de redefinição de senha
- [x] Tela de auditoria com filtro por ação e paginação
- [x] Tela de Configurações (gestor) com aba de usuários
- [x] Guards de rota por role já implementados na Fase 1

### Critério de conclusão
Admin cria empresa, cria usuários, cada usuário vê apenas dados da própria empresa.

---

## Fase 3 — Integração WhatsApp (UazAPI) ✅

**Objetivo:** empresa conecta WhatsApp via QR Code e recebe mensagens.

### Backend
- [x] Migration: tabelas `whatsapp_connections` e `whatsapp_messages_queue`
- [x] `src/services/uazapi.js` — wrapper UazAPI: createInstance, getQRCode, getConnectionState, logout, delete, sendText, sendTyping
- [x] `GET /api/whatsapp/status` — retorna status atual da empresa
- [x] `GET /api/whatsapp/qr` — busca QR Code atual na UazAPI
- [x] `POST /api/whatsapp/connect` — cria instância e inicia conexão
- [x] `POST /api/whatsapp/disconnect` — desconecta e limpa estado
- [x] `POST /api/whatsapp/reconnect` — reset + nova tentativa de conexão
- [x] `GET /api/whatsapp/events` — SSE em tempo real (status + QR + mensagens)
- [x] `POST /webhooks/whatsapp` — processa eventos: CONNECTION_UPDATE, QRCODE_UPDATED, MESSAGES_UPSERT
- [x] `src/services/messageQueue.js` — fila em memória com persistência em tabela + EventEmitter para Fase 5
- [x] `src/services/sseManager.js` — gerencia streams SSE por empresa

### Frontend
- [x] `WhatsAppPage.jsx` — tela completa com QR Code, status badge animado, ações
- [x] `hooks/useWhatsApp.js` — hook com SSE (Fetch API + ReadableStream), polling de QR, reconexão automática
- [x] Badge de status: Conectado (verde) / Desconectado (cinza) / Conectando (amarelo pulsando) / Erro (vermelho)
- [x] Painel de monitoramento: número, último heartbeat, mensagens recebidas/enviadas, nome da instância
- [x] Instruções passo a passo para conectar
- [x] Reconexão automática do SSE em caso de queda

### Critério de conclusão
QR Code aparece, WhatsApp conecta, mensagem enviada para o número aparece no log de webhook.

> ⚠️ **Em desenvolvimento local:** configure `WEBHOOK_BASE_URL` com uma URL pública (ngrok/cloudflare tunnel) para a UazAPI conseguir entregar os webhooks. Para testar sem webhook, use `GET /api/whatsapp/qr` manualmente após iniciar a conexão.

---

## Fase 4 — Gestão de Agentes ✅

**Objetivo:** criar, configurar e gerenciar agentes de IA com base de conhecimento.

### Backend
- [x] Migration: tabelas `agents`, `knowledge_base_documents`, `knowledge_base_chunks`
- [x] CRUD de agentes — `GET/POST/PUT/DELETE /api/agents`
- [x] Pipeline de ingestão de conhecimento (processamento assíncrono com `setImmediate`):
  - [x] PDF → `pdf-parse`
  - [x] DOCX → `mammoth`
  - [x] TXT → leitura direta do buffer
  - [x] URL → `https.get` + `cheerio` para extração de texto
  - [x] Texto manual → direto
- [x] Chunking inteligente: 1500 chars com 200 de overlap, quebra em limite de frase
- [x] Embeddings via OpenAI `text-embedding-3-small` em batches de 100
- [x] Armazenamento como JSONB + busca cosseno em JavaScript (MVP; pgvector para produção)
- [x] `POST /api/agents/:id/search` — endpoint de busca semântica (usado pelo engine na Fase 5)
- [x] `GET /api/agents/tools` — lista 7 ferramentas disponíveis
- [x] Upload via `multer` (memoryStorage, 20MB, aceita PDF/DOCX/TXT)

### Frontend
- [x] `AgentsPage.jsx` — listagem em grid com cards (personalidade, delay, docs, chunks, ferramentas)
- [x] `AgentFormPage.jsx` — formulário multi-abas:
  - [x] Aba "Dados Básicos" — nome, descrição, objetivo + seletor visual de personalidade (5 opções com emoji)
  - [x] Aba "Comportamento" — sliders de delay min/max, contexto (textarea), critério de sucesso
  - [x] Aba "Conhecimento" — upload drag-and-drop, URL, texto manual + lista de documentos com badges de status
  - [x] Aba "Ferramentas" — toggle de 7 ferramentas com descrição
- [x] Polling automático a cada 3s para documentos com status 'processing'
- [x] `hooks/useAgents.js` — useAgents, useAgent, useAvailableTools

### Critério de conclusão
Agente criado com PDF enviado, chunks indexados, busca semântica retorna trechos relevantes.

---

## Fase 5 — Runtime dos Agentes e Motor de Fluxos ✅

**Objetivo:** agente responde mensagens do WhatsApp seguindo um fluxo configurado.

### Backend
- [x] Migration: tabelas `flows`, `leads`, `conversations`, `messages`
- [x] Motor de execução de fluxos (`src/engine/`):
  - `engine/index.js` — ouve EventEmitter do messageQueue, despacha para flowRunner
  - `engine/flowRunner.js` — identifica conversa, percorre nós, gerencia estado (`current_node_id`)
  - Tipos de nó implementados: `whatsapp_input`, `ai_agent`, `condition`, `human_transfer`, `action`, `end`
- [x] Runtime do agente IA (`engine/agentRunner.js`):
  - RAG: busca chunks do agente, gera embedding da mensagem, cosine similarity em JS, top-4 injetados no prompt
  - System prompt dinâmico (personalidade + contexto + objetivo + critério de sucesso + RAG)
  - GPT-4o com function calling e delay aleatório (delay_min → delay_max segundos)
  - Segunda chamada após ferramentas para formular resposta natural
  - `evaluateCondition()` — avalia condições de nó via GPT-4o-mini (YES/NO)
- [x] `engine/toolRunner.js` — 6 ferramentas: create_lead, update_lead, send_proposal, schedule_meeting, transfer_to_human, close_conversation
- [x] Gerenciador de conversas: cria conversa na primeira mensagem, associa ao fluxo ativo da empresa
- [x] CRUD de fluxos: `GET/POST/PUT/DELETE /api/flows`, `PATCH /api/flows/:id/toggle-active`
- [x] Apenas 1 fluxo ativo por empresa (toggle-active desativa todos os outros)
- [x] `services/whatsapp.js` — wrapper de envio de mensagens (usa uazapi.sendText)
- [x] Engine iniciada no startup do servidor (`startEngine()` em `src/index.js`)

### Frontend — Construtor de Fluxos
- [x] `FlowsPage.jsx` — listagem de fluxos em grid (criar, ativar/desativar, remover)
- [x] `FlowBuilderPage.jsx` — canvas fullscreen com @xyflow/react
  - Paleta de nós à esquerda (click para adicionar)
  - Conexões com handles específicos (condition: yes/no em verde/vermelho)
  - MiniMap + Controls + Background grid
  - Botão Salvar + toggle Ativo/Inativo na toolbar
- [x] `components/flow/FlowNodes.jsx` — 6 nós customizados com cores distintas
- [x] `components/flow/NodePropertiesPanel.jsx` — painel lateral de propriedades por tipo de nó
- [x] Prevenção de nó `whatsapp_input` duplicado
- [x] Dependências instaladas: `react-router-dom`, `axios`, `react-hot-toast`, `clsx`

### Critério de conclusão
Mensagem enviada ao WhatsApp → agente responde com GPT-4o → resposta enviada de volta via UazAPI.

---

## Fase 6 — Atendimento Humano e Tela de Conversas ✅

**Objetivo:** operadores visualizam e assumem conversas em tempo real.

### Backend
- [x] Migration: `assigned_operator_id` e `status` (`active`, `human`, `waiting`, `closed`) já presentes desde Fase 5
- [x] `GET /api/conversations` — listagem com filtros (status, busca, agente, operador, data)
- [x] `GET /api/conversations/:id` — detalhes + histórico completo de mensagens
- [x] `POST /api/conversations/:id/assume` — operador assume conversa
- [x] `POST /api/conversations/:id/return-to-ai` — devolve para IA
- [x] `POST /api/conversations/:id/close` — encerra atendimento
- [x] `POST /api/conversations/:id/messages` — operador envia mensagem (salva + envia via UazAPI + SSE)
- [x] Push em tempo real via SSE já existente (`sseManager`): eventos `message` e `conversation_update`

### Frontend
- [x] `ConversationsPage.jsx` — layout CRM fullscreen, 3 colunas:
  - Lista lateral: busca, filtro de status, última mensagem, badge (IA/Humano/Aguardando/Encerrado), operador
  - Área central: histórico com bolhas diferenciadas por remetente (contato / IA / operador / sistema)
  - Painel direito: info do contato, agente, operador, timestamps
- [x] Campo de resposta manual (visível apenas quando status = 'human')
- [x] Botões: "Assumir atendimento" / "Devolver para IA" / "Encerrar"
- [x] Push em tempo real via SSE: novas mensagens e mudanças de status atualizam a UI sem reload
- [x] `hooks/useConversations.js` — `useConversations` (lista) + `useConversation` (detalhe + ações)

### Critério de conclusão
Operador vê conversa ativa, assume, responde manualmente, devolve para IA que continua o fluxo.

---

## Fase 7 — CRM Simplificado ✅

**Objetivo:** leads capturados automaticamente pelos agentes são gerenciados em pipeline.

### Backend
- [x] Tabela `leads` já criada na Fase 5 (com todos os campos necessários)
- [x] Estágios do pipeline: `novo_lead`, `qualificado`, `em_negociacao`, `proposta_enviada`, `venda_concluida`, `perdido`
- [x] Ferramentas `create_lead` e `update_lead` já implementadas no `toolRunner.js` (Fase 5)
- [x] `GET /api/leads` — listagem com filtros (busca, stage, date_from, date_to) e paginação
- [x] `GET /api/leads/:id` — detalhe + últimas 50 mensagens da conversa associada
- [x] `POST /api/leads` — criação manual
- [x] `PUT /api/leads/:id` — atualização de dados
- [x] `PATCH /api/leads/:id/stage` — mover no pipeline
- [x] `DELETE /api/leads/:id` — exclusão (somente gestor)

### Frontend
- [x] `CRMPage.jsx` — Kanban board fullscreen com 6 colunas (estágios do pipeline)
- [x] Cards arrastáveis via HTML5 drag-and-drop nativo (sem dependência extra)
- [x] Cards mostram: nome, telefone, interesse, origem, data da última atualização
- [x] `LeadDetailModal` — dados completos, botões de estágio, histórico de mensagens, link para /conversations
- [x] `NewLeadModal` — criação manual com nome, telefone, e-mail, interesse
- [x] Busca por texto em tempo real (nome, telefone, e-mail)
- [x] `hooks/useLeads.js` — `useLeads` (lista + ações) + `useLeadDetail` (detalhe)

### Critério de conclusão
Agente cria lead via ferramenta → lead aparece no Kanban em "Novo Lead" → operador pode mover para "Qualificado".

---

## Fase 8 — Dashboard e Métricas

**Objetivo:** visualização de dados operacionais em tempo real e por período.

### Backend
- [ ] Endpoints de métricas:
  - `GET /metrics/summary` — cards do dashboard (conversas ativas, leads hoje, qualificados, vendas, taxa de conversão, tempo médio, atendimentos humanos, agentes online)
  - `GET /metrics/leads-per-day` — série temporal para gráfico de barras
  - `GET /metrics/conversions` — conversões por período e por agente
  - `GET /metrics/messages-volume` — volume de mensagens por dia
  - `GET /metrics/agent-distribution` — distribuição de atendimentos por agente
- [ ] Para `platform_admin`: métricas globais (todas as empresas)
- [ ] Para `gestor`/`operador`: métricas apenas da própria empresa

### Frontend
- [ ] Dashboard pós-login:
  - 8 cards com ícones e delta (variação vs. dia anterior)
  - Gráfico de barras: leads por dia (últimos 30 dias) — Recharts
  - Gráfico de linha: conversões por período — Recharts
  - Gráfico de rosca: distribuição por agente — Recharts
  - Gráfico de área: volume de mensagens — Recharts
- [ ] Seletor de período (hoje / 7d / 30d / custom)
- [ ] Auto-refresh a cada 60 segundos

### Critério de conclusão
Dashboard exibe métricas reais calculadas das conversas e leads do banco.

---

## Fase 9 — Dados de Demonstração (Seed)

**Objetivo:** sistema entregue pronto para demonstração com dados realistas da "Vision Motors".

### Backend — Script de Seed (`backend/src/database/seed.js`)
- [ ] Empresa: **Vision Motors** (concessionária)
- [ ] Usuários:
  - 1 admin da plataforma (`admin@atseller.io` / `Admin@123`)
  - 1 gestor (`gestor@visionmotors.com.br` / `Gestor@123`)
  - 2 operadores (`op1@visionmotors.com.br`, `op2@visionmotors.com.br`)
- [ ] WhatsApp: status `conectado` (simulado, sem QR real)
- [ ] 3 agentes configurados:
  - **Recepcionista** — boas-vindas, qualificação inicial, personalidade amigável
  - **Especialista Veículos Novos** — foco em venda de 0km, personalidade consultiva
  - **Especialista Seminovos** — foco em usados, personalidade vendedora
- [ ] Fluxo da Vision Motors:
  - WhatsApp Input → Recepcionista → Condição (interesse em novo ou seminovo) → Especialista respectivo → Encerramento/Venda
- [ ] 100 leads distribuídos nos estágios do pipeline
- [ ] 500+ mensagens distribuídas em 50-70 conversas simuladas com timestamps realistas (últimos 30 dias)
- [ ] Métricas coerentes com os dados (taxa de conversão ~18%, tempo médio ~4min)

### Critério de conclusão
`npm run db:seed` executa sem erros. Login com `admin@atseller.io` mostra dashboard preenchido, fluxo configurado e conversas simuladas.

---

## Fase 10 — Polimento, UX e QA

**Objetivo:** produto com qualidade de demonstração comercial.

### UX / Visual
- [ ] Design system consistente: tokens de cor (vermelho primário, branco, neutros grafite/slate)
- [ ] Animações de transição de tela (Framer Motion ou CSS transitions)
- [ ] Loading states em todas as ações assíncronas (skeletons nos cards/tabelas)
- [ ] Empty states com call-to-action (ex: "Nenhum agente criado ainda. Criar primeiro agente →")
- [ ] Toasts de feedback (sucesso, erro, aviso)
- [ ] Confirmação antes de ações destrutivas (modais)
- [ ] Responsividade: layout funcional em 1280px+ (foco desktop, produto SaaS)

### Qualidade
- [ ] Testes de integração dos fluxos críticos: auth, processamento de mensagem, handoff humano
- [ ] Tratamento de erros: UazAPI offline, OpenAI rate limit, QR code expirado
- [ ] Variáveis de ambiente documentadas em `.env.example`
- [ ] README com instruções de setup em `atseller/`

### Critério de Aceite Final (da spec)
- [ ] Fazer login ✓
- [ ] Visualizar dados de demonstração ✓
- [ ] Visualizar fluxo de agentes já configurado ✓
- [ ] Visualizar WhatsApp conectado ✓
- [ ] Simular conversas ✓
- [ ] Visualizar métricas ✓
- [ ] Ver agentes roteando atendimentos ✓
- [ ] Transferir atendimento para humano ✓
- [ ] Retornar atendimento para IA ✓
- [ ] Concluir uma venda utilizando o fluxo completo ✓

---

## Ordem de Prioridade por Valor

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 9*
                                                ↓
                                         Fase 6 → Fase 7 → Fase 8 → Fase 10
```

> *Fase 9 (seed) pode ser desenvolvida paralelamente após Fase 5, pois depende das tabelas criadas nas fases anteriores mas não bloqueia funcionalidades.

---

## Dependências Externas

| Serviço | Uso | Variável de Env |
|---|---|---|
| UazAPI | Envio/recebimento WhatsApp | `UAZAPI_BASE_URL`, `UAZAPI_API_KEY` |
| OpenAI | GPT-4o (agentes) + embeddings | `OPENAI_API_KEY` |
| PostgreSQL | Banco principal | `DATABASE_URL` |

---

## Status Atual

**Fase atual:** Fase 7 — CRM ✅ (concluída)

| Fase | Status |
|---|---|
| Fase 1 — Fundação | ✅ Concluída |
| Fase 2 — Empresas + RBAC | ✅ Concluída |
| Fase 3 — WhatsApp (UazAPI) | ✅ Concluída |
| Fase 4 — Agentes + RAG | ✅ Concluída |
| Fase 5 — Runtime + Flow Builder | ✅ Concluída |
| Fase 6 — Atendimento Humano | ✅ Concluída |
| Fase 7 — CRM | ✅ Concluída |
| Fase 8 — Dashboard + Métricas | — |
| Fase 9 — Seed "Vision Motors" | — |
| Fase 10 — Polimento + QA | — |

> Atualizar esta seção a cada fase concluída.
