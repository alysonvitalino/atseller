import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { http } from '../lib/api';
import toast from 'react-hot-toast';
import { NODE_TYPES } from '../components/flow/FlowNodes';
import NodePropertiesPanel from '../components/flow/NodePropertiesPanel';

let nodeIdCounter = 1;
function generateId() {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

const NODE_MENU = [
  { type: 'whatsapp_input', label: 'Mensagem Recebida', icon: '💬', color: 'bg-green-500', once: true },
  { type: 'ai_agent', label: 'Agente IA', icon: '🤖', color: 'bg-blue-500' },
  { type: 'condition', label: 'Condição', icon: '🔀', color: 'bg-orange-500' },
  { type: 'human_transfer', label: 'Transferir', icon: '👤', color: 'bg-purple-500' },
  { type: 'action', label: 'Ação', icon: '⚡', color: 'bg-yellow-500' },
  { type: 'end', label: 'Encerrar', icon: '🔚', color: 'bg-gray-400' },
];

function FlowBuilderInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [flow, setFlow] = useState(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);

  useEffect(() => {
    http.get(`/flows/${id}`)
      .then(({ data }) => {
        setFlow(data.flow);
        setNodes(data.flow.nodes || []);
        setEdges(data.flow.edges || []);
      })
      .catch(() => { toast.error('Fluxo não encontrado.'); navigate('/flows'); })
      .finally(() => setLoading(false));
  }, [id]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  function addNode(type) {
    // impede duplicar whatsapp_input
    if (type === 'whatsapp_input' && nodes.some((n) => n.type === 'whatsapp_input')) {
      toast.error('Só pode haver um nó de entrada no fluxo.');
      return;
    }

    const position = rfInstance?.screenToFlowPosition({ x: 300, y: 200 }) || { x: 200 + nodes.length * 50, y: 150 };
    const newNode = {
      id: generateId(),
      type,
      position,
      data: {},
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function handleNodeClick(_, node) {
    setSelectedNode(node);
  }

  function handleNodeDataChange(newData) {
    setNodes((nds) =>
      nds.map((n) => n.id === selectedNode.id ? { ...n, data: newData } : n)
    );
    setSelectedNode((prev) => ({ ...prev, data: newData }));
  }

  function handleDeleteSelected() {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { nodes, edges };
      if (flow.name) payload.name = flow.name;
      await http.put(`/flows/${id}`, payload);
      toast.success('Fluxo salvo!');
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    try {
      const { data } = await http.patch(`/flows/${id}/toggle-active`);
      setFlow((prev) => ({ ...prev, is_active: data.flow.is_active }));
      toast.success(data.flow.is_active ? 'Fluxo ativado!' : 'Fluxo desativado.');
    } catch {
      toast.error('Erro ao alterar status.');
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-gray-400">Carregando fluxo...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/flows')} className="text-gray-500 hover:text-gray-800 text-sm">
            ← Voltar
          </button>
          <span className="font-semibold text-gray-800">{flow?.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${flow?.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {flow?.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleActive}
            className={`text-sm px-3 py-1.5 rounded-lg ${flow?.is_active ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            {flow?.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* painel esquerdo — paleta de nós */}
        <div className="w-48 bg-gray-50 border-r border-gray-200 p-3 flex flex-col gap-1 shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nós disponíveis</p>
          {NODE_MENU.map(({ type, label, icon, color }) => (
            <button
              key={type}
              onClick={() => addNode(type)}
              className="flex items-center gap-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-2 hover:bg-gray-100 text-left"
            >
              <span className={`${color} text-white rounded-md p-1 text-xs leading-none`}>{icon}</span>
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>

        {/* canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            onInit={setRfInstance}
            fitView
            deleteKeyCode="Delete"
            className="bg-gray-50"
          >
            <Background gap={16} color="#e5e7eb" />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const map = { whatsapp_input: '#22c55e', ai_agent: '#3b82f6', condition: '#f97316', human_transfer: '#a855f7', action: '#eab308', end: '#9ca3af' };
                return map[n.type] || '#ccc';
              }}
            />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-2">🔀</div>
                <p className="font-medium text-gray-500">Adicione um nó para começar</p>
                <p className="text-sm mt-1">Use a paleta à esquerda</p>
              </div>
            </div>
          )}
        </div>

        {/* painel direito — propriedades */}
        <div className="w-64 bg-white border-l border-gray-200 shrink-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Propriedades</h3>
          </div>
          <NodePropertiesPanel
            node={selectedNode}
            onChange={handleNodeDataChange}
            onDelete={handleDeleteSelected}
          />
        </div>
      </div>
    </div>
  );
}

export default function FlowBuilderPage() {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner />
    </ReactFlowProvider>
  );
}
