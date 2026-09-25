import { Router } from 'express';
import { query, withTransaction } from '../lib/db.js';
import { validateHorarioAssignment } from '../lib/validation.js';

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
  SELECT s.id_semestre, s.descripcion, s.descripcion AS nombre_semestre, s.fecha_inicio, s.fecha_fin,
         s.id_cct, s.id_status, s.tipo_semestre, st.descripcion AS status_descripcion,
         (s.id_status = 1) AS activo
    FROM semestre s
    LEFT JOIN status st ON st.id_status = s.id_status
`;

const MATERIA_SELECT = `
  SELECT m.id_materia, m.nombre, m.nombre AS nombre_materia, m.nombre_corto, m.semestre, m.especialidad,
         m.id_especialidad, m.horas, m.tipo_semestre, m.id_academia, m.id_status, m.id_cct,
         st.descripcion AS status_descripcion
    FROM materia m
    LEFT JOIN status st ON st.id_status = m.id_status
`;

const GRUPO_SELECT = `
  SELECT g.id_grupo, g.grupo, g.grupo AS nombre_grupo, g.semestre, g.tipo_semestre, g.id_academia,
         g.id_cct, g.id_turno, t.Descripcion AS turno_descripcion
    FROM grupo g
    LEFT JOIN turno t ON t.id_turno = g.id_turno
`;

// Alias en minúsculas para evitar colisiones de llave insensibles a mayúsculas
// en clientes JSON (p. ej. ConvertFrom-Json de PowerShell) entre `Nombre` y `nombre`.
const DOCENTE_SELECT = `
  SELECT d.id_docente, d.RFC AS rfc, d.Nombre AS nombre_pila, d.Apellido_pat AS apellido_paterno,
         d.Apellido_mat AS apellido_materno,
         CONCAT_WS(' ', d.Nombre, d.Apellido_pat, d.Apellido_mat) AS nombre,
         d.Perfil AS perfil, d.correo_e, d.Telefono AS telefono, d.horas_nombramiento, d.horas_descarga,
         d.id_turno, d.id_cct, d.id_status, t.Descripcion AS turno_descripcion, st.descripcion AS status_descripcion
    FROM docente d
    LEFT JOIN turno t ON t.id_turno = d.id_turno
    LEFT JOIN status st ON st.id_status = d.id_status
`;

const TURNO_SELECT = `SELECT id_turno, Descripcion, Descripcion AS nombre_turno FROM turno`;

const HORARIO_SELECT = `
  SELECT hd.id_horario, hd.id_asignacion, hd.dia_semana, hd.id_bloque,
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
  const semesterId = Number(id ?? 0);
  if (semesterId) {
    const [rows] = await query<any>(`${SEMESTER_SELECT} WHERE s.id_semestre = ? LIMIT 1`, [semesterId]);
    return rows[0] ?? null;
  }

  const [activeRows] = await query<any>(`${SEMESTER_SELECT} WHERE s.id_status = 1 ORDER BY s.fecha_inicio DESC LIMIT 1`);
  if (activeRows[0]) {
    return activeRows[0];
  }

  const [recentRows] = await query<any>(`${SEMESTER_SELECT} ORDER BY s.fecha_inicio DESC LIMIT 1`);
  return recentRows[0] ?? null;
}

// Resuelve el semestre a usar en una solicitud: query param > sesión > activo en BD.
async function resolveRequestSemester(req: any) {
  const requestedId = Number(req.query.semesterId ?? req.body?.id_semestre ?? req.session.activeSemesterId ?? 0);
  return getSemesterById(requestedId);
}

