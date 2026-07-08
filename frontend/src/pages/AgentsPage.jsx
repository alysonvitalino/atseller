import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAgents } from '../hooks/useAgents';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

const PERSONALITY_LABELS = {
  formal: 'Formal',
  consultive: 'Consultivo',
  friendly: 'Amigável',
  sales: 'Vendedor',
  technical: 'Técnico',
};

const PERSONALITY_COLORS = {
  formal: 'blue',
  consultive: 'green',
  friendly: 'yellow',
  sales: 'red',
  technical: 'gray',
};

export default function AgentsPage() {
  const navigate = useNavigate();
  const { agents, total, loading, fetchAgents, deleteAgent } = useAgents();
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(agent) {
    if (!confirm(`Excluir o agente "${agent.name}"? Esta ação é irreversível.`)) return;
    setDeletingId(agent.id);
    try {
      await deleteAgent(agent.id);
      toast.success('Agente excluído.');
    } catch {
      toast.error('Erro ao excluir agente.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Agentes de IA</h1>
          <p className="text-sm text-neutral-500 mt-1">{total} agente{total !== 1 ? 's' : ''} configurado{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => navigate('/agents/new')}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo agente
        </Button>
      </div>

      <div className="mb-4">
        <Input
          placeholder="Buscar agentes..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); fetchAgents(e.target.value); }}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200">
          <EmptyState
            title="Nenhum agente criado"
            description="Crie seu primeiro agente de IA para automatizar o atendimento."
            action={<Button size="sm" onClick={() => navigate('/agents/new')}>Criar primeiro agente</Button>}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={() => navigate(`/agents/${agent.id}/edit`)}
              onDelete={() => handleDelete(agent)}
              deleting={deletingId === agent.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent, onEdit, onDelete, deleting }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-col gap-4 hover:border-neutral-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">{agent.name}</h3>
            <Badge variant={PERSONALITY_COLORS[agent.personality] || 'gray'} className="mt-0.5">
              {PERSONALITY_LABELS[agent.personality] || agent.personality}
            </Badge>
          </div>
        </div>
        <Badge variant={agent.status === 'active' ? 'green' : 'gray'}>
          {agent.status === 'active' ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>

      {agent.description && (
        <p className="text-xs text-neutral-500 line-clamp-2">{agent.description}</p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Delay" value={`${agent.delay_min}–${agent.delay_max}s`} />
        <Stat label="Documentos" value={agent.document_count ?? 0} />
        <Stat label="Chunks" value={agent.chunk_count ?? 0} />
      </div>

      {agent.tools?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agent.tools.slice(0, 3).map((t) => (
            <span key={t} className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">
              {t.replace(/_/g, ' ')}
            </span>
          ))}
          {agent.tools.length > 3 && (
            <span className="text-xs text-neutral-400">+{agent.tools.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1 border-t border-neutral-100">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
          Editar
        </Button>
        <Button variant="danger" size="sm" loading={deleting} onClick={onDelete}>
          Excluir
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-neutral-50 rounded-lg py-2 px-1">
      <p className="text-xs font-semibold text-neutral-800">{value}</p>
      <p className="text-xs text-neutral-400 mt-0.5">{label}</p>
    </div>
  );
}
