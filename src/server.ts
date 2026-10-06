import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApiRouter } from './routes/api.js';
import { buildAuthRouter } from './routes/auth.js';
import { authMiddleware, roleMiddleware, cctMiddleware } from './lib/auth.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);

// Caducidad de sesión por inactividad: 5 minutos (300,000 ms) - §2.1.
// `rolling: true` renueva el contador de expiración en cada petición válida.
const SESSION_INACTIVITY_MS = 5 * 60 * 1000;

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'sis-doc-secret',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { secure: false, maxAge: SESSION_INACTIVITY_MS },
  })
);

app.use('/api/auth', buildAuthRouter());
app.use('/api', authMiddleware, roleMiddleware, cctMiddleware, buildApiRouter());


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`sis_doc running at http://localhost:${port}`);
});
