const pool = require('../database/connection');

function auditLog(action, entityType = null) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode < 400 && req.user) {
        try {
          await pool.query(
            `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, metadata, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              req.user.company_id,
              req.user.id,
              action,
              entityType,
              body?.id || req.params?.id || null,
              JSON.stringify({ method: req.method, path: req.path }),
              req.ip,
            ]
          );
        } catch (err) {
          console.error('Falha ao registrar auditoria:', err.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog };
