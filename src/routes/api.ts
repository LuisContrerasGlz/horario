import { Router } from 'express';
import bcrypt from 'bcryptjs';
import type { PoolConnection } from 'mysql2/promise';
import { query, withTransaction } from '../lib/db.js';
import {
  getScheduleCellAction,
  validateAsignacionDocente,
  validateDocenteHours,
  validateHorarioAssignment,
} from '../lib/validation.js';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ---------------------------------------------------------------------------
// Consultas SQL directas contra el esquema real de `sis_doc`.
// NOTA: `semestre` no tiene columna `activo`, el estado se determina por
// `id_status` (1 = Activo en la tabla `status`). `materia`/`grupo`/`docente`/
// `turno` tampoco usan los nombres de columna genéricos que asumía la versión
// anterior de este archivo; se agregan alias para exponer siempre `id_*` y
// una descripción legible en el JSON de salida.
// ---------------------------------------------------------------------------

const SEMESTER_SELECT = `
  SELECT vs.id_semestre, vs.descripcion_semestre AS descripcion,
         vs.descripcion_semestre AS nombre_semestre, vs.fecha_inicio, vs.fecha_fin,
         vs.id_cct, vs.CCT, vs.nombre_centro_trabajo, vs.id_status, vs.tipo_semestre,
         vs.descripcion_status AS status_descripcion, (vs.id_status = 1) AS activo
    FROM vista_semestre vs
`;

const MATERIA_SELECT = `
  SELECT vm.id_materia, vm.nombre_materia, vm.nombre_materia AS nombre,
         vm.nombre_corto, vm.semestre, vm.horas, vm.tipo_semestre, vm.id_academia,
         vm.nombre_academia, vm.academia_corto, vm.id_status, vm.status_materia AS status_descripcion,
         vm.id_cct
    FROM vista_materias vm
`;

const GRUPO_SELECT = `
  SELECT vg.id_grupo, vg.grupo, CONCAT(vg.semestre, '° ', vg.grupo) AS nombre_grupo,
         vg.semestre, vg.tipo_semestre, vg.id_especialidad, vg.nombre_especialidad,
         vg.especialidad_corta, vg.id_cct, vg.CCT, vg.centro_trabajo,
         vg.id_turno, vg.turno AS turno_descripcion
    FROM vista_grupos vg
`;

// Alias en minúsculas para evitar colisiones de llave insensibles a mayúsculas
// en clientes JSON (p. ej. ConvertFrom-Json de PowerShell) entre `Nombre` y `nombre`.
const DOCENTE_SELECT = `
  SELECT vd.id_docente, vd.RFC AS rfc, vd.Nombre AS nombre_pila,
         vd.Apellido_pat AS apellido_paterno, vd.Apellido_mat AS apellido_materno,
         vd.nombre_completo, vd.nombre_completo AS nombre, vd.Perfil AS perfil,
         vd.correo_e, vd.Telefono AS telefono, vd.horas_nombramiento, vd.horas_descarga,
         vd.id_turno, vd.turno AS turno_descripcion, vd.id_cct, vd.centro_trabajo,
         vd.id_status, vd.status AS status_descripcion
    FROM vista_docente vd
`;

const TURNO_SELECT = `SELECT id_turno, Descripcion, Descripcion AS nombre_turno FROM turno`;
const BLOQUE_SELECT = `
  SELECT b.*, t.Descripcion AS turno_descripcion
    FROM bloque_horario b
    JOIN turno t ON t.id_turno = b.id_turno
`;

const HORARIO_SELECT = `
  SELECT hd.id_horario, hd.id_asignacion,
         CASE hd.dia_semana WHEN 'Miercoles' THEN 'Miércoles' ELSE hd.dia_semana END AS dia_semana,
         hd.id_bloque,
         ad.id_semestre, ad.id_docente, ad.id_grupo, ad.id_materia,
         CONCAT_WS(' ', d.Nombre, d.Apellido_pat, d.Apellido_mat) AS docente_nombre,
         m.nombre AS nombre_materia, g.grupo AS nombre_grupo,
         b.codigo_bloque, b.hora_inicio, b.hora_fin, b.orden AS bloque_orden, b.id_turno
    FROM horario_detalle hd
    JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
    LEFT JOIN docente d ON d.id_docente = ad.id_docente
    LEFT JOIN materia m ON m.id_materia = ad.id_materia
    LEFT JOIN grupo g ON g.id_grupo = ad.id_grupo
    LEFT JOIN bloque_horario b ON b.id_bloque = hd.id_bloque
`;

// ---------------------------------------------------------------------------
// Helpers de semestre activo (contexto global obligatorio para carga docente
// y asignación de horarios, ver PLAN_DESARROLLO_COPILOT.md §2.1).
// ---------------------------------------------------------------------------

// Resuelve el semestre activo: id_status = 1 ("Activo"); si ninguno está
// marcado como activo, cae al más reciente por fecha_inicio.
async function getSemesterById(id?: number | null) {
  if (id !== undefined && id !== null) {
    const semesterId = Number(id);
    if (!Number.isSafeInteger(semesterId) || semesterId <= 0) {
      return null;
    }
    const [rows] = await query<any>(`${SEMESTER_SELECT} WHERE vs.id_semestre = ? LIMIT 1`, [semesterId]);
    return rows[0] ?? null;
  }

  const [activeRows] = await query<any>(`${SEMESTER_SELECT} WHERE vs.id_status = 1 ORDER BY vs.fecha_inicio DESC LIMIT 1`);
  if (activeRows[0]) {
    return activeRows[0];
  }

  const [recentRows] = await query<any>(`${SEMESTER_SELECT} ORDER BY vs.fecha_inicio DESC LIMIT 1`);
  return recentRows[0] ?? null;
}

// Resuelve el semestre a usar en una solicitud: query param > sesión > activo en BD.
async function resolveRequestSemester(req: any) {
  const requestedId = req.query.semesterId ?? req.body?.id_semestre ?? req.session?.activeSemesterId;
  return requestedId === undefined || requestedId === null || requestedId === ''
    ? getSemesterById()
    : getSemesterById(Number(requestedId));
}

function registerReadOnlyCatalogRoutes(router: Router, path: string, listSql: string, detailSql: string) {
  router.get(`/${path}`, async (_req, res) => {
    const [rows] = await query<any>(listSql);
    res.json(rows);
  });

  router.get(`/${path}/:id`, async (req, res) => {
    const [rows] = await query<any>(detailSql, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Registro no encontrado.' });
    }
    res.json(rows[0]);
  });
}

type CatalogCrudConfig = {
  path: string;
  table: string;
  idColumn: string;
  fields: string[];
  listSql: string;
  detailSql: string;
  validate?: (body: any) => string | null;
  softDelete?: { column: string; value: number };
};

function registerCatalogCrudRoutes(router: Router, config: CatalogCrudConfig) {
  registerReadOnlyCatalogRoutes(router, config.path, config.listSql, config.detailSql);

  router.post(`/${config.path}`, async (req, res) => {
    const validationError = config.validate?.(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    try {
      const values = config.fields.map((field) => req.body[field] ?? null);
      const [result] = await query<any>(
        `INSERT INTO ${config.table} (${config.fields.join(', ')}) VALUES (${config.fields.map(() => '?').join(', ')})`,
        values
      );
      const [rows] = await query<any>(config.detailSql, [result.insertId]);
      return res.status(201).json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el registro.';
      return res.status(400).json({ message });
    }
  });

  router.put(`/${config.path}/:id`, async (req, res) => {
    const validationError = config.validate?.(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identificador no válido.' });
    }
    try {
      const values = config.fields.map((field) => req.body[field] ?? null);
      await query(
        `UPDATE ${config.table} SET ${config.fields.map((field) => `${field} = ?`).join(', ')} WHERE ${config.idColumn} = ?`,
        [...values, id]
      );
      const [rows] = await query<any>(config.detailSql, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Registro no encontrado.' });
      }
      return res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el registro.';
      return res.status(400).json({ message });
    }
  });

  router.delete(`/${config.path}/:id`, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identificador no válido.' });
    }
    try {
      if (config.softDelete) {
        const [rows] = await query<any>(
          `SELECT ${config.idColumn} FROM ${config.table} WHERE ${config.idColumn} = ? LIMIT 1`,
          [id]
        );
        if (!rows[0]) {
          return res.status(404).json({ message: 'Registro no encontrado.' });
        }
        await query(
          `UPDATE ${config.table} SET ${config.softDelete.column} = ? WHERE ${config.idColumn} = ?`,
          [config.softDelete.value, id]
        );
      } else {
        const [result] = await query<any>(
          `DELETE FROM ${config.table} WHERE ${config.idColumn} = ?`,
          [id]
        );
        if (!result.affectedRows) {
          return res.status(404).json({ message: 'Registro no encontrado.' });
        }
      }
      return res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el registro.';
      return res.status(409).json({ message });
    }
  });
}

