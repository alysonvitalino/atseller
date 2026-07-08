const { EventEmitter } = require('events');
const pool = require('../database/connection');

// emitter para notificar o engine de fluxo (Fase 5)
const emitter = new EventEmitter();
emitter.setMaxListeners(50);

async function enqueue(companyId, instanceName, eventType, payload) {
  // persiste na tabela para auditoria e replay
  await pool.query(
    `INSERT INTO whatsapp_messages_queue (company_id, instance_name, event_type, payload)
     VALUES ($1, $2, $3, $4)`,
    [companyId, instanceName, eventType, JSON.stringify(payload)]
  );

  // notifica listeners síncronos (engine de fluxo na Fase 5 vai escutar aqui)
  emitter.emit('message', { companyId, instanceName, eventType, payload });
}

async function markProcessed(queueId) {
  await pool.query('UPDATE whatsapp_messages_queue SET processed = TRUE WHERE id = $1', [queueId]);
}

function onMessage(handler) {
  emitter.on('message', handler);
  return () => emitter.off('message', handler);
}

module.exports = { enqueue, markProcessed, onMessage };
