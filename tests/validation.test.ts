import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getScheduleCellAction,
  validateAsignacionDocente,
  validateDocenteHours,
  validateHorarioAssignment,
} from '../src/lib/validation.js';

test('accepts docente hours within the specification limits', () => {
  assert.deepEqual(validateDocenteHours({ horas_nombramiento: 40, horas_descarga: 10 }), {
    valid: true,
    errors: [],
  });
});

test('rejects docente hours outside limits or with excessive descarga', () => {
  const result = validateDocenteHours({ horas_nombramiento: 41, horas_descarga: 42 });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /nombramiento/i);
  assert.match(result.errors.join(' '), /descarga/i);
});

const validAsignacionInput = {
  id_semestre: 10,
  id_docente: 20,
  id_materia: 30,
  id_grupo: 40,
  semestre: { id_status: 1, tipo_semestre: 'P', id_cct: 1 },
  docente: { horas_nombramiento: 40, horas_descarga: 5, id_cct: 1 },
  materia: { tipo_semestre: 'P', semestre: 2, horas: 8, id_cct: 1 },
  grupo: { tipo_semestre: 'P', semestre: 2, id_cct: 1 },
  horasAsignadas: 20,
  asignacionDuplicada: false,
};

test('allows carga docente when business rules are satisfied', () => {
  const result = validateAsignacionDocente(validAsignacionInput);

  assert.deepEqual(result, { valid: true, errors: [] });
});

test('rejects carga docente for an inactive semester', () => {
  const result = validateAsignacionDocente({
    ...validAsignacionInput,
    semestre: { ...validAsignacionInput.semestre, id_status: 2 },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /semestre activo/i);
});

test('rejects carga docente when subject or group type differs from semester', () => {
  const result = validateAsignacionDocente({
    ...validAsignacionInput,
    materia: { ...validAsignacionInput.materia, tipo_semestre: 'N' },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /tipo del semestre/i);
});

test('blocks X and x semester types from carga docente', () => {
  for (const tipo_semestre of ['X', 'x']) {
    const result = validateAsignacionDocente({
      ...validAsignacionInput,
      materia: { ...validAsignacionInput.materia, tipo_semestre },
      grupo: { ...validAsignacionInput.grupo, tipo_semestre },
    });
    assert.equal(result.valid, false, `${tipo_semestre} must not be assignable`);
  }
});

test('rejects carga docente when subject and group semester numbers differ', () => {
  const result = validateAsignacionDocente({
    ...validAsignacionInput,
    grupo: { ...validAsignacionInput.grupo, semestre: 4 },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /mismo número de semestre/i);
});

test('rejects carga docente across different work centers', () => {
  const result = validateAsignacionDocente({
    ...validAsignacionInput,
    materia: { ...validAsignacionInput.materia, id_cct: 2 },
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /mismo centro de trabajo/i);
});

test('rejects duplicate carga docente assignments', () => {
  const result = validateAsignacionDocente({ ...validAsignacionInput, asignacionDuplicada: true });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /ya existe/i);
});

test('rejects carga docente beyond teacher available hours', () => {
  const result = validateAsignacionDocente({ ...validAsignacionInput, horasAsignadas: 28 });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /horas disponibles/i);
});

const validHorarioInput = {
  id_docente: 1,
  id_grupo: 10,
  id_materia: 20,
  id_semestre: 100,
  id_asignacion: 50,
  dia_semana: 'Lunes',
  id_bloque: 1,
  docente: { horas_nombramiento: 20, horas_descarga: 4, id_cct: 1 },
  materia: { tipo_semestre: 'P', semestre: 2, id_cct: 1 },
  grupo: { tipo_semestre: 'P', semestre: 2, id_cct: 1, id_turno: 1 },
  semestre: { tipo_semestre: 'P', id_status: 1, id_cct: 1 },
  asignacion: { id_asignacion: 50, id_semestre: 100 },
  bloque: { id_turno: 1 },
};

test('allows a valid assignment when no conflicts exist', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    existingAssignments: [
      { id_docente: 2, dia_semana: 'Lunes', id_bloque: 1 },
      { id_grupo: 11, dia_semana: 'Lunes', id_bloque: 1 }
    ]
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('rejects assignments that exceed the docentes available hours', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    dia_semana: 'Martes',
    id_bloque: 2,
    docente: { ...validHorarioInput.docente, horas_nombramiento: 12, horas_descarga: 8 },
    existingAssignments: [
      { id_docente: 1, dia_semana: 'Lunes', id_bloque: 1, horas: 3 },
      { id_docente: 1, dia_semana: 'Lunes', id_bloque: 2, horas: 3 },
      { id_docente: 1, dia_semana: 'Lunes', id_bloque: 3, horas: 3 }
    ]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /horas/i);
});

test('rejects overlapping schedule blocks for the same docente', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    dia_semana: 'Miércoles',
    id_bloque: 5,
    existingAssignments: [
      { id_docente: 1, dia_semana: 'Miércoles', id_bloque: 5 }
    ]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /docente/i);
});

test('rejects overlapping schedule blocks for the same group', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    dia_semana: 'Jueves',
    id_bloque: 6,
    existingAssignments: [
      { id_grupo: 10, dia_semana: 'Jueves', id_bloque: 6 }
    ]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /grupo/i);
});

test('rejects a semester mismatch between subject, group and active semester', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    dia_semana: 'Viernes',
    id_bloque: 7,
    materia: { ...validHorarioInput.materia, tipo_semestre: 'N' },
    existingAssignments: []
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /semestre/i);
});

test('blocks X and x semester types from schedules', () => {
  for (const tipo_semestre of ['X', 'x']) {
    const result = validateHorarioAssignment({
      ...validHorarioInput,
      semestre: { ...validHorarioInput.semestre, tipo_semestre },
      materia: { ...validHorarioInput.materia, tipo_semestre },
      grupo: { ...validHorarioInput.grupo, tipo_semestre },
      existingAssignments: [],
    });
    assert.equal(result.valid, false, `${tipo_semestre} must not be schedulable`);
  }
});

test('rejects schedule changes in an inactive semester', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    semestre: { ...validHorarioInput.semestre, id_status: 2 },
    existingAssignments: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /semestre activo/i);
});

test('rejects a schedule assignment that belongs to another semester', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    asignacion: { ...validHorarioInput.asignacion, id_semestre: 101 },
    existingAssignments: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /pertenecer al semestre/i);
});

test('rejects a schedule block from another group shift', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    bloque: { id_turno: 2 },
    existingAssignments: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /turno del grupo/i);
});

test('rejects a schedule assignment with different subject and group grades', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    materia: { ...validHorarioInput.materia, semestre: 4 },
    existingAssignments: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /mismo número de semestre/i);
});

test('rejects a schedule assignment from another work center', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    grupo: { ...validHorarioInput.grupo, id_cct: 2 },
    existingAssignments: [],
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /mismo centro de trabajo/i);
});

test('allows editing a schedule cell without conflicting with itself', () => {
  const result = validateHorarioAssignment({
    ...validHorarioInput,
    id_horario: 7,
    excludeId: 7,
    existingAssignments: [
      { id_horario: 7, id_docente: 1, id_grupo: 10, dia_semana: 'Miercoles', id_bloque: 1 },
    ],
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('schedule cell toggle removes only the same assignment', () => {
  assert.equal(getScheduleCellAction(null, 50), 'insert');
  assert.equal(getScheduleCellAction(50, 50), 'remove');
  assert.equal(getScheduleCellAction(51, 50), 'unavailable');
});
