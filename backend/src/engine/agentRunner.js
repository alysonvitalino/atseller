const OpenAI = require('openai');
const pool = require('../database/connection');
const { embedQuery, rankChunks } = require('../services/embeddings');
const { getToolDefinitions, executeTool } = require('./toolRunner');

let _openai = null;
function getClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// retry com backoff exponencial para rate limit (429) e erros 5xx da OpenAI
async function callWithRetry(fn, maxRetries = 3) {
  let lastErr;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status ?? err?.response?.status;
      const retryAfter = parseInt(err?.headers?.['retry-after'] ?? '0', 10) || 0;
      // só retenta em rate limit (429) e erros de servidor (5xx)
      if (status !== 429 && (status < 500 || status > 599)) throw err;
      const wait = retryAfter > 0
        ? retryAfter * 1000
        : Math.min(1000 * Math.pow(2, attempt), 16000);
      console.warn(`OpenAI error ${status} — retentando em ${wait}ms (tentativa ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

const PERSONALITY_PROMPTS = {
  friendly:   'Seu tom é descontraído, caloroso e próximo. Use linguagem informal mas profissional. Seja empático e crie conexão.',
  sales:      'Seja proativo, destaque benefícios e crie urgência com naturalidade. Foque em fechar o negócio sem ser agressivo.',
  consultive: 'Faça perguntas para entender profundamente a necessidade antes de propor. Seja um consultor, não um vendedor.',
  formal:     'Use linguagem formal, precisa e respeitosa. Evite gírias e mantenha postura profissional.',
  technical:  'Seja direto, preciso e baseado em dados. Use termos técnicos quando relevante e forneça especificações.',
};

async function runAgent(agentConfig, conversation, incomingText) {
  const { agent, node } = agentConfig;

  // busca histórico da conversa (últimas 20 mensagens)
  const historyResult = await pool.query(
    `SELECT role, content FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at DESC LIMIT 20`,
    [conversation.id]
  );
  const history = historyResult.rows.reverse();

  // RAG: busca trechos relevantes da base de conhecimento
  let knowledgeSnippets = '';
  if (incomingText && agent.id) {
    try {
      const chunksResult = await pool.query(
        'SELECT content, embedding FROM knowledge_base_chunks WHERE agent_id = $1',
        [agent.id]
      );
      if (chunksResult.rows.length > 0) {
        const queryEmb = await embedQuery(incomingText);
        const ranked = rankChunks(queryEmb, chunksResult.rows, 4);
        if (ranked.length > 0) {
          knowledgeSnippets = '\n\nBASE DE CONHECIMENTO (trechos relevantes):\n' +
            ranked.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n');
        }
      }
    } catch (err) {
      console.warn('RAG falhou, continuando sem knowledge base:', err.message);
    }
  }

  // monta system prompt
  const personalityText = PERSONALITY_PROMPTS[agent.personality] || PERSONALITY_PROMPTS.friendly;
  const systemPrompt = [
    `Você é ${agent.name}, um assistente de vendas por WhatsApp.`,
    personalityText,
    agent.context ? `\nCONTEXTO:\n${agent.context}` : '',
    agent.objective ? `\nOBJETIVO:\n${agent.objective}` : '',
    agent.success_criteria ? `\nCRITÉRIO DE SUCESSO:\n${agent.success_criteria}` : '',
    knowledgeSnippets,
    '\nINSTRUÇÕES IMPORTANTES:',
    '- Responda SEMPRE em português brasileiro.',
    '- Mantenha mensagens curtas e naturais, como em uma conversa de WhatsApp.',
    '- Nunca use formatação markdown (asteriscos, hashes, etc.).',
    '- Use as ferramentas disponíveis quando apropriado.',
  ].filter(Boolean).join('\n');

  // monta mensagens para a API
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  // ferramentas habilitadas para este agente
  const tools = getToolDefinitions(agent.tools || []);

  // chama GPT-4o com function calling (com retry em rate limit)
  const response = await callWithRetry(() =>
    getClient().chat.completions.create({
      model: 'gpt-4o',
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 500,
    })
  );

  const choice = response.choices[0];
  const assistantMessage = choice.message;

  // processa chamadas de ferramentas
  let flowAction = null;
  const toolResults = [];

  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    for (const tc of assistantMessage.tool_calls) {
      let toolArgs = {};
      try { toolArgs = JSON.parse(tc.function.arguments); } catch {}

      const result = await executeTool(tc.function.name, toolArgs, {
        conversationId: conversation.id,
        companyId: conversation.company_id,
        phone: conversation.phone,
        contactName: conversation.contact_name,
      });

      toolResults.push({ toolCallId: tc.id, name: tc.function.name, result });

      if (result._action) flowAction = result._action;
    }

    // segunda chamada para o agente formular a resposta após as ferramentas
    if (!flowAction || flowAction !== 'transfer_to_human') {
      const followUpMessages = [
        ...messages,
        assistantMessage,
        ...toolResults.map((tr) => ({
          role: 'tool',
          tool_call_id: tr.toolCallId,
          content: JSON.stringify(tr.result),
        })),
      ];

      const followUp = await callWithRetry(() =>
        getClient().chat.completions.create({
          model: 'gpt-4o',
          messages: followUpMessages,
          temperature: 0.7,
          max_tokens: 500,
        })
      );

      const replyText = followUp.choices[0].message.content;
      return { text: replyText, flowAction, toolResults };
    }
  }

  const replyText = assistantMessage.content;
  return { text: replyText, flowAction, toolResults };
}

async function evaluateCondition(condition, history) {
  const historyText = history
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'Cliente' : 'Agente'}: ${m.content}`)
    .join('\n');

  const response = await callWithRetry(() =>
    getClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você avalia condições sobre conversas de vendas. Responda apenas YES ou NO.',
        },
        {
          role: 'user',
          content: `Baseado na conversa abaixo, a seguinte condição é verdadeira?\n\nCONDIÇÃO: ${condition}\n\nCONVERSA:\n${historyText}\n\nResponda apenas YES ou NO.`,
        },
      ],
      temperature: 0,
      max_tokens: 5,
    })
  );

  const answer = response.choices[0].message.content.trim().toUpperCase();
  return answer.startsWith('YES');
}

module.exports = { runAgent, evaluateCondition };
