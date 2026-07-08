const { onMessage } = require('../services/messageQueue');
const { handleIncomingMessage } = require('./flowRunner');

function startEngine() {
  console.log('🤖 Engine de fluxos iniciada.');

  const unsubscribe = onMessage(async (event) => {
    if (event.eventType !== 'message.received') return;

    const { companyId, instanceName, payload } = event;

    // payload é o objeto msg bruto da UazAPI
    const phone = payload?.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const contactName = payload?.pushName || phone;
    const text = payload?.message?.conversation
      || payload?.message?.extendedTextMessage?.text
      || null;

    if (!text || !phone) return;

    await handleIncomingMessage(companyId, instanceName, phone, contactName, text);
  });

  // limpa listener ao encerrar o processo
  process.on('SIGTERM', unsubscribe);
  process.on('SIGINT', unsubscribe);
}

module.exports = { startEngine };
