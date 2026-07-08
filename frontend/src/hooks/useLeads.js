import { useState, useEffect, useCallback } from 'react';
import { http } from '../lib/api';

export function useLeads(initialFilters = {}) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(initialFilters);

  const fetchLeads = useCallback(async (currentFilters) => {
    setLoading(true);
    try {
      const params = {};
      if (currentFilters?.search) params.search = currentFilters.search;
      if (currentFilters?.stage) params.stage = currentFilters.stage;
      if (currentFilters?.date_from) params.date_from = currentFilters.date_from;
      if (currentFilters?.date_to) params.date_to = currentFilters.date_to;
      const { data } = await http.get('/leads', { params });
      setLeads(data);
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads(filters);
  }, [filters, fetchLeads]);

  const createLead = useCallback(async (payload) => {
    const { data } = await http.post('/leads', payload);
    setLeads((prev) => [data, ...prev]);
    return data;
  }, []);

  const updateLead = useCallback(async (id, payload) => {
    const { data } = await http.put(`/leads/${id}`, payload);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
    return data;
  }, []);

  const moveStage = useCallback(async (id, stage) => {
    const { data } = await http.patch(`/leads/${id}/stage`, { stage });
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
    return data;
  }, []);

  const deleteLead = useCallback(async (id) => {
    await http.delete(`/leads/${id}`);
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return {
    leads,
    loading,
    filters,
    setFilters,
    refresh: () => fetchLeads(filters),
    createLead,
    updateLead,
    moveStage,
    deleteLead,
  };
}

export function useLeadDetail(id) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) { setLead(null); return; }
    setLoading(true);
    http.get(`/leads/${id}`)
      .then(({ data }) => setLead(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  return { lead, loading };
}
