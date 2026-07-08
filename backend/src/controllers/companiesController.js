const pool = require('../database/connection');

async function list(req, res) {
  const { search, status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.name ILIKE $${params.length} OR c.slug ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT c.*,
              COUNT(u.id) FILTER (WHERE u.status = 'active') AS user_count
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       ${where}
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM companies c ${where}`, params),
  ]);

  return res.json({ data: rows, total: Number(countRows[0].count), page: Number(page), limit: Number(limit) });
}

async function getOne(req, res) {
  const result = await pool.query(
    `SELECT c.*, COUNT(u.id) FILTER (WHERE u.status = 'active') AS user_count
     FROM companies c
     LEFT JOIN users u ON u.company_id = c.id
     WHERE c.id = $1
     GROUP BY c.id`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Empresa não encontrada.' });
  return res.json(result.rows[0]);
}

async function create(req, res) {
  const { name, slug } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Nome e slug são obrigatórios.' });
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hífens.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO companies (name, slug) VALUES ($1, $2) RETURNING *`,
      [name.trim(), slug.trim()]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'company.create', 'company', result.rows[0].id, req.ip]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug já está em uso.' });
    throw err;
  }
}

async function update(req, res) {
  const { name, slug, settings } = req.body;
  const company = await pool.query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
  if (!company.rows[0]) return res.status(404).json({ error: 'Empresa não encontrada.' });

  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hífens.' });
  }

  try {
    const result = await pool.query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           settings = COALESCE($3, settings),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [name?.trim(), slug?.trim(), settings ? JSON.stringify(settings) : null, req.params.id]
    );

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [req.user.id, 'company.update', 'company', req.params.id, req.ip]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug já está em uso.' });
    throw err;
  }
}

async function setStatus(req, res) {
  const { status } = req.body;
  if (!['active', 'blocked', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  const result = await pool.query(
    `UPDATE companies
     SET status = $1,
         blocked_at = CASE WHEN $1 = 'blocked' THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, req.params.id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Empresa não encontrada.' });

  await pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
    [req.user.id, `company.${status}`, 'company', req.params.id, JSON.stringify({ status }), req.ip]
  );

  return res.json(result.rows[0]);
}

module.exports = { list, getOne, create, update, setStatus };
