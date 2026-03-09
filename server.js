import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5173;

// Proxy /api al backend usando fetch nativo (Node 18+)
// Express 5 requiere {*path} en lugar de * para wildcards
app.use('/api/{*path}', async (req, res) => {
  try {
    const url = 'http://127.0.0.1:3000' + req.originalUrl;
    const headers = { ...req.headers, host: '127.0.0.1:3000' };
    delete headers['content-length'];

    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
        const response = await fetch(url, {
          method: req.method,
          headers,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
          duplex: 'half',
        });

        res.status(response.status);
        response.headers.forEach((value, key) => {
          if (key !== 'transfer-encoding') {
            res.setHeader(key, value);
          }
        });

        const data = await response.arrayBuffer();
        res.end(Buffer.from(data));
      } catch (err) {
        console.error('Proxy fetch error:', err.message);
        res.status(502).json({ error: 'Backend no disponible' });
      }
    });
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Error de proxy' });
  }
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, '127.0.0.1', () => {
  console.log('Servidor corriendo en http://127.0.0.1:' + PORT);
});

server.on('error', (err) => {
  console.error('SERVER ERROR:', err.code, err.message);
});

process.on('SIGTERM', () => console.log('>>> Recibida señal SIGTERM'));
process.on('SIGINT', () => console.log('>>> Recibida señal SIGINT'));
process.on('uncaughtException', (err) => console.error('>>> Uncaught:', err));
process.on('unhandledRejection', (err) => console.error('>>> Unhandled rejection:', err));
process.on('exit', (code) => console.log('>>> Process exit code:', code));
