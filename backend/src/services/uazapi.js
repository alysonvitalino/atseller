const https = require('https');
const http = require('http');
const url = require('url');

const BASE_URL = process.env.UAZAPI_BASE_URL;
const API_KEY = process.env.UAZAPI_API_KEY;

const REQUEST_TIMEOUT_MS = 10_000;

function request(method, path, body = null) {
  if (!BASE_URL) {
    return Promise.reject(new Error('UAZAPI_BASE_URL não configurado.'));
  }

  return new Promise((resolve, reject) => {
    const parsed = url.parse(`${BASE_URL}${path}`);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.path,
      method,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': API_KEY,
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(Object.assign(new Error(parsed.message || 'UazAPI error'), { status: res.statusCode, body: parsed }));
          } else {
            resolve(parsed);
          }
        } catch {
          resolve(data);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(Object.assign(new Error('UazAPI timeout — servidor não respondeu em 10s'), { code: 'ETIMEDOUT' }));
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        reject(Object.assign(err, { uazapiOffline: true }));
      } else {
        reject(err);
      }
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function createInstance(instanceName, webhookUrl) {
  return request('POST', '/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    webhook: {
      enabled: true,
      url: webhookUrl,
      events: [
        'MESSAGES_UPSERT',
        'CONNECTION_UPDATE',
        'QRCODE_UPDATED',
        'MESSAGES_UPDATE',
      ],
    },
  });
}

async function getQRCode(instanceName) {
  return request('GET', `/instance/${instanceName}/connect`);
}

async function getConnectionState(instanceName) {
  return request('GET', `/instance/${instanceName}/connectionState`);
}

async function logoutInstance(instanceName) {
  return request('DELETE', `/instance/${instanceName}/logout`);
}

async function deleteInstance(instanceName) {
  return request('DELETE', `/instance/${instanceName}/delete`);
}

async function sendText(instanceName, to, text) {
  return request('POST', `/message/sendText/${instanceName}`, {
    number: to,
    text,
  });
}

async function sendTyping(instanceName, to, durationMs = 3000) {
  return request('POST', `/chat/presence/${instanceName}`, {
    number: to,
    options: { presence: 'composing', delay: durationMs },
  });
}

module.exports = {
  createInstance,
  getQRCode,
  getConnectionState,
  logoutInstance,
  deleteInstance,
  sendText,
  sendTyping,
};
