const pool = require('../database/connection');
const { extract } = require('../services/textExtraction');
const { chunkText } = require('../services/chunking');
const { embedTexts, embedQuery, rankChunks } = require('../services/embeddings');

async function listDocuments(req, res) {
  const { agentId } = req.params;

  const agent = await pool.query(
    'SELECT id FROM agents WHERE id = $1 AND company_id = $2',
    [agentId, req.user.company_id]
  );
  if (!agent.rows[0]) return res.status(404).json({ error: 'Agente não encontrado.' });

  const result = await pool.query(
    `SELECT id, name, type, source, status, chunk_count, error_message, created_at
     FROM knowledge_base_documents
     WHERE agent_id = $1
     ORDER BY created_at DESC`,
    [agentId]
  );

  return res.json(result.rows);
}

async function uploadDocument(req, res) {
  const { agentId } = req.params;
  const { type, url, text, name: docName } = req.body;

  const agent = await pool.query(
    'SELECT id FROM agents WHERE id = $1 AND company_id = $2',
    [agentId, req.user.company_id]
  );
  if (!agent.rows[0]) return res.status(404).json({ error: 'Agente não encontrado.' });

  let docType = type;
  let docSource = url || null;
  let displayName = docName || url || 'Texto manual';
  let buffer = null;

  // arquivo enviado via multipart
  if (req.file) {
    buffer = req.file.buffer;
    displayName = req.file.originalname;
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    docType = ['pdf', 'docx', 'txt'].includes(ext) ? ext : 'txt';
  }

  if (!docType) return res.status(400).json({ error: 'type é obrigatório.' });
  if (docType === 'url' && !url) return res.status(400).json({ error: 'url é obrigatório para tipo url.' });
  if (docType === 'text' && !text) return res.status(400).json({ error: 'text é obrigatório para tipo text.' });

  // cria o registro imediatamente com status 'processing'
  const doc = await pool.query(
    `INSERT INTO knowledge_base_documents (agent_id, company_id, name, type, source, status)
     VALUES ($1, $2, $3, $4, $5, 'processing')
     RETURNING *`,
    [agentId, req.user.company_id, displayName, docType, docSource]
  );

  // processa em background — responde sem aguardar
  setImmediate(() => processDocument(doc.rows[0].id, agentId, req.user.company_id, { type: docType, buffer, url, text }));

  return res.status(202).json(doc.rows[0]);
}

async function processDocument(docId, agentId, companyId, { type, buffer, url, text }) {
  try {
    const rawText = await extract({ type, buffer, url, text });

    if (!rawText || rawText.trim().length < 10) {
      await pool.query(
        `UPDATE knowledge_base_documents SET status = 'error', error_message = $1, updated_at = NOW() WHERE id = $2`,
        ['Não foi possível extrair texto do documento.', docId]
      );
      return;
    }

    const chunks = chunkText(rawText);

    // gera embeddings para todos os chunks
    const embeddings = await embedTexts(chunks);

    // insere chunks no banco
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < chunks.length; i++) {
        await client.query(
          `INSERT INTO knowledge_base_chunks (document_id, agent_id, company_id, content, embedding, chunk_index)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [docId, agentId, companyId, chunks[i], JSON.stringify(embeddings[i]), i]
        );
      }
      await client.query(
        `UPDATE knowledge_base_documents
         SET status = 'ready', chunk_count = $1, updated_at = NOW()
         WHERE id = $2`,
        [chunks.length, docId]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(`Erro ao processar documento ${docId}:`, err.message);
    await pool.query(
      `UPDATE knowledge_base_documents
       SET status = 'error', error_message = $1, updated_at = NOW()
       WHERE id = $2`,
      [err.message.slice(0, 500), docId]
    );
  }
}

async function deleteDocument(req, res) {
  const { agentId, docId } = req.params;

  const result = await pool.query(
    `DELETE FROM knowledge_base_documents
     WHERE id = $1 AND agent_id = $2 AND company_id = $3
     RETURNING id`,
    [docId, agentId, req.user.company_id]
  );

  if (!result.rows[0]) return res.status(404).json({ error: 'Documento não encontrado.' });
  return res.json({ message: 'Documento removido.' });
}

// endpoint de busca semântica — usado pelo engine de fluxo na Fase 5
async function semanticSearch(req, res) {
  const { agentId } = req.params;
  const { query, topK = 5 } = req.body;

  if (!query) return res.status(400).json({ error: 'query é obrigatório.' });

  const agent = await pool.query(
    'SELECT id FROM agents WHERE id = $1 AND company_id = $2',
    [agentId, req.user.company_id]
  );
  if (!agent.rows[0]) return res.status(404).json({ error: 'Agente não encontrado.' });

  const chunksResult = await pool.query(
    'SELECT id, content, embedding, chunk_index FROM knowledge_base_chunks WHERE agent_id = $1',
    [agentId]
  );

  const chunks = chunksResult.rows.map((r) => ({
    ...r,
    embedding: r.embedding, // já é array do JSONB
  }));

  const queryEmbedding = await embedQuery(query);
  const ranked = rankChunks(queryEmbedding, chunks, Number(topK));

  return res.json(ranked.map(({ id, content, score, chunk_index }) => ({ id, content, score, chunk_index })));
}

module.exports = { listDocuments, uploadDocument, deleteDocument, semanticSearch };
