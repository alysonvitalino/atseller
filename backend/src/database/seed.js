require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./connection');

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function randomDate(maxDaysAgo = 30) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, maxDaysAgo));
  d.setHours(randInt(8, 20), randInt(0, 59), 0, 0);
  return d;
}

function addMinutes(date, min) {
  return new Date(date.getTime() + min * 60_000);
}

function iso(date) { return date.toISOString(); }

// ——— Dados base
const FIRST_NAMES = [
  'João','Maria','Carlos','Ana','Pedro','Fernanda','Lucas','Juliana','Rafael','Camila',
  'Bruno','Larissa','Thiago','Patrícia','Felipe','Amanda','Gabriel','Letícia','Diego','Bruna',
  'Leonardo','Vanessa','Rodrigo','Tatiana','Marcelo','Priscila','Eduardo','Daniela','Gustavo','Renata',
  'Paulo','Cristina','André','Mônica','Ricardo','Sandra','Alexandre','Adriana','Henrique','Roberta',
];
const LAST_NAMES = [
  'Silva','Santos','Oliveira','Souza','Rodrigues','Ferreira','Alves','Pereira','Lima','Gomes',
  'Costa','Ribeiro','Martins','Carvalho','Almeida','Lopes','Sousa','Fernandes','Vieira','Barbosa',
  'Rocha','Dias','Melo','Nunes','Pinto','Moreira','Monteiro','Nascimento','Araújo','Cardoso',
];
const MODELS_NOVOS = [
  'Toyota Corolla Cross','Honda HR-V','Jeep Compass','Volkswagen T-Cross',
  'Hyundai Creta','Chevrolet Equinox','Nissan Kicks','Ford Bronco Sport',
];
const MODELS_SEMINOVOS = [
  'Toyota Corolla 2022','Honda Civic 2021','Volkswagen Golf 2022','Jeep Renegade 2021',
  'Hyundai HB20 2022','Chevrolet Onix 2023','Ford Ka 2021','Renault Sandero 2022',
];
const FINANC_PARCELAS = ['48','60','72'];
const COLORS = ['Branco Perolizado','Prata Metálico','Preto Piano','Azul Metalizado','Vermelho Granada','Cinza Grafite'];

// ——— Scripts de conversa por estágio
// cada script é um array de {role, text} — role: 'user' | 'assistant'
// Os scripts de estágio mais avançado incluem os anteriores naturalmente

function scriptNovo(name, model) {
  return [
    { role: 'user', text: 'Olá, gostaria de informações sobre veículos disponíveis' },
    { role: 'assistant', text: `Olá! Seja bem-vindo à Vision Motors! Sou a Sofia, sua consultora virtual 😊 Que ótimo que você entrou em contato! Para te ajudar melhor, você tem interesse em um veículo **novo (0km)** ou **seminovo**?` },
    { role: 'user', text: `Quero um zero km` },
    { role: 'assistant', text: `Perfeito! Vou te conectar com nosso Especialista em Veículos Novos. Pode me informar seu nome para personalizar o atendimento?` },
    { role: 'user', text: name },
  ];
}

function scriptQualificado(name, model) {
  const base = scriptNovo(name, model);
  return [...base,
    { role: 'assistant', text: `Olá, ${name}! Sou o Carlos, Especialista em Veículos Novos da Vision Motors. Temos um estoque incrível de 0km! Qual categoria te interessa — SUV, sedan, hatch ou pickup?` },
    { role: 'user', text: 'Estou pensando em um SUV' },
    { role: 'assistant', text: `Excelente escolha! SUVs são nossa linha mais procurada. Temos o ${MODELS_NOVOS[0]} a partir de R$168.990, ${MODELS_NOVOS[1]} a partir de R$159.990 e o ${MODELS_NOVOS[2]} a partir de R$179.990. Algum desses te interessa mais?` },
    { role: 'user', text: `O ${model} me chamou atenção` },
  ];
}