function normalizeTipoSemestre(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

// existingAssignments para las validaciones de horario: se obtienen uniendo
// horario_detalle con asignacion_docente, ya que horario_detalle no guarda
// directamente id_docente/id_grupo/id_materia/id_semestre.
async function getHorarioBySemester(semesterId: number) {
  const [rows] = await query<any>(
    `SELECT hd.id_horario, hd.dia_semana, hd.id_bloque, ad.id_docente, ad.id_grupo, ad.id_materia, ad.id_semestre
       FROM horario_detalle hd
       JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
      WHERE ad.id_semestre = ?
      ORDER BY hd.dia_semana, hd.id_bloque`,
    [semesterId]
  );
  return rows;
}

// Encuentra (o crea) la fila de asignacion_docente para una combinación
// semestre/docente/materia/grupo, usada como llave foránea de horario_detalle.
async function findOrCreateAsignacion(
  conn: { query: (sql: string, params?: any[]) => Promise<any> },
  semesterId: number,
  docenteId: number,
  materiaId: number,
  grupoId: number
): Promise<number> {
  const [existing] = await conn.query(
    'SELECT id_asignacion FROM asignacion_docente WHERE id_semestre = ? AND id_docente = ? AND id_materia = ? AND id_grupo = ? LIMIT 1',
    [semesterId, docenteId, materiaId, grupoId]
  );
  if (existing[0]) {
    return existing[0].id_asignacion;
  }

  const [result] = await conn.query(
    'INSERT INTO asignacion_docente (id_semestre, id_docente, id_materia, id_grupo) VALUES (?, ?, ?, ?)',
    [semesterId, docenteId, materiaId, grupoId]
  );
  return result.insertId;
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
    const [rows] = await query<any>(`${SEMESTER_SELECT} ORDER BY s.fecha_inicio DESC`);
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
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM semestre WHERE id_semestre = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Semestre no encontrado.' });
      }
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
    const [rows] = await query<any>('SELECT * FROM bloque_horario ORDER BY codigo_bloque');
    res.json(rows);
  });

  router.get('/bloques/:id', async (req, res) => {
    const [rows] = await query<any>('SELECT * FROM bloque_horario WHERE id_bloque = ? LIMIT 1', [Number(req.params.id)]);
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
    const [rows] = await query<any>(`${DOCENTE_SELECT} ORDER BY d.Apellido_pat, d.Apellido_mat, d.Nombre`);
    res.json(rows);
  });

  router.get('/docentes/:id', async (req, res) => {
    const [rows] = await query<any>(`${DOCENTE_SELECT} WHERE d.id_docente = ? LIMIT 1`, [Number(req.params.id)]);
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
    try {
      const values = DOCENTE_FIELDS.map((field) => req.body[field] ?? null);
      const [result] = (await query<{ insertId: number }>(
        `INSERT INTO docente (${DOCENTE_FIELDS.join(', ')}) VALUES (${DOCENTE_FIELDS.map(() => '?').join(', ')})`,
        values
      )) as [{ insertId: number }, any];
      const [rows] = await query<any>(`${DOCENTE_SELECT} WHERE d.id_docente = ? LIMIT 1`, [result.insertId]);
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
    try {
      const setClause = DOCENTE_FIELDS.map((field) => `${field} = ?`).join(', ');
      const values = DOCENTE_FIELDS.map((field) => req.body[field] ?? null);
      await query(`UPDATE docente SET ${setClause} WHERE id_docente = ?`, [...values, id]);
      const [rows] = await query<any>(`${DOCENTE_SELECT} WHERE d.id_docente = ? LIMIT 1`, [id]);
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
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM docente WHERE id_docente = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Docente no encontrado.' });
      }
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
    const sql = semester ? `${MATERIA_SELECT} WHERE m.tipo_semestre = ? ORDER BY m.nombre` : `${MATERIA_SELECT} ORDER BY m.nombre`;
    const params = semester ? [semester.tipo_semestre] : [];
    const [rows] = await query<any>(sql, params);
    res.json(rows);
  });

  router.get('/materias/:id', async (req, res) => {
    const [rows] = await query<any>(`${MATERIA_SELECT} WHERE m.id_materia = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Materia no encontrada.' });
    }
    res.json(rows[0]);
  });

  const MATERIA_FIELDS = ['nombre', 'nombre_corto', 'semestre', 'especialidad', 'id_especialidad', 'horas', 'tipo_semestre', 'id_academia', 'id_status', 'id_cct'];

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
      const [rows] = await query<any>(`${MATERIA_SELECT} WHERE m.id_materia = ? LIMIT 1`, [result.insertId]);
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
      const [rows] = await query<any>(`${MATERIA_SELECT} WHERE m.id_materia = ? LIMIT 1`, [id]);
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
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM materia WHERE id_materia = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Materia no encontrada.' });
      }
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la materia (verifique dependencias).';
      res.status(409).json({ message });
    }
  });

  router.get('/grupos', async (req, res) => {
    const semester = await resolveRequestSemester(req);
    const sql = semester ? `${GRUPO_SELECT} WHERE g.tipo_semestre = ? ORDER BY g.grupo` : `${GRUPO_SELECT} ORDER BY g.grupo`;
    const params = semester ? [semester.tipo_semestre] : [];
    const [rows] = await query<any>(sql, params);
    res.json(rows);
  });

  router.get('/grupos/:id', async (req, res) => {
    const [rows] = await query<any>(`${GRUPO_SELECT} WHERE g.id_grupo = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Grupo no encontrado.' });
    }
    res.json(rows[0]);
  });

  const GRUPO_FIELDS = ['grupo', 'semestre', 'tipo_semestre', 'id_academia', 'id_cct', 'id_turno'];

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
      const [rows] = await query<any>(`${GRUPO_SELECT} WHERE g.id_grupo = ? LIMIT 1`, [result.insertId]);
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
      const [rows] = await query<any>(`${GRUPO_SELECT} WHERE g.id_grupo = ? LIMIT 1`, [id]);
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
  async function validateAsignacionCoherence(body: any, semesterId: number) {
    const semestre = await getSemesterById(semesterId);
    const [docenteRows] = await query<any>('SELECT * FROM docente WHERE id_docente = ? LIMIT 1', [Number(body.id_docente)]);
    const [materiaRows] = await query<any>('SELECT * FROM materia WHERE id_materia = ? LIMIT 1', [Number(body.id_materia)]);
    const [grupoRows] = await query<any>('SELECT * FROM grupo WHERE id_grupo = ? LIMIT 1', [Number(body.id_grupo)]);

    const docente = docenteRows[0];
    const materia = materiaRows[0];
    const grupo = grupoRows[0];

    if (!semestre || !docente || !materia || !grupo) {
      return 'No se pudo validar la asignación docente: revise semestre, docente, materia y grupo.';
    }

    if (
      normalizeTipoSemestre(semestre.tipo_semestre) !== normalizeTipoSemestre(materia.tipo_semestre) ||
      normalizeTipoSemestre(semestre.tipo_semestre) !== normalizeTipoSemestre(grupo.tipo_semestre)
    ) {
      return 'Coherencia de semestre: la materia y el grupo deben coincidir con el tipo del semestre activo.';
    }

    return null;
  }

  const ASIGNACION_SELECT = `
    SELECT ad.id_asignacion, ad.id_semestre, ad.id_docente, ad.id_materia, ad.id_grupo,
           CONCAT_WS(' ', d.Nombre, d.Apellido_pat, d.Apellido_mat) AS docente_nombre,
           m.nombre AS nombre_materia, m.horas, g.grupo AS nombre_grupo
      FROM asignacion_docente ad
      LEFT JOIN docente d ON d.id_docente = ad.id_docente
      LEFT JOIN materia m ON m.id_materia = ad.id_materia
      LEFT JOIN grupo g ON g.id_grupo = ad.id_grupo
  `;

  router.get('/asignaciones', async (req, res) => {
    const semester = await resolveRequestSemester(req);
    const semesterId = semester?.id_semestre ?? Number(req.query.semesterId ?? 0);
    const [rows] = await query<any>(`${ASIGNACION_SELECT} WHERE ad.id_semestre = ? ORDER BY docente_nombre`, [
      semesterId || 0,
    ]);
    res.json(rows);
  });

  router.get('/asignaciones/:id', async (req, res) => {
    const [rows] = await query<any>(`${ASIGNACION_SELECT} WHERE ad.id_asignacion = ? LIMIT 1`, [Number(req.params.id)]);
    if (!rows[0]) {
      return res.status(404).json({ message: 'Asignación no encontrada.' });
    }
    res.json(rows[0]);
  });

  router.post('/asignaciones', async (req, res) => {
    const semesterId = Number(req.body.id_semestre ?? req.session.activeSemesterId ?? 0);
    if (!semesterId || !req.body.id_docente || !req.body.id_materia || !req.body.id_grupo) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para la asignación docente.' });
    }

    const coherenceError = await validateAsignacionCoherence(req.body, semesterId);
    if (coherenceError) {
      return res.status(400).json({ message: coherenceError });
    }

    try {
      const [result] = (await query<{ insertId: number }>(
        'INSERT INTO asignacion_docente (id_semestre, id_docente, id_materia, id_grupo) VALUES (?, ?, ?, ?)',
        [semesterId, Number(req.body.id_docente), Number(req.body.id_materia), Number(req.body.id_grupo)]
      )) as [{ insertId: number }, any];

      res.status(201).json({ message: 'Asignación docente registrada.', id: result.insertId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la asignación docente.';
      res.status(500).json({ message });
    }
  });

  router.put('/asignaciones/:id', async (req, res) => {
    const id = Number(req.params.id);
    const semesterId = Number(req.body.id_semestre ?? req.session.activeSemesterId ?? 0);
    if (!semesterId || !req.body.id_docente || !req.body.id_materia || !req.body.id_grupo) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para la asignación docente.' });
    }

    const coherenceError = await validateAsignacionCoherence(req.body, semesterId);
    if (coherenceError) {
      return res.status(400).json({ message: coherenceError });
    }

    try {
      await query(
        'UPDATE asignacion_docente SET id_semestre = ?, id_docente = ?, id_materia = ?, id_grupo = ? WHERE id_asignacion = ?',
        [semesterId, Number(req.body.id_docente), Number(req.body.id_materia), Number(req.body.id_grupo), id]
      );
      const [rows] = await query<any>(`${ASIGNACION_SELECT} WHERE ad.id_asignacion = ? LIMIT 1`, [id]);
      if (!rows[0]) {
        return res.status(404).json({ message: 'Asignación no encontrada.' });
      }
      res.json(rows[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar la asignación docente.';
      res.status(500).json({ message });
    }
  });

  router.delete('/asignaciones/:id', async (req, res) => {
    try {
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM asignacion_docente WHERE id_asignacion = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Asignación no encontrada.' });
      }
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la asignación docente.';
      res.status(409).json({ message });
    }
  });

  // -------------------------------------------------------------------
  // Catálogos combinados para alimentar el frontend (§3, vista interactiva)
  // -------------------------------------------------------------------
  router.get('/catalogos', async (req, res) => {
    const selectedSemester = await resolveRequestSemester(req);
    const semesterId = selectedSemester?.id_semestre ?? Number(req.query.semesterId ?? 0);

    const [docentes] = await query<any>(`${DOCENTE_SELECT} ORDER BY d.Apellido_pat, d.Apellido_mat, d.Nombre`);
    const [bloques] = await query<any>('SELECT * FROM bloque_horario ORDER BY codigo_bloque');
    const [turnos] = await query<any>(`${TURNO_SELECT} ORDER BY Descripcion`);
    const [semestres] = await query<any>(`${SEMESTER_SELECT} ORDER BY s.fecha_inicio DESC`);

    const materiaSql = selectedSemester
      ? `${MATERIA_SELECT} WHERE m.tipo_semestre = ? ORDER BY m.nombre`
      : `${MATERIA_SELECT} ORDER BY m.nombre`;
    const materiaParams = selectedSemester ? [selectedSemester.tipo_semestre] : [];
    const [materias] = await query<any>(materiaSql, materiaParams);

    const grupoSql = selectedSemester
      ? `${GRUPO_SELECT} WHERE g.tipo_semestre = ? ORDER BY g.grupo`
      : `${GRUPO_SELECT} ORDER BY g.grupo`;
    const grupoParams = selectedSemester ? [selectedSemester.tipo_semestre] : [];
    const [grupos] = await query<any>(grupoSql, grupoParams);

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
    const semesterId = selectedSemester?.id_semestre ?? Number(req.query.semesterId ?? 0);
    const docenteId = Number(req.query.docenteId ?? 0);
    const grupoId = Number(req.query.grupoId ?? 0);

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
    const [bloques] = await query<any>('SELECT * FROM bloque_horario ORDER BY orden, hora_inicio');

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
    const semesterId = selectedSemester?.id_semestre ?? Number(req.query.semesterId ?? 0);

    const [docenteRows] = await query<any>('SELECT * FROM docente WHERE id_docente = ? LIMIT 1', [docenteId]);
    const docente = docenteRows[0];
    if (!docente) {
      return res.status(404).json({ message: 'Docente no encontrado.' });
    }

    const [asignadasRows] = await query<any>(
      `SELECT COUNT(*) AS total
         FROM horario_detalle hd
         JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
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

  async function loadValidationContext(body: any, semesterId: number) {
    const selectedSemester = await getSemesterById(semesterId);
    const [docenteRows] = await query<any>('SELECT * FROM docente WHERE id_docente = ? LIMIT 1', [Number(body.id_docente)]);
    const [materiaRows] = await query<any>('SELECT * FROM materia WHERE id_materia = ? LIMIT 1', [Number(body.id_materia)]);
    const [grupoRows] = await query<any>('SELECT * FROM grupo WHERE id_grupo = ? LIMIT 1', [Number(body.id_grupo)]);
    const existingAssignments = await getHorarioBySemester(semesterId);

    return {
      selectedSemester,
      docente: docenteRows[0],
      materia: materiaRows[0],
      grupo: grupoRows[0],
      existingAssignments,
    };
  }

  router.post('/horario/validar', async (req, res) => {
    const semesterId = Number(req.body.id_semestre ?? req.session.activeSemesterId ?? 0);
    const context = await loadValidationContext(req.body, semesterId);

    const validation = validateHorarioAssignment({
      ...req.body,
      id_semestre: semesterId,
      semestre: context.selectedSemester,
      docente: context.docente,
      materia: context.materia,
      grupo: context.grupo,
      existingAssignments: context.existingAssignments,
      excludeId: req.body.id_horario ? Number(req.body.id_horario) : null,
    });

    res.json({ validation });
  });

  router.post('/horario', async (req, res) => {
    const semesterId = Number(req.body.id_semestre ?? req.session.activeSemesterId ?? 0);
    if (!semesterId) {
      return res.status(400).json({ message: 'Debe seleccionar un semestre activo.' });
    }

    try {
      const item = await withTransaction(async (conn) => {
        // Bloquea las asignaciones del semestre para evitar condiciones de
        // carrera entre solicitudes concurrentes (empalmes / tope de horas).
        await conn.query(
          `SELECT hd.id_horario
             FROM horario_detalle hd
             JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
            WHERE ad.id_semestre = ? FOR UPDATE`,
          [semesterId]
        );

        const context = await loadValidationContext(req.body, semesterId);
        const validation = validateHorarioAssignment({
          ...req.body,
          id_semestre: semesterId,
          semestre: context.selectedSemester,
          docente: context.docente,
          materia: context.materia,
          grupo: context.grupo,
          existingAssignments: context.existingAssignments,
        });

        if (!validation.valid) {
          const error = new Error('La asignación no cumple las reglas de negocio.');
          (error as any).validationErrors = validation.errors;
          throw error;
        }

        const idAsignacion = await findOrCreateAsignacion(
          conn,
          semesterId,
          Number(req.body.id_docente),
          Number(req.body.id_materia),
          Number(req.body.id_grupo)
        );

        const payload = {
          id_semestre: semesterId,
          id_docente: Number(req.body.id_docente),
          id_grupo: Number(req.body.id_grupo),
          id_materia: Number(req.body.id_materia),
          dia_semana: req.body.dia_semana,
          id_bloque: Number(req.body.id_bloque),
        };

        const [result] = (await conn.query(
          'INSERT INTO horario_detalle (id_asignacion, dia_semana, id_bloque) VALUES (?, ?, ?)',
          [idAsignacion, payload.dia_semana, payload.id_bloque]
        )) as [{ insertId: number }, any];

        return { ...payload, id_horario: result.insertId, id_asignacion: idAsignacion };
      });

      return res.status(201).json({ message: 'Horario guardado correctamente.', item });
    } catch (error: any) {
      if (error?.validationErrors) {
        return res.status(400).json({ message: error.message, errors: error.validationErrors });
      }
      const message = error instanceof Error ? error.message : 'No se pudo registrar el horario.';
      return res.status(500).json({ message });
    }
  });

  router.put('/horario/:id', async (req, res) => {
    const id = Number(req.params.id);
    const semesterId = Number(req.body.id_semestre ?? req.session.activeSemesterId ?? 0);
    if (!semesterId) {
      return res.status(400).json({ message: 'Debe seleccionar un semestre activo.' });
    }

    try {
      const item = await withTransaction(async (conn) => {
        await conn.query(
          `SELECT hd.id_horario
             FROM horario_detalle hd
             JOIN asignacion_docente ad ON ad.id_asignacion = hd.id_asignacion
            WHERE ad.id_semestre = ? FOR UPDATE`,
          [semesterId]
        );

        const context = await loadValidationContext(req.body, semesterId);
        const validation = validateHorarioAssignment({
          ...req.body,
          id_semestre: semesterId,
          semestre: context.selectedSemester,
          docente: context.docente,
          materia: context.materia,
          grupo: context.grupo,
          existingAssignments: context.existingAssignments,
          excludeId: id,
        });

        if (!validation.valid) {
          const error = new Error('La asignación no cumple las reglas de negocio.');
          (error as any).validationErrors = validation.errors;
          throw error;
        }

        const idAsignacion = await findOrCreateAsignacion(
          conn,
          semesterId,
          Number(req.body.id_docente),
          Number(req.body.id_materia),
          Number(req.body.id_grupo)
        );

        const payload = {
          id_semestre: semesterId,
          id_docente: Number(req.body.id_docente),
          id_grupo: Number(req.body.id_grupo),
          id_materia: Number(req.body.id_materia),
          dia_semana: req.body.dia_semana,
          id_bloque: Number(req.body.id_bloque),
        };

        const [result] = (await conn.query(
          'UPDATE horario_detalle SET id_asignacion = ?, dia_semana = ?, id_bloque = ? WHERE id_horario = ?',
          [idAsignacion, payload.dia_semana, payload.id_bloque, id]
        )) as [{ affectedRows: number }, any];

        if (!result.affectedRows) {
          const error = new Error('Registro de horario no encontrado.');
          (error as any).notFound = true;
          throw error;
        }

        return { ...payload, id_horario: id, id_asignacion: idAsignacion };
      });

      return res.json({ message: 'Horario actualizado correctamente.', item });
    } catch (error: any) {
      if (error?.validationErrors) {
        return res.status(400).json({ message: error.message, errors: error.validationErrors });
      }
      if (error?.notFound) {
        return res.status(404).json({ message: error.message });
      }
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el horario.';
      return res.status(500).json({ message });
    }
  });

  router.delete('/horario/:id', async (req, res) => {
    try {
      const [result] = (await query<{ affectedRows: number }>('DELETE FROM horario_detalle WHERE id_horario = ?', [
        Number(req.params.id),
      ])) as [{ affectedRows: number }, any];
      if (!result.affectedRows) {
        return res.status(404).json({ message: 'Registro de horario no encontrado.' });
      }
      res.status(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el registro de horario.';
      res.status(409).json({ message });
    }
  });

  return router;
}

