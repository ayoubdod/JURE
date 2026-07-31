/**
 * Production static server for the Vite SPA on Railway.
 * Serves `dist/` and falls back to index.html for client-side routes.
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const indexHtml = path.join(distDir, 'index.html');
const port = Number(process.env.PORT) || 3000;

console.log('[jure-frontend] starting', {
  port,
  distDir,
  node: process.version,
  cwd: process.cwd(),
});

if (!fs.existsSync(indexHtml)) {
  console.error(`[jure-frontend] missing ${indexHtml} — did "vite build" run?`);
  process.exit(1);
}

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.use(
  express.static(distDir, {
    index: false,
    maxAge: '1y',
    immutable: true,
  })
);

// SPA fallback (middleware, not a path pattern — Express 5 safe)
app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).type('text/plain').send('Method Not Allowed');
    return;
  }
  res.sendFile(indexHtml);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`[jure-frontend] listening on http://0.0.0.0:${port}`);
});
