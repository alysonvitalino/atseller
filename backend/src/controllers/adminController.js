const pool = require('../database/connection');
const { generateAccessToken, generateRefreshToken, setRefreshCookie } = require('../utils/tokens');

async function impersonate(req, res) {
  const target = await pool.query(
    `SELECT u.*, c.name as company_name, c.status as company_status
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1`,
    [req.params.userId]
  );

  const user = target.rows[0];
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  if (user.status !== 'active') return res.status(400).json({ error: 'Usuário inativo.' });
  if (user.role === 'platform_admin') return res.status(403).json({ error: 'Não é possível impersonar outro admin.' });

  await pool.query(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
    [req.user.id, 'admin.impersonate', 'user', user.id, JSON.stringify({ target_email: user.email }), req.ip]
  );

  const accessToken = generateAccessToken(user);
  const refreshToken = await generateRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  return res.json({
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.company_id,
      companyName: user.company_name,
    },
    impersonatedBy: req.user.id,
  });
}

async function getAuditLogs(req, res) {
  const { company_id, user_id, action, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (company_id) { params.push(company_id); conditions.push(`al.company_id = $${params.length}`); }
  if (user_id) { params.push(user_id); conditions.push(`al.user_id = $${params.length}`); }
  if (action) { params.push(`%${action}%`); conditions.push(`al.action ILIKE $${params.length}`); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [{ rows }, { rows: countRows }] = await Promise.all([
    pool.query(
      `SELECT al.*, u.name AS user_name, u.email AS user_email, c.name AS company_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       LEFT JOIN companies c ON c.id = al.company_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params),
  ]);

  return res.json({ data: rows, total: Number(countRows[0].count), page: Number(page), limit: Number(limit) });
}

module.exports = { impersonate, getAuditLogs };
