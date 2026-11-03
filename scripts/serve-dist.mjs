// Serve o build de produção como uma hospedagem estática: gzip, cache longo nos arquivos com hash
// no nome e o index.html em qualquer rota (fallback de SPA). Serve para medir com o Lighthouse
// (docs/metricas.md) sem depender de pacote extra.
//
// Uso: node scripts/serve-dist.mjs [pasta] [porta]
// Padrão: dist/scua-logon-poc/browser na porta 4400.
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = resolve(process.argv[2] ?? 'dist/scua-logon-poc/browser');
const port = Number(process.argv[3] ?? 4400);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt']);
// O Angular põe um hash no nome dos arquivos do build (main-XIF427PZ.js): podem ficar em cache.
const HASHED = /-[A-Za-z0-9_]{8,}\.(js|css|woff2?)$/;

/** O arquivo pedido, se existir dentro da pasta; senão, o index.html. */
async function pick(pathname) {
  const file = resolve(join(root, decodeURIComponent(pathname)));
  if (file.startsWith(root + sep)) {
    const info = await stat(file).catch(() => null);
    if (info?.isFile()) return file;
  }
  return join(root, 'index.html');
}

createServer(async (request, response) => {
  const file = await pick(new URL(request.url, 'http://localhost').pathname);
  const ext = extname(file);
  let body = await readFile(file);
  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': HASHED.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache',
  };
  if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(request.headers['accept-encoding'] ?? '')) {
    body = gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }
  response.writeHead(200, headers).end(body);
}).listen(port, () => console.log(`Servindo ${root} em http://localhost:${port}`));
