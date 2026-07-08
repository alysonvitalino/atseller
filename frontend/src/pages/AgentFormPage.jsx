import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { http } from '../lib/api';
import { useAgent, useAvailableTools } from '../hooks/useAgents';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'basic', label: 'Dados Básicos' },
  { id: 'behavior', label: 'Comportamento' },
  { id: 'knowledge', label: 'Conhecimento' },
  { id: 'tools', label: 'Ferramentas' },
];

const PERSONALITIES = [
  { id: 'friendly', label: 'Amigável', desc: 'Tom descontraído e próximo do cliente', emoji: '😊' },
  { id: 'sales', label: 'Vendedor', desc: 'Focado em fechar negócio e superar objeções', emoji: '🎯' },
  { id: 'consultive', label: 'Consultivo', desc: 'Faz perguntas e entende a necessidade antes de propor', emoji: '🧠' },
  { id: 'formal', label: 'Formal', desc: 'Comunicação profissional e linguagem técnica', emoji: '💼' },
  { id: 'technical', label: 'Técnico', desc: 'Preciso, direto e baseado em dados', emoji: '⚙️' },
];

const DEFAULT_FORM = {
  name: '', description: '', objective: '', personality: 'friendly',
  context: '', success_criteria: '', delay_min: 2, delay_max: 15, tools: [],
};

