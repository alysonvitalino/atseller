const pool = require('../database/connection');

async function listFlows(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, description, is_active, created_at, updated_at,
              jsonb_array_length(nodes) AS node_count
       FROM flows
       WHERE company_id = $1
       ORDER BY updated_at DESC`,
      [req.companyId]
    );
    res.json({ flows: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar fluxos.' });
  }
}

async function getFlow(req, res) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM flows WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Fluxo não encontrado.' });
    res.json({ flow: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar fluxo.' });
  }
}

async function createFlow(req, res) {
  const { name, description, nodes = [], edges = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome é obrigatório.' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO flows (company_id, name, description, nodes, edges)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.companyId, name, description || null, JSON.stringify(nodes), JSON.stringify(edges)]
    );
    res.status(201).json({ flow: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar fluxo.' });
  }
}

async function updateFlow(req, res) {
  const { name, description, nodes, edges } = req.body;

  try {
    const existing = await pool.query(
      'SELECT id FROM flows WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Fluxo não encontrado.' });

    const { rows } = await pool.query(
      `UPDATE flows
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           nodes = COALESCE($3, nodes),
           edges = COALESCE($4, edges),
           updated_at = NOW()
       WHERE id = $5 AND company_id = $6
       RETURNING *`,
      [
        name || null,
        description !== undefined ? description : null,
        nodes ? JSON.stringify(nodes) : null,
        edges ? JSON.stringify(edges) : null,
        req.params.id,
        req.companyId,
      ]
    );
    res.json({ flow: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar fluxo.' });
  }
}

async function toggleActive(req, res) {
  try {
    const existing = await pool.query(
      'SELECT id, is_active FROM flows WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Fluxo não encontrado.' });

    const willActivate = !existing.rows[0].is_active;

    if (willActivate) {
      // desativa todos os outros antes de ativar este
      await pool.query(
        'UPDATE flows SET is_active = FALSE, updated_at = NOW() WHERE company_id = $1',
        [req.companyId]
      );
    }

    const { rows } = await pool.query(
      'UPDATE flows SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [willActivate, req.params.id]
    );
    res.json({ flow: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alternar status do fluxo.' });
  }
}

async function deleteFlow(req, res) {
  try {
    const existing = await pool.query(
      'SELECT id FROM flows WHERE id = $1 AND company_id = $2',
      [req.params.id, req.companyId]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Fluxo não encontrado.' });

    await pool.query('DELETE FROM flows WHERE id = $1', [req.params.id]);
    res.json({ message: 'Fluxo removido.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao remover fluxo.' });
  }
}

module.exports = { listFlows, getFlow, createFlow, updateFlow, toggleActive, deleteFlow };
