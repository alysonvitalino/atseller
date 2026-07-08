const pool = require('../database/connection');

const AVAILABLE_TOOLS = [
  { id: 'create_lead', name: 'Criar Lead', description: 'Cadastra o contato como lead no CRM automaticamente.' },
  { id: 'update_lead', name: 'Atualizar Lead', description: 'Atualiza informações ou estágio do lead.' },
  { id: 'query_crm', name: 'Consultar CRM', description: 'Busca dados de leads e histórico no CRM.' },
  { id: 'send_proposal', name: 'Enviar Proposta', description: 'Registra envio de proposta e avança no pipeline.' },
  { id: 'schedule_meeting', name: 'Agendar Reunião', description: 'Registra interesse em reunião/visita.' },
  { id: 'transfer_to_human', name: 'Encaminhar Atendimento', description: 'Transfere a conversa para um operador humano.' },
  { id: 'close_conversation', name: 'Encerrar Conversa', description: 'Finaliza o atendimento com status definido.' },
];

async function list(req, res) {
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['a.company_id = $1'];
  const params = [req.user.company_id];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(a.name ILIKE $${params.length} OR a.description ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`a.status = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT a.*,
              COUNT(DISTINCT d.id) AS document_count,
              COUNT(DISTINCT c.id) AS chunk_count
       FROM agents a
       LEFT JOIN knowledge_base_documents d ON d.agent_id = a.id AND d.status = 'ready'
       LEFT JOIN knowledge_base_chunks c ON c.agent_id = a.id
       ${where}
       GROUP BY a.id
       ORDER BY a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM agents a ${where}`, params),
  ]);

  return res.json({ data: rows, total: Number(countRows[0].count) });
}

async function getOne(req, res) {
  const result = await pool.query(
    `SELECT a.*,
            COALESCE(json_agg(DISTINCT d) FILTER (WHERE d.id IS NOT NULL), '[]') AS documents
     FROM agents a
     LEFT JOIN knowledge_base_documents d ON d.agent_id = a.id
     WHERE a.id = $1 AND a.company_id = $2
     GROUP BY a.id`,
    [req.params.id, req.user.company_id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Agente não encontrado.' });
  return res.json(result.rows[0]);
}

async function create(req, res) {
  const { name, description, objective, personality, context, success_criteria, delay_min, delay_max, tools } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

  const result = await pool.query(
    `INSERT INTO agents (company_id, name, description, objective, personality, context, success_criteria, delay_min, delay_max, tools)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      req.user.company_id,
      name.trim(),
      description || null,
      objective || null,
      personality || 'friendly',
      context || null,
      success_criteria || null,
      delay_min ?? 2,
      delay_max ?? 15,
      JSON.stringify(tools || []),
    ]
  );

  await pool.query(
    'INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
    [req.user.company_id, req.user.id, 'agent.create', 'agent', result.rows[0].id, req.ip]
  );

  return res.status(201).json(result.rows[0]);
}

async function update(req, res) {
  const { name, description, objective, personality, context, success_criteria, delay_min, delay_max, tools, status } = req.body;

  const existing = await pool.query(
    'SELECT id FROM agents WHERE id = $1 AND company_id = $2',
    [req.params.id, req.user.company_id]
  );
  if (!existing.rows[0]) return res.status(404).json({ error: 'Agente não encontrado.' });

  const result = await pool.query(
    `UPDATE agents SET
       name = COALESCE($1, name),
       description = COALESCE($2, description),
       objective = COALESCE($3, objective),
       personality = COALESCE($4, personality),
       context = COALESCE($5, context),
       success_criteria = COALESCE($6, success_criteria),
       delay_min = COALESCE($7, delay_min),
       delay_max = COALESCE($8, delay_max),
       tools = COALESCE($9, tools),
       status = COALESCE($10, status),
       updated_at = NOW()
     WHERE id = $11
     RETURNING *`,
    [name?.trim(), description, objective, personality, context, success_criteria, delay_min, delay_max, tools ? JSON.stringify(tools) : null, status, req.params.id]
  );

  await pool.query(
    'INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
    [req.user.company_id, req.user.id, 'agent.update', 'agent', req.params.id, req.ip]
  );

  return res.json(result.rows[0]);
}

async function remove(req, res) {
  const result = await pool.query(
    'DELETE FROM agents WHERE id = $1 AND company_id = $2 RETURNING id',
    [req.params.id, req.user.company_id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Agente não encontrado.' });

  await pool.query(
    'INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
    [req.user.company_id, req.user.id, 'agent.delete', 'agent', req.params.id, req.ip]
  );

  return res.json({ message: 'Agente excluído.' });
}

function getAvailableTools(req, res) {
  return res.json(AVAILABLE_TOOLS);
}

module.exports = { list, getOne, create, update, remove, getAvailableTools };
