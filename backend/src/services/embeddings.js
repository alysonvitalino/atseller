const OpenAI = require('openai');

// lazy — instancia apenas na primeira chamada, após o .env estar carregado
let _openai = null;
function getClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100; // máximo de textos por chamada à API

async function embedTexts(texts) {
  if (!texts.length) return [];

  const allEmbeddings = [];

  // processa em batches para evitar rate limits
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    allEmbeddings.push(...response.data.map((e) => e.embedding));
  }

  return allEmbeddings;
}

async function embedQuery(text) {
  const [embedding] = await embedTexts([text]);
  return embedding;
}

// busca por similaridade cosseno em JavaScript
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function rankChunks(queryEmbedding, chunks, topK = 5) {
  return chunks
    .filter((c) => c.embedding)
    .map((c) => ({
      ...c,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { embedTexts, embedQuery, rankChunks };
