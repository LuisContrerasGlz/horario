export type SemesterLike = {
  tipo_semestre?: string | null;
  id_status?: number | null;
  id_cct?: number | null;
};

export type DocenteLike = {
  horas_nombramiento?: number | null;
  horas_descarga?: number | null;
  id_cct?: number | null;
};

export type MateriaLike = {
  tipo_semestre?: string | null;
  semestre?: number | null;
  id_cct?: number | null;
};

export type GrupoLike = {
  tipo_semestre?: string | null;
  semestre?: number | null;
  id_cct?: number | null;
  id_turno?: number | null;
};

export type AsignacionValidationInput = {
  id_semestre?: number | null;
  id_docente?: number | null;
  id_materia?: number | null;
  id_grupo?: number | null;
  semestre?: {
    id_status?: number | null;
    tipo_semestre?: string | null;
    id_cct?: number | null;
  } | null;
  docente?: DocenteLike & { id_cct?: number | null };
  materia?: MateriaLike & {
    semestre?: number | null;
    horas?: number | null;
    id_cct?: number | null;
  };
  grupo?: GrupoLike & {
    semestre?: number | null;
    id_cct?: number | null;
  };
  horasAsignadas?: number | null;
  asignacionDuplicada?: boolean;
};

export type AssignmentRecord = {
  id_horario?: number | null;
  id_asignacion?: number | null;
  id_docente?: number | null;
  id_grupo?: number | null;
  id_materia?: number | null;
  id_semestre?: number | null;
  dia_semana?: string | null;
  id_bloque?: number | null;
  horas?: number | null;
};

export type HorarioValidationInput = {
  id_horario?: number | null;
  id_asignacion?: number | null;
  id_docente?: number | null;
  id_grupo?: number | null;
  id_materia?: number | null;
  id_semestre?: number | null;
  dia_semana?: string | null;
  id_bloque?: number | null;
  horas?: number | null;
  docente?: DocenteLike | null;
  materia?: MateriaLike | null;
  grupo?: GrupoLike | null;
  semestre?: SemesterLike | null;
  asignacion?: { id_asignacion?: number | null; id_semestre?: number | null } | null;
  bloque?: { id_turno?: number | null } | null;
  existingAssignments?: AssignmentRecord[];
  /** Al editar, excluye este id_horario de las validaciones de empalme/horas. */
  excludeId?: number | null;
};

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type ScheduleCellAction = 'insert' | 'remove' | 'unavailable';

export function getScheduleCellAction(
  existingAssignmentId: number | null | undefined,
  selectedAssignmentId: number
): ScheduleCellAction {
  if (existingAssignmentId === undefined || existingAssignmentId === null) {
    return 'insert';
  }
  return Number(existingAssignmentId) === Number(selectedAssignmentId) ? 'remove' : 'unavailable';
}

export function normalizeSemesterType(value?: string | null): string {
  return String(value ?? '').trim().toUpperCase();
}

export function getAvailableHours(docente?: DocenteLike | null): number {
  if (!docente) {
    return 0;
  }

  const nombramiento = Number(docente.horas_nombramiento ?? 0);
  const descarga = Number(docente.horas_descarga ?? 0);
  return nombramiento - descarga;
}