function buildMateriaListFilter(semester: { tipo_semestre: string; id_cct: number }, grupoId?: unknown) {
  const conditions = ['vm.tipo_semestre = ?', 'vm.id_cct = ?'];
  const params: Array<string | number> = [semester.tipo_semestre, Number(semester.id_cct)];

  if (grupoId !== undefined) {
    const id = Number(grupoId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return { conditions, params, error: 'Grupo no válido.' };
    }
    conditions.push(`EXISTS (
      SELECT 1 FROM grupo gx
       WHERE gx.id_grupo = ? AND gx.semestre = vm.semestre
         AND gx.tipo_semestre = vm.tipo_semestre AND gx.id_cct = vm.id_cct
    )`);
    params.push(id);
  }

  return { conditions, params };
}

function buildGrupoListFilter(semester: { tipo_semestre: string; id_cct: number }, materiaId?: unknown) {
  const conditions = ['vg.tipo_semestre = ?', 'vg.id_cct = ?'];
  const params: Array<string | number> = [semester.tipo_semestre, Number(semester.id_cct)];

  if (materiaId !== undefined) {
    const id = Number(materiaId);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return { conditions, params, error: 'Materia no válida.' };
    }
    conditions.push(`EXISTS (
      SELECT 1 FROM materia mx
       WHERE mx.id_materia = ? AND mx.semestre = vg.semestre
         AND mx.tipo_semestre = vg.tipo_semestre AND mx.id_cct = vg.id_cct
    )`);
    params.push(id);
  }

  return { conditions, params };
}

