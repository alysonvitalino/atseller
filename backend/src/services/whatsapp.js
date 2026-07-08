const uazapi = require('./uazapi');
const pool = require('../database/connection');

async function getInstanceName(companyId) {
  const res = await pool.query(
    'SELECT instance_name FROM whatsapp_connections WHERE company_id = $1',
    [companyId]
  );
  return res.rows[0]?.instance_name || null;
}

async function sendTextMessage(instanceName, phone, text) {
  return uazapi.sendText(instanceName, phone, text);
}

async function sendTyping(instanceName, phone, durationMs = 3000) {
  return uazapi.sendTyping(instanceName, phone, durationMs);
}

module.exports = { getInstanceName, sendTextMessage, sendTyping };
