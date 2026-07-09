import { useEffect, useState } from 'react';
import { http } from '../../lib/api';

const NODE_TITLES = {
  whatsapp_input: 'Mensagem Recebida',
  ai_agent: 'Agente IA',
  condition: 'Condição',
  human_transfer: 'Transferir para Humano',
  action: 'Ação',
  end: 'Encerrar Conversa',
};

export default function NodePropertiesPanel({ node, onChange, onDelete }) {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (node?.type === 'ai_agent') {
      http.get('/agents').then((r) => setAgents(r.data.data || [])).catch(() => {});
    }
  }, [node?.type]);

  if (!node) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm gap-2 p-4">
        <span className="text-3xl">🖱️</span>
        <p className="text-center">Selecione um nó para editar suas propriedades</p>
      </div>
    );
  }

  const data = node.data || {};

  function update(key, value) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">{NODE_TITLES[node.type] || node.type}</h3>
        <button
          onClick={onDelete}
          className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50"
        >
          Remover
        </button>
      </div>

      {node.type === 'whatsapp_input' && (
        <p className="text-gray-500 text-sm">Nó de entrada automático. Não possui configurações.</p>
      )}

      {node.type === 'ai_agent' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Agente</span>
            <select
              value={data.agentId || ''}
              onChange={(e) => {
                const selected = agents.find((a) => a.id === e.target.value);
                update('agentId', e.target.value);
                onChange({ ...data, agentId: e.target.value, agentName: selected?.name || '' });
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecione um agente...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {node.type === 'condition' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Condição (linguagem natural)</span>
            <textarea
              value={data.condition || ''}
              onChange={(e) => update('condition', e.target.value)}
              rows={3}
              placeholder="Ex: O cliente demonstrou interesse em comprar?"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none resize-none"
            />
          </label>
          <p className="text-xs text-gray-500">A IA avaliará a condição com base no histórico da conversa.</p>
          <div className="flex gap-2 text-xs mt-1">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Handle esquerdo = Sim</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Handle direito = Não</span>
          </div>
        </div>
      )}

      {node.type === 'human_transfer' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Mensagem de aviso ao cliente (opcional)</span>
            <textarea
              value={data.message || ''}
              onChange={(e) => update('message', e.target.value)}
              rows={3}
              placeholder="Ex: Aguarde um momento, vou te conectar com nossa equipe."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none resize-none"
            />
          </label>
        </div>
      )}

      {node.type === 'action' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Tipo de ação</span>
            <select
              value={data.actionType || ''}
              onChange={(e) => update('actionType', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
            >
              <option value="">Selecione...</option>
              <option value="send_message">Enviar mensagem</option>
              <option value="set_tag">Definir tag</option>
              <option value="update_lead">Atualizar lead</option>
            </select>
          </label>
          {data.actionType === 'send_message' && (
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Mensagem</span>
              <textarea
                value={data.message || ''}
                onChange={(e) => update('message', e.target.value)}
                rows={3}
                placeholder="Texto que será enviado..."
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none resize-none"
              />
            </label>
          )}
        </div>
      )}

      {node.type === 'end' && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Mensagem de encerramento (opcional)</span>
            <textarea
              value={data.message || ''}
              onChange={(e) => update('message', e.target.value)}
              rows={3}
              placeholder="Ex: Obrigado pelo contato! Até a próxima. 😊"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none resize-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}
