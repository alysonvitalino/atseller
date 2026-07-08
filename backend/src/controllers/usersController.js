const bcrypt = require('bcryptjs');
const pool = require('../database/connection');

async function list(req, res) {
  // admin pode passar company_id; gestor vê apenas a própria empresa
  const companyId = req.user.role === 'platform_admin'
    ? (req.params.companyId || req.query.company_id)
    : req.user.company_id;

  const { search, role, status = 'active', page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['u.role != $1'];
  const params = ['platform_admin'];

  if (companyId) {
    params.push(companyId);
    conditions.push(`u.company_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`u.status = $${params.length}`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.last_login_at, u.created_at,
              c.name AS company_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM users u ${where}`, params),
  ]);

  return res.json({ data: rows, total: Number(countRows[0].count), page: Number(page), limit: Number(limit) });
}

async function getOne(req, res) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.last_login_at, u.created_at, c.name AS company_name
     FROM users u LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });

  // gestor só vê usuários da própria empresa
  if (req.user.role === 'gestor' && result.rows[0].company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  return res.json(result.rows[0]);
}

async function create(req, res) {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  // gestor só pode criar operadores na própria empresa
  const companyId = req.user.role === 'platform_admin'
    ? req.body.company_id
    : req.user.company_id;

  const allowedRoles = req.user.role === 'platform_admin'
    ? ['gestor', 'operador']
    : ['operador'];

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: `Você não pode criar usuários com o role "${role}".` });
  }

  if (!companyId && role !== 'platform_admin') {
    return res.status(400).json({ error: 'company_id é obrigatório.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, company_id, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, name, email, role, status, company_id, created_at`,
      [name.trim(), email.toLowerCase().trim(), passwordHash, role, companyId || null]
    );

    await pool.query(
      'INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [companyId, req.user.id, 'user.create', 'user', result.rows[0].id, req.ip]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'E-mail já está em uso.' });
    throw err;
  }
}

async function update(req, res) {
  const { name, email, role, status } = req.body;
  const target = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!target.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (req.user.role === 'gestor' && target.rows[0].company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, role, status, company_id`,
      [name?.trim(), email?.toLowerCase().trim(), role, status, req.params.id]
    );

    await pool.query(
      'INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [target.rows[0].company_id, req.user.id, 'user.update', 'user', req.params.id, req.ip]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'E-mail já está em uso.' });
    throw err;
  }
}

async function resetPassword(req, res) {
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' });
  }

  const target = await pool.query('SELECT company_id FROM users WHERE id = $1', [req.params.id]);
  if (!target.rows[0]) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (req.user.role === 'gestor' && target.rows[0].company_id !== req.user.company_id) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, req.params.id]);
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.params.id]);

  return res.json({ message: 'Senha redefinida com sucesso.' });
}

module.exports = { list, getOne, create, update, resetPassword };
