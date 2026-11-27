import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import healthHandler from './api/health.ts';
import geminiAskHandler from './api/gemini/ask.ts';
import geminiTranscribeHandler from './api/gemini/transcribe-preview.ts';
import { sendJson } from './api/_lib/geminiService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);

  // Mount the exact same Vercel Serverless Function handlers locally
  app.all('/api/health', (req, res) => healthHandler(req, res));
  app.all('/api/gemini/ask', (req, res) => geminiAskHandler(req, res));
  app.all('/api/gemini/transcribe-preview', (req, res) =>
    geminiTranscribeHandler(req, res)
  );

  // Explicit JSON 404 for any unknown /api/* route
  app.use('/api', (req, res) => {
    sendJson(res, 404, {
      error: `Không tìm thấy API endpoint: ${req.method} ${req.originalUrl}`,
    });
  });

  // Vite middleware in dev, static dist in production Node server
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ky Uc Viet server listening on port ${PORT}`);
  });
}

startServer();
