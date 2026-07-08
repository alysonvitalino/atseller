import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { http } from '../lib/api';
import toast from 'react-hot-toast';

export default function FlowsPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  async function loadFlows() {
    try {
      const { data } = await http.get('/flows');
      setFlows(data.flows || []);
    } catch {
      toast.error('Erro ao carregar fluxos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFlows(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await http.post('/flows', { name: newName.trim(), description: newDesc.trim() });
      toast.success('Fluxo criado!');
      setShowModal(false);
      setNewName('');
      setNewDesc('');
      navigate(`/flows/${data.flow.id}`);
    } catch {
      toast.error('Erro ao criar fluxo.');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id) {
    try {
      const { data } = await http.patch(`/flows/${id}/toggle-active`);
      setFlows((prev) => prev.map((f) =>
        f.id === id ? { ...f, is_active: data.flow.is_active } : { ...f, is_active: false }
      ));
      toast.success(data.flow.is_active ? 'Fluxo ativado!' : 'Fluxo desativado.');
    } catch {
      toast.error('Erro ao alterar status.');
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Remover o fluxo "${name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await http.delete(`/flows/${id}`);
      setFlows((prev) => prev.filter((f) => f.id !== id));
      toast.success('Fluxo removido.');
    } catch {
      toast.error('Erro ao remover fluxo.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Fluxos de Atendimento</h1>
          <p className="text-sm text-neutral-500 mt-1">Construa fluxos visuais de automação com agentes de IA</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo fluxo
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-neutral-200 rounded-xl p-5 animate-pulse">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-neutral-100 rounded w-2/3" />
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                </div>
                <div className="h-5 w-12 bg-neutral-100 rounded-full" />
              </div>
              <div className="h-3 bg-neutral-100 rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-8 bg-neutral-100 rounded-lg flex-1" />
                <div className="h-8 bg-neutral-100 rounded-lg w-20" />
                <div className="h-8 bg-neutral-100 rounded-lg w-10" />
              </div>
            </div>
          ))}
        </div>
      ) : flows.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 py-16 flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-neutral-700">Nenhum fluxo criado ainda</p>
          <p className="text-xs text-neutral-400 mt-1 mb-5">Crie seu primeiro fluxo para automatizar atendimentos com IA.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Criar primeiro fluxo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onEdit={() => navigate(`/flows/${flow.id}`)}
              onToggle={() => handleToggle(flow.id)}
              onDelete={() => handleDelete(flow.id, flow.name)}
            />
          ))}
        </div>
      )}

      {/* modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-neutral-900">Novo fluxo</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Nome *</label>
                <input
                  autoFocus
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Fluxo de Vendas"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1.5">Descrição (opcional)</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Breve descrição do objetivo deste fluxo"
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {creating ? 'Criando...' : 'Criar e editar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FlowCard({ flow, onEdit, onToggle, onDelete }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 truncate">{flow.name}</h3>
          {flow.description && (
            <p className="text-neutral-500 text-xs mt-0.5 line-clamp-2">{flow.description}</p>
          )}
        </div>
        <span className={clsx(
          'shrink-0 text-xs px-2 py-0.5 rounded-full font-medium',
          flow.is_active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'
        )}>
          {flow.is_active ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        {flow.node_count ?? 0} nós · Editado {new Date(flow.updated_at).toLocaleDateString('pt-BR')}
      </p>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onEdit}
          className="flex-1 text-center text-sm bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          Editar
        </button>
        <button
          onClick={onToggle}
          className={clsx(
            'text-sm px-3 py-1.5 rounded-lg transition-colors',
            flow.is_active
              ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              : 'bg-green-50 text-green-700 hover:bg-green-100'
          )}
        >
          {flow.is_active ? 'Desativar' : 'Ativar'}
        </button>
        <button
          onClick={onDelete}
          className="text-sm text-neutral-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
