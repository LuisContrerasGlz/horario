import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import session from 'express-session';
import { createServer } from 'node:http';
import { buildApiRouter } from '../src/routes/api.js';
import { pool } from '../src/lib/db.js';

const hasDatabaseConfig = Boolean(process.env.DB_HOST && process.env.DB_NAME);

test('catalog GET endpoints return view-backed contracts from sis_doc', { skip: !hasDatabaseConfig }, async () => {
  const app = express();
  app.use(express.json());
  app.use(
    session({
      secret: 'catalog-api-test',
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use('/api', buildApiRouter());

  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  async function getJson(path: string) {
    const response = await fetch(`${baseUrl}${path}`);
    const text = await response.text();
    assert.equal(response.status, 200, `${path}: ${text}`);
    return JSON.parse(text);
  }

  try {
    const semestres = await getJson('/api/semestres');
    assert.ok(Array.isArray(semestres));
    assert.ok(semestres.length > 0, 'Expected at least one configured semester');

    const sessionSemester = await getJson('/api/session/semestre');
    assert.ok(sessionSemester.activeSemesterId);
    assert.ok(sessionSemester.activeSemester.tipo_semestre);

    const catalogs = await getJson(`/api/catalogos?semesterId=${sessionSemester.activeSemesterId}`);
    for (const key of [
      'docentes',
      'materias',
      'grupos',
      'turnos',
      'bloques',
      'semestres',
      'centrosTrabajo',
      'especialidades',
      'academias',
      'statuses',
      'tiposUsuario',
      'horario',
    ]) {
      assert.ok(Array.isArray(catalogs[key]), `catalogos.${key} must be an array`);
    }
    assert.equal(catalogs.activeSemester.tipo_semestre, sessionSemester.activeSemester.tipo_semestre);

    const docenteId = catalogs.docentes[0]?.id_docente;
    assert.ok(docenteId, 'Expected at least one docente for assignment list filtering');

    const paths = [
      '/api/turnos',
      '/api/bloques',
      '/api/docentes',
      '/api/centros-trabajo',
      '/api/academias',
      '/api/especialidades',
      '/api/status',
      '/api/tipos-usuario',
      '/api/usuarios',
      `/api/materias?semesterId=${sessionSemester.activeSemesterId}`,
      `/api/grupos?semesterId=${sessionSemester.activeSemesterId}`,
      `/api/asignaciones?semesterId=${sessionSemester.activeSemesterId}&docenteId=${docenteId}`,
    ];
    const lists = await Promise.all(paths.map((path) => getJson(path)));
    for (const list of lists) {
      assert.ok(Array.isArray(list));
    }

    for (const docente of catalogs.docentes) {
      assert.equal(typeof docente.nombre, 'string');
      assert.equal(typeof docente.nombre_completo, 'string');
      assert.equal(docente.id_cct, catalogs.activeSemester.id_cct);
    }
    for (const materia of catalogs.materias) {
      assert.equal(materia.tipo_semestre, catalogs.activeSemester.tipo_semestre);
      assert.ok(materia.id_materia);
      assert.ok(materia.nombre_materia);
    }
    for (const grupo of catalogs.grupos) {
      assert.equal(grupo.tipo_semestre, catalogs.activeSemester.tipo_semestre);
      assert.equal(grupo.id_cct, catalogs.activeSemester.id_cct);
      assert.ok(grupo.id_especialidad);
      assert.ok(grupo.nombre_grupo);
    }
    for (const materia of catalogs.materias) {
      assert.equal(materia.id_cct, catalogs.activeSemester.id_cct);
    }
    for (const bloque of catalogs.bloques) {
      assert.ok(bloque.id_bloque);
      assert.ok(bloque.turno_descripcion);
    }
    for (const usuario of lists[8]) {
      assert.equal(Object.hasOwn(usuario, 'password'), false);
    }

    for (const asignacion of lists[11]) {
      assert.equal(asignacion.id_docente, docenteId);
      assert.equal(asignacion.id_semestre, sessionSemester.activeSemesterId);
    }
    const horasDocente = await getJson(
      `/api/docentes/${docenteId}/horas-disponibles?semesterId=${sessionSemester.activeSemesterId}`
    );
    assert.equal(typeof horasDocente.horas_asignadas, 'number');
    const expectedHours = lists[11].reduce((total: number, assignment: any) => {
      return total + Number(assignment.horas_materia);
    }, 0);
    assert.equal(horasDocente.horas_asignadas, expectedHours);

    const missingDocenteFilter = await fetch(
      `${baseUrl}/api/asignaciones?semesterId=${sessionSemester.activeSemesterId}`
    );
    assert.equal(missingDocenteFilter.status, 400);

    const selectedGroup = catalogs.grupos[0];
    if (selectedGroup) {
      const materiasDelGrupo = await getJson(
        `/api/materias?semesterId=${sessionSemester.activeSemesterId}&grupoId=${selectedGroup.id_grupo}`
      );
      assert.ok(materiasDelGrupo.every((materia: any) => materia.semestre === selectedGroup.semestre));

      const asignacionesDelGrupo = await getJson(
        `/api/asignaciones?semesterId=${sessionSemester.activeSemesterId}&grupoId=${selectedGroup.id_grupo}`
      );
      assert.ok(asignacionesDelGrupo.every((asignacion: any) => asignacion.id_grupo === selectedGroup.id_grupo));

      const grid = await getJson(
        `/api/horario/grid?semesterId=${sessionSemester.activeSemesterId}&grupoId=${selectedGroup.id_grupo}`
      );
      assert.ok(grid.bloques.length > 0);
      assert.ok(grid.bloques.every((bloque: any) => bloque.id_turno === selectedGroup.id_turno));
    }

    const selectedMateria = catalogs.materias[0];
    if (selectedMateria) {
      const gruposDeMateria = await getJson(
        `/api/grupos?semesterId=${sessionSemester.activeSemesterId}&materiaId=${selectedMateria.id_materia}`
      );
      assert.ok(gruposDeMateria.every((grupo: any) => grupo.semestre === selectedMateria.semestre));
    }

    const invalidSemesterResponse = await fetch(`${baseUrl}/api/materias?semesterId=999999999`);
    assert.equal(invalidSemesterResponse.status, 400);

    const allSubjects = await getJson('/api/materias?all=1');
    assert.ok(allSubjects.some((materia: any) => materia.tipo_semestre !== catalogs.activeSemester.tipo_semestre));
    const allGroups = await getJson('/api/grupos?all=1');
    assert.ok(allGroups.some((grupo: any) => grupo.tipo_semestre !== catalogs.activeSemester.tipo_semestre));

    const invalidDocenteHours = await fetch(`${baseUrl}/api/docentes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Nombre: 'Prueba', Apellido_pat: 'Prueba', horas_nombramiento: 41, horas_descarga: 0 }),
    });
    assert.equal(invalidDocenteHours.status, 400);

    for (const tipo_semestre of ['X', 'x']) {
      const invalidMateriaType = await fetch(`${baseUrl}/api/materias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Tipo inválido', tipo_semestre }),
      });
      assert.equal(invalidMateriaType.status, 400);

      const invalidGroupType = await fetch(`${baseUrl}/api/grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grupo: 'Z', tipo_semestre }),
      });
      assert.equal(invalidGroupType.status, 400);
    }

    const invalidUsuario = await fetch(`${baseUrl}/api/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Prueba', correo_electronico: 'prueba@example.test', password: 'corta' }),
    });
    assert.equal(invalidUsuario.status, 400);

    const implicitAssignmentResponse = await fetch(`${baseUrl}/api/horario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_semestre: sessionSemester.activeSemesterId,
        id_docente: docenteId,
        id_materia: catalogs.materias[0]?.id_materia,
        id_grupo: catalogs.grupos[0]?.id_grupo,
        dia_semana: 'Lunes',
        id_bloque: catalogs.bloques[0]?.id_bloque,
      }),
    });
    assert.equal(implicitAssignmentResponse.status, 400);

    const missingAssignmentResponse = await fetch(`${baseUrl}/api/horario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_semestre: sessionSemester.activeSemesterId,
        id_asignacion: 999999999,
        dia_semana: 'Lunes',
        id_bloque: catalogs.bloques[0]?.id_bloque,
      }),
    });
    const missingAssignmentBody = await missingAssignmentResponse.text();
    assert.equal(missingAssignmentResponse.status, 409, missingAssignmentBody);

    const inactiveSemester = semestres.find((semester: any) => Number(semester.id_status) !== 1);
    if (inactiveSemester) {
      const inactiveScheduleResponse = await fetch(`${baseUrl}/api/horario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_semestre: inactiveSemester.id_semestre,
          id_asignacion: 1,
          dia_semana: 'Lunes',
          id_bloque: 1,
        }),
      });
      assert.equal(inactiveScheduleResponse.status, 403);

      const inactiveDeleteResponse = await fetch(`${baseUrl}/api/horario/999999999`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_semestre: inactiveSemester.id_semestre }),
      });
      assert.equal(inactiveDeleteResponse.status, 403);
    }
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await pool.end();
  }
});