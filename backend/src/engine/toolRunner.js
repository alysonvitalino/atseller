const pool = require('../database/connection');

// Definições de ferramentas para o function calling do OpenAI
const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'create_lead',
      description: 'Cadastra o contato como lead no CRM quando identificar interesse real.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome do lead' },
          email: { type: 'string', description: 'E-mail (se informado pelo contato)' },
          interest: { type: 'string', description: 'Principal interesse ou necessidade identificada' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_lead',
      description: 'Atualiza informações ou avança o estágio do lead no pipeline.',
      parameters: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            enum: ['qualificado', 'em_negociacao', 'proposta_enviada', 'venda_concluida', 'perdido'],
            description: 'Novo estágio do lead',
          },
          notes: { type: 'string', description: 'Observações sobre a atualização' },
        },
        required: ['stage'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'transfer_to_human',
      description: 'Transfere o atendimento para um operador humano. Use quando o cliente solicitar falar com uma pessoa, quando houver reclamação grave, ou quando a negociação precisar de aprovação.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Motivo da transferência' },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'close_conversation',
      description: 'Encerra o atendimento quando o objetivo foi concluído ou o cliente não tem interesse.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['success', 'no_interest', 'completed'],
            description: 'Resultado do atendimento',
          },
        },
        required: ['status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_proposal',
      description: 'Registra que uma proposta foi enviada ao cliente e avança o pipeline.',
      parameters: {
        type: 'object',
        properties: {
          details: { type: 'string', description: 'Detalhes da proposta enviada' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_meeting',
      description: 'Registra interesse em agendar visita ou reunião.',
      parameters: {
        type: 'object',
        properties: {
          preference: { type: 'string', description: 'Preferência de data/horário do cliente' },
        },
        required: [],
      },
    },
  },
];

function getToolDefinitions(enabledTools) {
  if (!enabledTools || enabledTools.length === 0) return [];
  return TOOL_DEFINITIONS.filter((t) => enabledTools.includes(t.function.name));
}

async function executeTool(toolName, args, context) {
  const { conversationId, companyId, phone, contactName } = context;

  switch (toolName) {
    case 'create_lead': {
      const existing = await pool.query(
        'SELECT id FROM leads WHERE conversation_id = $1',
        [conversationId]
      );
      if (existing.rows[0]) {
        return { success: true, leadId: existing.rows[0].id, message: 'Lead já existia.' };
      }
      const lead = await pool.query(
        `INSERT INTO leads (company_id, conversation_id, name, phone, email, source, interest)
         VALUES ($1, $2, $3, $4, $5, 'whatsapp', $6) RETURNING id`,
        [companyId, conversationId, args.name || contactName || phone, phone, args.email || null, args.interest || null]
      );
      await pool.query('UPDATE conversations SET lead_id = $1 WHERE id = $2', [lead.rows[0].id, conversationId]);
      return { success: true, leadId: lead.rows[0].id };
    }

    case 'update_lead': {
      const lead = await pool.query('SELECT id FROM leads WHERE conversation_id = $1', [conversationId]);
      if (!lead.rows[0]) return { success: false, message: 'Lead não encontrado. Crie o lead primeiro.' };
      await pool.query(
        'UPDATE leads SET status = $1, pipeline_stage = $1, updated_at = NOW() WHERE id = $2',
        [args.stage, lead.rows[0].id]
      );
      return { success: true };
    }

    case 'send_proposal': {
      const lead = await pool.query('SELECT id FROM leads WHERE conversation_id = $1', [conversationId]);
      if (lead.rows[0]) {
        await pool.query(
          "UPDATE leads SET status = 'proposta_enviada', pipeline_stage = 'proposta_enviada', updated_at = NOW() WHERE id = $1",
          [lead.rows[0].id]
        );
      }
      return { success: true };
    }

    case 'schedule_meeting': {
      await pool.query(
        `UPDATE conversations SET metadata = jsonb_set(metadata, '{meeting_requested}', 'true'), updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );
      return { success: true };
    }

    case 'transfer_to_human':
      // sinaliza para o flowRunner que deve mudar o estado
      return { success: true, _action: 'transfer_to_human', reason: args.reason };

    case 'close_conversation':
      return { success: true, _action: 'close_conversation', status: args.status };

    default:
      return { success: false, message: `Ferramenta desconhecida: ${toolName}` };
  }
}

module.exports = { getToolDefinitions, executeTool };
