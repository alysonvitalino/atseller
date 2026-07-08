const pool = require('../database/connection');
const uazapi = require('../services/uazapi');
const sseManager = require('../services/sseManager');
const { addClient } = require('../services/sseManager');

function buildInstanceName(companyId) {
  // nomes curtos e únicos por empresa
  return `atseller-${companyId.replace(/-/g, '').slice(0, 12)}`;
}

async function getStatus(req, res) {
  const result = await pool.query(
    'SELECT * FROM whatsapp_connections WHERE company_id = $1',
    [req.user.company_id]
  );
  return res.json(result.rows[0] || { status: 'disconnected' });
}

async function connect(req, res) {
  const companyId = req.user.company_id;
  const instanceName = buildInstanceName(companyId);
  const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/webhooks/whatsapp`;

  // verifica se já existe conexão ativa
  const existing = await pool.query(
    'SELECT * FROM whatsapp_connections WHERE company_id = $1',
    [companyId]
  );

  if (existing.rows[0]?.status === 'connected') {
    return res.status(409).json({ error: 'WhatsApp já está conectado.' });
  }

  try {
    // cria ou recria a instância na UazAPI
    await uazapi.createInstance(instanceName, webhookUrl).catch(() => {
      // ignora erro se instância já existir
    });

    // atualiza ou insere o registro de conexão
    const conn = await pool.query(
      `INSERT INTO whatsapp_connections (company_id, instance_name, status)
       VALUES ($1, $2, 'connecting')
       ON CONFLICT (company_id) DO UPDATE
         SET instance_name = $2, status = 'connecting', updated_at = NOW()
       RETURNING *`,
      [companyId, instanceName]
    );

    // obtém o QR Code inicial
    let qrData = null;
    try {
      qrData = await uazapi.getQRCode(instanceName);
    } catch {
      // QR pode demorar um instante para ser gerado
    }

    sseManager.emit(companyId, 'status', { status: 'connecting', instance: instanceName });

    return res.json({ connection: conn.rows[0], qr: qrData });
  } catch (err) {
    console.error('Erro ao conectar WhatsApp:', err);
    return res.status(500).json({ error: 'Erro ao iniciar conexão com WhatsApp.' });
  }
}

async function getQRCode(req, res) {
  const companyId = req.user.company_id;
  const conn = await pool.query(
    'SELECT * FROM whatsapp_connections WHERE company_id = $1',
    [companyId]
  );

  if (!conn.rows[0]) return res.status(404).json({ error: 'Nenhuma conexão iniciada.' });
  if (conn.rows[0].status === 'connected') return res.json({ status: 'connected' });

  try {
    const qrData = await uazapi.getQRCode(conn.rows[0].instance_name);
    return res.json(qrData);
  } catch (err) {
    return res.status(502).json({ error: 'Não foi possível obter o QR Code da UazAPI.' });
  }
}

async function disconnect(req, res) {
  const companyId = req.user.company_id;
  const conn = await pool.query(
    'SELECT * FROM whatsapp_connections WHERE company_id = $1',
    [companyId]
  );

  if (!conn.rows[0]) return res.status(404).json({ error: 'Nenhuma conexão encontrada.' });

  try {
    await uazapi.logoutInstance(conn.rows[0].instance_name).catch(() => {});
  } catch {
    // continua mesmo se a UazAPI falhar
  }

  await pool.query(
    `UPDATE whatsapp_connections
     SET status = 'disconnected', phone = NULL, connected_at = NULL, updated_at = NOW()
     WHERE company_id = $1`,
    [companyId]
  );

  sseManager.emit(companyId, 'status', { status: 'disconnected' });

  return res.json({ message: 'WhatsApp desconectado.' });
}

async function reconnect(req, res) {
  const companyId = req.user.company_id;
  const conn = await pool.query(
    'SELECT * FROM whatsapp_connections WHERE company_id = $1',
    [companyId]
  );

  if (!conn.rows[0]) return connect(req, res);

  try {
    await uazapi.logoutInstance(conn.rows[0].instance_name).catch(() => {});
    await pool.query(
      `UPDATE whatsapp_connections SET status = 'connecting', phone = NULL, updated_at = NOW()
       WHERE company_id = $1`,
      [companyId]
    );

    const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/webhooks/whatsapp`;
    await uazapi.createInstance(conn.rows[0].instance_name, webhookUrl).catch(() => {});

    let qrData = null;
    try { qrData = await uazapi.getQRCode(conn.rows[0].instance_name); } catch {}

    sseManager.emit(companyId, 'status', { status: 'connecting' });
    return res.json({ status: 'connecting', qr: qrData });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao reconectar.' });
  }
}

// SSE — stream de eventos em tempo real para o frontend
function subscribe(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const companyId = req.user.company_id;
  addClient(companyId, res);

  // envia o status atual imediatamente ao conectar
  pool.query('SELECT * FROM whatsapp_connections WHERE company_id = $1', [companyId])
    .then(({ rows }) => {
      const status = rows[0]?.status || 'disconnected';
      res.write(`event: status\ndata: ${JSON.stringify({ status, phone: rows[0]?.phone, last_heartbeat: rows[0]?.last_heartbeat })}\n\n`);
    })
    .catch(() => {});

  // keep-alive a cada 30 segundos
  const keepAlive = setInterval(() => {
    try { res.write(': ping\n\n'); } catch { clearInterval(keepAlive); }
  }, 30000);

  req.on('close', () => clearInterval(keepAlive));
}

module.exports = { getStatus, connect, getQRCode, disconnect, reconnect, subscribe };
