import { Handle, Position } from '@xyflow/react';

function NodeShell({ color, icon, label, selected, children }) {
  return (
    <div className={`rounded-xl border-2 bg-white shadow-md min-w-[180px] max-w-[220px] text-sm
      transition-shadow ${selected ? 'shadow-lg ring-2 ring-offset-1' : ''}
      ${color}`}>
      <div className={`px-3 py-2 rounded-t-[10px] flex items-center gap-2 font-semibold text-white ${color.replace('border-', 'bg-')}`}>
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="px-3 py-2 text-gray-600">{children}</div>
    </div>
  );
}

// nó de entrada (verde)
export function WhatsAppInputNode({ data, selected }) {
  return (
    <div className={`rounded-xl border-2 border-green-500 bg-white shadow-md min-w-[180px] text-sm transition-shadow ${selected ? 'shadow-lg ring-2 ring-green-300 ring-offset-1' : ''}`}>
      <div className="px-3 py-2 rounded-t-[10px] flex items-center gap-2 font-semibold text-white bg-green-500">
        <span>💬</span>
        <span>Mensagem Recebida</span>
      </div>
      <div className="px-3 py-2 text-gray-500 text-xs">Dispara ao receber mensagem no WhatsApp</div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  );
}

// nó de agente IA (azul)
export function AIAgentNode({ data, selected }) {
  return (
    <div className={`rounded-xl border-2 border-blue-500 bg-white shadow-md min-w-[200px] text-sm transition-shadow ${selected ? 'shadow-lg ring-2 ring-blue-300 ring-offset-1' : ''}`}>
      <div className="px-3 py-2 rounded-t-[10px] flex items-center gap-2 font-semibold text-white bg-blue-500">
        <span>🤖</span>
        <span>Agente IA</span>
      </div>
      <div className="px-3 py-2 text-gray-600 text-xs">
        {data.agentName ? (
          <span className="font-medium text-blue-700">{data.agentName}</span>
        ) : (
          <span className="text-gray-400 italic">Nenhum agente selecionado</span>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </div>
  );
}

// nó de condição (laranja)
export function ConditionNode({ data, selected }) {
  return (
    <div className={`rounded-xl border-2 border-orange-500 bg-white shadow-md min-w-[200px] text-sm transition-shadow ${selected ? 'shadow-lg ring-2 ring-orange-300 ring-offset-1' : ''}`}>
      <div className="px-3 py-2 rounded-t-[10px] flex items-center gap-2 font-semibold text-white bg-orange-500">
        <span>🔀</span>
        <span>Condição</span>
      </div>
      <div className="px-3 py-2 text-gray-600 text-xs">
        {data.condition ? (
          <span className="line-clamp-2">{data.condition}</span>
        ) : (
          <span className="text-gray-400 italic">Sem condição definida</span>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '30%' }} className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: '70%' }} className="!bg-red-500 !w-3 !h-3" />
      <div className="flex justify-between px-4 pb-1 text-[10px] text-gray-400">
        <span>Sim</span>
        <span>Não</span>
      </div>
    </div>
  );
}

// nó de transferência humana (roxo)
export function HumanTransferNode({ data, selected }) {
  return (
    <div className={`rounded-xl border-2 border-purple-500 bg-white shadow-md min-w-[180px] text-sm transition-shadow ${selected ? 'shadow-lg ring-2 ring-purple-300 ring-offset-1' : ''}`}>
      <div className="px-3 py-2 rounded-t-[10px] flex items-center gap-2 font-semibold text-white bg-purple-500">
        <span>👤</span>
        <span>Transferir</span>
      </div>
      <div className="px-3 py-2 text-gray-600 text-xs">
        {data.message || <span className="text-gray-400 italic">Sem mensagem de aviso</span>}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  );
}

// nó de ação (amarelo)
export function ActionNode({ data, selected }) {
  const ACTION_LABELS = {
    send_message: 'Enviar mensagem',
    set_tag: 'Definir tag',
    update_lead: 'Atualizar lead',
  };
  return (
    <div className={`rounded-xl border-2 border-yellow-500 bg-white shadow-md min-w-[180px] text-sm transition-shadow ${selected ? 'shadow-lg ring-2 ring-yellow-300 ring-offset-1' : ''}`}>
      <div className="px-3 py-2 rounded-t-[10px] flex items-center gap-2 font-semibold text-white bg-yellow-500">
        <span>⚡</span>
        <span>Ação</span>
      </div>
      <div className="px-3 py-2 text-gray-600 text-xs">
        {data.actionType ? (
          <span>{ACTION_LABELS[data.actionType] || data.actionType}</span>
        ) : (
          <span className="text-gray-400 italic">Sem ação definida</span>
        )}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-yellow-500 !w-3 !h-3" />
    </div>
  );
}

// nó final (cinza)
export function EndNode({ data, selected }) {
  return (
    <div className={`rounded-xl border-2 border-gray-400 bg-white shadow-md min-w-[160px] text-sm transition-shadow ${selected ? 'shadow-lg ring-2 ring-gray-300 ring-offset-1' : ''}`}>
      <div className="px-3 py-2 rounded-t-[10px] flex items-center gap-2 font-semibold text-white bg-gray-400">
        <span>🔚</span>
        <span>Encerrar</span>
      </div>
      <div className="px-3 py-2 text-gray-600 text-xs">
        {data.message || <span className="text-gray-400 italic">Sem mensagem final</span>}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}

export const NODE_TYPES = {
  whatsapp_input: WhatsAppInputNode,
  ai_agent: AIAgentNode,
  condition: ConditionNode,
  human_transfer: HumanTransferNode,
  action: ActionNode,
  end: EndNode,
};
