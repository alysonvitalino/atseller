const CHUNK_SIZE = 1500;   // caracteres por chunk
const CHUNK_OVERLAP = 200; // sobreposição entre chunks

function chunkText(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];

  const chunks = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = start + CHUNK_SIZE;

    // tenta quebrar em limite de frase (ponto final, exclamação, interrogação)
    if (end < cleaned.length) {
      const boundary = cleaned.lastIndexOf('. ', end);
      if (boundary > start + CHUNK_SIZE * 0.5) {
        end = boundary + 1;
      }
    }

    const chunk = cleaned.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk); // ignora fragmentos muito pequenos

    start = end - CHUNK_OVERLAP;
    if (start >= cleaned.length) break;
  }

  return chunks;
}

module.exports = { chunkText };
