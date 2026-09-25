import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHorarioAssignment } from '../src/lib/validation.js';
test('allows a valid assignment when no conflicts exist', () => {
    const result = validateHorarioAssignment({
        id_docente: 1,
        id_grupo: 10,
        id_materia: 20,
        id_semestre: 100,
        dia_semana: 'Lunes',
        id_bloque: 1,
        docente: { horas_nombramiento: 18, horas_descarga: 4 },
        materia: { tipo_semestre: 'P' },
        grupo: { tipo_semestre: 'P' },
        semestre: { tipo_semestre: 'P' },
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
        id_docente: 1,
        id_grupo: 10,
        id_materia: 20,
        id_semestre: 100,
        dia_semana: 'Martes',
        id_bloque: 2,
        docente: { horas_nombramiento: 12, horas_descarga: 8 },
        materia: { tipo_semestre: 'P' },
        grupo: { tipo_semestre: 'P' },
        semestre: { tipo_semestre: 'P' },
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
        id_docente: 1,
        id_grupo: 10,
        id_materia: 20,
        id_semestre: 100,
        dia_semana: 'Miércoles',
        id_bloque: 5,
        docente: { horas_nombramiento: 20, horas_descarga: 4 },
        materia: { tipo_semestre: 'P' },
        grupo: { tipo_semestre: 'P' },
        semestre: { tipo_semestre: 'P' },
        existingAssignments: [
            { id_docente: 1, dia_semana: 'Miércoles', id_bloque: 5 }
        ]
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /docente/i);
});
test('rejects overlapping schedule blocks for the same group', () => {
    const result = validateHorarioAssignment({
        id_docente: 1,
        id_grupo: 10,
        id_materia: 20,
        id_semestre: 100,
        dia_semana: 'Jueves',
        id_bloque: 6,
        docente: { horas_nombramiento: 20, horas_descarga: 2 },
        materia: { tipo_semestre: 'P' },
        grupo: { tipo_semestre: 'P' },
        semestre: { tipo_semestre: 'P' },
        existingAssignments: [
            { id_grupo: 10, dia_semana: 'Jueves', id_bloque: 6 }
        ]
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /grupo/i);
});
test('rejects a semester mismatch between subject, group and active semester', () => {
    const result = validateHorarioAssignment({
        id_docente: 1,
        id_grupo: 10,
        id_materia: 20,
        id_semestre: 100,
        dia_semana: 'Viernes',
        id_bloque: 7,
        docente: { horas_nombramiento: 20, horas_descarga: 2 },
        materia: { tipo_semestre: 'N' },
        grupo: { tipo_semestre: 'P' },
        semestre: { tipo_semestre: 'P' },
        existingAssignments: []
    });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /semestre/i);
});
//# sourceMappingURL=validation.test.js.map