import { useState, useEffect, useRef, useCallback } from 'react';
import { http } from '../lib/api';

export function useWhatsApp() {
  const [connection, setConnection] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const eventSourceRef = useRef(null);
  const qrPollingRef = useRef(null);

  // busca status inicial
  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await http.get('/whatsapp/status');
      setConnection(data);
      return data;
    } catch {
      setConnection({ status: 'disconnected' });
    } finally {
      setLoading(false);
    }
  }, []);

  // polling do QR Code enquanto está conectando
  const startQrPolling = useCallback(() => {
    if (qrPollingRef.current) return;
    qrPollingRef.current = setInterval(async () => {
      try {
        const { data } = await http.get('/whatsapp/qr');
        if (data.status === 'connected') {
          stopQrPolling();
          return;
        }
        // UazAPI retorna o QR como base64 ou como string
        const qr = data?.base64 || data?.qrcode || data?.code;
        if (qr) setQrCode(qr);
      } catch {
        // silencioso — QR pode não estar disponível ainda
      }
    }, 5000);
  }, []);

  const stopQrPolling = useCallback(() => {
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
      qrPollingRef.current = null;
    }
    setQrCode(null);
  }, []);

  // SSE para receber atualizações de status em tempo real
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // EventSource não suporta headers nativamente; usamos fetch + ReadableStream
    let cancelled = false;

    async function connectSSE() {
      try {
        const response = await fetch('/api/whatsapp/events', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          let currentEvent = null;
          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              try {
                const payload = JSON.parse(line.slice(5).trim());
                if (currentEvent === 'status') {
                  setConnection((prev) => ({ ...prev, ...payload }));
                  if (payload.status === 'connecting') startQrPolling();
                  else stopQrPolling();
                } else if (currentEvent === 'qr') {
                  const qr = payload?.qr || payload?.base64 || payload?.code;
                  if (qr) setQrCode(qr);
                }
              } catch {}
              currentEvent = null;
            }
          }
        }
      } catch {
        // reconecta após 5 segundos em caso de falha
        if (!cancelled) setTimeout(connectSSE, 5000);
      }
    }

    connectSSE();

    return () => {
      cancelled = true;
      stopQrPolling();
    };
  }, [startQrPolling, stopQrPolling]);

  useEffect(() => {
    fetchStatus().then((data) => {
      if (data?.status === 'connecting') startQrPolling();
    });
  }, [fetchStatus, startQrPolling]);

  const connect = useCallback(async () => {
    setActionLoading(true);
    try {
      const { data } = await http.post('/whatsapp/connect');
      setConnection(data.connection);
      const qr = data.qr?.base64 || data.qr?.qrcode || data.qr?.code;
      if (qr) setQrCode(qr);
      startQrPolling();
      return data;
    } finally {
      setActionLoading(false);
    }
  }, [startQrPolling]);

  const disconnect = useCallback(async () => {
    setActionLoading(true);
    try {
      await http.post('/whatsapp/disconnect');
      setConnection((prev) => ({ ...prev, status: 'disconnected', phone: null }));
      stopQrPolling();
    } finally {
      setActionLoading(false);
    }
  }, [stopQrPolling]);

  const reconnect = useCallback(async () => {
    setActionLoading(true);
    stopQrPolling();
    try {
      const { data } = await http.post('/whatsapp/reconnect');
      setConnection((prev) => ({ ...prev, status: 'connecting' }));
      const qr = data.qr?.base64 || data.qr?.qrcode || data.qr?.code;
      if (qr) setQrCode(qr);
      startQrPolling();
    } finally {
      setActionLoading(false);
    }
  }, [startQrPolling, stopQrPolling]);

  return {
    connection,
    qrCode,
    loading,
    actionLoading,
    connect,
    disconnect,
    reconnect,
    refresh: fetchStatus,
  };
}
