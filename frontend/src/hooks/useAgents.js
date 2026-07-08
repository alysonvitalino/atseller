import { useState, useEffect, useCallback } from 'react';
import { http } from '../lib/api';
import toast from 'react-hot-toast';

export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const { data } = await http.get('/agents', { params: { search } });
      setAgents(data.data);
      setTotal(data.total);
    } catch {
      toast.error('Erro ao carregar agentes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const deleteAgent = useCallback(async (id) => {
    await http.delete(`/agents/${id}`);
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => t - 1);
  }, []);

  return { agents, total, loading, fetchAgents, deleteAgent };
}

export function useAgent(id) {
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    http.get(`/agents/${id}`)
      .then(({ data }) => setAgent(data))
      .catch(() => toast.error('Erro ao carregar agente.'))
      .finally(() => setLoading(false));
  }, [id]);

  return { agent, loading };
}

export function useAvailableTools() {
  const [tools, setTools] = useState([]);
  useEffect(() => {
    http.get('/agents/tools').then(({ data }) => setTools(data)).catch(() => {});
  }, []);
  return tools;
}
