import express from 'express';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApiRouter } from './routes/api.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET ?? 'sis-doc-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 8 }
  })
);

app.use('/api', buildApiRouter());

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