function normalizeTipoSemestre(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

// existingAssignments para las validaciones de horario: se obtienen uniendo
// horario_detalle con asignacion_docente, ya que horario_detalle no guarda
// directamente id_docente/id_grupo/id_materia/id_semestre.
async function getHorarioBySemester(conn: PoolConnection, semesterId: number) {
  const [rows] = await conn.query<any>(
    `SELECT hd.id_horario, hd.dia_semana, hd.id_bloque, ad.id_docente, ad.id_grupo, ad.id_materia, ad.id_semestre
       FROM horario_detalle hd
       JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
      WHERE ad.id_semestre = ?
      ORDER BY hd.dia_semana, hd.id_bloque
      FOR UPDATE`,
    [semesterId]
  );
  return rows;
}

function normalizeScheduleDay(value: unknown): string | null {
  if (value === 'Miércoles') {
    return 'Miercoles';
  }
  return typeof value === 'string' && ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'].includes(value)
    ? value
    : null;
}

const tipoSemestreValidator = (body: any): string | null => {
  const tipo = normalizeTipoSemestre(body.tipo_semestre);
  if (tipo !== 'P' && tipo !== 'N') {
    return "tipo_semestre debe ser 'P' (par) o 'N' (impar).";
  }
  return null;
};

export function buildApiRouter() {
  const router = Router();

  // -------------------------------------------------------------------
  // Salud del servicio
  // -------------------------------------------------------------------
  router.get('/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ ok: true, service: 'sis_doc', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo conectar a MySQL';
      res.status(500).json({ ok: false, service: 'sis_doc', error: message });
    }
  });

  // -------------------------------------------------------------------
  // Semestre activo (contexto global) - §2.1
  // -------------------------------------------------------------------
  router.get('/semestres', async (_req, res) => {
    const [rows] = await query<any>(`${SEMESTER_SELECT} ORDER BY vs.fecha_inicio DESC`);
    res.json(rows);
  });

  router.get('/semestres/:id', async (req, res) => {
    const semester = await getSemesterById(Number(req.params.id));
    if (!semester) {
      return res.status(404).json({ message: 'Semestre no encontrado.' });
    }
    res.json(semester);
  });

  router.post('/semestres', async (req, res) => {
    const validationError = tipoSemestreValidator(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    if (!req.body.descripcion || !req.body.id_cct) {
      return res.status(400).json({ message: 'descripcion e id_cct son obligatorios.' });
    }

    try {
      const idStatus = Number(req.body.id_status ?? 2);
      if (idStatus === 1) {
        await query('UPDATE semestre SET id_status = 2 WHERE id_status = 1');
      }
      const [result] = (await query<{ insertId: number }>(
        `INSERT INTO semestre (descripcion, fecha_inicio, fecha_fin, id_cct, id_status, tipo_semestre)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.body.descripcion,
          req.body.fecha_inicio ?? null,
          req.body.fecha_fin ?? null,
          Number(req.body.id_cct),
          idStatus,
          normalizeTipoSemestre(req.body.tipo_semestre),
        ]
      )) as [{ insertId: number }, any];
      const semester = await getSemesterById(result.insertId);
      res.status(201).json(semester);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el semestre.';
      res.status(400).json({ message });
    }
  });

  router.put('/semestres/:id', async (req, res) => {
    const validationError = tipoSemestreValidator(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const id = Number(req.params.id);
    try {
      const idStatus = Number(req.body.id_status ?? 2);
      if (idStatus === 1) {
        await query('UPDATE semestre SET id_status = 2 WHERE id_status = 1 AND id_semestre != ?', [id]);
      }
      await query(
        `UPDATE semestre SET descripcion = ?, fecha_inicio = ?, fecha_fin = ?, id_cct = ?, id_status = ?, tipo_semestre = ?
          WHERE id_semestre = ?`,
        [
          req.body.descripcion,
          req.body.fecha_inicio ?? null,
          req.body.fecha_fin ?? null,
          Number(req.body.id_cct),
          idStatus,
          normalizeTipoSemestre(req.body.tipo_semestre),
          id,
        ]
      );
      const semester = await getSemesterById(id);
      if (!semester) {
        return res.status(404).json({ message: 'Semestre no encontrado.' });
      }
      res.json(semester);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el semestre.';
      res.status(400).json({ message });
    }
  });

  router.delete('/semestres/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await query<any>('SELECT id_semestre FROM semestre WHERE id_semestre = ? LIMIT 1', [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Semestre no encontrado.' });
      }
      await query('UPDATE semestre SET id_status = 2 WHERE id_semestre = ?', [id]);
      res.status(204).send();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo eliminar el semestre (verifique dependencias).';
      res.status(409).json({ message });
    }
  });

  router.get('/session/semestre', async (req, res) => {
    const activeSemester = await getSemesterById(req.session.activeSemesterId);
    res.json({ activeSemesterId: activeSemester?.id_semestre ?? null, activeSemester });
  });

  router.post('/session/semestre', async (req, res) => {
    const semesterId = Number(req.body.semesterId ?? 0);
    if (!semesterId) {
      return res.status(400).json({ message: 'Semestre no válido.' });
    }

    const selectedSemester = await getSemesterById(semesterId);
    if (!selectedSemester) {
      return res.status(400).json({ message: 'Semestre no válido.' });
    }

    await query('UPDATE semestre SET id_status = CASE WHEN id_semestre = ? THEN 1 ELSE 2 END', [semesterId]);
    req.session.activeSemesterId = semesterId;

    return res.json({ activeSemesterId: semesterId, activeSemester: await getSemesterById(semesterId) });
  });

  registerCatalogCrudRoutes(router, {
    path: 'centros-trabajo',
    table: 'centro_trabajo',
    idColumn: 'id_cct',
    fields: ['CCT', 'Nombre'],
    listSql: 'SELECT id_cct, CCT, Nombre FROM centro_trabajo ORDER BY Nombre',
    detailSql: 'SELECT id_cct, CCT, Nombre FROM centro_trabajo WHERE id_cct = ? LIMIT 1',
    validate: (body) => {
      if (!body.CCT || String(body.CCT).length > 10 || !body.Nombre || String(body.Nombre).length > 100) {
        return 'CCT (máximo 10 caracteres) y Nombre (máximo 100 caracteres) son obligatorios.';
      }
      return null;
    },
  });

  registerCatalogCrudRoutes(router, {
    path: 'academias',
    table: 'academia',
    idColumn: 'id_academia',
    fields: ['nombre_academia', 'nombre_corto', 'id_especialidad', 'id_cct', 'id_status'],
    listSql: 'SELECT * FROM vista_academias ORDER BY nombre_academia',
    detailSql: 'SELECT * FROM vista_academias WHERE id_academia = ? LIMIT 1',
    softDelete: { column: 'id_status', value: 5 },
    validate: (body) => {
      if (!body.nombre_academia || String(body.nombre_academia).length > 100 || !body.nombre_corto || String(body.nombre_corto).length > 10) {
        return 'nombre_academia (máximo 100) y nombre_corto (máximo 10) son obligatorios.';
      }
      return null;
    },
  });

  registerCatalogCrudRoutes(router, {
    path: 'especialidades',
    table: 'especialidad',
    idColumn: 'id_especialidad',
    fields: ['nombre_especialidad', 'nombre_corto', 'id_cct'],
    listSql: `SELECT e.id_especialidad, e.nombre_especialidad, e.nombre_corto, e.id_cct,
                     ct.CCT, ct.Nombre AS centro_trabajo
                FROM especialidad e
                LEFT JOIN centro_trabajo ct ON ct.id_cct = e.id_cct
               ORDER BY e.nombre_especialidad`,
    detailSql: `SELECT e.id_especialidad, e.nombre_especialidad, e.nombre_corto, e.id_cct,
                       ct.CCT, ct.Nombre AS centro_trabajo
                  FROM especialidad e
                  LEFT JOIN centro_trabajo ct ON ct.id_cct = e.id_cct
                 WHERE e.id_especialidad = ? LIMIT 1`,
    validate: (body) => {
      if (!body.nombre_especialidad || String(body.nombre_especialidad).length > 100 || !body.nombre_corto || String(body.nombre_corto).length > 20) {
        return 'nombre_especialidad (máximo 100) y nombre_corto (máximo 20) son obligatorios.';
      }
      return null;
    },
  });

  registerCatalogCrudRoutes(router, {
    path: 'status',
    table: 'status',
    idColumn: 'id_status',
    fields: ['descripcion'],
    listSql: 'SELECT id_status, descripcion FROM status ORDER BY descripcion',
    detailSql: 'SELECT id_status, descripcion FROM status WHERE id_status = ? LIMIT 1',
    validate: (body) => (!body.descripcion || String(body.descripcion).length > 100 ? 'descripcion es obligatoria (máximo 100 caracteres).' : null),
  });

  registerCatalogCrudRoutes(router, {
    path: 'tipos-usuario',
    table: 'tipo_usuario',
    idColumn: 'id_tipo_usuario',
    fields: ['descripcion'],
    listSql: 'SELECT id_tipo_usuario, descripcion FROM tipo_usuario ORDER BY descripcion',
    detailSql: 'SELECT id_tipo_usuario, descripcion FROM tipo_usuario WHERE id_tipo_usuario = ? LIMIT 1',
    validate: (body) => (!body.descripcion || String(body.descripcion).length > 200 ? 'descripcion es obligatoria (máximo 200 caracteres).' : null),
  });

  const USUARIO_SELECT = `
    SELECT u.id_usuario, u.nombre, u.correo_electronico, u.tipo_usuario,
           tu.descripcion AS tipo_usuario_descripcion, u.status,
           st.descripcion AS status_descripcion, u.telefono, u.id_ct,
           ct.CCT, ct.Nombre AS centro_trabajo
      FROM usuario u
      LEFT JOIN tipo_usuario tu ON tu.id_tipo_usuario = u.tipo_usuario
      LEFT JOIN status st ON st.id_status = u.status
      LEFT JOIN centro_trabajo ct ON ct.id_cct = u.id_ct
  `;

  registerReadOnlyCatalogRoutes(
    router,
    'usuarios',
    `${USUARIO_SELECT} ORDER BY u.nombre`,
    `${USUARIO_SELECT} WHERE u.id_usuario = ? LIMIT 1`
  );

  function validateUsuarioBody(body: any, requirePassword: boolean): string | null {
    if (!body.nombre || String(body.nombre).length > 200) {
      return 'nombre es obligatorio (máximo 200 caracteres).';
    }
    if (!body.correo_electronico || String(body.correo_electronico).length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.correo_electronico)) {
      return 'correo_electronico debe ser un correo válido de máximo 100 caracteres.';
    }
    if (!body.tipo_usuario || !body.status || !body.telefono || String(body.telefono).length > 20) {
      return 'tipo_usuario, status y telefono (máximo 20 caracteres) son obligatorios.';
    }
    if (requirePassword && (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 72)) {
      return 'password debe tener entre 8 y 72 caracteres.';
    }
    if (!requirePassword && body.password && (body.password.length < 8 || body.password.length > 72)) {
      return 'password debe tener entre 8 y 72 caracteres.';
    }
    return null;
  }

  router.post('/usuarios', async (req, res) => {
    const validationError = validateUsuarioBody(req.body, true);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    try {
      const passwordHash = await bcrypt.hash(req.body.password, 12);
      const [result] = await query<any>(
        `INSERT INTO usuario (nombre, correo_electronico, password, tipo_usuario, status, telefono, id_ct)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [req.body.nombre, req.body.correo_electronico, passwordHash, Number(req.body.tipo_usuario), Number(req.body.status), req.body.telefono, req.body.id_ct ? Number(req.body.id_ct) : null]
      );
      const [rows] = await query<any>(`${USUARIO_SELECT} WHERE u.id_usuario = ? LIMIT 1`, [result.insertId]);
      return res.status(201).json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el usuario.';
      return res.status(400).json({ message });
    }
  });

  router.put('/usuarios/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identificador de usuario no válido.' });
    }
    const validationError = validateUsuarioBody(req.body, false);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }
    try {
      const values: unknown[] = [req.body.nombre, req.body.correo_electronico, Number(req.body.tipo_usuario), Number(req.body.status), req.body.telefono, req.body.id_ct ? Number(req.body.id_ct) : null];
      let sql = `UPDATE usuario SET nombre = ?, correo_electronico = ?, tipo_usuario = ?, status = ?, telefono = ?, id_ct = ?`;
      if (req.body.password) {
        const passwordHash = await bcrypt.hash(req.body.password, 12);
        sql += ', password = ?';
        values.push(passwordHash);
      }
      sql += ' WHERE id_usuario = ?';
      values.push(id);
      await query(sql, values);
      const [rows] = await query<any>(`${USUARIO_SELECT} WHERE u.id_usuario = ? LIMIT 1`, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
      }
      return res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el usuario.';
      return res.status(400).json({ message });
    }
  });

  router.delete('/usuarios/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Identificador de usuario no válido.' });
    }
    const [rows] = await query<any>('SELECT id_usuario FROM usuario WHERE id_usuario = ? LIMIT 1', [id]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    await query('UPDATE usuario SET status = 5 WHERE id_usuario = ?', [id]);
    return res.status(204).send();
  });

  // -------------------------------------------------------------------
  // Catálogos: consultas SQL directas contra sis_doc, ordenadas alfabéticamente
  // -------------------------------------------------------------------
  router.get('/turnos', async (_req, res) => {
    const [rows] = await query<any>(`${TURNO_SELECT} ORDER BY Descripcion`);
    res.json(rows);
  });

  router.get('/turnos/:id', async (req, res) => {
    const [rows] = await query<any>(`${TURNO_SELECT} WHERE id_turno = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Turno no encontrado.' });
    }
    res.json(rows[0]);
  });

  router.post('/turnos', async (req, res) => {
    if (!req.body.Descripcion && !req.body.nombre_turno) {
      return res.status(400).json({ message: 'Descripcion es obligatoria.' });
    }
    try {
      const [result] = (await query<{ insertId: number }>('INSERT INTO turno (Descripcion) VALUES (?)', [
        req.body.Descripcion ?? req.body.nombre_turno,
      ])) as [{ insertId: number }, any];
      const [rows] = await query<any>(`${TURNO_SELECT} WHERE id_turno = ? LIMIT 1`, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el turno.';
      res.status(400).json({ message });
    }
  });

  router.put('/turnos/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!req.body.Descripcion && !req.body.nombre_turno) {
      return res.status(400).json({ message: 'Descripcion es obligatoria.' });
    }
    try {
      await query('UPDATE turno SET Descripcion = ? WHERE id_turno = ?', [
        req.body.Descripcion ?? req.body.nombre_turno,
        id,
      ]);
      const [rows] = await query<any>(`${TURNO_SELECT} WHERE id_turno = ? LIMIT 1`, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Turno no encontrado.' });
      }
      res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el turno.';
      res.status(400).json({ message });
    }
  });

  router.delete('/turnos/:id', async (req, res) => {
    try {
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM turno WHERE id_turno = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Turno no encontrado.' });
      }
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el turno (verifique dependencias).';
      res.status(409).json({ message });
    }
  });

  router.get('/bloques', async (_req, res) => {
    const [rows] = await query<any>(`${BLOQUE_SELECT} ORDER BY b.codigo_bloque`);
    res.json(rows);
  });

  router.get('/bloques/:id', async (req, res) => {
    const [rows] = await query<any>(`${BLOQUE_SELECT} WHERE b.id_bloque = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Bloque no encontrado.' });
    }
    res.json(rows[0]);
  });

  router.post('/bloques', async (req, res) => {
    const { codigo_bloque, id_turno, hora_inicio, hora_fin, orden } = req.body;
    if (!codigo_bloque || !id_turno || !hora_inicio || !hora_fin) {
      return res.status(400).json({ message: 'codigo_bloque, id_turno, hora_inicio y hora_fin son obligatorios.' });
    }
    try {
      const [result] = (await query<{ insertId: number }>(
        'INSERT INTO bloque_horario (codigo_bloque, id_turno, hora_inicio, hora_fin, orden) VALUES (?, ?, ?, ?, ?)',
        [codigo_bloque, Number(id_turno), hora_inicio, hora_fin, Number(orden ?? 0)]
      )) as [{ insertId: number }, any];
      const [rows] = await query<any>('SELECT * FROM bloque_horario WHERE id_bloque = ? LIMIT 1', [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el bloque.';
      res.status(400).json({ message });
    }
  });

  router.put('/bloques/:id', async (req, res) => {
    const id = Number(req.params.id);
    const { codigo_bloque, id_turno, hora_inicio, hora_fin, orden } = req.body;
    if (!codigo_bloque || !id_turno || !hora_inicio || !hora_fin) {
      return res.status(400).json({ message: 'codigo_bloque, id_turno, hora_inicio y hora_fin son obligatorios.' });
    }
    try {
      await query(
        'UPDATE bloque_horario SET codigo_bloque = ?, id_turno = ?, hora_inicio = ?, hora_fin = ?, orden = ? WHERE id_bloque = ?',
        [codigo_bloque, Number(id_turno), hora_inicio, hora_fin, Number(orden ?? 0), id]
      );
      const [rows] = await query<any>('SELECT * FROM bloque_horario WHERE id_bloque = ? LIMIT 1', [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Bloque no encontrado.' });
      }
      res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el bloque.';
      res.status(400).json({ message });
    }
  });

  router.delete('/bloques/:id', async (req, res) => {
    try {
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM bloque_horario WHERE id_bloque = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Bloque no encontrado.' });
      }
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el bloque (verifique dependencias).';
      res.status(409).json({ message });
    }
  });

  router.get('/docentes', async (_req, res) => {
    const [rows] = await query<any>(`${DOCENTE_SELECT} ORDER BY vd.Apellido_pat, vd.Apellido_mat, vd.Nombre`);
    res.json(rows);
  });

  router.get('/docentes/:id', async (req, res) => {
    const [rows] = await query<any>(`${DOCENTE_SELECT} WHERE vd.id_docente = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Docente no encontrado.' });
    }
    res.json(rows[0]);
  });

  const DOCENTE_FIELDS = ['RFC', 'Nombre', 'Apellido_pat', 'Apellido_mat', 'Perfil', 'correo_e', 'Telefono', 'horas_nombramiento', 'horas_descarga', 'id_turno', 'id_cct', 'id_status'];

  router.post('/docentes', async (req, res) => {
    if (!req.body.Nombre || !req.body.Apellido_pat) {
      return res.status(400).json({ message: 'Nombre y Apellido_pat son obligatorios.' });
    }
    const hoursValidation = validateDocenteHours(req.body);
    if (!hoursValidation.valid) {
      return res.status(400).json({ message: 'Las horas del docente no son válidas.', errors: hoursValidation.errors });
    }
    try {
      const values = DOCENTE_FIELDS.map((field) => req.body[field] ?? null);
      const [result] = (await query<{ insertId: number }>(
        `INSERT INTO docente (${DOCENTE_FIELDS.join(', ')}) VALUES (${DOCENTE_FIELDS.map(() => '?').join(', ')})`,
        values
      )) as [{ insertId: number }, any];
      const [rows] = await query<any>(`${DOCENTE_SELECT} WHERE vd.id_docente = ? LIMIT 1`, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el docente.';
      res.status(400).json({ message });
    }
  });

  router.put('/docentes/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!req.body.Nombre || !req.body.Apellido_pat) {
      return res.status(400).json({ message: 'Nombre y Apellido_pat son obligatorios.' });
    }
    const hoursValidation = validateDocenteHours(req.body);
    if (!hoursValidation.valid) {
      return res.status(400).json({ message: 'Las horas del docente no son válidas.', errors: hoursValidation.errors });
    }
    try {
      const setClause = DOCENTE_FIELDS.map((field) => `${field} = ?`).join(', ');
      const values = DOCENTE_FIELDS.map((field) => req.body[field] ?? null);
      await query(`UPDATE docente SET ${setClause} WHERE id_docente = ?`, [...values, id]);
      const [rows] = await query<any>(`${DOCENTE_SELECT} WHERE vd.id_docente = ? LIMIT 1`, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Docente no encontrado.' });
      }
      res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el docente.';
      res.status(400).json({ message });
    }
  });

  router.delete('/docentes/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await query<any>('SELECT id_docente FROM docente WHERE id_docente = ? LIMIT 1', [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Docente no encontrado.' });
      }
      await query('UPDATE docente SET id_status = 5 WHERE id_docente = ?', [id]);
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el docente (verifique dependencias).';
      res.status(409).json({ message });
    }
  });

  // Materias y grupos se filtran estrictamente por tipo_semestre del semestre
  // activo/solicitado - §2.1.
  router.get('/materias', async (req, res) => {
    const semester = await resolveRequestSemester(req);
    if (!semester) {
      return res.status(400).json({ message: 'Semestre no válido o no disponible.' });
    }
    if (req.query.all === '1') {
      const [allRows] = await query<any>(`${MATERIA_SELECT} ORDER BY vm.nombre_materia`);
      return res.json(allRows);
    }
    const filter = buildMateriaListFilter(semester, req.query.grupoId);
    if (filter.error) {
      return res.status(400).json({ message: filter.error });
    }
    const [rows] = await query<any>(
      `${MATERIA_SELECT} WHERE ${filter.conditions.join(' AND ')} ORDER BY vm.nombre_materia`,
      filter.params
    );
    res.json(rows);
  });

  router.get('/materias/:id', async (req, res) => {
    const [rows] = await query<any>(`${MATERIA_SELECT} WHERE vm.id_materia = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Materia no encontrada.' });
    }
    res.json(rows[0]);
  });

  const MATERIA_FIELDS = ['nombre', 'nombre_corto', 'semestre', 'horas', 'tipo_semestre', 'id_academia', 'id_status', 'id_cct'];

  router.post('/materias', async (req, res) => {
    if (!req.body.nombre) {
      return res.status(400).json({ message: 'nombre es obligatorio.' });
    }
    const tipoError = tipoSemestreValidator(req.body);
    if (tipoError) {
      return res.status(400).json({ message: tipoError });
    }
    try {
      const values = MATERIA_FIELDS.map((field) => req.body[field] ?? null);
      const [result] = (await query<{ insertId: number }>(
        `INSERT INTO materia (${MATERIA_FIELDS.join(', ')}) VALUES (${MATERIA_FIELDS.map(() => '?').join(', ')})`,
        values
      )) as [{ insertId: number }, any];
      const [rows] = await query<any>(`${MATERIA_SELECT} WHERE vm.id_materia = ? LIMIT 1`, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la materia.';
      res.status(400).json({ message });
    }
  });

  router.put('/materias/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!req.body.nombre) {
      return res.status(400).json({ message: 'nombre es obligatorio.' });
    }
    const tipoError = tipoSemestreValidator(req.body);
    if (tipoError) {
      return res.status(400).json({ message: tipoError });
    }
    try {
      const setClause = MATERIA_FIELDS.map((field) => `${field} = ?`).join(', ');
      const values = MATERIA_FIELDS.map((field) => req.body[field] ?? null);
      await query(`UPDATE materia SET ${setClause} WHERE id_materia = ?`, [...values, id]);
      const [rows] = await query<any>(`${MATERIA_SELECT} WHERE vm.id_materia = ? LIMIT 1`, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Materia no encontrada.' });
      }
      res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la materia.';
      res.status(400).json({ message });
    }
  });

  router.delete('/materias/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const [rows] = await query<any>('SELECT id_materia FROM materia WHERE id_materia = ? LIMIT 1', [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Materia no encontrada.' });
      }
      await query('UPDATE materia SET id_status = 5 WHERE id_materia = ?', [id]);
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la materia (verifique dependencias).';
      res.status(409).json({ message });
    }
  });

  router.get('/grupos', async (req, res) => {
    const semester = await resolveRequestSemester(req);
    if (!semester) {
      return res.status(400).json({ message: 'Semestre no válido o no disponible.' });
    }
    if (req.query.all === '1') {
      const [allRows] = await query<any>(`${GRUPO_SELECT} ORDER BY vg.semestre, vg.grupo`);
      return res.json(allRows);
    }
    const filter = buildGrupoListFilter(semester, req.query.materiaId);
    if (filter.error) {
      return res.status(400).json({ message: filter.error });
    }
    const [rows] = await query<any>(
      `${GRUPO_SELECT} WHERE ${filter.conditions.join(' AND ')} ORDER BY vg.semestre, vg.grupo`,
      filter.params
    );
    res.json(rows);
  });

  router.get('/grupos/:id', async (req, res) => {
    const [rows] = await query<any>(`${GRUPO_SELECT} WHERE vg.id_grupo = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Grupo no encontrado.' });
    }
    res.json(rows[0]);
  });

  const GRUPO_FIELDS = ['grupo', 'semestre', 'id_especialidad', 'id_cct', 'id_turno', 'tipo_semestre'];

  router.post('/grupos', async (req, res) => {
    if (!req.body.grupo) {
      return res.status(400).json({ message: 'grupo es obligatorio.' });
    }
    const tipoError = tipoSemestreValidator(req.body);
    if (tipoError) {
      return res.status(400).json({ message: tipoError });
    }
    try {
      const values = GRUPO_FIELDS.map((field) => req.body[field] ?? null);
      const [result] = (await query<{ insertId: number }>(
        `INSERT INTO grupo (${GRUPO_FIELDS.join(', ')}) VALUES (${GRUPO_FIELDS.map(() => '?').join(', ')})`,
        values
      )) as [{ insertId: number }, any];
      const [rows] = await query<any>(`${GRUPO_SELECT} WHERE vg.id_grupo = ? LIMIT 1`, [result.insertId]);
      res.status(201).json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el grupo.';
      res.status(400).json({ message });
    }
  });

  router.put('/grupos/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!req.body.grupo) {
      return res.status(400).json({ message: 'grupo es obligatorio.' });
    }
    const tipoError = tipoSemestreValidator(req.body);
    if (tipoError) {
      return res.status(400).json({ message: tipoError });
    }
    try {
      const setClause = GRUPO_FIELDS.map((field) => `${field} = ?`).join(', ');
      const values = GRUPO_FIELDS.map((field) => req.body[field] ?? null);
      await query(`UPDATE grupo SET ${setClause} WHERE id_grupo = ?`, [...values, id]);
      const [rows] = await query<any>(`${GRUPO_SELECT} WHERE vg.id_grupo = ? LIMIT 1`, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Grupo no encontrado.' });
      }
      res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el grupo.';
      res.status(400).json({ message });
    }
  });

  router.delete('/grupos/:id', async (req, res) => {
    try {
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM grupo WHERE id_grupo = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Grupo no encontrado.' });
      }
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el grupo (verifique dependencias).';
      res.status(409).json({ message });
    }
  });

  // -------------------------------------------------------------------
  // Asignación docente (tabla real: asignacion_docente) - coherencia de
  // tipo_semestre §2.1 y §2.2.4
  // -------------------------------------------------------------------
  const ASIGNACION_SELECT = `
    SELECT va.*, va.nombre_docente AS docente_nombre,
           va.horas_materia AS horas, va.grupo AS nombre_grupo
      FROM vista_asignacion_docente va
  `;

  async function persistAsignacion(
    semesterId: number,
    docenteId: number,
    materiaId: number,
    grupoId: number,
    assignmentId?: number
  ) {
    return withTransaction(async (conn: PoolConnection) => {
      const [docenteRows] = await conn.query<any>(
        'SELECT id_docente, horas_nombramiento, horas_descarga, id_cct FROM docente WHERE id_docente = ? FOR UPDATE',
        [docenteId]
      );
      const [semestreRows] = await conn.query<any>(
        'SELECT id_semestre, id_status, tipo_semestre, id_cct FROM semestre WHERE id_semestre = ? FOR UPDATE',
        [semesterId]
      );
      const [materiaRows] = await conn.query<any>(
        'SELECT id_materia, semestre, tipo_semestre, horas, id_cct FROM materia WHERE id_materia = ? FOR UPDATE',
        [materiaId]
      );
      const [grupoRows] = await conn.query<any>(
        'SELECT id_grupo, semestre, tipo_semestre, id_cct FROM grupo WHERE id_grupo = ? FOR UPDATE',
        [grupoId]
      );

      if (assignmentId !== undefined) {
        const [currentRows] = await conn.query<any>(
          'SELECT id_asignacion, id_semestre FROM asignacion_docente WHERE id_asignacion = ? FOR UPDATE',
          [assignmentId]
        );
        if (!currentRows[0]) {
          throw Object.assign(new Error('Asignación no encontrada.'), { httpStatus: 404 });
        }
        if (Number(currentRows[0].id_semestre) !== semesterId) {
          throw Object.assign(new Error('La asignación no pertenece al semestre seleccionado.'), { httpStatus: 400 });
        }
      }

      const duplicateSql = `
        SELECT id_asignacion
          FROM asignacion_docente
         WHERE id_semestre = ? AND id_docente = ? AND id_materia = ? AND id_grupo = ?
           ${assignmentId === undefined ? '' : 'AND id_asignacion <> ?'}
         LIMIT 1
         FOR UPDATE
      `;
      const duplicateParams = [semesterId, docenteId, materiaId, grupoId];
      if (assignmentId !== undefined) {
        duplicateParams.push(assignmentId);
      }
      const [duplicateRows] = await conn.query<any>(duplicateSql, duplicateParams);

      const hoursSql = `
        SELECT COALESCE(SUM(m.horas), 0) AS horas_asignadas
          FROM asignacion_docente ad
          JOIN materia m ON m.id_materia = ad.id_materia
         WHERE ad.id_docente = ? AND ad.id_semestre = ?
           ${assignmentId === undefined ? '' : 'AND ad.id_asignacion <> ?'}
      `;
      const hoursParams = [docenteId, semesterId];
      if (assignmentId !== undefined) {
        hoursParams.push(assignmentId);
      }
      const [hoursRows] = await conn.query<any>(hoursSql, hoursParams);

      const validation = validateAsignacionDocente({
        id_semestre: semesterId,
        id_docente: docenteId,
        id_materia: materiaId,
        id_grupo: grupoId,
        semestre: semestreRows[0],
        docente: docenteRows[0],
        materia: materiaRows[0],
        grupo: grupoRows[0],
        horasAsignadas: Number(hoursRows[0]?.horas_asignadas ?? 0),
        asignacionDuplicada: duplicateRows.length > 0,
      });

      if (!validation.valid) {
        const duplicate = validation.errors.some((message) => message.startsWith('Ya existe'));
        throw Object.assign(new Error('La asignación docente no cumple las reglas de negocio.'), {
          httpStatus: duplicate ? 409 : 400,
          validationErrors: validation.errors,
        });
      }

      if (assignmentId === undefined) {
        const [result] = await conn.query<any>(
          'INSERT INTO asignacion_docente (id_semestre, id_docente, id_materia, id_grupo) VALUES (?, ?, ?, ?)',
          [semesterId, docenteId, materiaId, grupoId]
        );
        return Number(result.insertId);
      }

      await conn.query(
        'UPDATE asignacion_docente SET id_semestre = ?, id_docente = ?, id_materia = ?, id_grupo = ? WHERE id_asignacion = ?',
        [semesterId, docenteId, materiaId, grupoId, assignmentId]
      );
      return assignmentId;
    });
  }

  router.get('/asignaciones', async (req, res) => {
    const semester = await resolveRequestSemester(req);
    if (!semester) {
      return res.status(400).json({ message: 'Semestre no válido o no disponible.' });
    }

    const docenteId = req.query.docenteId === undefined ? null : Number(req.query.docenteId);
    const groupId = req.query.grupoId === undefined ? null : Number(req.query.grupoId);
    if (
      (docenteId !== null && (!Number.isSafeInteger(docenteId) || docenteId <= 0)) ||
      (groupId !== null && (!Number.isSafeInteger(groupId) || groupId <= 0)) ||
      (docenteId === null && groupId === null)
    ) {
      return res.status(400).json({ message: 'Seleccione un docente o un grupo válido.' });
    }

    const conditions = ['va.id_semestre = ?'];
    const params: number[] = [Number(semester.id_semestre)];
    if (docenteId !== null) {
      conditions.push('va.id_docente = ?');
      params.push(docenteId);
    }
    if (groupId !== null) {
      conditions.push('va.id_grupo = ?');
      params.push(groupId);
    }

    const [rows] = await query<any>(
      `${ASIGNACION_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY va.nombre_docente`,
      params
    );
    res.json(rows);
  });

  router.get('/asignaciones/:id', async (req, res) => {
    const [rows] = await query<any>(`${ASIGNACION_SELECT} WHERE va.id_asignacion = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }
    res.json(rows[0]);
  });

  router.post('/asignaciones', async (req, res) => {
    const semester = await resolveRequestSemester(req);
    const semesterId = Number(semester?.id_semestre ?? 0);
    const docenteId = Number(req.body.id_docente);
    const materiaId = Number(req.body.id_materia);
    const grupoId = Number(req.body.id_grupo);
    if (
      !semester ||
      !Number.isSafeInteger(docenteId) || docenteId <= 0 ||
      !Number.isSafeInteger(materiaId) || materiaId <= 0 ||
      !Number.isSafeInteger(grupoId) || grupoId <= 0
    ) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para la asignación docente.' });
    }

    try {
      const id = await persistAsignacion(semesterId, docenteId, materiaId, grupoId);
      res.status(201).json({ message: 'Asignación docente registrada.', id });
    } catch (error: any) {
      if (error?.validationErrors) {
        return res.status(error.httpStatus ?? 400).json({ message: error.message, errors: error.validationErrors });
      }
      if (error?.httpStatus) {
        return res.status(error.httpStatus).json({ message: error.message });
      }
      if (error?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Ya existe esta asignación docente.' });
      }
      const message = error instanceof Error ? error.message : 'No se pudo guardar la asignación docente.';
      res.status(500).json({ message });
    }
  });

  router.put('/asignaciones/:id', async (req, res) => {
    const id = Number(req.params.id);
    const semester = await resolveRequestSemester(req);
    const semesterId = Number(semester?.id_semestre ?? 0);
    const docenteId = Number(req.body.id_docente);
    const materiaId = Number(req.body.id_materia);
    const grupoId = Number(req.body.id_grupo);
    if (
      !Number.isSafeInteger(id) || id <= 0 || !semester ||
      !Number.isSafeInteger(docenteId) || docenteId <= 0 ||
      !Number.isSafeInteger(materiaId) || materiaId <= 0 ||
      !Number.isSafeInteger(grupoId) || grupoId <= 0
    ) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para la asignación docente.' });
    }

    try {
      await persistAsignacion(semesterId, docenteId, materiaId, grupoId, id);
      const [rows] = await query<any>(`${ASIGNACION_SELECT} WHERE va.id_asignacion = ? LIMIT 1`, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Asignación no encontrada.' });
      }
      res.json(rows[0]);
    } catch (error: any) {
      if (error?.validationErrors) {
        return res.status(error.httpStatus ?? 400).json({ message: error.message, errors: error.validationErrors });
      }
      if (error?.httpStatus) {
        return res.status(error.httpStatus).json({ message: error.message });
      }
      if (error?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Ya existe esta asignación docente.' });
      }
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la asignación docente.';
      res.status(500).json({ message });
    }
  });

  router.delete('/asignaciones/:id', async (req, res) => {
    const assignmentId = Number(req.params.id);
    const selectedSemester = await resolveRequestSemester(req);
    if (!Number.isSafeInteger(assignmentId) || assignmentId <= 0 || !selectedSemester) {
      return res.status(400).json({ message: 'Asignación o semestre no válido.' });
    }

    try {
      await withTransaction(async (conn) => {
        const [assignmentRows] = await conn.query<any>(
          `SELECT ad.id_asignacion, ad.id_semestre, s.id_status
             FROM asignacion_docente ad
             JOIN semestre s ON s.id_semestre = ad.id_semestre
            WHERE ad.id_asignacion = ? FOR UPDATE`,
          [assignmentId]
        );
        const assignment = assignmentRows[0];
        if (!assignment) {
          throw Object.assign(new Error('Asignación no encontrada.'), { httpStatus: 404 });
        }
        if (Number(assignment.id_semestre) !== Number(selectedSemester.id_semestre)) {
          throw Object.assign(new Error('La asignación no pertenece al semestre seleccionado.'), { httpStatus: 409 });
        }
        if (Number(assignment.id_status) !== 1) {
          throw Object.assign(new Error('No se puede eliminar una asignación de un semestre inactivo.'), {
            httpStatus: 403,
          });
        }
        await conn.query('DELETE FROM asignacion_docente WHERE id_asignacion = ?', [assignmentId]);
      });
      res.status(204).send();
    } catch (error: any) {
      if (error?.httpStatus) {
        return res.status(error.httpStatus).json({ message: error.message });
      }
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la asignación docente.';
      res.status(409).json({ message });
    }
  });

  // -------------------------------------------------------------------
  // Catálogos combinados para alimentar el frontend (§3, vista interactiva)
  // -------------------------------------------------------------------
  router.get('/catalogos', async (req, res) => {
    const selectedSemester = await resolveRequestSemester(req);
    if (!selectedSemester) {
      return res.status(400).json({ message: 'Semestre no válido o no disponible.' });
    }
    const semesterId = Number(selectedSemester.id_semestre);

    const [docentes] = await query<any>(
      `${DOCENTE_SELECT} WHERE vd.id_cct = ? ORDER BY vd.Apellido_pat, vd.Apellido_mat, vd.Nombre`,
      [selectedSemester.id_cct]
    );
    const [bloques] = await query<any>(`${BLOQUE_SELECT} ORDER BY b.codigo_bloque`);
    const [turnos] = await query<any>(`${TURNO_SELECT} ORDER BY Descripcion`);
    const [semestres] = await query<any>(`${SEMESTER_SELECT} ORDER BY vs.fecha_inicio DESC`);

    const materiaFilter = buildMateriaListFilter(selectedSemester, req.query.grupoId);
    if (materiaFilter.error) {
      return res.status(400).json({ message: materiaFilter.error });
    }
    const [materias] = await query<any>(
      `${MATERIA_SELECT} WHERE ${materiaFilter.conditions.join(' AND ')} ORDER BY vm.nombre_materia`,
      materiaFilter.params
    );
    const grupoFilter = buildGrupoListFilter(selectedSemester, req.query.materiaId);
    if (grupoFilter.error) {
      return res.status(400).json({ message: grupoFilter.error });
    }
    const [grupos] = await query<any>(
      `${GRUPO_SELECT} WHERE ${grupoFilter.conditions.join(' AND ')} ORDER BY vg.semestre, vg.grupo`,
      grupoFilter.params
    );
    const [centrosTrabajo] = await query<any>('SELECT id_cct, CCT, Nombre FROM centro_trabajo ORDER BY Nombre');
    const [especialidades] = await query<any>(
      `SELECT e.id_especialidad, e.nombre_especialidad, e.nombre_corto, e.id_cct,
              ct.CCT, ct.Nombre AS centro_trabajo
         FROM especialidad e
         LEFT JOIN centro_trabajo ct ON ct.id_cct = e.id_cct
        ORDER BY e.nombre_especialidad`
    );
    const [academias] = await query<any>('SELECT * FROM vista_academias ORDER BY nombre_academia');
    const [statuses] = await query<any>('SELECT id_status, descripcion FROM status ORDER BY descripcion');
    const [tiposUsuario] = await query<any>(
      'SELECT id_tipo_usuario, descripcion FROM tipo_usuario ORDER BY descripcion'
    );

    const [horario] = await query<any>(`${HORARIO_SELECT} WHERE ad.id_semestre = ? ORDER BY hd.dia_semana, b.orden`, [
      semesterId || 0,
    ]);

    res.json({
      activeSemester: selectedSemester,
      semestres,
      turnos,
      bloques,
      docentes,
      materias,
      grupos,
      centrosTrabajo,
      especialidades,
      academias,
      statuses,
      tiposUsuario,
      horario,
    });
  });

  // -------------------------------------------------------------------
  // Horario (horario_detalle + asignacion_docente) - CRUD + 4 validaciones
  // de negocio (§2.2)
  // -------------------------------------------------------------------
  router.get('/horario', async (req, res) => {
    const selectedSemester = await resolveRequestSemester(req);
    const semesterId = selectedSemester?.id_semestre ?? Number(req.query.semesterId ?? 0);
    const [rows] = await query<any>(`${HORARIO_SELECT} WHERE ad.id_semestre = ? ORDER BY hd.dia_semana, b.orden`, [
      semesterId || 0,
    ]);
    res.json(rows);
  });

  router.get('/horario/grid', async (req, res) => {
    const selectedSemester = await resolveRequestSemester(req);
    if (!selectedSemester) {
      return res.status(400).json({ message: 'Semestre no válido o no disponible.' });
    }
    const semesterId = Number(selectedSemester.id_semestre);
    const docenteId = Number(req.query.docenteId ?? 0);
    const grupoId = Number(req.query.grupoId ?? 0);
    let turnoId: number | null = null;

    if (grupoId) {
      const [grupoRows] = await query<any>(
        `SELECT id_turno
           FROM grupo
          WHERE id_grupo = ? AND tipo_semestre = ? AND id_cct = ?
          LIMIT 1`,
        [grupoId, selectedSemester.tipo_semestre, selectedSemester.id_cct]
      );
      if (!grupoRows[0]) {
        return res.status(400).json({ message: 'El grupo no corresponde al semestre o centro seleccionado.' });
      }
      turnoId = Number(grupoRows[0].id_turno);
    }

    const conditions = ['ad.id_semestre = ?'];
    const params: any[] = [semesterId || 0];

    if (docenteId) {
      conditions.push('ad.id_docente = ?');
      params.push(docenteId);
    }
    if (grupoId) {
      conditions.push('ad.id_grupo = ?');
      params.push(grupoId);
    }

    const [celdas] = await query<any>(
      `${HORARIO_SELECT} WHERE ${conditions.join(' AND ')} ORDER BY b.orden, hd.dia_semana`,
      params
    );
    const [bloques] = turnoId === null
      ? await query<any>('SELECT * FROM bloque_horario ORDER BY orden, hora_inicio')
      : await query<any>('SELECT * FROM bloque_horario WHERE id_turno = ? ORDER BY orden, hora_inicio', [turnoId]);

    res.json({
      activeSemester: selectedSemester,
      dias: DIAS_SEMANA,
      bloques,
      celdas,
    });
  });

  router.get('/horario/:id', async (req, res) => {
    const [rows] = await query<any>(`${HORARIO_SELECT} WHERE hd.id_horario = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Registro de horario no encontrado.' });
    }
    res.json(rows[0]);
  });

  // Horas disponibles en tiempo real para retroalimentar la vista interactiva.
  router.get('/docentes/:id/horas-disponibles', async (req, res) => {
    const docenteId = Number(req.params.id);
    const selectedSemester = await resolveRequestSemester(req);
    if (!Number.isSafeInteger(docenteId) || docenteId <= 0 || !selectedSemester) {
      return res.status(400).json({ message: 'Docente o semestre no válido.' });
    }
    const semesterId = Number(selectedSemester.id_semestre);

    const [docenteRows] = await query<any>('SELECT * FROM docente WHERE id_docente = ? LIMIT 1', [docenteId]);
    const docente = docenteRows[0];
    if (!docente) {
      return res.status(404).json({ message: 'Docente no encontrado.' });
    }

    const [asignadasRows] = await query<any>(
      `SELECT COALESCE(SUM(m.horas), 0) AS total
         FROM asignacion_docente ad
         JOIN materia m ON m.id_materia = ad.id_materia
        WHERE ad.id_docente = ? AND ad.id_semestre = ?`,
      [docenteId, semesterId || 0]
    );
    const horasDisponibles = Number(docente.horas_nombramiento) - Number(docente.horas_descarga);
    const horasAsignadas = Number(asignadasRows[0]?.total ?? 0);

    res.json({
      id_docente: docenteId,
      horas_nombramiento: docente.horas_nombramiento,
      horas_descarga: docente.horas_descarga,
      horas_disponibles: horasDisponibles,
      horas_asignadas: horasAsignadas,
      horas_restantes: horasDisponibles - horasAsignadas,
    });
  });

  async function lockScheduleSemester(conn: PoolConnection, semesterId: number) {
    const [rows] = await conn.query<any>(
      'SELECT id_semestre, id_status, tipo_semestre, id_cct FROM semestre WHERE id_semestre = ? FOR UPDATE',
      [semesterId]
    );
    const semester = rows[0];
    if (!semester) {
      throw Object.assign(new Error('Semestre no encontrado.'), { httpStatus: 404 });
    }
    if (Number(semester.id_status) !== 1) {
      throw Object.assign(new Error('No se pueden modificar horarios de un semestre inactivo.'), {
        httpStatus: 403,
      });
    }
    return semester;
  }

  async function loadScheduleAssignment(conn: PoolConnection, assignmentId: number) {
    const [rows] = await conn.query<any>(
      `SELECT ad.id_asignacion, ad.id_semestre,
              d.id_docente, d.horas_nombramiento, d.horas_descarga, d.id_cct AS docente_id_cct,
              m.id_materia, m.semestre AS materia_semestre, m.tipo_semestre AS materia_tipo_semestre,
              m.id_cct AS materia_id_cct,
              g.id_grupo, g.semestre AS grupo_semestre, g.tipo_semestre AS grupo_tipo_semestre,
              g.id_cct AS grupo_id_cct, g.id_turno AS grupo_id_turno
         FROM asignacion_docente ad
         JOIN docente d ON d.id_docente = ad.id_docente
         JOIN materia m ON m.id_materia = ad.id_materia
         JOIN grupo g ON g.id_grupo = ad.id_grupo
        WHERE ad.id_asignacion = ?
        FOR UPDATE`,
      [assignmentId]
    );
    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      assignment: { id_asignacion: Number(row.id_asignacion), id_semestre: Number(row.id_semestre) },
      docente: {
        id_docente: Number(row.id_docente),
        horas_nombramiento: Number(row.horas_nombramiento),
        horas_descarga: Number(row.horas_descarga),
        id_cct: Number(row.docente_id_cct),
      },
      materia: {
        id_materia: Number(row.id_materia),
        semestre: Number(row.materia_semestre),
        tipo_semestre: row.materia_tipo_semestre,
        id_cct: Number(row.materia_id_cct),
      },
      grupo: {
        id_grupo: Number(row.id_grupo),
        semestre: Number(row.grupo_semestre),
        tipo_semestre: row.grupo_tipo_semestre,
        id_cct: Number(row.grupo_id_cct),
        id_turno: Number(row.grupo_id_turno),
      },
    };
  }

  async function getSlotOccupants(conn: PoolConnection, semesterId: number, day: string, blockId: number) {
    const [rows] = await conn.query<any>(
      `SELECT hd.id_horario, hd.id_asignacion, ad.id_docente, ad.id_grupo,
              ad.id_materia, ad.id_semestre, hd.dia_semana, hd.id_bloque
         FROM horario_detalle hd
         JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
        WHERE ad.id_semestre = ? AND hd.dia_semana = ? AND hd.id_bloque = ?
        FOR UPDATE`,
      [semesterId, day, blockId]
    );
    return rows as Array<{
      id_horario: number;
      id_asignacion: number;
      id_docente: number;
      id_grupo: number;
      id_materia: number;
      id_semestre: number;
      dia_semana: string;
      id_bloque: number;
    }>;
  }

  async function loadBlock(conn: PoolConnection, blockId: number) {
    const [rows] = await conn.query<any>(
      'SELECT id_bloque, id_turno FROM bloque_horario WHERE id_bloque = ? FOR UPDATE',
      [blockId]
    );
    return rows[0] ? { id_bloque: Number(rows[0].id_bloque), id_turno: Number(rows[0].id_turno) } : null;
  }

  async function validateScheduleSlot(
    conn: PoolConnection,
    semesterId: number,
    assignmentId: number,
    day: string,
    blockId: number,
    excludeId?: number
  ) {
    const semester = await lockScheduleSemester(conn, semesterId);
    const assignment = await loadScheduleAssignment(conn, assignmentId);
    const block = await loadBlock(conn, blockId);
    const existingAssignments = await getHorarioBySemester(conn, semesterId);
    const occupants = await getSlotOccupants(conn, semesterId, day, blockId);
    const sameAssignmentOccupant = occupants.find((item) => item.id_asignacion === assignmentId);
    const ignoredScheduleId = excludeId ?? sameAssignmentOccupant?.id_horario;
    const validation = validateHorarioAssignment({
      id_horario: ignoredScheduleId,
      id_asignacion: assignmentId,
      id_docente: assignment?.docente.id_docente,
      id_grupo: assignment?.grupo.id_grupo,
      id_materia: assignment?.materia.id_materia,
      id_semestre: semesterId,
      dia_semana: day,
      id_bloque: blockId,
      semestre: semester,
      docente: assignment?.docente,
      materia: assignment?.materia,
      grupo: assignment?.grupo,
      asignacion: assignment?.assignment,
      bloque: block ?? undefined,
      existingAssignments,
      excludeId: ignoredScheduleId,
    });
    return { validation, occupants };
  }

  function throwHorarioValidation(errors: string[]) {
    throw Object.assign(new Error('Horario no disponible.'), { httpStatus: 409, validationErrors: errors });
  }

  function respondScheduleError(res: any, error: any, fallbackMessage: string) {
    if (error?.validationErrors) {
      return res.status(error.httpStatus ?? 409).json({ message: error.message, errors: error.validationErrors });
    }
    if (error?.httpStatus) {
      return res.status(error.httpStatus).json({ message: error.message });
    }
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Horario no disponible.' });
    }
    const message = error instanceof Error ? error.message : fallbackMessage;
    return res.status(500).json({ message });
  }

  function readScheduleRequest(body: any, semesterId: number) {
    body = body ?? {};
    const assignmentId = Number(body.id_asignacion);
    const blockId = Number(body.id_bloque);
    const day = normalizeScheduleDay(body.dia_semana);
    if (
      !Number.isSafeInteger(semesterId) || semesterId <= 0 ||
      !Number.isSafeInteger(assignmentId) || assignmentId <= 0 ||
      !Number.isSafeInteger(blockId) || blockId <= 0 ||
      !day
    ) {
      return null;
    }
    return { semesterId, assignmentId, blockId, day };
  }

  router.post('/horario/validar', async (req, res) => {
    const selectedSemester = await resolveRequestSemester(req);
    if (!selectedSemester) {
      return res.status(400).json({ message: 'Debe seleccionar un semestre válido.' });
    }
    const payload = readScheduleRequest(req.body, Number(selectedSemester.id_semestre));
    if (!payload) {
      return res.status(400).json({ message: 'Debe especificar asignación, día y bloque válidos.' });
    }

    try {
      const validation = await withTransaction(async (conn) => {
        const { validation: result, occupants } = await validateScheduleSlot(
          conn,
          payload.semesterId,
          payload.assignmentId,
          payload.day,
          payload.blockId,
          req.body.id_horario ? Number(req.body.id_horario) : undefined
        );
        const currentOccupant = occupants.find((item) => item.id_horario !== Number(req.body.id_horario ?? 0));
        if (getScheduleCellAction(currentOccupant?.id_asignacion, payload.assignmentId) === 'unavailable') {
          result.valid = false;
          result.errors.push('Horario no disponible.');
        }
        return result;
      });
      return res.json({ validation });
    } catch (error: any) {
      return respondScheduleError(res, error, 'No se pudo validar el horario.');
    }
  });

  router.post('/horario', async (req, res) => {
    const selectedSemester = await resolveRequestSemester(req);
    if (!selectedSemester) {
      return res.status(400).json({ message: 'Debe seleccionar un semestre válido.' });
    }
    const payload = readScheduleRequest(req.body, Number(selectedSemester.id_semestre));
    if (!payload) {
      return res.status(400).json({ message: 'Debe especificar asignación, día y bloque válidos.' });
    }

    try {
      const result = await withTransaction(async (conn) => {
        const { validation, occupants } = await validateScheduleSlot(
          conn,
          payload.semesterId,
          payload.assignmentId,
          payload.day,
          payload.blockId
        );
        if (occupants.some((item) => item.id_asignacion !== payload.assignmentId)) {
          throwHorarioValidation(['Horario no disponible.']);
        }
        const occupant = occupants.find((item) => item.id_asignacion === payload.assignmentId);
        const cellAction = getScheduleCellAction(occupant?.id_asignacion, payload.assignmentId);
        if (!validation.valid) {
          throwHorarioValidation(validation.errors);
        }

        if (cellAction === 'remove') {
          const occupiedScheduleId = occupant?.id_horario;
          if (occupiedScheduleId === undefined) {
            throw new Error('No se encontró la celda que se intentaba liberar.');
          }
          await conn.query('DELETE FROM horario_detalle WHERE id_horario = ?', [occupiedScheduleId]);
          return { removed: true, id_horario: occupiedScheduleId, id_asignacion: payload.assignmentId };
        }

        const [insertResult] = await conn.query<any>(
          'INSERT INTO horario_detalle (id_asignacion, dia_semana, id_bloque) VALUES (?, ?, ?)',
          [payload.assignmentId, payload.day, payload.blockId]
        );
        return {
          removed: false,
          id_horario: Number(insertResult.insertId),
          id_asignacion: payload.assignmentId,
          id_semestre: payload.semesterId,
          dia_semana: payload.day === 'Miercoles' ? 'Miércoles' : payload.day,
          id_bloque: payload.blockId,
        };
      });

      const message = result.removed ? 'Horario eliminado correctamente.' : 'Horario guardado correctamente.';
      return res.status(result.removed ? 200 : 201).json({ message, item: result });
    } catch (error: any) {
      return respondScheduleError(res, error, 'No se pudo registrar el horario.');
    }
  });

  router.put('/horario/:id', async (req, res) => {
    const scheduleId = Number(req.params.id);
    const selectedSemester = await resolveRequestSemester(req);
    if (!Number.isSafeInteger(scheduleId) || scheduleId <= 0 || !selectedSemester) {
      return res.status(400).json({ message: 'Horario o semestre no válido.' });
    }
    const payload = readScheduleRequest(req.body, Number(selectedSemester.id_semestre));
    if (!payload) {
      return res.status(400).json({ message: 'Debe especificar asignación, día y bloque válidos.' });
    }

    try {
      const item = await withTransaction(async (conn) => {
        await lockScheduleSemester(conn, payload.semesterId);
        const [currentRows] = await conn.query<any>(
          `SELECT hd.id_horario
             FROM horario_detalle hd
             JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
            WHERE hd.id_horario = ? AND ad.id_semestre = ? FOR UPDATE`,
          [scheduleId, payload.semesterId]
        );
        if (!currentRows[0]) {
          throw Object.assign(new Error('Registro de horario no encontrado.'), { httpStatus: 404 });
        }

        const { validation, occupants } = await validateScheduleSlot(
          conn,
          payload.semesterId,
          payload.assignmentId,
          payload.day,
          payload.blockId,
          scheduleId
        );
        if (occupants.some((item) => item.id_horario !== scheduleId)) {
          throwHorarioValidation(['Horario no disponible.']);
        }
        if (!validation.valid) {
          throwHorarioValidation(validation.errors);
        }

        await conn.query(
          'UPDATE horario_detalle SET id_asignacion = ?, dia_semana = ?, id_bloque = ? WHERE id_horario = ?',
          [payload.assignmentId, payload.day, payload.blockId, scheduleId]
        );
        return {
          id_horario: scheduleId,
          id_asignacion: payload.assignmentId,
          id_semestre: payload.semesterId,
          dia_semana: payload.day === 'Miercoles' ? 'Miércoles' : payload.day,
          id_bloque: payload.blockId,
        };
      });
      return res.json({ message: 'Horario actualizado correctamente.', item });
    } catch (error: any) {
      return respondScheduleError(res, error, 'No se pudo actualizar el horario.');
    }
  });

  router.delete('/horario/:id', async (req, res) => {
    const scheduleId = Number(req.params.id);
    const selectedSemester = await resolveRequestSemester(req);
    if (!Number.isSafeInteger(scheduleId) || scheduleId <= 0 || !selectedSemester) {
      return res.status(400).json({ message: 'Horario o semestre no válido.' });
    }

    try {
      await withTransaction(async (conn) => {
        await lockScheduleSemester(conn, Number(selectedSemester.id_semestre));
        const [rows] = await conn.query<any>(
          `SELECT hd.id_horario
             FROM horario_detalle hd
             JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
            WHERE hd.id_horario = ? AND ad.id_semestre = ? FOR UPDATE`,
          [scheduleId, Number(selectedSemester.id_semestre)]
        );
        if (!rows[0]) {
          throw Object.assign(new Error('Registro de horario no encontrado.'), { httpStatus: 404 });
        }
        await conn.query('DELETE FROM horario_detalle WHERE id_horario = ?', [scheduleId]);
      });
      return res.status(204).send();
    } catch (error: any) {
      return respondScheduleError(res, error, 'No se pudo eliminar el registro de horario.');
    }
  });

  return router;
}

