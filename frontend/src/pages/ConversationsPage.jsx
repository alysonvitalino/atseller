import { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useConversations, useConversation } from '../hooks/useConversations';

const STATUS_LABELS = {
  active: 'IA',
  human: 'Humano',
  waiting: 'Aguardando',
  closed: 'Encerrado',
};

const STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-700',
  human: 'bg-orange-100 text-orange-700',
  waiting: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-neutral-100 text-neutral-500',
};

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function senderLabel(senderType) {
  if (senderType === 'contact') return '';
  if (senderType === 'agent') return '🤖 ';
  if (senderType === 'operator') return '👤 ';
  if (senderType === 'system') return '⚙️ ';
  return '';
}

// ——— Componente: lista lateral de conversas
function ConversationList({ conversations, loading, selectedId, onSelect, filters, onFiltersChange }) {
  return (
    <aside className="w-80 shrink-0 flex flex-col border-r border-neutral-200 bg-white">
      <div className="p-4 border-b border-neutral-200 space-y-3">
        <h2 className="font-semibold text-neutral-900">Conversas</h2>
        <input
          type="text"
          placeholder="Buscar contato ou número..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
        />
        <select
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
          className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 bg-white"
        >
          <option value="">Todos os status</option>
          <option value="active">IA ativa</option>
          <option value="human">Com operador</option>
          <option value="waiting">Aguardando</option>
          <option value="closed">Encerradas</option>
        </select>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {loading && (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-neutral-100 rounded w-2/3" />
                <div className="h-3 bg-neutral-100 rounded w-full" />
              </div>
            ))}
          </div>
        )}
        {!loading && conversations.length === 0 && (
          <div className="p-6 text-center text-sm text-neutral-400">
            Nenhuma conversa encontrada
          </div>
        )}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={clsx(
              'w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors',
              selectedId === conv.id && 'bg-red-50 border-l-2 border-red-500'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-neutral-900 truncate">
                    {conv.contact_name || conv.phone}
                  </span>
                  <span className={clsx(
                    'shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium',
                    STATUS_COLORS[conv.status]
                  )}>
                    {STATUS_LABELS[conv.status]}
                  </span>
                </div>
                {conv.contact_name && (
                  <p className="text-xs text-neutral-400 mt-0.5">{conv.phone}</p>
                )}
                <p className="text-xs text-neutral-500 mt-1 truncate">
                  {senderLabel(conv.last_message_sender_type)}{conv.last_message || 'Sem mensagens'}
                </p>
              </div>
              <span className="text-xs text-neutral-400 shrink-0">
                {formatTime(conv.last_message_at || conv.created_at)}
              </span>
            </div>
            {conv.operator_name && (
              <p className="text-xs text-orange-600 mt-1">👤 {conv.operator_name}</p>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}

// ——— Componente: área de mensagens
function MessageArea({ conversation, messages, onSend, actionLoading, currentUser }) {
  const bottomRef = useRef(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const canReply = conversation?.status === 'human';

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSend(text.trim());
      setText('');
    } catch {
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setSending(false);
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
        Selecione uma conversa para visualizar
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-neutral-50">
      {/* cabeçalho */}
      <div className="h-14 bg-white border-b border-neutral-200 px-5 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-bold text-neutral-600">
          {(conversation.contact_name || conversation.phone)[0]?.toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {conversation.contact_name || conversation.phone}
          </p>
          {conversation.contact_name && (
            <p className="text-xs text-neutral-400">{conversation.phone}</p>
          )}
        </div>
        <span className={clsx('ml-auto text-xs px-2 py-1 rounded-full font-medium', STATUS_COLORS[conversation.status])}>
          {STATUS_LABELS[conversation.status]}
        </span>
      </div>

      {/* mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-neutral-400 py-8">Sem mensagens nesta conversa</p>
        )}
        {messages.map((msg) => {
          const isContact = msg.role === 'user' || msg.sender_type === 'contact';
          return (
            <div
              key={msg.id}
              className={clsx('flex', isContact ? 'justify-start' : 'justify-end')}
            >
              <div className={clsx(
                'max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                isContact
                  ? 'bg-white text-neutral-900 rounded-tl-none'
                  : msg.sender_type === 'operator'
                    ? 'bg-orange-500 text-white rounded-tr-none'
                    : msg.sender_type === 'system'
                      ? 'bg-neutral-200 text-neutral-600 text-xs italic'
                      : 'bg-red-600 text-white rounded-tr-none'
              )}>
                {!isContact && msg.sender_type !== 'system' && (
                  <p className="text-xs opacity-75 mb-1">
                    {msg.sender_type === 'operator'
                      ? `👤 ${msg.sender_name || 'Operador'}`
                      : '🤖 IA'}
                  </p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={clsx('text-xs mt-1 text-right', isContact ? 'text-neutral-400' : 'opacity-60')}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* campo de resposta */}
      {canReply ? (
        <form
          onSubmit={handleSend}
          className="border-t border-neutral-200 bg-white p-3 flex gap-2 shrink-0"
        >
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {sending ? '...' : 'Enviar'}
          </button>
        </form>
      ) : (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 text-xs text-neutral-400 text-center shrink-0">
          {conversation.status === 'closed'
            ? 'Conversa encerrada'
            : 'Assuma o atendimento para enviar mensagens'}
        </div>
      )}
    </div>
  );
}

// ——— Componente: painel direito de informações
function InfoPanel({ conversation, onAssume, onReturnToAI, onClose, actionLoading, currentUser }) {
  if (!conversation) return null;

  const isHuman = conversation.status === 'human';
  const isClosed = conversation.status === 'closed';
  const isMyConversation = conversation.assigned_operator_id === currentUser?.id;

  return (
    <aside className="w-72 shrink-0 border-l border-neutral-200 bg-white flex flex-col overflow-y-auto">
      <div className="p-5 border-b border-neutral-200">
        <h3 className="text-sm font-semibold text-neutral-700 mb-4">Informações do contato</h3>
        <div className="space-y-3">
          <InfoRow label="Nome" value={conversation.contact_name || '—'} />
          <InfoRow label="Telefone" value={conversation.phone} />
          <InfoRow label="Agente" value={conversation.agent_name || '—'} />
          <InfoRow
            label="Operador"
            value={conversation.operator_name || (isHuman ? 'Sem operador' : '—')}
            highlight={isHuman}
          />
          <InfoRow
            label="Status"
            value={STATUS_LABELS[conversation.status]}
          />
          <InfoRow label="Início" value={formatDatetime(conversation.created_at)} />
          {conversation.last_message_at && (
            <InfoRow label="Última mensagem" value={formatDatetime(conversation.last_message_at)} />
          )}
        </div>
      </div>

      {!isClosed && (
        <div className="p-5 space-y-2">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">Ações</h3>

          {!isHuman && (
            <button
              onClick={onAssume}
              disabled={actionLoading}
              className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {actionLoading ? 'Aguarde...' : 'Assumir atendimento'}
            </button>
          )}

          {isHuman && (
            <button
              onClick={onReturnToAI}
              disabled={actionLoading}
              className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {actionLoading ? 'Aguarde...' : 'Devolver para IA'}
            </button>
          )}

          <button
            onClick={onClose}
            disabled={actionLoading}
            className="w-full py-2 px-4 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 text-neutral-700 text-sm font-medium rounded-lg transition-colors"
          >
            Encerrar conversa
          </button>
        </div>
      )}

      {isClosed && (
        <div className="p-5">
          <p className="text-xs text-neutral-400 text-center">Conversa encerrada</p>
        </div>
      )}
    </aside>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div>
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={clsx('text-sm font-medium mt-0.5', highlight ? 'text-orange-600' : 'text-neutral-800')}>
        {value}
      </p>
    </div>
  );
}

function formatDatetime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

// ——— Página principal
export default function ConversationsPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(null);
  const { conversations, loading, filters, setFilters, refresh: refreshList } = useConversations();

  const {
    conversation,
    messages,
    loading: convLoading,
    actionLoading,
    assume,
    returnToAI,
    close,
    sendMessage,
    handleSSEMessage,
    handleSSEConversationUpdate,
  } = useConversation(selectedId);

  // conecta SSE central e despacha para os hooks
  useEffect(() => {
    let cancelled = false;

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

        while (!cancelled) {
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
                  handleSSEMessage(payload);
                } else if (currentEvent === 'conversation_update') {
                  handleSSEConversationUpdate(payload);
                }
              } catch {}
              currentEvent = null;
            }
          }
        }
      } catch {
        if (!cancelled) setTimeout(connectSSE, 5000);
      }
    }

    connectSSE();
    return () => { cancelled = true; };
  }, [handleSSEMessage, handleSSEConversationUpdate]);

  async function handleAssume() {
    try {
      await assume();
      refreshList();
      toast.success('Você assumiu o atendimento.');
    } catch {
      toast.error('Erro ao assumir conversa.');
    }
  }

  async function handleReturnToAI() {
    try {
      await returnToAI();
      refreshList();
      toast.success('Conversa devolvida para a IA.');
    } catch {
      toast.error('Erro ao devolver para IA.');
    }
  }

  async function handleClose() {
    try {
      await close();
      refreshList();
      toast.success('Conversa encerrada.');
    } catch {
      toast.error('Erro ao encerrar conversa.');
    }
  }

  return (
    <div className="flex h-full -m-6 overflow-hidden">
      <ConversationList
        conversations={conversations}
        loading={loading}
        selectedId={selectedId}
        onSelect={setSelectedId}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <MessageArea
        conversation={conversation}
        messages={messages}
        onSend={sendMessage}
        actionLoading={actionLoading}
        currentUser={user}
      />

      <InfoPanel
        conversation={conversation}
        onAssume={handleAssume}
        onReturnToAI={handleReturnToAI}
        onClose={handleClose}
        actionLoading={actionLoading}
        currentUser={user}
      />
    </div>
  );
}
