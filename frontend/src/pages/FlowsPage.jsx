import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setFlows((prev) => prev.map((f) => f.id === id ? { ...f, is_active: data.flow.is_active } : { ...f, is_active: false }));
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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fluxos de Atendimento</h1>
          <p className="text-gray-500 text-sm mt-1">Construa fluxos visuais de automação com IA</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Novo fluxo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-400">Carregando...</div>
      ) : flows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🔀</div>
          <p className="text-lg font-medium text-gray-600">Nenhum fluxo criado ainda</p>
          <p className="text-sm mt-1">Crie seu primeiro fluxo para começar a automatizar atendimentos.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Criar fluxo
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <div key={flow.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{flow.name}</h3>
                  {flow.description && (
                    <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{flow.description}</p>
                  )}
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                  flow.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {flow.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="mt-3 text-xs text-gray-400">
                {flow.node_count} nós · Editado {new Date(flow.updated_at).toLocaleDateString('pt-BR')}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate(`/flows/${flow.id}`)}
                  className="flex-1 text-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggle(flow.id)}
                  className={`text-sm px-3 py-1.5 rounded-lg ${
                    flow.is_active
                      ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {flow.is_active ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => handleDelete(flow.id, flow.name)}
                  className="text-sm text-red-400 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* modal de criação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Novo fluxo</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Fluxo de Vendas Automóveis"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Breve descrição do objetivo deste fluxo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !newName.trim()} className="text-sm bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {creating ? 'Criando...' : 'Criar e editar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
