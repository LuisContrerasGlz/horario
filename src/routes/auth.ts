import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../lib/db.js';

const USER_LOGIN_SELECT = `
  SELECT u.id_usuario, u.nombre, u.correo_electronico, u.password, u.tipo_usuario,
         tu.descripcion AS tipo_usuario_descripcion, u.status, u.id_ct,
         ct.CCT AS cct_codigo, ct.Nombre AS cct_nombre
    FROM usuario u
    LEFT JOIN tipo_usuario tu ON tu.id_tipo_usuario = u.tipo_usuario
    LEFT JOIN centro_trabajo ct ON ct.id_cct = u.id_ct
   WHERE u.correo_electronico = ?
   LIMIT 1
`;

function toSessionUser(row: any) {
  return {
    id_usuario: row.id_usuario,
    nombre: row.nombre,
    correo_electronico: row.correo_electronico,
    tipo_usuario: Number(row.tipo_usuario),
    tipo_usuario_descripcion: row.tipo_usuario_descripcion,
    id_ct: row.id_ct ?? null,
    cct_codigo: row.cct_codigo ?? null,
    cct_nombre: row.cct_nombre ?? null,
  };
}

export function buildAuthRouter() {
  const router = Router();

  // POST /api/auth/login - valida credenciales contra `usuario` (mysql2) - §2 y §8.1
  router.post('/login', async (req, res) => {
    const correo = String(req.body?.correo_electronico ?? '').trim();
    const password = String(req.body?.password ?? '');
    if (!correo || !password) {
      return res.status(400).json({ message: 'correo_electronico y password son obligatorios.' });
    }

    try {
      const [rows] = await query<any>(USER_LOGIN_SELECT, [correo]);
      const usuario = rows[0];
      if (!usuario || !usuario.password) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }
      if (Number(usuario.status) !== 1) {
        return res.status(401).json({ message: 'El usuario no se encuentra activo.' });
      }

      const passwordMatches = await bcrypt.compare(password, usuario.password);
      if (!passwordMatches) {
        return res.status(401).json({ message: 'Credenciales inválidas.' });
      }

      const sessionUser = toSessionUser(usuario);
      // Regenera el identificador de sesión al autenticar para evitar fijación de sesión.
      req.session.regenerate((error) => {
        if (error) {
          return res.status(500).json({ message: 'No se pudo iniciar sesión.' });
        }
        req.session.user = sessionUser;
        req.session.save((saveError) => {
          if (saveError) {
            return res.status(500).json({ message: 'No se pudo iniciar sesión.' });
          }
          return res.json({ user: sessionUser });
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo iniciar sesión.';
      res.status(500).json({ message });
    }
  });

  // POST /api/auth/logout - destruye la sesión activa - §2.1
  router.post('/logout', (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({ message: 'No se pudo cerrar la sesión.' });
      }
      res.clearCookie('connect.sid');
      return res.status(204).send();
    });
  });

  // GET /api/auth/me - usuario autenticado actual - §2.1
  router.get('/me', (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: 'Sesión no iniciada o expirada.', code: 'UNAUTHENTICATED' });
    }
    return res.json({ user: req.session.user });
  });

  return router;
}
