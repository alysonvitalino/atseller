const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../database/connection');
const { sendPasswordResetEmail } = require('../services/email');
const {
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
} = require('../utils/tokens');

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  const result = await pool.query(
    `SELECT u.*, c.name as company_name, c.status as company_status
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Conta inativa. Contate o administrador.' });
  }

  if (user.company_id && user.company_status === 'blocked') {
    return res.status(403).json({ error: 'Empresa bloqueada. Contate o suporte.' });
  }

  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  // registra auditoria de login
  await pool.query(
    'INSERT INTO audit_logs (company_id, user_id, action, ip_address) VALUES ($1, $2, $3, $4)',
    [user.company_id, user.id, 'login', req.ip]
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
  });
}

async function logout(req, res) {
  const rawToken = req.cookies?.refreshToken;

  if (rawToken) {
    await revokeRefreshToken(rawToken);
    if (req.user) {
      await pool.query(
        'INSERT INTO audit_logs (company_id, user_id, action, ip_address) VALUES ($1, $2, $3, $4)',
        [req.user.company_id, req.user.id, 'logout', req.ip]
      );
    }
  }

  clearRefreshCookie(res);
  return res.json({ message: 'Logout realizado com sucesso.' });
}

async function refresh(req, res) {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    return res.status(401).json({ error: 'Refresh token ausente.' });
  }

  const tokenData = await validateRefreshToken(rawToken);
  if (!tokenData) {
    clearRefreshCookie(res);
    return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
  }

  const accessToken = generateAccessToken({
    id: tokenData.user_id,
    role: tokenData.role,
    company_id: tokenData.company_id,
  });

  return res.json({ accessToken });
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  const user = result.rows[0];

  // sempre retorna 200 para não vazar quais e-mails existem
  if (!user) return res.json({ message: 'Se o e-mail existir, você receberá as instruções.' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await pool.query(
    'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3',
    [tokenHash, expiresAt, user.id]
  );

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await sendPasswordResetEmail(user.email, user.name, resetUrl);
  } catch (err) {
    console.error('Falha ao enviar e-mail de recuperação:', err.message);
  }

  return res.json({ message: 'Se o e-mail existir, você receberá as instruções.' });
}

async function resetPassword(req, res) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await pool.query(
    'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires_at > NOW()',
    [tokenHash]
  );

  const user = result.rows[0];
  if (!user) {
    return res.status(400).json({ error: 'Token inválido ou expirado.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE id = $2',
    [passwordHash, user.id]
  );

  // invalida todos os refresh tokens do usuário por segurança
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

  return res.json({ message: 'Senha redefinida com sucesso. Faça login.' });
}

async function me(req, res) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.company_id, c.name as company_name
     FROM users u
     LEFT JOIN companies c ON c.id = u.company_id
     WHERE u.id = $1`,
    [req.user.id]
  );

  return res.json(result.rows[0]);
}

module.exports = { login, logout, refresh, forgotPassword, resetPassword, me };
