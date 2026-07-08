const jwt = require('jsonwebtoken');
const pool = require('../database/connection');

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação ausente.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, name, email, role, company_id, status FROM users WHERE id = $1',
      [payload.sub]
    );

    if (!result.rows[0] || result.rows[0].status !== 'active') {
      return res.status(401).json({ error: 'Usuário não encontrado ou inativo.' });
    }

    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Acesso negado: permissão insuficiente.' });
    }
    next();
  };
}

// Injeta company_id nas queries — platform_admin pode acessar via query param
function tenantScope(req, res, next) {
  if (req.user.role === 'platform_admin') {
    req.companyId = req.query.company_id || null;
  } else {
    req.companyId = req.user.company_id;
  }
  next();
}

module.exports = { authenticate, requireRole, tenantScope };
