import { useState, useEffect, useRef, useCallback } from 'react';
import { http } from '../lib/api';

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const cancelledRef = useRef(false);

  const fetchConversations = useCallback(async (currentFilters) => {
    try {
      const params = {};
      if (currentFilters?.status) params.status = currentFilters.status;
      if (currentFilters?.search) params.search = currentFilters.search;
      const { data } = await http.get('/conversations', { params });
      if (!cancelledRef.current) setConversations(data);
    } catch {
      // silencioso — SSE já recarrega quando necessário
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, []);

  // SSE: recebe novas mensagens e atualizações de status em tempo real
  useEffect(() => {
    cancelledRef.current = false;

    async function connectSSE() {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      try {
        const response = await fetch('/api/whatsapp/events', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = null;

        while (!cancelledRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              try {
                const payload = JSON.parse(line.slice(5).trim());

                if (currentEvent === 'message') {
                  // atualiza última mensagem na lista sem refetch completo
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === payload.conversationId
                        ? {
                            ...c,
                            last_message: payload.content,
                            last_message_sender_type: payload.senderType,
                            last_message_at: new Date().toISOString(),
                          }
                        : c
                    )
                  );
                } else if (currentEvent === 'conversation_update') {
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.id === payload.conversationId
                        ? {
                            ...c,
                            status: payload.status ?? c.status,
                            assigned_operator_id: payload.assigned_operator_id !== undefined
                              ? payload.assigned_operator_id
                              : c.assigned_operator_id,
                            operator_name: payload.operator_name !== undefined
                              ? payload.operator_name
                              : c.operator_name,
                          }
                        : c
                    )
                  );
                }
              } catch {}
              currentEvent = null;
            }
          }
        }
      } catch {
        if (!cancelledRef.current) setTimeout(connectSSE, 5000);
      }
    }

    fetchConversations(filters);
    connectSSE();

    return () => {
      cancelledRef.current = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // refetch quando filtros mudam
  useEffect(() => {
    setLoading(true);
    fetchConversations(filters);
  }, [filters, fetchConversations]);

  return {
    conversations,
    loading,
    filters,
    setFilters,
    refresh: () => fetchConversations(filters),
  };
}

export function useConversation(id) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const cancelledRef = useRef(false);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await http.get(`/conversations/${id}`);
      if (!cancelledRef.current) {
        const { messages: msgs, ...conv } = data;
        setConversation(conv);
        setMessages(msgs || []);
      }
    } catch {
      // ignora
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    cancelledRef.current = false;
    fetch();
    return () => {
      cancelledRef.current = true;
    };
  }, [fetch]);

  // recebe eventos SSE via prop callback
  const handleSSEMessage = useCallback((payload) => {
    if (payload.conversationId !== id) return;
    const newMsg = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      conversation_id: id,
      role: payload.role,
      content: payload.content,
      sender_type: payload.senderType,
      sender_name: payload.senderName || null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
  }, [id]);

  const handleSSEConversationUpdate = useCallback((payload) => {
    if (payload.conversationId !== id) return;
    setConversation((prev) =>
      prev
        ? {
            ...prev,
            status: payload.status ?? prev.status,
            assigned_operator_id: payload.assigned_operator_id !== undefined
              ? payload.assigned_operator_id
              : prev.assigned_operator_id,
            operator_name: payload.operator_name !== undefined
              ? payload.operator_name
              : prev.operator_name,
          }
        : prev
    );
  }, [id]);

  const assume = useCallback(async () => {
    setActionLoading(true);
    try {
      const { data } = await http.post(`/conversations/${id}/assume`);
      setConversation((prev) => ({ ...prev, ...data }));
      return data;
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const returnToAI = useCallback(async () => {
    setActionLoading(true);
    try {
      const { data } = await http.post(`/conversations/${id}/return-to-ai`);
      setConversation((prev) => ({ ...prev, ...data }));
      return data;
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const close = useCallback(async () => {
    setActionLoading(true);
    try {
      const { data } = await http.post(`/conversations/${id}/close`);
      setConversation((prev) => ({ ...prev, ...data }));
      return data;
    } finally {
      setActionLoading(false);
    }
  }, [id]);

  const sendMessage = useCallback(async (text) => {
    const { data } = await http.post(`/conversations/${id}/messages`, { text });
    setMessages((prev) => [...prev, data]);
    return data;
  }, [id]);

  return {
    conversation,
    messages,
    loading,
    actionLoading,
    refresh: fetch,
    assume,
    returnToAI,
    close,
    sendMessage,
    handleSSEMessage,
    handleSSEConversationUpdate,
  };
}
