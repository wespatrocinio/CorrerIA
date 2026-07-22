// Servidor estático de produção para o build do Vite (dist/).
// Não depende de expansão de $PORT pelo shell — lê process.env.PORT direto no Node,
// o que funciona independente de como a plataforma (Railway) invoca o start command.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

async function lerArquivo(caminho) {
  return readFile(caminho);
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const caminhoPedido = url.pathname === '/' ? '/index.html' : url.pathname;

  try {
    const dados = await lerArquivo(join(DIST, caminhoPedido));
    res.writeHead(200, { 'Content-Type': MIME[extname(caminhoPedido)] || 'application/octet-stream' });
    res.end(dados);
  } catch {
    // Rota não encontrada como arquivo estático — fallback de SPA: serve index.html
    // para que o React Router trate rotas como /ciclo/:id/semana/:id no client-side.
    try {
      const indexHtml = await lerArquivo(join(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(indexHtml);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}).listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