export default function AgentFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { agent, loading: loadingAgent } = useAgent(isEdit ? id : null);
  const availableTools = useAvailableTools();

  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (agent) {
      setForm({
        name: agent.name || '',
        description: agent.description || '',
        objective: agent.objective || '',
        personality: agent.personality || 'friendly',
        context: agent.context || '',
        success_criteria: agent.success_criteria || '',
        delay_min: agent.delay_min ?? 2,
        delay_max: agent.delay_max ?? 15,
        tools: agent.tools || [],
      });
    }
  }, [agent]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório.';
    if (form.delay_min > form.delay_max) e.delay = 'Delay mínimo não pode ser maior que o máximo.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) { setTab('basic'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await http.put(`/agents/${id}`, form);
        toast.success('Agente atualizado!');
      } else {
        const { data } = await http.post('/agents', form);
        toast.success('Agente criado!');
        navigate(`/agents/${data.id}/edit`);
        return;
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar agente.');
    } finally {
      setSaving(false);
    }
  }

  function toggleTool(toolId) {
    set('tools', form.tools.includes(toolId)
      ? form.tools.filter((t) => t !== toolId)
      : [...form.tools, toolId]
    );
  }

  if (loadingAgent) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate('/agents')} className="text-sm text-neutral-500 hover:text-neutral-700 mb-1 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Agentes
          </button>
          <h1 className="text-2xl font-bold text-neutral-900">
            {isEdit ? `Editar — ${agent?.name || ''}` : 'Novo Agente'}
          </h1>
        </div>
        <Button onClick={handleSave} loading={saving}>Salvar agente</Button>
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.id
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* conteúdo das abas */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">

        {tab === 'basic' && (
          <div className="space-y-6">
            <Input label="Nome do agente *" placeholder="Ex: Recepcionista, Especialista Veículos Novos"
              value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Descrição</label>
              <textarea rows={2} placeholder="Breve descrição do papel deste agente"
                value={form.description} onChange={(e) => set('description', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Objetivo</label>
              <textarea rows={2} placeholder="Ex: Qualificar leads e encaminhar para o especialista correto"
                value={form.objective} onChange={(e) => set('objective', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none" />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-3">Personalidade</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PERSONALITIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set('personality', p.id)}
                    className={clsx(
                      'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      form.personality === p.id
                        ? 'border-red-500 bg-red-50'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    )}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <div>
                      <p className={clsx('text-sm font-semibold', form.personality === p.id ? 'text-red-700' : 'text-neutral-800')}>
                        {p.label}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'behavior' && (
          <div className="space-y-6">
            {/* delay slider */}
            <div>
              <label className="text-sm font-medium text-neutral-700 block mb-1">
                Delay de resposta: <span className="text-red-600">{form.delay_min}s – {form.delay_max}s</span>
              </label>
              <p className="text-xs text-neutral-400 mb-4">Simula digitação humana. A resposta será enviada após um intervalo aleatório neste intervalo.</p>
              {errors.delay && <p className="text-xs text-red-600 mb-2">{errors.delay}</p>}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 mb-1 block">Mínimo (s)</label>
                  <input type="range" min="0" max="60" value={form.delay_min}
                    onChange={(e) => set('delay_min', Number(e.target.value))}
                    className="w-full accent-red-600" />
                  <div className="flex justify-between text-xs text-neutral-400 mt-1">
                    <span>0s</span><span className="font-medium text-red-600">{form.delay_min}s</span><span>60s</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 mb-1 block">Máximo (s)</label>
                  <input type="range" min="0" max="120" value={form.delay_max}
                    onChange={(e) => set('delay_max', Number(e.target.value))}
                    className="w-full accent-red-600" />
                  <div className="flex justify-between text-xs text-neutral-400 mt-1">
                    <span>0s</span><span className="font-medium text-red-600">{form.delay_max}s</span><span>120s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Contexto</label>
              <p className="text-xs text-neutral-400">Instruções livres sobre onde o agente está inserido e como deve se comportar.</p>
              <textarea rows={5} placeholder={`Ex: Você trabalha para a Vision Motors, uma concessionária de veículos novos e seminovos em São Paulo. Atenda clientes interessados em comprar veículos com cordialidade e entusiasmo.`}
                value={form.context} onChange={(e) => set('context', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mt-1" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-neutral-700">Critério de Sucesso</label>
              <p className="text-xs text-neutral-400">O que significa sucesso para este agente? Será usado para medir conversão.</p>
              <textarea rows={2} placeholder="Ex: Agendar uma visita à concessionária ou capturar o interesse por um modelo específico."
                value={form.success_criteria} onChange={(e) => set('success_criteria', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mt-1" />
            </div>
          </div>
        )}

        {tab === 'knowledge' && (
          <KnowledgeTab agentId={id} />
        )}

        {tab === 'tools' && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-500 mb-4">
              Selecione as ferramentas que este agente pode usar durante as conversas. Ferramentas ampliam as capacidades do agente além do texto.
            </p>
            {availableTools.map((tool) => {
              const active = form.tools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => toggleTool(tool.id)}
                  className={clsx(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                    active
                      ? 'border-red-500 bg-red-50'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  )}
                >
                  <div className={clsx(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    active ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-500'
                  )}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className={clsx('text-sm font-semibold', active ? 'text-red-700' : 'text-neutral-800')}>{tool.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{tool.description}</p>
                  </div>
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                    active ? 'border-red-600 bg-red-600' : 'border-neutral-300'
                  )}>
                    {active && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <Button variant="secondary" onClick={() => navigate('/agents')}>Cancelar</Button>
        <Button onClick={handleSave} loading={saving}>Salvar agente</Button>
      </div>
    </div>
  );
}

// componente da aba de conhecimento
function KnowledgeTab({ agentId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [addingText, setAddingText] = useState(false);
  const [showTextArea, setShowTextArea] = useState(false);
  const fileRef = useRef();

  async function fetchDocs() {
    if (!agentId) return;
    try {
      const { data } = await http.get(`/agents/${agentId}/documents`);
      setDocuments(data);
    } catch {}
  }

  useEffect(() => { fetchDocs(); }, [agentId]);

  // polling para atualizar status de documentos 'processing'
  useEffect(() => {
    if (!agentId) return;
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;
    const t = setInterval(fetchDocs, 3000);
    return () => clearInterval(t);
  }, [documents, agentId]);

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!agentId) { toast.error('Salve o agente primeiro para adicionar documentos.'); return; }
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        await http.post(`/agents/${agentId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success(`"${file.name}" enviado e sendo processado...`);
      } catch (err) {
        toast.error(err.response?.data?.error || `Erro ao enviar "${file.name}".`);
      }
    }
    fetchDocs();
    e.target.value = '';
  }

  async function handleAddUrl() {
    if (!urlInput.trim()) return;
    if (!agentId) { toast.error('Salve o agente primeiro.'); return; }
    setLoading(true);
    try {
      await http.post(`/agents/${agentId}/documents`, { type: 'url', url: urlInput.trim() });
      toast.success('URL adicionada e sendo indexada...');
      setUrlInput('');
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar URL.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddText() {
    if (!textInput.trim()) return;
    if (!agentId) { toast.error('Salve o agente primeiro.'); return; }
    setAddingText(true);
    try {
      await http.post(`/agents/${agentId}/documents`, { type: 'text', text: textInput.trim(), name: `Texto — ${new Date().toLocaleDateString('pt-BR')}` });
      toast.success('Texto adicionado à base de conhecimento.');
      setTextInput('');
      setShowTextArea(false);
      fetchDocs();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao adicionar texto.');
    } finally {
      setAddingText(false);
    }
  }

  async function handleDelete(docId) {
    try {
      await http.delete(`/agents/${agentId}/documents/${docId}`);
      setDocuments((d) => d.filter((x) => x.id !== docId));
      toast.success('Documento removido.');
    } catch {
      toast.error('Erro ao remover documento.');
    }
  }

  if (!agentId) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-neutral-500">Salve o agente primeiro para adicionar documentos à base de conhecimento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* upload de arquivo */}
      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-2">Carregar arquivos</label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors"
        >
          <svg className="w-8 h-8 text-neutral-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-neutral-600 font-medium">Clique para selecionar arquivos</p>
          <p className="text-xs text-neutral-400 mt-1">PDF, DOCX ou TXT — até 20MB por arquivo</p>
          <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* URL */}
      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-2">Adicionar por URL</label>
        <div className="flex gap-2">
          <Input placeholder="https://exemplo.com/sobre-nos" value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()} />
          <Button variant="secondary" onClick={handleAddUrl} loading={loading}>Adicionar</Button>
        </div>
      </div>

      {/* texto manual */}
      <div>
        <label className="text-sm font-medium text-neutral-700 block mb-2">Texto manual</label>
        {showTextArea ? (
          <div className="space-y-2">
            <textarea rows={5} placeholder="Cole ou escreva o conteúdo que o agente deve conhecer..."
              value={textInput} onChange={(e) => setTextInput(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowTextArea(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAddText} loading={addingText}>Adicionar texto</Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setShowTextArea(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar texto
          </Button>
        )}
      </div>

      {/* lista de documentos */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-neutral-700 mb-3">Documentos ({documents.length})</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <DocumentItem key={doc.id} doc={doc} onDelete={() => handleDelete(doc.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentItem({ doc, onDelete }) {
  const typeIcons = {
    pdf: '📄', docx: '📝', txt: '📃', url: '🌐', text: '✏️',
  };

  const statusConfig = {
    ready: { label: 'Indexado', variant: 'green' },
    processing: { label: 'Indexando...', variant: 'yellow' },
    error: { label: 'Erro', variant: 'red' },
  };

  const sc = statusConfig[doc.status] || statusConfig.processing;

  return (
    <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
      <span className="text-lg">{typeIcons[doc.type] || '📄'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={sc.variant}>{sc.label}</Badge>
          {doc.status === 'ready' && (
            <span className="text-xs text-neutral-400">{doc.chunk_count} chunks</span>
          )}
          {doc.status === 'error' && (
            <span className="text-xs text-red-500">{doc.error_message}</span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
