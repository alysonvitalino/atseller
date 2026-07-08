// Gerencia conexões SSE por empresa
// Map: companyId → Set de objetos { res, id }
const clients = new Map();

function addClient(companyId, res) {
  if (!clients.has(companyId)) clients.set(companyId, new Set());
  const client = { res, id: Date.now() };
  clients.get(companyId).add(client);

  res.on('close', () => {
    clients.get(companyId)?.delete(client);
    if (clients.get(companyId)?.size === 0) clients.delete(companyId);
  });

  return client;
}

function emit(companyId, event, data) {
  const companyClients = clients.get(companyId);
  if (!companyClients || companyClients.size === 0) return;

  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of companyClients) {
    try {
      client.res.write(payload);
    } catch {
      companyClients.delete(client);
    }
  }
}

function emitToAll(event, data) {
  for (const [companyId] of clients) {
    emit(companyId, event, data);
  }
}

module.exports = { addClient, emit, emitToAll };
