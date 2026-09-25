export function normalizeSemesterType(value) {
    return String(value ?? '').trim().toUpperCase();
}
export function getAvailableHours(docente) {
    if (!docente) {
        return 0;
    }
    const nombramiento = Number(docente.horas_nombramiento ?? 0);
    const descarga = Number(docente.horas_descarga ?? 0);
    return nombramiento - descarga;
}
export function validateHorarioAssignment(input) {
    const errors = [];
    const existingAssignments = (input.existingAssignments ?? []).filter((record) => !input.excludeId || record.id_horario !== input.excludeId);
    if (!input.id_docente || !input.id_grupo || !input.id_materia || !input.id_semestre) {
        errors.push('Faltan datos obligatorios para registrar la asignación.');
    }
    if (!input.dia_semana || !input.id_bloque) {
        errors.push('Debe especificar el día y el bloque horario.');
    }
    const activeType = normalizeSemesterType(input.semestre?.tipo_semestre);
    const materiaType = normalizeSemesterType(input.materia?.tipo_semestre);
    const grupoType = normalizeSemesterType(input.grupo?.tipo_semestre);
    if (activeType && materiaType && grupoType) {
        if (materiaType !== activeType || grupoType !== activeType) {
            errors.push('Coherencia de Semestre: la materia y el grupo deben coincidir con el tipo del semestre activo.');
        }
    }
    const docente = input.docente ?? null;
    const availableHours = getAvailableHours(docente);
    const proposedHours = Number(input.horas ?? 1);
    const assignedHours = existingAssignments
        .filter((record) => record.id_docente === input.id_docente)
        .reduce((sum, record) => sum + Number(record.horas ?? 1), 0);
    if (availableHours > 0 && assignedHours + proposedHours > availableHours) {
        errors.push(`No se permite asignar más módulos semanales que las horas disponibles del docente (${availableHours}).`);
    }
    const sameDocenteConflict = existingAssignments.some((record) => record.id_docente === input.id_docente &&
        record.dia_semana === input.dia_semana &&
        record.id_bloque === input.id_bloque);
    if (sameDocenteConflict) {
        errors.push('Sin empalme de docente: el docente ya tiene un bloque asignado en ese día y horario.');
    }
    const sameGroupConflict = existingAssignments.some((record) => record.id_grupo === input.id_grupo &&
        record.dia_semana === input.dia_semana &&
        record.id_bloque === input.id_bloque);
    if (sameGroupConflict) {
        errors.push('Sin empalme de grupo: el grupo ya tiene un bloque asignado en ese día y horario.');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=validation.js.map