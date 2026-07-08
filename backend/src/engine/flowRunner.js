const pool = require('../database/connection');
const whatsappService = require('../services/whatsapp');
const { runAgent, evaluateCondition } = require('./agentRunner');
const sseManager = require('../services/sseManager');

// delay simulado de digitação (delay_min a delay_max segundos do agente)
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minSec, maxSec) {
  const ms = (minSec + Math.random() * (maxSec - minSec)) * 1000;
  return sleep(ms);
}

async function sendWhatsAppMessage(instanceName, phone, text) {
  try {
    await whatsappService.sendTextMessage(instanceName, phone, text);
  } catch (err) {
    console.error(`Erro ao enviar mensagem WhatsApp para ${phone}:`, err.message);
  }
}

async function saveMessage(conversationId, companyId, role, content, senderType, metadata = null) {
  await pool.query(
    `INSERT INTO messages (conversation_id, company_id, role, content, sender_type, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [conversationId, companyId, role, content, senderType, metadata ? JSON.stringify(metadata) : null]
  );
}

async function getOrCreateConversation(companyId, phone, contactName, flowId) {
  // tenta encontrar conversa ativa para este número
  const existing = await pool.query(
    `SELECT * FROM conversations
     WHERE company_id = $1 AND phone = $2 AND status != 'closed'
     LIMIT 1`,
    [companyId, phone]
  );

  if (existing.rows[0]) return existing.rows[0];

  // cria nova conversa; descobre o nó inicial do fluxo ativo
  let startNodeId = null;
  if (flowId) {
    const flowRes = await pool.query('SELECT nodes FROM flows WHERE id = $1', [flowId]);
    if (flowRes.rows[0]) {
      const startNode = flowRes.rows[0].nodes.find((n) => n.type === 'whatsapp_input');
      if (startNode) startNodeId = startNode.id;
    }
  }

  const result = await pool.query(
    `INSERT INTO conversations (company_id, flow_id, phone, contact_name, current_node_id, status)
     VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
    [companyId, flowId || null, phone, contactName || phone, startNodeId]
  );
  return result.rows[0];
}

async function getActiveFlow(companyId) {
  const res = await pool.query(
    'SELECT * FROM flows WHERE company_id = $1 AND is_active = TRUE LIMIT 1',
    [companyId]
  );
  return res.rows[0] || null;
}

function findNodeById(nodes, nodeId) {
  return nodes.find((n) => n.id === nodeId) || null;
}

function getNextNode(edges, currentNodeId, handle = 'default') {
  const edge = edges.find((e) => e.source === currentNodeId && (e.sourceHandle === handle || !e.sourceHandle));
  return edge ? edge.target : null;
}

async function processNode(conversation, node, nodes, edges, incomingText, instanceName) {
  const { company_id, id: conversationId, phone } = conversation;

  switch (node.type) {
    case 'whatsapp_input': {
      // nó de entrada — apenas avança para o próximo
      const nextId = getNextNode(edges, node.id);
      return { nextNodeId: nextId };
    }

    case 'ai_agent': {
      const agentId = node.data?.agentId;
      if (!agentId) {
        console.warn(`Nó AI Agent ${node.id} sem agentId configurado.`);
        return { nextNodeId: getNextNode(edges, node.id) };
      }

      const agentRes = await pool.query('SELECT * FROM agents WHERE id = $1 AND company_id = $2', [agentId, company_id]);
      if (!agentRes.rows[0]) {
        console.warn(`Agente ${agentId} não encontrado.`);
        return { nextNodeId: getNextNode(edges, node.id) };
      }
      const agent = agentRes.rows[0];

      // delay humano
      await randomDelay(agent.delay_min, agent.delay_max);

      const { text, flowAction } = await runAgent({ agent, node }, conversation, incomingText);

      if (text) {
        await sendWhatsAppMessage(instanceName, phone, text);
        await saveMessage(conversationId, company_id, 'assistant', text, 'agent');

        // notifica operadores via SSE
        sseManager.emit(company_id, 'message', {
          conversationId,
          phone,
          role: 'assistant',
          content: text,
          senderType: 'agent',
        });
      }

      if (flowAction === 'transfer_to_human') {
        return { nextNodeId: null, action: 'transfer_to_human' };
      }
      if (flowAction === 'close_conversation') {
        return { nextNodeId: null, action: 'close_conversation' };
      }

      return { nextNodeId: getNextNode(edges, node.id) };
    }

    case 'condition': {
      const condition = node.data?.condition;
      if (!condition) return { nextNodeId: getNextNode(edges, node.id) };

      const historyRes = await pool.query(
        'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 20',
        [conversationId]
      );
      const history = historyRes.rows.reverse();
      const result = await evaluateCondition(condition, history);

      // handle 'yes' avança pelo branch verdadeiro, 'no' pelo falso
      const nextId = result
        ? getNextNode(edges, node.id, 'yes')
        : getNextNode(edges, node.id, 'no');
      return { nextNodeId: nextId };
    }

    case 'human_transfer': {
      const message = node.data?.message;
      if (message) {
        await sendWhatsAppMessage(instanceName, phone, message);
        await saveMessage(conversationId, company_id, 'assistant', message, 'system');
      }
      return { nextNodeId: null, action: 'transfer_to_human' };
    }

    case 'action': {
      const actionType = node.data?.actionType;
      const actionMessage = node.data?.message;

      if (actionMessage) {
        await sendWhatsAppMessage(instanceName, phone, actionMessage);
        await saveMessage(conversationId, company_id, 'assistant', actionMessage, 'agent');
      }

      console.log(`Action node: ${actionType}`, node.data);
      return { nextNodeId: getNextNode(edges, node.id) };
    }

    case 'end': {
      const message = node.data?.message;
      if (message) {
        await sendWhatsAppMessage(instanceName, phone, message);
        await saveMessage(conversationId, company_id, 'assistant', message, 'system');
      }
      return { nextNodeId: null, action: 'close_conversation' };
    }

    default:
      console.warn(`Tipo de nó desconhecido: ${node.type}`);
      return { nextNodeId: getNextNode(edges, node.id) };
  }
}