function scriptNegociacao(name, model) {
  const base = scriptQualificado(name, model);
  return [...base,
    { role: 'assistant', text: `Ótima escolha! O ${model} é um dos mais procurados aqui. Disponível em ${rand(COLORS)} e ${rand(COLORS)}. Para um financiamento em ${rand(FINANC_PARCELAS)} meses com 20% de entrada, a parcela seria de aproximadamente R$${randInt(1800, 3200).toLocaleString('pt-BR')}/mês. O que acha?` },
    { role: 'user', text: 'Quanto fica na entrada?' },
    { role: 'assistant', text: `Para o ${model}, o valor de tabela é R$${randInt(150, 200).toLocaleString('pt-BR')}.990. Com 20% de entrada seria R$${randInt(30, 42).toLocaleString('pt-BR')}.000 aproximadamente. Mas trabalhamos com condições especiais — posso verificar opções com entrada menor, tudo bem?` },
    { role: 'user', text: 'Sim, pode verificar' },
    { role: 'assistant', text: `Perfeito! Vou checar com nossa equipe financeira. Pode me informar seu e-mail para enviar as opções de financiamento detalhadas?` },
  ];
}

function scriptProposta(name, model, email) {
  const base = scriptNegociacao(name, model);
  return [...base,
    { role: 'user', text: email },
    { role: 'assistant', text: `Obrigado, ${name}! Proposta enviada para **${email}** com 3 opções de financiamento para o ${model}:\n\n✅ Opção 1: 48x de R$${randInt(2200, 2800).toLocaleString('pt-BR')}\n✅ Opção 2: 60x de R$${randInt(1900, 2400).toLocaleString('pt-BR')}\n✅ Opção 3: 72x de R$${randInt(1700, 2100).toLocaleString('pt-BR')}\n\nQual opção faz mais sentido para você?` },
    { role: 'user', text: 'Vou analisar e te retorno em breve' },
    { role: 'assistant', text: `Claro! Estarei aqui quando precisar. Ficamos com a proposta reservada por 72h. Se quiser agendar um test drive antes de decidir, é só me falar! 🚗` },
  ];
}

function scriptVenda(name, model, email) {
  const base = scriptProposta(name, model, email);
  return [...base,
    { role: 'user', text: `Decidi! Quero fechar pela opção 2` },
    { role: 'assistant', text: `Parabéns, ${name}! 🎉 Excelente decisão! Vou confirmar a disponibilidade do ${model} em estoque e acionar nossa equipe para preparar toda a documentação. Posso agendar para você vir assinar ainda essa semana?` },
    { role: 'user', text: 'Pode ser quinta-feira de manhã' },
    { role: 'assistant', text: `Perfeito! Quinta-feira às 10h confirmado! 📅 Aqui está o resumo:\n\n🚗 ${model}\n💰 60x de R$${randInt(1900,2400).toLocaleString('pt-BR')}\n📍 Vision Motors — Av. Brasil, 1500\n\nDocumentos necessários: RG, CPF, comprovante de renda e residência. Nos vemos na quinta! 😊` },
    { role: 'user', text: 'Ótimo, obrigado pelo atendimento!' },
    { role: 'assistant', text: `Fico muito feliz em ajudar! Seja bem-vindo à família Vision Motors, ${name}! 🏎️ Qualquer dúvida até quinta, estou por aqui.` },
  ];
}

function scriptPerdido(name, model) {
  const base = scriptNegociacao(name, model);
  return [...base,
    { role: 'user', text: 'Achei o valor um pouco alto para minha realidade atual' },
    { role: 'assistant', text: `Entendo, ${name}. Posso verificar se temos alguma opção com entrada menor ou um modelo que caiba melhor no seu orçamento. O que você pensa seria um valor de parcela mais confortável?` },
    { role: 'user', text: 'Preciso pensar mais um pouco, obrigado' },
    { role: 'assistant', text: `Claro! Sem pressão 😊 Quando estiver pronto, é só nos chamar. Guardo suas preferências aqui. Boa sorte na sua busca pelo veículo ideal!` },
  ];
}

