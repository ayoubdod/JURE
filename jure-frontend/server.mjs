/**
 * Production static server for the Vite SPA on Railway.
 * Serves `dist/` and falls back to index.html for client-side routes.
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.use(express.static(distDir, { index: false, maxAge: '1y', immutable: true }));

// SPA fallback: all non-file routes → index.html
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Jure frontend listening on 0.0.0.0:${port}`);
});
