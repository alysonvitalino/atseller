const pool = require('../database/connection');

// retorna company_id de acordo com o role: admin vê tudo (company_id = null), gestor/operador vê só a sua
function getScope(user) {
  if (user.role === 'platform_admin') return null;
  return user.company_id;
}

function companyFilter(alias, companyId, paramIdx) {
  if (!companyId) return { sql: '', params: [], nextIdx: paramIdx };
  return {
    sql: `AND ${alias}.company_id = $${paramIdx}`,
    params: [companyId],
    nextIdx: paramIdx + 1,
  };
}

async function getSummary(req, res) {
  try {
    const companyId = getScope(req.user);
    const cf = companyFilter('', companyId, 1);
    const params = cf.params;

    const whereCompany = companyId ? `WHERE company_id = $1` : `WHERE TRUE`;
    const andCompany = companyId ? `AND company_id = $1` : ``;

    // hoje e ontem
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const [
      convsActive,
      leadsToday,
      leadsYesterday,
      leadsQualified,
      vendas,
      vendasYesterday,
      humanConvs,
      totalLeads,
      agents,
      totalMessages,
      messagesYesterday,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM conversations ${whereCompany.replace('WHERE', 'WHERE')} ${andCompany ? andCompany.replace('AND ', 'AND ') : ''} AND status IN ('active','human','waiting')`.replace('WHERE  AND', 'WHERE'),
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads ${whereCompany} AND created_at >= $${params.length + 1}`,
        [...params, todayStart.toISOString()]
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads ${whereCompany} AND created_at >= $${params.length + 1} AND created_at < $${params.length + 2}`,
        [...params, yesterdayStart.toISOString(), todayStart.toISOString()]
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads ${whereCompany} AND pipeline_stage IN ('qualificado','em_negociacao','proposta_enviada','venda_concluida')`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads ${whereCompany} AND pipeline_stage = 'venda_concluida' AND updated_at >= $${params.length + 1}`,
        [...params, todayStart.toISOString()]
      ),
      pool.query(
        `SELECT COUNT(*) FROM leads ${whereCompany} AND pipeline_stage = 'venda_concluida' AND updated_at >= $${params.length + 1} AND updated_at < $${params.length + 2}`,
        [...params, yesterdayStart.toISOString(), todayStart.toISOString()]
      ),
      pool.query(
        `SELECT COUNT(*) FROM conversations ${whereCompany} ${andCompany ? andCompany : ''} AND status = 'human'`.replace('WHERE  AND', 'WHERE'),
        params
      ),
      pool.query(`SELECT COUNT(*) FROM leads ${whereCompany}`, params),
      pool.query(`SELECT COUNT(*) FROM agents ${whereCompany} AND status = 'active'`, params),
      pool.query(`SELECT COUNT(*) FROM messages ${whereCompany}`, params),
      pool.query(
        `SELECT COUNT(*) FROM messages ${whereCompany} AND created_at >= $${params.length + 1} AND created_at < $${params.length + 2}`,
        [...params, yesterdayStart.toISOString(), todayStart.toISOString()]
      ),
    ]);

    const totalLeadsN = parseInt(totalLeads.rows[0].count);
    const vendasTotal = await pool.query(
      `SELECT COUNT(*) FROM leads ${whereCompany} AND pipeline_stage = 'venda_concluida'`,
      params
    );
    const vendasTotalN = parseInt(vendasTotal.rows[0].count);
    const taxaConversao = totalLeadsN > 0 ? Math.round((vendasTotalN / totalLeadsN) * 100) : 0;

    const leadsTodayN = parseInt(leadsToday.rows[0].count);
    const leadsYesterdayN = parseInt(leadsYesterday.rows[0].count);
    const vendasN = parseInt(vendas.rows[0].count);
    const vendasYesterdayN = parseInt(vendasYesterday.rows[0].count);
    const totalMessagesN = parseInt(totalMessages.rows[0].count);
    const messagesYesterdayN = parseInt(messagesYesterday.rows[0].count);

    res.json({
      conversas_ativas: parseInt(convsActive.rows[0].count),
      leads_hoje: leadsTodayN,
      leads_hoje_delta: leadsTodayN - leadsYesterdayN,
      leads_qualificados: parseInt(leadsQualified.rows[0].count),
      vendas_hoje: vendasN,
      vendas_hoje_delta: vendasN - vendasYesterdayN,
      taxa_conversao: taxaConversao,
      atendimentos_humanos: parseInt(humanConvs.rows[0].count),
      total_leads: totalLeadsN,
      agentes_ativos: parseInt(agents.rows[0].count),
      total_mensagens: totalMessagesN,
      mensagens_ontem: messagesYesterdayN,
    });
  } catch (err) {
    console.error('Erro em getSummary:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function getLeadsPerDay(req, res) {
  try {
    const companyId = getScope(req.user);
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const andCompany = companyId ? `AND company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const result = await pool.query(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*) AS total
       FROM leads
       WHERE created_at >= NOW() - INTERVAL '${days} days' ${andCompany}
       GROUP BY day
       ORDER BY day ASC`,
      params
    );

    // preenche dias sem dados com 0
    const map = {};
    for (const row of result.rows) map[row.day.toISOString().slice(0, 10)] = parseInt(row.total);

    const filled = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      filled.push({ day: key, total: map[key] || 0 });
    }

    res.json(filled);
  } catch (err) {
    console.error('Erro em getLeadsPerDay:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function getConversions(req, res) {
  try {
    const companyId = getScope(req.user);
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const andCompany = companyId ? `AND company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const result = await pool.query(
      `SELECT
         DATE(updated_at) AS day,
         COUNT(*) AS vendas
       FROM leads
       WHERE pipeline_stage = 'venda_concluida'
         AND updated_at >= NOW() - INTERVAL '${days} days' ${andCompany}
       GROUP BY day
       ORDER BY day ASC`,
      params
    );

    const map = {};
    for (const row of result.rows) map[row.day.toISOString().slice(0, 10)] = parseInt(row.vendas);

    const filled = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      filled.push({ day: key, vendas: map[key] || 0 });
    }

    res.json(filled);
  } catch (err) {
    console.error('Erro em getConversions:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function getMessagesVolume(req, res) {
  try {
    const companyId = getScope(req.user);
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const andCompany = companyId ? `AND company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const result = await pool.query(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*) FILTER (WHERE role = 'user') AS recebidas,
         COUNT(*) FILTER (WHERE role = 'assistant') AS enviadas
       FROM messages
       WHERE created_at >= NOW() - INTERVAL '${days} days' ${andCompany}
       GROUP BY day
       ORDER BY day ASC`,
      params
    );

    const map = {};
    for (const row of result.rows) {
      map[row.day.toISOString().slice(0, 10)] = {
        recebidas: parseInt(row.recebidas),
        enviadas: parseInt(row.enviadas),
      };
    }

    const filled = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      filled.push({ day: key, ...(map[key] || { recebidas: 0, enviadas: 0 }) });
    }

    res.json(filled);
  } catch (err) {
    console.error('Erro em getMessagesVolume:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

async function getAgentDistribution(req, res) {
  try {
    const companyId = getScope(req.user);
    const andCompany = companyId ? `AND c.company_id = $1` : '';
    const params = companyId ? [companyId] : [];

    const result = await pool.query(
      `SELECT
         a.name AS agent,
         COUNT(c.id) AS conversas
       FROM conversations c
       JOIN agents a ON c.assigned_agent_id = a.id
       WHERE c.assigned_agent_id IS NOT NULL ${andCompany}
       GROUP BY a.name
       ORDER BY conversas DESC
       LIMIT 10`,
      params
    );

    // conversas sem agente
    const semAgente = await pool.query(
      `SELECT COUNT(*) FROM conversations c
       WHERE c.assigned_agent_id IS NULL ${andCompany}`,
      params
    );

    const rows = result.rows.map((r) => ({ agent: r.agent, conversas: parseInt(r.conversas) }));
    const semAgentaN = parseInt(semAgente.rows[0].count);
    if (semAgentaN > 0) rows.push({ agent: 'Sem agente', conversas: semAgentaN });

    res.json(rows);
  } catch (err) {
    console.error('Erro em getAgentDistribution:', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
}

module.exports = { getSummary, getLeadsPerDay, getConversions, getMessagesVolume, getAgentDistribution };