// Versão seminovo dos scripts
function scriptSeminovo(name, model) {
  return [
    { role: 'user', text: 'Boa tarde! Quero ver opções de seminovos' },
    { role: 'assistant', text: `Boa tarde! Bem-vindo à Vision Motors! Sou a Sofia 😊 Temos um ótimo estoque de seminovos Vision Certified — todos revisados e com garantia! Vou te conectar com nossa especialista em seminovos. Seu nome, por favor?` },
    { role: 'user', text: name },
    { role: 'assistant', text: `Olá, ${name}! Sou a Marina, Especialista em Seminovos. Nosso estoque Vision Certified inclui veículos com até 3 anos e menos de 50 mil km, todos revisados em 82 pontos. Qual modelo você tem em mente, ou prefere que eu sugira por faixa de preço?` },
    { role: 'user', text: `Tenho interesse no ${model}` },
  ];
}

function scriptSeminоvoQualificado(name, model) {
  const base = scriptSeminovo(name, model);
  return [...base,
    { role: 'assistant', text: `Excelente gosto! Temos um ${model} disponível: ${randInt(20, 48)} mil km, ${rand(COLORS)}, único dono, com revisões em dia. Preço: R$${randInt(65, 130).toLocaleString('pt-BR')}.990. Gostaria de mais detalhes ou comparar com outras opções?` },
    { role: 'user', text: `Que outros modelos têm disponíveis nessa faixa?` },
    { role: 'assistant', text: `Nessa faixa de preço também temos:\n\n✅ ${rand(MODELS_SEMINOVOS)} — ${randInt(25,45)}k km — R$${randInt(65,95).toLocaleString('pt-BR')}.990\n✅ ${rand(MODELS_SEMINOVOS)} — ${randInt(20,40)}k km — R$${randInt(70,110).toLocaleString('pt-BR')}.990\n\nTodos Vision Certified com 1 ano de garantia. Qual te interessa mais?` },
  ];
}

function buildScript(stage, name, model) {
  const email = `${name.toLowerCase().replace(/\s+/g, '.')}@email.com`;
  const isSeminovo = MODELS_SEMINOVOS.includes(model);
  if (isSeminovo) {
    if (stage === 'novo_lead') return scriptSeminovo(name, model).slice(0, 3);
    if (stage === 'qualificado') return scriptSeminоvoQualificado(name, model);
    if (stage === 'em_negociacao') return [...scriptSeminоvoQualificado(name, model),
      { role: 'user', text: `Quero o ${model} mesmo, como funciona o financiamento?` },
      { role: 'assistant', text: `Ótimo! Para o ${model}, conseguimos financiar em até ${rand(FINANC_PARCELAS)} meses. Com 10% de entrada, a parcela ficaria em torno de R$${randInt(900, 1800).toLocaleString('pt-BR')}/mês. Quer que eu prepare uma simulação?` },
      { role: 'user', text: 'Sim, por favor' },
    ];
    if (stage === 'proposta_enviada') return [...scriptSeminоvoQualificado(name, model),
      { role: 'user', text: `Me manda uma proposta no e-mail` },
      { role: 'assistant', text: `Com certeza! Qual seu e-mail?` },
      { role: 'user', text: email },
      { role: 'assistant', text: `Proposta enviada para ${email}! O ${model} está reservado por 48h. Se quiser agendar para ver o carro pessoalmente, é só falar 🚗` },
      { role: 'user', text: 'Obrigado, vou analisar' },
    ];
    if (stage === 'venda_concluida') return [...scriptSeminоvoQualificado(name, model),
      { role: 'user', text: `Quero fechar negócio!` },
      { role: 'assistant', text: `Que ótimo, ${name}! 🎉 Vou preparar tudo. Quando você pode vir à loja assinar?` },
      { role: 'user', text: 'Posso ir amanhã' },
      { role: 'assistant', text: `Perfeito! Te esperamos amanhã. Traga RG, CPF e comprovantes. Seja bem-vindo à família Vision Motors! 🚗✨` },
    ];
    if (stage === 'perdido') return [...scriptSeminоvoQualificado(name, model),
      { role: 'user', text: 'Achei em outra loja mais barato, obrigado' },
      { role: 'assistant', text: `Entendo! Se mudar de ideia ou precisar de algo mais, estaremos aqui. Boa sorte! 😊` },
    ];
    return scriptSeminovo(name, model);
  }
  // novos
  if (stage === 'novo_lead') return scriptNovo(name, model).slice(0, 3);
  if (stage === 'qualificado') return scriptQualificado(name, model);
  if (stage === 'em_negociacao') return scriptNegociacao(name, model);
  if (stage === 'proposta_enviada') return scriptProposta(name, model, email);
  if (stage === 'venda_concluida') return scriptVenda(name, model, email);
  if (stage === 'perdido') return scriptPerdido(name, model);
  return scriptNovo(name, model);
}