async function handleIncomingMessage(companyId, instanceName, phone, contactName, messageText) {
  try {
    const flow = await getActiveFlow(companyId);
    const conversation = await getOrCreateConversation(companyId, phone, contactName, flow?.id);

    // se conversa está com operador humano, apenas persiste a mensagem
    if (conversation.status === 'human') {
      await saveMessage(conversation.id, companyId, 'user', messageText, 'contact');
      sseManager.emit(companyId, 'message', {
        conversationId: conversation.id,
        phone,
        role: 'user',
        content: messageText,
        senderType: 'contact',
        waitingHuman: true,
      });
      return;
    }

    // persiste mensagem do contato
    await saveMessage(conversation.id, companyId, 'user', messageText, 'contact');
    sseManager.emit(companyId, 'message', {
      conversationId: conversation.id,
      phone,
      role: 'user',
      content: messageText,
      senderType: 'contact',
    });

    // atualiza last_message_at
    await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [conversation.id]);

    if (!flow) {
      console.log(`Nenhum fluxo ativo para company ${companyId}. Mensagem registrada.`);
      return;
    }

    const { nodes, edges } = flow;
    let currentNodeId = conversation.current_node_id;

    // se não tem nó atual, começa pelo nó de entrada
    if (!currentNodeId) {
      const startNode = nodes.find((n) => n.type === 'whatsapp_input');
      currentNodeId = startNode ? startNode.id : null;
    }

    if (!currentNodeId) {
      console.warn(`Fluxo ${flow.id} não tem nó whatsapp_input.`);
      return;
    }

    // executa nós sequencialmente até aguardar nova mensagem ou terminar
    let currentNode = findNodeById(nodes, currentNodeId);
    let processedIncomingText = messageText;

    // máximo de 20 nós por ciclo para evitar loops infinitos
    for (let i = 0; i < 20; i++) {
      if (!currentNode) break;

      const result = await processNode(
        { ...conversation, company_id: companyId },
        currentNode,
        nodes,
        edges,
        processedIncomingText,
        instanceName
      );

      // após processar o whatsapp_input, a mensagem já foi "consumida"
      processedIncomingText = null;

      if (result.action === 'transfer_to_human') {
        await pool.query(
          "UPDATE conversations SET status = 'human', current_node_id = $1, updated_at = NOW() WHERE id = $2",
          [currentNode.id, conversation.id]
        );
        sseManager.emit(companyId, 'message', {
          conversationId: conversation.id,
          phone,
          type: 'transfer_to_human',
        });
        return;
      }

      if (result.action === 'close_conversation') {
        await pool.query(
          "UPDATE conversations SET status = 'closed', updated_at = NOW() WHERE id = $1",
          [conversation.id]
        );
        return;
      }

      if (!result.nextNodeId) {
        // nó terminal sem ação específica — aguarda próxima mensagem
        await pool.query(
          'UPDATE conversations SET current_node_id = $1, updated_at = NOW() WHERE id = $2',
          [currentNode.id, conversation.id]
        );
        return;
      }

      currentNode = findNodeById(nodes, result.nextNodeId);

      // se o próximo nó é ai_agent, ele aguardará a próxima mensagem para responder
      // (para fluxos lineares sem whatsapp_input intermediários o agente processa direto)
    }

    // persiste o nó atual para retomar na próxima mensagem
    if (currentNode) {
      await pool.query(
        'UPDATE conversations SET current_node_id = $1, updated_at = NOW() WHERE id = $2',
        [currentNode.id, conversation.id]
      );
    }
  } catch (err) {
    console.error(`Erro ao processar mensagem de ${phone} (company ${companyId}):`, err);
  }
}

module.exports = { handleIncomingMessage };
