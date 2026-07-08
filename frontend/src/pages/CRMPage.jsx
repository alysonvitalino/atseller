import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useLeads, useLeadDetail } from '../hooks/useLeads';

const STAGES = [
  { id: 'novo_lead', label: 'Novo Lead', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  { id: 'qualificado', label: 'Qualificado', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  { id: 'em_negociacao', label: 'Em Negociação', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  { id: 'venda_concluida', label: 'Venda Concluída', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function sourceLabel(source) {
  if (source === 'whatsapp') return '📱 WhatsApp';
  if (source === 'manual') return '✏️ Manual';
  return source || '—';
}

// ——— Modal de detalhe do lead
function LeadDetailModal({ id, onClose, onMoveStage, onUpdate, onDelete }) {
  const navigate = useNavigate();
  const { lead, loading } = useLeadDetail(id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  function startEdit() {
    setForm({ name: lead.name, phone: lead.phone || '', email: lead.email || '', interest: lead.interest || '' });
    setEditing(true);
  }

  async function saveEdit() {
    try {
      await onUpdate(id, form);
      setEditing(false);
      toast.success('Lead atualizado.');
    } catch {
      toast.error('Erro ao atualizar lead.');
    }
  }

  async function handleDelete() {
    if (!confirm('Excluir este lead?')) return;
    try {
      await onDelete(id);
      toast.success('Lead excluído.');
      onClose();
    } catch {
      toast.error('Erro ao excluir lead.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900">
            {loading ? 'Carregando...' : (lead?.name || 'Lead')}
          </h2>
          <div className="flex items-center gap-2">
            {!editing && lead && (
              <button
                onClick={startEdit}
                className="text-xs px-3 py-1.5 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-600"
              >
                Editar
              </button>
            )}
            {lead && (
              <button
                onClick={handleDelete}
                className="text-xs px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
              >
                Excluir
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => <div key={i} className="h-6 bg-neutral-100 rounded" />)}
            </div>
          )}

          {!loading && lead && (
            <div className="p-6 space-y-6">
              {/* dados do lead */}
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Nome *">
                      <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                    </Field>
                    <Field label="Telefone">
                      <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                    </Field>
                    <Field label="E-mail">
                      <input
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                    </Field>
                    <Field label="Interesse">
                      <input
                        value={form.interest}
                        onChange={(e) => setForm({ ...form, interest: e.target.value })}
                        className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                    </Field>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">
                      Salvar
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <InfoRow label="Nome" value={lead.name} />
                  <InfoRow label="Telefone" value={lead.phone || '—'} />
                  <InfoRow label="E-mail" value={lead.email || '—'} />
                  <InfoRow label="Origem" value={sourceLabel(lead.source)} />
                  <InfoRow label="Interesse" value={lead.interest || '—'} />
                  <InfoRow label="Criado em" value={formatDatetime(lead.created_at)} />
                </div>
              )}

              {/* estágio do pipeline */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Mover para estágio</p>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onMoveStage(id, s.id)}
                      className={clsx(
                        'text-xs px-3 py-1.5 rounded-full font-medium border transition-colors',
                        lead.pipeline_stage === s.id
                          ? `${s.color} border-current`
                          : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* conversa associada */}
              {lead.conv_id && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Conversa associada</p>
                  <button
                    onClick={() => { navigate('/conversations'); onClose(); }}
                    className="w-full text-left p-3 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-neutral-800">{lead.conv_contact_name || lead.phone}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Status: {lead.conv_status} · Última mensagem: {formatDate(lead.conv_last_message_at)}
                    </p>
                  </button>
                </div>
              )}

              {/* histórico de mensagens */}
              {lead.messages?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    Últimas mensagens ({lead.messages.length})
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-neutral-100 rounded-xl p-3">
                    {lead.messages.map((msg, i) => (
                      <div key={i} className="text-xs text-neutral-600">
                        <span className={clsx(
                          'font-medium mr-1',
                          msg.sender_type === 'contact' ? 'text-neutral-800' :
                          msg.sender_type === 'operator' ? 'text-orange-600' :
                          msg.sender_type === 'agent' ? 'text-red-600' : 'text-neutral-400'
                        )}>
                          {msg.sender_type === 'contact' ? '📱' :
                           msg.sender_type === 'agent' ? '🤖' :
                           msg.sender_type === 'operator' ? '👤' : '⚙️'}
                        </span>
                        <span className="text-neutral-500 mr-1">{formatDatetime(msg.created_at)}</span>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-neutral-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="text-sm font-medium text-neutral-800 mt-0.5">{value}</p>
    </div>
  );
}

// ——— Modal de criação de lead
function NewLeadModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', interest: '', source: 'manual' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onCreate(form);
      toast.success('Lead criado com sucesso.');
      onClose();
    } catch {
      toast.error('Erro ao criar lead.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Novo Lead</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Nome *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
              placeholder="Nome do lead"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                placeholder="5511999..."
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Interesse / Observações</label>
            <textarea
              rows={2}
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 resize-none"
              placeholder="Produto de interesse, contexto..."
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Criando...' : 'Criar Lead'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-sm font-medium rounded-lg">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ——— Coluna do Kanban
function KanbanColumn({ stage, leads, onDrop, onCardClick }) {
  const dragOverRef = useRef(false);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e) {
    e.preventDefault();
    if (!isDragOver) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) onDrop(leadId, stage.id);
  }

  return (
    <div
      className={clsx(
        'flex flex-col w-64 shrink-0 rounded-xl border transition-colors',
        isDragOver ? 'border-red-300 bg-red-50/30' : 'border-neutral-200 bg-neutral-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* cabeçalho da coluna */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200">
        <span className={clsx('w-2 h-2 rounded-full', stage.dot)} />
        <span className="text-sm font-semibold text-neutral-700 flex-1">{stage.label}</span>
        <span className="text-xs bg-white border border-neutral-200 text-neutral-500 px-2 py-0.5 rounded-full font-medium">
          {leads.length}
        </span>
      </div>

      {/* cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {leads.map((lead) => (
          <div
            key={lead.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('leadId', lead.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onClick={() => onCardClick(lead.id)}
            className="bg-white border border-neutral-200 rounded-lg p-3 cursor-pointer hover:border-red-300 hover:shadow-sm transition-all select-none"
          >
            <p className="text-sm font-semibold text-neutral-900 truncate">{lead.name}</p>
            {lead.phone && (
              <p className="text-xs text-neutral-500 mt-0.5 truncate">{lead.phone}</p>
            )}
            {lead.interest && (
              <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2">{lead.interest}</p>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-neutral-400">{sourceLabel(lead.source)}</span>
              <span className="text-xs text-neutral-400">{formatDate(lead.updated_at)}</span>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <div className="text-center py-6 text-xs text-neutral-400">Arraste leads aqui</div>
        )}
      </div>
    </div>
  );
}

// ——— Página principal
export default function CRMPage() {
  const { leads, loading, filters, setFilters, createLead, updateLead, moveStage, deleteLead } = useLeads();
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  async function handleMoveStage(leadId, stage) {
    try {
      await moveStage(leadId, stage);
    } catch {
      toast.error('Erro ao mover lead.');
    }
  }

  async function handleMoveStageFromDetail(leadId, stage) {
    await handleMoveStage(leadId, stage);
  }

  const leadsPerStage = STAGES.reduce((acc, s) => {
    acc[s.id] = leads.filter((l) => l.pipeline_stage === s.id);
    return acc;
  }, {});

  const totalLeads = leads.length;
  const totalConvertidos = leads.filter((l) => l.pipeline_stage === 'venda_concluida').length;

  return (
    <div className="flex flex-col h-full -m-6 overflow-hidden">
      {/* header */}
      <div className="shrink-0 bg-white border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">CRM</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {loading ? 'Carregando...' : `${totalLeads} leads · ${totalConvertidos} vendas`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar lead..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="text-sm border border-neutral-200 rounded-lg px-3 py-2 w-52 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
            />
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Novo Lead
            </button>
          </div>
        </div>
      </div>

      {/* kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-4 h-full p-6 min-w-max">
          {loading ? (
            STAGES.map((s) => (
              <div key={s.id} className="w-64 shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 animate-pulse">
                <div className="h-12 border-b border-neutral-200 px-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-neutral-200" />
                  <div className="h-4 bg-neutral-200 rounded flex-1" />
                </div>
                <div className="p-2 space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white border border-neutral-200 rounded-lg p-3 h-20" />
                  ))}
                </div>
              </div>
            ))
          ) : (
            STAGES.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={leadsPerStage[stage.id]}
                onDrop={handleMoveStage}
                onCardClick={setSelectedLeadId}
              />
            ))
          )}
        </div>
      </div>

      {/* modais */}
      {selectedLeadId && (
        <LeadDetailModal
          id={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onMoveStage={handleMoveStageFromDetail}
          onUpdate={updateLead}
          onDelete={deleteLead}
        />
      )}

      {showNewModal && (
        <NewLeadModal
          onClose={() => setShowNewModal(false)}
          onCreate={createLead}
        />
      )}
    </div>
  );
}