export function validateDocenteHours(docente: DocenteLike): ValidationResult {
  const errors: string[] = [];
  const appointment = Number(docente.horas_nombramiento);
  const release = Number(docente.horas_descarga);

  if (!Number.isSafeInteger(appointment) || appointment < 0 || appointment > 40) {
    errors.push('Las horas de nombramiento deben ser un entero entre 0 y 40.');
  }
  if (!Number.isSafeInteger(release) || release < 0 || release > 10) {
    errors.push('Las horas de descarga deben ser un entero entre 0 y 10.');
  }
  if (Number.isSafeInteger(appointment) && Number.isSafeInteger(release) && release > appointment) {
    errors.push('Las horas de descarga no pueden superar las horas de nombramiento.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateAsignacionDocente(input: AsignacionValidationInput): ValidationResult {
  const errors: string[] = [];
  const ids = [input.id_semestre, input.id_docente, input.id_materia, input.id_grupo];
  if (ids.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) {
    errors.push('Semestre, docente, materia y grupo son obligatorios y deben ser válidos.');
  }

  const { semestre, docente, materia, grupo } = input;
  if (!semestre) {
    errors.push('El semestre seleccionado no existe.');
  } else if (Number(semestre.id_status) !== 1) {
    errors.push('Solo se permiten asignaciones en un semestre activo.');
  }

  if (!docente || !materia || !grupo) {
    errors.push('No se pudo validar el docente, la materia y el grupo seleccionados.');
    return { valid: false, errors };
  }

  const semesterType = normalizeSemesterType(semestre?.tipo_semestre);
  const subjectType = normalizeSemesterType(materia.tipo_semestre);
  const groupType = normalizeSemesterType(grupo.tipo_semestre);
  if (!['P', 'N'].includes(semesterType) || subjectType !== semesterType || groupType !== semesterType) {
    errors.push('La materia y el grupo deben coincidir con el tipo del semestre seleccionado (P/N).');
  }

  const subjectGrade = Number(materia.semestre);
  const groupGrade = Number(grupo.semestre);
  if (!Number.isSafeInteger(subjectGrade) || !Number.isSafeInteger(groupGrade) || subjectGrade !== groupGrade) {
    errors.push('La materia y el grupo deben corresponder al mismo número de semestre.');
  }

  const centerIds = [semestre?.id_cct, docente.id_cct, materia.id_cct, grupo.id_cct].map(Number);
  if (centerIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(centerIds).size !== 1) {
    errors.push('El docente, la materia, el grupo y el semestre deben pertenecer al mismo centro de trabajo.');
  }

  if (input.asignacionDuplicada) {
    errors.push('Ya existe esta asignación para el docente, la materia, el grupo y el semestre.');
  }

  const availableHours = getAvailableHours(docente);
  const assignedHours = Number(input.horasAsignadas ?? 0);
  const subjectHours = Number(materia.horas ?? 0);
  if (!Number.isFinite(assignedHours) || assignedHours < 0 || !Number.isFinite(subjectHours) || subjectHours < 0) {
    errors.push('Las horas asignadas y las horas de la materia deben ser válidas.');
  } else if (availableHours < 0 || assignedHours + subjectHours > availableHours) {
    errors.push(
      `La carga del docente excede sus horas disponibles (${Math.max(availableHours, 0)}).`
    );
  }

  return { valid: errors.length === 0, errors };
}

export function validateHorarioAssignment(input: HorarioValidationInput): ValidationResult {
  const errors: string[] = [];
  const existingAssignments = (input.existingAssignments ?? []).filter(
    (record) => !input.excludeId || record.id_horario !== input.excludeId
  );

  const requiredIds = [input.id_docente, input.id_grupo, input.id_materia, input.id_semestre, input.id_asignacion, input.id_bloque];
  if (requiredIds.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) {
    errors.push('Faltan datos obligatorios válidos para registrar el horario.');
  }

  const diaSemana = input.dia_semana === 'Miércoles' ? 'Miercoles' : input.dia_semana;
  const validDays = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
  if (!diaSemana || !validDays.includes(diaSemana)) {
    errors.push('Debe especificar un día hábil válido.');
  }

  if (!input.semestre || Number(input.semestre.id_status) !== 1) {
    errors.push('Solo se permiten cambios de horario en un semestre activo.');
  }

  if (
    !input.asignacion ||
    Number(input.asignacion.id_asignacion) !== Number(input.id_asignacion) ||
    Number(input.asignacion.id_semestre) !== Number(input.id_semestre)
  ) {
    errors.push('La asignación docente debe existir y pertenecer al semestre seleccionado.');
  }

  const activeType = normalizeSemesterType(input.semestre?.tipo_semestre);
  const materiaType = normalizeSemesterType(input.materia?.tipo_semestre);
  const grupoType = normalizeSemesterType(input.grupo?.tipo_semestre);

  if (!['P', 'N'].includes(activeType) || materiaType !== activeType || grupoType !== activeType) {
    errors.push('La materia y el grupo deben coincidir con el tipo del semestre activo.');
  }

  if (Number(input.materia?.semestre) !== Number(input.grupo?.semestre)) {
    errors.push('La materia y el grupo deben corresponder al mismo número de semestre.');
  }

  const centerIds = [
    input.semestre?.id_cct,
    input.docente?.id_cct,
    input.materia?.id_cct,
    input.grupo?.id_cct,
  ].map(Number);
  if (centerIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(centerIds).size !== 1) {
    errors.push('La asignación, materia, grupo y semestre deben pertenecer al mismo centro de trabajo.');
  }

  if (!input.bloque || Number(input.bloque.id_turno) !== Number(input.grupo?.id_turno)) {
    errors.push('El bloque horario debe corresponder al turno del grupo.');
  }

  const docente = input.docente ?? null;
  const availableHours = getAvailableHours(docente);
  const proposedHours = Number(input.horas ?? 1);
  const assignedHours = existingAssignments
    .filter((record) => record.id_docente === input.id_docente)
    .reduce((sum, record) => sum + Number(record.horas ?? 1), 0);

  if (availableHours > 0 && assignedHours + proposedHours > availableHours) {
    errors.push(
      `No se permite asignar más módulos semanales que las horas disponibles del docente (${availableHours}).`
    );
  }

  const sameDocenteConflict = existingAssignments.some(
    (record) =>
      record.id_docente === input.id_docente &&
      (record.dia_semana === 'Miércoles' ? 'Miercoles' : record.dia_semana) === diaSemana &&
      record.id_bloque === input.id_bloque
  );

  if (sameDocenteConflict) {
    errors.push('Sin empalme de docente: el docente ya tiene un bloque asignado en ese día y horario.');
  }

  const sameGroupConflict = existingAssignments.some(
    (record) =>
      record.id_grupo === input.id_grupo &&
      (record.dia_semana === 'Miércoles' ? 'Miercoles' : record.dia_semana) === diaSemana &&
      record.id_bloque === input.id_bloque
  );

  if (sameGroupConflict) {
    errors.push('Sin empalme de grupo: el grupo ya tiene un bloque asignado en ese día y horario.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
