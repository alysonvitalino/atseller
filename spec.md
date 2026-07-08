Requisitos Gerais
Multi Tenant

A plataforma deve suportar múltiplas empresas.

Cada empresa possui:

Usuários próprios
Agentes próprios
Fluxos próprios
Integrações próprias
Histórico próprio
Base de conhecimento própria
Métricas próprias

Nenhuma informação deve ser compartilhada entre empresas.

Controle de Acesso
Administrador da Plataforma

Perfil responsável por administrar todo o sistema.

Permissões:

Visualizar todas as empresas
Criar empresas
Editar empresas
Bloquear empresas
Acessar métricas globais
Visualizar todos os fluxos
Visualizar todos os agentes
Assumir identidade de qualquer usuário para suporte
Gestor

Responsável pela operação da empresa cliente.

Permissões:

Gerenciar agentes
Gerenciar fluxos
Conectar WhatsApp
Visualizar métricas
Visualizar conversas
Criar operadores
Editar configurações da empresa
Operador

Permissões:

Visualizar conversas
Assumir atendimento
Encerrar atendimento
Visualizar histórico

Sem acesso às configurações administrativas.

Autenticação

Tela de login simples.

Funcionalidades:

Login
Logout
Recuperação de senha
Alteração de senha
Sessão persistente

Design moderno.

Paleta:

Vermelho
Branco
Tons neutros

Visual inspirado em softwares SaaS modernos.

Dashboard

Após login, exibir:

Cards
Conversas ativas
Leads recebidos hoje
Leads qualificados
Vendas realizadas
Taxa de conversão
Tempo médio de resposta
Atendimentos humanos ativos
Agentes online
Gráficos
Leads por dia
Conversões por período
Conversões por agente
Volume de mensagens
Distribuição entre agentes
Integração WhatsApp

Integração via UazAPI.

Cada empresa deve poder:

Conectar WhatsApp
Desconectar WhatsApp
Reconectar WhatsApp
Conexão

Exibir QR Code.

Estados possíveis:

Conectado
Desconectado
Conectando
Erro
Monitoramento

Exibir:

Status da conexão
Último heartbeat
Número conectado
Mensagens recebidas
Mensagens enviadas
Tempo online
Gestão de Agentes

Tela para CRUD completo de agentes.

Cada agente deve possuir:

Dados Básicos
Nome
Descrição
Objetivo
Personalidade

Configuração de:

Tom formal
Tom consultivo
Tom amigável
Tom vendedor
Tom técnico
Delay de Resposta

Configuração:

Delay mínimo
Delay máximo

Exemplo:

mínimo: 2 segundos
máximo: 15 segundos

As respostas devem respeitar essa janela.

Contexto

Campo livre para instruções.

Exemplo:

"Você trabalha para uma clínica odontológica especializada em implantes dentários."

Critério de Sucesso

Campo para definir o objetivo final do agente.

Exemplo:

"Agendar consulta."

ou

"Concluir venda."

Conhecimento

Permitir:

Texto manual
Upload PDF
Upload DOCX
Upload TXT
URLs

Os documentos devem alimentar uma base de conhecimento utilizada pelo agente.

Ferramentas

O agente pode possuir ferramentas.

Exemplos:

Criar lead
Atualizar lead
Consultar CRM
Enviar proposta
Agendar reunião
Encaminhar atendimento
Encerrar conversa
Fluxos de Agentes

Criar um construtor visual semelhante ao n8n.

Interface drag-and-drop.

Nós

Tipos de nós:

Entrada WhatsApp

Recebe mensagens.

Agente IA

Executa raciocínio.

Condição

Permite bifurcação.

Transferência Humana

Encaminha para operador.

Ação

Executa ferramentas.

Encerramento

Finaliza atendimento.

Exemplo de Fluxo

WhatsApp

↓

Agente Recepcionista

↓

Qualificação de Lead

↓

Se interesse em operação A

↓

Agente Especialista A

↓

Venda

ou

↓

Agente Especialista B

↓

Venda

Atendimento Humano

Operador deve poder:

Assumir conversa
Devolver para IA
Encerrar atendimento

Exibir status:

IA atendendo
Humano atendendo
Em espera
Conversas

Tela semelhante a um CRM de atendimento.

Exibir:

Lista de contatos
Status
Última interação
Responsável atual

Ao abrir conversa:

Histórico completo
Linha do tempo
Agente responsável
Operador responsável
CRM Simplificado

Cadastrar automaticamente:

Leads
Oportunidades
Clientes

Campos:

Nome
Telefone
E-mail
Origem
Status
Pipeline

Etapas:

Novo Lead
Qualificado
Em negociação
Proposta enviada
Venda concluída
Perdido
Métricas

Métricas por:

Empresa
Agente
Operador

Indicadores:

Conversões
Vendas
Leads
Tempo médio
Abandono
Transferências humanas
Taxa de sucesso por agente
Auditoria

Registrar:

Login
Logout
Alterações
Criação de agentes
Exclusão de agentes
Alterações em fluxos
Dados Fictícios

O sistema deve ser entregue com uma base completa para demonstração.

Criar automaticamente:

Empresa

Vision Motors

Usuários

Administrador

Gestor

Operadores

WhatsApp

Status conectado

Leads

Mínimo 100 leads

Conversas

Mínimo 500 mensagens distribuídas

Agentes

Agente Recepcionista

Agente Especialista Veículos Novos

Agente Especialista Veículos Seminovos

Fluxo

Recepcionista

↓

Qualificação

↓

Veículos Novos

ou

↓

Seminovos

↓

Fechamento

Dashboard

Popular com métricas realistas.

Requisitos de UX

A interface deve transmitir:

Inteligência Artificial
Automação
Escalabilidade
Controle operacional

Evitar aparência genérica.

Inspirar-se em:

n8n
HubSpot
Pipefy
Salesforce
Langflow
Retool
Critério de Aceite Principal

Ao executar a aplicação pela primeira vez, deve ser possível:

Fazer login.
Visualizar dados de demonstração.
Visualizar fluxo de agentes já configurado.
Visualizar WhatsApp conectado.
Simular conversas.
Visualizar métricas.
Ver agentes roteando atendimentos.
Transferir atendimento para humano.
Retornar atendimento para IA.
Concluir uma venda utilizando o fluxo completo.

O sistema deve estar organizado, modularizado, preparado para evolução futura e com foco em vendas automatizadas por agentes de IA especializados.