const pool = require('../database/connection');
const sseManager = require('../services/sseManager');
const { enqueue } = require('../services/messageQueue');

// mapeia instanceName → companyId (cache em memória)
const instanceCompanyCache = new Map();

async function resolveCompany(instanceName) {
  if (instanceCompanyCache.has(instanceName)) {
    return instanceCompanyCache.get(instanceName);
  }
  const result = await pool.query(
    'SELECT company_id FROM whatsapp_connections WHERE instance_name = $1',
    [instanceName]
  );
  if (result.rows[0]) {
    instanceCompanyCache.set(instanceName, result.rows[0].company_id);
    return result.rows[0].company_id;
  }
  return null;
}

async function handleWhatsApp(req, res) {
  // responde 200 imediatamente para a UazAPI não reenviar
  res.status(200).json({ received: true });

  const { event, instance, data } = req.body;
  if (!event || !instance) return;

  try {
    const companyId = await resolveCompany(instance);
    if (!companyId) {
      console.warn(`Webhook ignorado: instância desconhecida "${instance}"`);
      return;
    }

    switch (event) {
      case 'connection.update':
      case 'CONNECTION_UPDATE':
        await handleConnectionUpdate(companyId, instance, data);
        break;

      case 'qrcode.updated':
      case 'QRCODE_UPDATED':
        sseManager.emit(companyId, 'qr', { qr: data?.qrcode || data?.base64 || data });
        break;

      case 'messages.upsert':
      case 'MESSAGES_UPSERT':
        await handleMessagesUpsert(companyId, instance, data);
        break;

      case 'messages.update':
      case 'MESSAGES_UPDATE':
        // confirmação de entrega — pode ser expandido futuramente
        break;

      default:
        // evento não tratado, registra para debugging
        console.debug(`Webhook event não tratado: ${event} (${instance})`);
    }
  } catch (err) {
    console.error('Erro ao processar webhook:', err);
  }
}

async function handleConnectionUpdate(companyId, instanceName, data) {
  const state = data?.state || data?.connection;

  const statusMap = {
    open: 'connected',
    close: 'disconnected',
    connecting: 'connecting',
  };

  const newStatus = statusMap[state] || 'error';
  const phone = data?.instance?.wuid?.replace('@s.whatsapp.net', '') || null;

  await pool.query(
    `UPDATE whatsapp_connections
     SET status = $1,
         phone = COALESCE($2, phone),
         last_heartbeat = NOW(),
         connected_at = CASE WHEN $1 = 'connected' THEN NOW() ELSE connected_at END,
         updated_at = NOW()
     WHERE company_id = $3`,
    [newStatus, phone, companyId]
  );

  sseManager.emit(companyId, 'status', {
    status: newStatus,
    phone,
    last_heartbeat: new Date().toISOString(),
  });
}

async function handleMessagesUpsert(companyId, instanceName, data) {
  const messages = Array.isArray(data?.messages) ? data.messages : [data];

  for (const msg of messages) {
    // ignora mensagens enviadas pelo próprio número
    if (msg?.key?.fromMe) continue;
    // ignora mensagens de grupos por ora
    if (msg?.key?.remoteJid?.endsWith('@g.us')) continue;

    // atualiza contador de mensagens recebidas
    await pool.query(
      `UPDATE whatsapp_connections
       SET stats = jsonb_set(stats, '{messages_received}',
           ((stats->>'messages_received')::int + 1)::text::jsonb),
           last_heartbeat = NOW(),
           updated_at = NOW()
       WHERE company_id = $1`,
      [companyId]
    );

    // enfileira para o engine de fluxo processar (Fase 5)
    await enqueue(companyId, instanceName, 'message.received', msg);

    // notifica frontend via SSE
    sseManager.emit(companyId, 'message', {
      from: msg?.key?.remoteJid?.replace('@s.whatsapp.net', ''),
      text: msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || '[mídia]',
      timestamp: msg?.messageTimestamp,
    });
  }
}

module.exports = { handleWhatsApp };
