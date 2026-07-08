const pool = require('../database/connection');
const whatsappService = require('../services/whatsapp');
const sseManager = require('../services/sseManager');

async function listConversations(req, res) {
  try {
    const { company_id } = req.user;
    const { status, agent_id, operator_id, date_from, date_to, search } = req.query;

    const conditions = ['c.company_id = $1'];
    const params = [company_id];
    let idx = 2;

    if (status) {
      conditions.push(`c.status = $${idx++}`);
      params.push(status);
    }
    if (agent_id) {
      conditions.push(`c.assigned_agent_id = $${idx++}`);
      params.push(agent_id);
    }
    if (operator_id) {
      conditions.push(`c.assigned_operator_id = $${idx++}`);
      params.push(operator_id);
    }
    if (date_from) {
      conditions.push(`c.created_at >= $${idx++}`);
      params.push(date_from);
    }
    if (date_to) {
      conditions.push(`c.created_at <= $${idx++}`);
      params.push(date_to);
    }
    if (search) {
      conditions.push(`(c.contact_name ILIKE $${idx} OR c.phone ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(' AND ');

    const result = await pool.query(
      `SELECT
        c.id, c.phone, c.contact_name, c.status, c.assigned_agent_id, c.assigned_operator_id,
        c.last_message_at, c.created_at, c.updated_at,
        a.name AS agent_name,
        u.name AS operator_name,
        m.content AS last_message,
        m.sender_type AS last_message_sender_type
       FROM conversations c
       LEFT JOIN agents a ON c.assigned_agent_id = a.id
       LEFT JOIN users u ON c.assigned_operator_id = u.id
       LEFT JOIN LATERAL (
         SELECT content, sender_type
         FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON TRUE
       WHERE ${where}
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
       LIMIT 100`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar conversas:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function getConversation(req, res) {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const convRes = await pool.query(
      `SELECT c.*, a.name AS agent_name, u.name AS operator_name
       FROM conversations c
       LEFT JOIN agents a ON c.assigned_agent_id = a.id
       LEFT JOIN users u ON c.assigned_operator_id = u.id
       WHERE c.id = $1 AND c.company_id = $2`,
      [id, company_id]
    );

    if (!convRes.rows[0]) return res.status(404).json({ error: 'Conversa não encontrada.' });

    const messagesRes = await pool.query(
      `SELECT m.*, u.name AS sender_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    res.json({ ...convRes.rows[0], messages: messagesRes.rows });
  } catch (err) {
    console.error('Erro ao buscar conversa:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function assumeConversation(req, res) {
  try {
    const { company_id, id: operator_id, name: operator_name } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE conversations
       SET status = 'human', assigned_operator_id = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3 AND status != 'closed'
       RETURNING *`,
      [operator_id, id, company_id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Conversa não encontrada.' });

    sseManager.emit(company_id, 'conversation_update', {
      conversationId: id,
      status: 'human',
      assigned_operator_id: operator_id,
      operator_name,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao assumir conversa:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function returnToAI(req, res) {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE conversations
       SET status = 'active', assigned_operator_id = NULL, updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND status != 'closed'
       RETURNING *`,
      [id, company_id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Conversa não encontrada.' });

    sseManager.emit(company_id, 'conversation_update', {
      conversationId: id,
      status: 'active',
      assigned_operator_id: null,
      operator_name: null,
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao devolver conversa para IA:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function closeConversation(req, res) {
  try {
    const { company_id } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE conversations
       SET status = 'closed', updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND status != 'closed'
       RETURNING *`,
      [id, company_id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Conversa não encontrada.' });

    sseManager.emit(company_id, 'conversation_update', {
      conversationId: id,
      status: 'closed',
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao encerrar conversa:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function sendMessage(req, res) {
  try {
    const { company_id, id: operator_id, name: operator_name } = req.user;
    const { id } = req.params;
    const { text } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: 'Mensagem não pode ser vazia.' });

    const convRes = await pool.query(
      `SELECT c.*, wc.instance_name
       FROM conversations c
       LEFT JOIN whatsapp_connections wc ON wc.company_id = c.company_id
       WHERE c.id = $1 AND c.company_id = $2 AND c.status = 'human'`,
      [id, company_id]
    );

    if (!convRes.rows[0]) {
      return res.status(404).json({ error: 'Conversa não encontrada ou não está em modo humano.' });
    }

    const conversation = convRes.rows[0];

    const msgRes = await pool.query(
      `INSERT INTO messages (conversation_id, company_id, role, content, sender_type, sender_id)
       VALUES ($1, $2, 'assistant', $3, 'operator', $4)
       RETURNING *`,
      [id, company_id, text.trim(), operator_id]
    );

    await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [id]);

    if (conversation.instance_name) {
      try {
        await whatsappService.sendTextMessage(conversation.instance_name, conversation.phone, text.trim());
      } catch (err) {
        console.error('Erro ao enviar mensagem WhatsApp:', err.message);
      }
    }

    sseManager.emit(company_id, 'message', {
      conversationId: id,
      phone: conversation.phone,
      role: 'assistant',
      content: text.trim(),
      senderType: 'operator',
      senderId: operator_id,
      senderName: operator_name,
    });

    res.status(201).json({ ...msgRes.rows[0], sender_name: operator_name });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

module.exports = {
  listConversations,
  getConversation,
  assumeConversation,
  returnToAI,
  closeConversation,
  sendMessage,
};