// ——— Distribuição de leads por estágio (total = 100, ~18% conversão)
const STAGE_DISTRIBUTION = [
  { stage: 'novo_lead', count: 18 },
  { stage: 'qualificado', count: 22 },
  { stage: 'em_negociacao', count: 19 },
  { stage: 'proposta_enviada', count: 17 },
  { stage: 'venda_concluida', count: 18 },
  { stage: 'perdido', count: 6 },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Iniciando seed da Vision Motors...\n');

    // ——— Verifica se já existe
    const existing = await client.query(`SELECT id FROM companies WHERE slug = 'vision-motors'`);
    if (existing.rows[0]) {
      console.log('⚠️  Vision Motors já existe no banco. Pulando seed.');
      return;
    }

    await client.query('BEGIN');

    // ——— Admin da plataforma
    const adminEmail = 'admin@atseller.io';
    let adminId;
    const adminExisting = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (adminExisting.rows[0]) {
      adminId = adminExisting.rows[0].id;
      console.log('✅ Admin já existe, reutilizando.');
    } else {
      const adminHash = await bcrypt.hash('Admin@123', 12);
      const adminRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status) VALUES ($1,$2,$3,'platform_admin','active') RETURNING id`,
        ['Administrador', adminEmail, adminHash]
      );
      adminId = adminRes.rows[0].id;
      console.log('✅ Admin criado: admin@atseller.io / Admin@123');
    }

    // ——— Empresa Vision Motors
    const companyRes = await client.query(
      `INSERT INTO companies (name, slug, status, settings)
       VALUES ('Vision Motors','vision-motors','active','{"theme":"red","segment":"automotive"}')
       RETURNING id`
    );
    const companyId = companyRes.rows[0].id;
    console.log(`✅ Empresa criada: Vision Motors (${companyId})`);

    // ——— Usuários da empresa
    const gestorHash = await bcrypt.hash('Gestor@123', 12);
    const opHash = await bcrypt.hash('Operador@123', 12);

    const gestorRes = await client.query(
      `INSERT INTO users (company_id, name, email, password_hash, role, status)
       VALUES ($1,'Lucas Andrade','gestor@visionmotors.com.br',$2,'gestor','active') RETURNING id`,
      [companyId, gestorHash]
    );
    const gestorId = gestorRes.rows[0].id;

    const op1Res = await client.query(
      `INSERT INTO users (company_id, name, email, password_hash, role, status)
       VALUES ($1,'Beatriz Santos','op1@visionmotors.com.br',$2,'operador','active') RETURNING id`,
      [companyId, opHash]
    );
    const op1Id = op1Res.rows[0].id;

    const op2Res = await client.query(
      `INSERT INTO users (company_id, name, email, password_hash, role, status)
       VALUES ($1,'Marcos Oliveira','op2@visionmotors.com.br',$2,'operador','active') RETURNING id`,
      [companyId, opHash]
    );
    const op2Id = op2Res.rows[0].id;

    console.log('✅ Usuários criados: gestor, op1, op2');

    // ——— WhatsApp simulado (conectado)
    await client.query(
      `INSERT INTO whatsapp_connections
         (company_id, instance_name, status, phone, connected_at, last_heartbeat, stats)
       VALUES ($1,'vision-motors-wa','connected','5511999990000', NOW() - INTERVAL '5 days', NOW(),
               '{"messages_received":847,"messages_sent":1203}')`,
      [companyId]
    );
    console.log('✅ WhatsApp simulado: conectado (5511999990000)');

    // ——— Agentes
    const agentRecRes = await client.query(
      `INSERT INTO agents
         (company_id, name, description, objective, personality, context, success_criteria, delay_min, delay_max, status, tools)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 4, 'active', $8) RETURNING id`,
      [
        companyId,
        'Sofia — Recepcionista',
        'Agente de boas-vindas e qualificação inicial',
        'Recepcionar o cliente, identificar se tem interesse em veículo novo (0km) ou seminovo, coletar o nome e encaminhar para o especialista correto.',
        'friendly',
        'Você é Sofia, a recepcionista virtual da Vision Motors, a maior concessionária multimarcas do estado. A Vision Motors oferece veículos novos 0km e seminovos Vision Certified com garantia. Nossa missão é oferecer a melhor experiência de compra do segmento.',
        'Cliente identificado (novo vs. seminovo) e nome coletado para personalização do atendimento.',
        JSON.stringify(['create_lead', 'transfer_to_human']),
      ]
    );
    const agentRecId = agentRecRes.rows[0].id;

    const agentNovosRes = await client.query(
      `INSERT INTO agents
         (company_id, name, description, objective, personality, context, success_criteria, delay_min, delay_max, status, tools)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 2, 8, 'active', $8) RETURNING id`,
      [
        companyId,
        'Carlos — Especialista Novos',
        'Especialista em veículos novos 0km',
        'Apresentar o portfólio de veículos novos, identificar o modelo ideal para o cliente, discutir financiamento, enviar proposta e fechar a venda.',
        'consultive',
        `Você é Carlos, Especialista em Veículos Novos da Vision Motors. Portfólio atual:
