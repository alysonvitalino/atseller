const pool = require('../database/connection');

const VALID_STAGES = ['novo_lead', 'qualificado', 'em_negociacao', 'proposta_enviada', 'venda_concluida', 'perdido'];

async function listLeads(req, res) {
  try {
    const { company_id } = req.user;
    const { stage, search, date_from, date_to, page = 1, limit = 200 } = req.query;

    const conditions = ['l.company_id = $1'];
    const params = [company_id];
    let idx = 2;

    if (stage) {
      conditions.push(`l.pipeline_stage = $${idx++}`);
      params.push(stage);
    }
    if (search) {
      conditions.push(`(l.name ILIKE $${idx} OR l.phone ILIKE $${idx} OR l.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (date_from) {
      conditions.push(`l.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`l.created_at <= $${idx++}`);
      params.push(date_to);
    }

    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const result = await pool.query(
      `SELECT l.*,
        c.phone AS conv_phone,
        c.status AS conv_status,
        c.contact_name AS conv_contact_name
       FROM leads l
       LEFT JOIN conversations c ON l.conversation_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY l.updated_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar leads:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function getLead(req, res) {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const leadRes = await pool.query(
      `SELECT l.*,
        c.id AS conv_id, c.status AS conv_status, c.contact_name AS conv_contact_name,
        c.last_message_at AS conv_last_message_at
       FROM leads l
       LEFT JOIN conversations c ON l.conversation_id = c.id
       WHERE l.id = $1 AND l.company_id = $2`,
      [id, company_id]
    );

    if (!leadRes.rows[0]) return res.status(404).json({ error: 'Lead não encontrado.' });

    // histórico de mensagens da conversa associada (últimas 50)
    let messages = [];
    if (leadRes.rows[0].conv_id) {
      const msgRes = await pool.query(
        `SELECT m.role, m.content, m.sender_type, m.created_at, u.name AS sender_name
         FROM messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at DESC
         LIMIT 50`,
        [leadRes.rows[0].conv_id]
      );
      messages = msgRes.rows.reverse();
    }

    res.json({ ...leadRes.rows[0], messages });
  } catch (err) {
    console.error('Erro ao buscar lead:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function createLead(req, res) {
  try {
    const { company_id } = req.user;
    const { name, phone, email, interest, source = 'manual', pipeline_stage = 'novo_lead' } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (pipeline_stage && !VALID_STAGES.includes(pipeline_stage)) {
      return res.status(400).json({ error: 'Estágio inválido.' });
    }

    const result = await pool.query(
      `INSERT INTO leads (company_id, name, phone, email, interest, source, status, pipeline_stage)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`,
      [company_id, name.trim(), phone || null, email || null, interest || null, source, pipeline_stage]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar lead:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function updateLead(req, res) {
  try {
    const { company_id } = req.user;
    const { id } = req.params;
    const { name, phone, email, interest, source } = req.body;

    const result = await pool.query(
      `UPDATE leads
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email),
           interest = COALESCE($4, interest),
           source = COALESCE($5, source),
           updated_at = NOW()
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [name?.trim() || null, phone || null, email || null, interest || null, source || null, id, company_id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Lead não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar lead:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function moveStage(req, res) {
  try {
    const { company_id } = req.user;
    const { id } = req.params;
    const { stage } = req.body;

    if (!VALID_STAGES.includes(stage)) {
      return res.status(400).json({ error: 'Estágio inválido.' });
    }

    const result = await pool.query(
      `UPDATE leads
       SET pipeline_stage = $1, status = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [stage, id, company_id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Lead não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao mover lead:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function deleteLead(req, res) {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, company_id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Lead não encontrado.' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao deletar lead:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

module.exports = { listLeads, getLead, createLead, updateLead, moveStage, deleteLead };
