const https = require('https');
const http = require('http');

async function extractFromPdf(buffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromDocx(buffer) {
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractFromTxt(buffer) {
  return buffer.toString('utf-8');
}

async function extractFromUrl(url) {
  const { load } = require('cheerio');

  const raw = await fetchUrl(url);
  const $ = load(raw);

  // remove scripts, styles e elementos de navegação
  $('script, style, nav, header, footer, aside, iframe, noscript').remove();

  const text = $('body').text().replace(/\s+/g, ' ').trim();
  return text;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'ATSeller-Bot/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function extract({ type, buffer, url, text }) {
  switch (type) {
    case 'pdf':  return extractFromPdf(buffer);
    case 'docx': return extractFromDocx(buffer);
    case 'txt':  return extractFromTxt(buffer);
    case 'url':  return extractFromUrl(url);
    case 'text': return text;
    default: throw new Error(`Tipo desconhecido: ${type}`);
  }
}

module.exports = { extract };