• Toyota Corolla Cross: R$168.990 (SUV)
• Honda HR-V: R$159.990 (SUV compacto)
• Jeep Compass: R$179.990 (SUV premium)
• Volkswagen T-Cross: R$149.990 (SUV compacto)
• Hyundai Creta: R$154.990 (SUV)
• Chevrolet Equinox: R$189.990 (SUV)
Financiamento: até 72 meses, taxa a partir de 0,99% a.m. Aceitamos usados como entrada.`,
        'Proposta de financiamento enviada e visita à loja agendada.',
        JSON.stringify(['create_lead', 'update_lead', 'send_proposal', 'schedule_meeting', 'transfer_to_human']),
      ]
    );
    const agentNovosId = agentNovosRes.rows[0].id;

    const agentSemRes = await client.query(
      `INSERT INTO agents
         (company_id, name, description, objective, personality, context, success_criteria, delay_min, delay_max, status, tools)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 2, 8, 'active', $8) RETURNING id`,
      [
        companyId,
        'Marina — Especialista Seminovos',
        'Especialista em veículos seminovos Vision Certified',
        'Apresentar o estoque de seminovos com garantia, destacar os diferenciais Vision Certified, negociar preço e financiamento, fechar a venda.',
        'sales',
        `Você é Marina, Especialista em Seminovos Vision Certified da Vision Motors. Estoque atual:
• Toyota Corolla 2022: 28k km — R$112.990
• Honda Civic 2021: 35k km — R$98.990
• Volkswagen Golf 2022: 22k km — R$119.990
• Jeep Renegade 2021: 41k km — R$89.990
• Hyundai HB20 2022: 18k km — R$74.990
• Chevrolet Onix Plus 2023: 12k km — R$82.990
Todos os seminovos têm revisão em 82 pontos, 1 ano de garantia e aceite de veículo na troca.`,
        'Visita ao estoque agendada ou venda concluída.',
        JSON.stringify(['create_lead', 'update_lead', 'send_proposal', 'schedule_meeting', 'transfer_to_human']),
      ]
    );
    const agentSemId = agentSemRes.rows[0].id;

    console.log('✅ Agentes criados: Sofia (Recepcionista), Carlos (Novos), Marina (Seminovos)');

    // ——— Fluxo Vision Motors
    const nodeInputId = 'node-input';
    const nodeRecId = 'node-rec';
    const nodeCondId = 'node-cond';
    const nodeNovosId = 'node-novos';
    const nodeSemId = 'node-sem';
    const nodeEndNovosId = 'node-end-novos';
    const nodeEndSemId = 'node-end-sem';

    const flowNodes = [
      {
        id: nodeInputId,
        type: 'whatsapp_input',
        position: { x: 60, y: 220 },
        data: { label: 'Mensagem recebida' },
      },
      {
        id: nodeRecId,
        type: 'ai_agent',
        position: { x: 280, y: 220 },
        data: { label: 'Recepcionista', agentId: agentRecId },
      },
      {
        id: nodeCondId,
        type: 'condition',
        position: { x: 520, y: 220 },
        data: { label: 'Interesse em novo?', condition: 'O cliente demonstrou interesse em veículo novo (0km)? Responda SIM apenas se ele mencionou explicitamente "novo", "zero km", "0km" ou similar.' },
      },
      {
        id: nodeNovosId,
        type: 'ai_agent',
        position: { x: 780, y: 80 },
        data: { label: 'Especialista Novos', agentId: agentNovosId },
      },
      {
        id: nodeSemId,
        type: 'ai_agent',
        position: { x: 780, y: 380 },
        data: { label: 'Especialista Seminovos', agentId: agentSemId },
      },
      {
        id: nodeEndNovosId,
        type: 'end',
        position: { x: 1040, y: 80 },
        data: { label: 'Encerramento Novos', message: 'Obrigado pelo contato com a Vision Motors! Em caso de dúvidas, estamos sempre à disposição. Até logo! 🚗' },
      },
      {
        id: nodeEndSemId,
        type: 'end',
        position: { x: 1040, y: 380 },
        data: { label: 'Encerramento Seminovos', message: 'Obrigado pelo contato com a Vision Motors! Em caso de dúvidas, estamos sempre à disposição. Até logo! 🚗' },
      },
    ];

    const flowEdges = [
      { id: 'e1', source: nodeInputId, target: nodeRecId },
      { id: 'e2', source: nodeRecId, target: nodeCondId },
      { id: 'e3', source: nodeCondId, target: nodeNovosId, sourceHandle: 'yes' },
      { id: 'e4', source: nodeCondId, target: nodeSemId, sourceHandle: 'no' },
      { id: 'e5', source: nodeNovosId, target: nodeEndNovosId },
      { id: 'e6', source: nodeSemId, target: nodeEndSemId },
    ];

    const flowRes = await client.query(
      `INSERT INTO flows (company_id, name, description, is_active, nodes, edges)
       VALUES ($1, 'Fluxo Vision Motors', 'Qualificação e roteamento para especialistas de veículos novos e seminovos', TRUE, $2, $3)
       RETURNING id`,
      [companyId, JSON.stringify(flowNodes), JSON.stringify(flowEdges)]
    );
    const flowId = flowRes.rows[0].id;
    console.log(`✅ Fluxo criado: Fluxo Vision Motors (ativo)`);

    // ——— Gerar 100 leads + 60 conversas
    let totalMessages = 0;
    let totalConvs = 0;
    let totalLeads = 0;

    // índice de contatos usados (para evitar duplicar telefone em conversas ativas)
    const usedPhones = new Set();

    // determina quais leads terão conversa (os primeiros 60 de cada estágio)
    // Distribuição de conversas por estágio (total 60):
    const CONV_PER_STAGE = {
      novo_lead: 8,
      qualificado: 12,
      em_negociacao: 12,
      proposta_enviada: 12,
      venda_concluida: 12,
      perdido: 4,
    };

    for (const { stage, count } of STAGE_DISTRIBUTION) {
      const withConv = CONV_PER_STAGE[stage] || 0;
      const convsForStage = Math.min(withConv, count);

      for (let i = 0; i < count; i++) {
        const firstName = rand(FIRST_NAMES);
        const lastName = rand(LAST_NAMES);
        const name = `${firstName} ${lastName}`;
        const phone = `5511${9}${randInt(10000000, 99999999)}`;
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`;
        const isNovo = Math.random() > 0.45; // 55% interesse em novos
        const model = isNovo ? rand(MODELS_NOVOS) : rand(MODELS_SEMINOVOS);
        const daysAgo = randInt(0, 30);

        const createdAt = randomDate(daysAgo);
        const updatedAt = addMinutes(createdAt, randInt(30, 180));

        // ——— Cria lead
        const leadRes = await client.query(
          `INSERT INTO leads
             (company_id, name, phone, email, source, status, pipeline_stage, interest, created_at, updated_at)
           VALUES ($1,$2,$3,$4,'whatsapp',$5,$5,$6,$7,$8) RETURNING id`,
          [companyId, name, phone, email, stage, `${isNovo ? 'Veículo novo' : 'Seminovo'}: ${model}`, iso(createdAt), iso(updatedAt)]
        );
        const leadId = leadRes.rows[0].id;
        totalLeads++;

        // ——— Cria conversa + mensagens para os primeiros `convsForStage` leads do estágio
        const hasConv = i < convsForStage && !usedPhones.has(phone);
        if (hasConv) {
          usedPhones.add(phone);

          const convStatus = stage === 'closed' || stage === 'perdido' || stage === 'venda_concluida'
            ? 'closed'
            : stage === 'em_negociacao' || stage === 'proposta_enviada'
              ? (Math.random() > 0.6 ? 'human' : 'active')
              : 'active';

          const assignedOperatorId = convStatus === 'human'
            ? (Math.random() > 0.5 ? op1Id : op2Id)
            : null;

          const assignedAgentId = isNovo
            ? (stage === 'novo_lead' ? agentRecId : agentNovosId)
            : agentSemId;

          // nó atual da conversa (ativo = agente ainda processando)
          const currentNodeId = convStatus !== 'closed'
            ? (isNovo ? nodeNovosId : nodeSemId)
            : null;

          const convRes = await client.query(
            `INSERT INTO conversations
               (company_id, flow_id, lead_id, phone, contact_name, status,
                assigned_agent_id, assigned_operator_id, current_node_id,
                last_message_at, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
            [
              companyId, flowId, leadId, phone, name, convStatus,
              assignedAgentId, assignedOperatorId, currentNodeId,
              iso(updatedAt), iso(createdAt), iso(updatedAt),
            ]
          );
          const convId = convRes.rows[0].id;

          // atualiza conversa no lead
          await client.query('UPDATE leads SET conversation_id = $1 WHERE id = $2', [convId, leadId]);

          // ——— Gera mensagens
          const script = buildScript(stage, name, model);
          let msgTime = new Date(createdAt);

          for (const { role, text } of script) {
            msgTime = addMinutes(msgTime, randInt(1, 5));
            const senderType = role === 'user' ? 'contact' : 'agent';
            await client.query(
              `INSERT INTO messages
                 (conversation_id, company_id, role, content, sender_type, created_at)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [convId, companyId, role, text, senderType, iso(msgTime)]
            );
            totalMessages++;
          }

          // Para conversas com operador, adiciona mensagem de operador
          if (convStatus === 'human') {
            msgTime = addMinutes(msgTime, randInt(3, 12));
            const opName = assignedOperatorId === op1Id ? 'Beatriz' : 'Marcos';
            const opText = rand([
              `Olá, ${name}! Aqui é ${opName} da Vision Motors. Vou dar continuidade ao seu atendimento. Posso te ajudar com mais detalhes sobre o ${model}?`,
              `Oi ${name}! Sou ${opName}, especialista de vendas. Vi que você tem interesse no ${model}. Que tal agendarmos um test drive esta semana?`,
            ]);
            await client.query(
              `INSERT INTO messages
                 (conversation_id, company_id, role, content, sender_type, sender_id, created_at)
               VALUES ($1,$2,'assistant',$3,'operator',$4,$5)`,
              [convId, companyId, opText, assignedOperatorId, iso(msgTime)]
            );
            totalMessages++;
          }

          totalConvs++;
        }
      }
    }

    await client.query('COMMIT');

    console.log(`\n✅ Seed concluído com sucesso!`);
    console.log(`   📦 Empresa: Vision Motors`);
    console.log(`   👥 Usuários: 1 admin + 1 gestor + 2 operadores`);
    console.log(`   🤖 Agentes: Sofia, Carlos, Marina`);
    console.log(`   🔀 Fluxo: Vision Motors (ativo)`);
    console.log(`   🎯 Leads: ${totalLeads} criados`);
    console.log(`   💬 Conversas: ${totalConvs} com mensagens`);
    console.log(`   📨 Mensagens: ${totalMessages} geradas`);
    console.log(`\n🔐 Credenciais:`);
    console.log(`   admin@atseller.io       / Admin@123`);
    console.log(`   gestor@visionmotors.com.br / Gestor@123`);
    console.log(`   op1@visionmotors.com.br / Operador@123`);
    console.log(`   op2@visionmotors.com.br / Operador@123`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro durante o seed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
