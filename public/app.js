const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const semesterSelect = $('#semester-select');
const teacherSelect = $('#teacher-select');
const subjectSelect = $('#subject-select');
const groupSelect = $('#group-select');
const turnFilter = $('#turn-filter');
const specialtyFilter = $('#specialty-filter');
const scheduleGrid = $('#schedule-grid');
const catalogDialog = $('#catalog-dialog');

const state = {
  semesterId: null,
  semester: null,
  semesters: [],
  catalogs: {},
  teacherHours: null,
  cargaAssignments: [],
  scheduleMode: 'group',
  scheduleAssignments: [],
  scheduleGrid: null,
  catalogRows: [],
  catalogDescriptor: null,
  catalogPage: 0,
  catalogPageSize: 12,
  catalogSort: { key: null, direction: 1 },
  selectedCatalogId: null,
  catalogEditorId: null,
};

const catalogDefinitions = {
  docentes: {
    label: 'Docentes', endpoint: '/api/docentes', idKey: 'id_docente', columns: [
      ['id_docente', 'No. control'], ['rfc', 'RFC'], ['nombre_completo', 'Nombre completo'],
      ['perfil', 'Perfil'], ['correo_e', 'Correo'], ['telefono', 'Teléfono'],
      ['horas_nombramiento', 'Nombramiento'], ['horas_descarga', 'Descarga'],
      ['turno_descripcion', 'Turno'], ['centro_trabajo', 'Centro'], ['status_descripcion', 'Estatus'],
    ],
    mutable: true, softDelete: true, fields: [
      { key: 'RFC', sourceKey: 'rfc', label: 'RFC', type: 'text', required: true, maxLength: 13 },
      { key: 'Nombre', sourceKey: 'nombre_pila', label: 'Nombre', type: 'text', required: true, maxLength: 100 },
      { key: 'Apellido_pat', sourceKey: 'apellido_paterno', label: 'Apellido paterno', type: 'text', required: true, maxLength: 100 },
      { key: 'Apellido_mat', sourceKey: 'apellido_materno', label: 'Apellido materno', type: 'text', maxLength: 100 },
      { key: 'Perfil', sourceKey: 'perfil', label: 'Perfil', type: 'text' },
      { key: 'correo_e', label: 'Correo electrónico', type: 'email', maxLength: 100 },
      { key: 'Telefono', sourceKey: 'telefono', label: 'Teléfono', type: 'tel', maxLength: 100 },
      { key: 'horas_nombramiento', label: 'Horas de nombramiento', type: 'number', required: true, min: 0, max: 40 },
      { key: 'horas_descarga', label: 'Horas de descarga', type: 'number', required: true, min: 0, max: 10 },
      { key: 'id_turno', label: 'Turno', type: 'select', source: 'turnos', valueKey: 'id_turno', labelKey: 'nombre_turno', required: true },
      { key: 'id_cct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre', required: true },
      { key: 'id_status', label: 'Estatus', type: 'select', source: 'statuses', valueKey: 'id_status', labelKey: 'descripcion', required: true },
    ],
  },
  materias: {
    label: 'Materias', endpoint: '/api/materias', catalogAll: true, idKey: 'id_materia', columns: [
      ['id_materia', 'ID'], ['nombre_materia', 'Materia'], ['nombre_corto', 'Nombre corto'],
      ['semestre', 'Semestre'], ['horas', 'Horas'], ['tipo_semestre', 'Tipo'],
      ['nombre_academia', 'Academia'], ['status_descripcion', 'Estatus'], ['id_cct', 'CCT'],
    ],
    mutable: true, softDelete: true, fields: [
      { key: 'nombre', sourceKey: 'nombre', label: 'Materia', type: 'text', required: true, maxLength: 100 },
      { key: 'nombre_corto', label: 'Nombre corto', type: 'text', required: true, maxLength: 20 },
      { key: 'semestre', label: 'Semestre', type: 'number', required: true, min: 0, max: 6 },
      { key: 'horas', label: 'Horas', type: 'number', required: true, min: 0, max: 40 },
      { key: 'tipo_semestre', label: 'Tipo', type: 'select', options: [['P', 'Par'], ['N', 'Impar']], required: true },
      { key: 'id_academia', label: 'Academia', type: 'select', source: 'academias', valueKey: 'id_academia', labelKey: 'nombre_academia' },
      { key: 'id_status', label: 'Estatus', type: 'select', source: 'statuses', valueKey: 'id_status', labelKey: 'descripcion', required: true },
      { key: 'id_cct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre' },
    ],
  },
  grupos: {
    label: 'Grupos', endpoint: '/api/grupos', catalogAll: true, idKey: 'id_grupo', columns: [
      ['id_grupo', 'ID'], ['nombre_grupo', 'Grupo'], ['semestre', 'Semestre'],
      ['nombre_especialidad', 'Especialidad'], ['turno_descripcion', 'Turno'],
      ['centro_trabajo', 'Centro'], ['tipo_semestre', 'Tipo'],
    ],
    mutable: true, fields: [
      { key: 'grupo', label: 'Grupo', type: 'text', required: true, maxLength: 10 },
      { key: 'semestre', label: 'Semestre', type: 'number', required: true, min: 1, max: 6 },
      { key: 'id_especialidad', label: 'Especialidad', type: 'select', source: 'especialidades', valueKey: 'id_especialidad', labelKey: 'nombre_especialidad', required: true },
      { key: 'id_cct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre', required: true },
      { key: 'id_turno', label: 'Turno', type: 'select', source: 'turnos', valueKey: 'id_turno', labelKey: 'nombre_turno', required: true },
    ],
  },
  semestres: {
    label: 'Semestres', endpoint: '/api/semestres', columns: [
      ['id_semestre', 'ID'], ['descripcion', 'Periodo'], ['fecha_inicio', 'Inicio'],
      ['fecha_fin', 'Fin'], ['nombre_centro_trabajo', 'Centro'], ['status_descripcion', 'Estatus'],
      ['tipo_semestre', 'Tipo'],
    ],
    mutable: true, softDelete: true, idKey: 'id_semestre', fields: [
      { key: 'descripcion', label: 'Descripción', type: 'text', required: true, maxLength: 100 },
      { key: 'fecha_inicio', label: 'Fecha de inicio', type: 'date', required: true },
      { key: 'fecha_fin', label: 'Fecha de término', type: 'date', required: true },
      { key: 'id_cct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre', required: true },
      { key: 'id_status', label: 'Estatus', type: 'select', source: 'statuses', valueKey: 'id_status', labelKey: 'descripcion', required: true },
      { key: 'tipo_semestre', label: 'Tipo de semestre', type: 'select', options: [['P', 'Par'], ['N', 'Impar']], required: true },
    ],
  },
  academias: {
    label: 'Academias', endpoint: '/api/academias', columns: [
      ['id_academia', 'ID'], ['nombre_academia', 'Academia'], ['nombre_corto', 'Nombre corto'],
      ['nombre_especialidad', 'Especialidad'], ['centro_trabajo', 'Centro'], ['status_academia', 'Estatus'],
    ],
    mutable: true, softDelete: true, idKey: 'id_academia', fields: [
      { key: 'nombre_academia', label: 'Academia', type: 'text', required: true, maxLength: 100 },
      { key: 'nombre_corto', label: 'Nombre corto', type: 'text', required: true, maxLength: 10 },
      { key: 'id_especialidad', label: 'Especialidad', type: 'select', source: 'especialidades', valueKey: 'id_especialidad', labelKey: 'nombre_especialidad' },
      { key: 'id_cct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre' },
      { key: 'id_status', label: 'Estatus', type: 'select', source: 'statuses', valueKey: 'id_status', labelKey: 'descripcion', required: true },
    ],
  },
  centrosTrabajo: {
    label: 'Centros de trabajo', endpoint: '/api/centros-trabajo', columns: [
      ['id_cct', 'ID'], ['CCT', 'CCT'], ['Nombre', 'Centro de trabajo'],
    ],
    mutable: true, idKey: 'id_cct', fields: [
      { key: 'CCT', label: 'CCT', type: 'text', required: true, maxLength: 10 },
      { key: 'Nombre', label: 'Centro de trabajo', type: 'text', required: true, maxLength: 100 },
    ],
    mutable: true, idKey: 'id_cct', fields: [
      { key: 'CCT', label: 'CCT', type: 'text', required: true, maxLength: 10 },
      { key: 'Nombre', label: 'Centro de trabajo', type: 'text', required: true, maxLength: 100 },
    ],
  },
  especialidades: {
    label: 'Especialidades', endpoint: '/api/especialidades', columns: [
      ['id_especialidad', 'ID'], ['nombre_especialidad', 'Especialidad'], ['nombre_corto', 'Nombre corto'],
      ['centro_trabajo', 'Centro'],
    ],
    mutable: true, idKey: 'id_especialidad', fields: [
      { key: 'nombre_especialidad', label: 'Especialidad', type: 'text', required: true, maxLength: 100 },
      { key: 'nombre_corto', label: 'Nombre corto', type: 'text', required: true, maxLength: 20 },
      { key: 'id_cct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre' },
    ],
    mutable: true, idKey: 'id_especialidad', fields: [
      { key: 'nombre_especialidad', label: 'Especialidad', type: 'text', required: true, maxLength: 100 },
      { key: 'nombre_corto', label: 'Nombre corto', type: 'text', required: true, maxLength: 20 },
      { key: 'id_cct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre' },
    ],
  },
  turnos: {
    label: 'Turnos', endpoint: '/api/turnos', columns: [
      ['id_turno', 'ID'], ['nombre_turno', 'Turno'],
    ],
    mutable: true, idKey: 'id_turno', fields: [
      { key: 'Descripcion', label: 'Descripción', type: 'text', required: true, maxLength: 100 },
    ],
  },
  bloques: {
    label: 'Bloques horarios', endpoint: '/api/bloques', columns: [
      ['id_bloque', 'ID'], ['codigo_bloque', 'Bloque'], ['turno_descripcion', 'Turno'],
      ['hora_inicio', 'Inicio'], ['hora_fin', 'Fin'], ['orden', 'Orden'],
    ],
    mutable: true, idKey: 'id_bloque', fields: [
      { key: 'codigo_bloque', label: 'Código', type: 'text', required: true, maxLength: 10 },
      { key: 'id_turno', label: 'Turno', type: 'select', source: 'turnos', valueKey: 'id_turno', labelKey: 'nombre_turno', required: true },
      { key: 'hora_inicio', label: 'Hora de inicio', type: 'time', required: true },
      { key: 'hora_fin', label: 'Hora de término', type: 'time', required: true },
      { key: 'orden', label: 'Orden', type: 'number', required: true, min: 1 },
    ],
  },
  statuses: {
    label: 'Estatus', endpoint: '/api/status', columns: [
      ['id_status', 'ID'], ['descripcion', 'Estatus'],
    ],
    mutable: true, idKey: 'id_status', fields: [
      { key: 'descripcion', label: 'Estatus', type: 'text', required: true, maxLength: 100 },
    ],
    mutable: true, idKey: 'id_status', fields: [
      { key: 'descripcion', label: 'Estatus', type: 'text', required: true, maxLength: 100 },
    ],
  },
  tiposUsuario: {
    label: 'Tipos de usuario', endpoint: '/api/tipos-usuario', columns: [
      ['id_tipo_usuario', 'ID'], ['descripcion', 'Tipo de usuario'],
    ],
    mutable: true, idKey: 'id_tipo_usuario', fields: [
      { key: 'descripcion', label: 'Tipo de usuario', type: 'text', required: true, maxLength: 200 },
    ],
    mutable: true, idKey: 'id_tipo_usuario', fields: [
      { key: 'descripcion', label: 'Tipo de usuario', type: 'text', required: true, maxLength: 200 },
    ],
  },
  usuarios: {
    label: 'Usuarios', endpoint: '/api/usuarios', columns: [
      ['id_usuario', 'ID'], ['nombre', 'Nombre'], ['correo_electronico', 'Correo'],
      ['tipo_usuario_descripcion', 'Tipo'], ['status_descripcion', 'Estatus'],
      ['telefono', 'Teléfono'], ['centro_trabajo', 'Centro'],
    ],
    mutable: true, softDelete: true, idKey: 'id_usuario', fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 200 },
      { key: 'correo_electronico', label: 'Correo electrónico', type: 'email', required: true, maxLength: 100 },
      { key: 'password', label: 'Contraseña', type: 'password', required: true, maxLength: 72, minLength: 8 },
      { key: 'tipo_usuario', label: 'Tipo de usuario', type: 'select', source: 'tiposUsuario', valueKey: 'id_tipo_usuario', labelKey: 'descripcion', required: true },
      { key: 'status', label: 'Estatus', type: 'select', source: 'statuses', valueKey: 'id_status', labelKey: 'descripcion', required: true },
      { key: 'telefono', label: 'Teléfono', type: 'tel', required: true, maxLength: 20 },
      { key: 'id_ct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre' },
    ],
    mutable: true, softDelete: true, idKey: 'id_usuario', fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 200 },
      { key: 'correo_electronico', label: 'Correo electrónico', type: 'email', required: true, maxLength: 100 },
      { key: 'password', label: 'Contraseña', type: 'password', required: true, maxLength: 72, minLength: 8 },
      { key: 'tipo_usuario', label: 'Tipo de usuario', type: 'select', source: 'tiposUsuario', valueKey: 'id_tipo_usuario', labelKey: 'descripcion', required: true },
      { key: 'status', label: 'Estatus', type: 'select', source: 'statuses', valueKey: 'id_status', labelKey: 'descripcion', required: true },
      { key: 'telefono', label: 'Teléfono', type: 'tel', required: true, maxLength: 20 },
      { key: 'id_ct', label: 'Centro de trabajo', type: 'select', source: 'centrosTrabajo', valueKey: 'id_cct', labelKey: 'Nombre' },
    ],
  },
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-MX');
}

async function requestJson(url, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers });
  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const details = Array.isArray(body?.errors) ? ` ${body.errors.join(' ')}` : '';
    throw new Error(`${body?.message ?? 'La solicitud no se pudo completar.'}${details}`);
  }
  return body;
}

function showMessage(message, kind = 'info') {
  const region = $('#app-message');
  region.textContent = message;
  region.dataset.kind = kind;
  region.hidden = false;
  clearTimeout(showMessage.timeout);
  showMessage.timeout = setTimeout(() => { region.hidden = true; }, 5200);
}

function optionMarkup(items, valueKey, labelBuilder, placeholder) {
  const options = items.map((item) => `<option value="${escapeHtml(item[valueKey])}">${escapeHtml(labelBuilder(item))}</option>`);
  return [`<option value="">${escapeHtml(placeholder)}</option>`, ...options].join('');
}

function fillSelect(select, items, valueKey, labelBuilder, placeholder, preferredValue = select.value) {
  select.innerHTML = optionMarkup(items, valueKey, labelBuilder, placeholder);
  if (items.some((item) => String(item[valueKey]) === String(preferredValue))) {
    select.value = String(preferredValue);
  } else if (items.length === 1) {
    select.value = String(items[0][valueKey]);
  }
}

function selectedSemesterIsEditable() {
  return Number(state.semester?.id_status) === 1;
}

function renderSemesterControl() {
  fillSelect(semesterSelect, state.semesters, 'id_semestre', (item) => item.descripcion ?? item.nombre_semestre, 'Selecciona periodo', state.semesterId);
  semesterSelect.value = String(state.semesterId ?? '');
  const editable = selectedSemesterIsEditable();
  const pill = $('#semester-state');
  pill.textContent = editable ? 'Activo · editable' : `${state.semester?.status_descripcion ?? 'Consulta'} · solo lectura`;
  pill.classList.toggle('is-locked', !editable);
  $('#schedule-edit-state').textContent = editable ? 'Periodo editable' : 'Solo consulta';
  $('#schedule-edit-state').classList.toggle('is-locked', !editable);
  $('#workspace-cct').textContent = state.semester?.CCT ? `${state.semester.CCT} · ${state.semester.nombre_centro_trabajo ?? ''}` : '';
}

async function loadCatalogs() {
  state.catalogs = await requestJson(`/api/catalogos?semesterId=${encodeURIComponent(state.semesterId)}`);
  state.semesters = state.catalogs.semestres ?? state.semesters;
  state.semester = state.catalogs.activeSemester;
  renderSemesterControl();
  renderCargaControls();
  renderCatalogSelection();
  await loadTeacherAssignments();
  await refreshScheduleWorkspace();
  if (state.catalogDescriptor) {
    await loadCatalogRows($('#catalog-select').value);
  }
}

function renderCargaControls() {
  const previousTeacher = teacherSelect.value;
  fillSelect(teacherSelect, state.catalogs.docentes ?? [], 'id_docente', (item) => item.nombre_completo ?? item.nombre, 'Selecciona docente', previousTeacher);
  fillSelect($('#schedule-teacher-select'), state.catalogs.docentes ?? [], 'id_docente', (item) => item.nombre_completo ?? item.nombre, 'Selecciona docente');
  fillSelect(turnFilter, state.catalogs.turnos ?? [], 'id_turno', (item) => item.nombre_turno ?? item.Descripcion, 'Todos los turnos');
  fillSelect(specialtyFilter, state.catalogs.especialidades ?? [], 'id_especialidad', (item) => item.nombre_especialidad, 'Todas las especialidades');

  const currentSubject = subjectSelect.value;
  const currentGroup = groupSelect.value;
  const chosenGroup = state.catalogs.grupos?.find((item) => String(item.id_grupo) === currentGroup);
  const chosenSubject = state.catalogs.materias?.find((item) => String(item.id_materia) === currentSubject);
  const subjects = chosenGroup
    ? state.catalogs.materias.filter((item) => Number(item.semestre) === Number(chosenGroup.semestre))
    : state.catalogs.materias ?? [];
  const groups = chosenSubject
    ? state.catalogs.grupos.filter((item) => Number(item.semestre) === Number(chosenSubject.semestre))
    : state.catalogs.grupos ?? [];
  const filteredGroups = groups.filter((item) =>
    (!turnFilter.value || String(item.id_turno) === turnFilter.value) &&
    (!specialtyFilter.value || String(item.id_especialidad) === specialtyFilter.value)
  );

  fillSelect(subjectSelect, subjects, 'id_materia', (item) => `${item.nombre_materia} · ${item.semestre}° · ${item.horas} h`, 'Selecciona materia', currentSubject);
  fillSelect(groupSelect, filteredGroups, 'id_grupo', (item) => `${item.nombre_grupo} · ${item.turno_descripcion}`, 'Selecciona grupo', currentGroup);

  const groupsForCounts = state.catalogs.grupos ?? [];
  $('#morning-count').textContent = String(groupsForCounts.filter((item) => Number(item.id_turno) === 1).length);
  $('#afternoon-count').textContent = String(groupsForCounts.filter((item) => Number(item.id_turno) === 2).length);

  const docent = state.catalogs.docentes?.find((item) => String(item.id_docente) === teacherSelect.value);
  $('#teacher-summary-name').textContent = docent?.nombre_completo ?? 'Selecciona un docente';
  $('#teacher-summary-profile').textContent = docent ? [docent.perfil, docent.turno_descripcion, docent.centro_trabajo].filter(Boolean).join(' · ') : 'Perfil no disponible';
  renderTeacherHours();
  const selectedMatter = state.catalogs.materias?.find((item) => String(item.id_materia) === subjectSelect.value);
  const hoursLoading = Boolean(teacherSelect.value) && !state.teacherHours;
  const insufficientHours = Boolean(selectedMatter && state.teacherHours &&
    Number(state.teacherHours.horas_restantes) < Number(selectedMatter.horas));
  $('#add-assignment').disabled = !selectedSemesterIsEditable() || !teacherSelect.value || !subjectSelect.value || !groupSelect.value || hoursLoading || insufficientHours;
}

function renderTeacherHours() {
  const hours = state.teacherHours;
  if (!hours) {
    $('#teacher-hours-remaining').textContent = '--';
    $('#teacher-hours-detail').textContent = 'Nombramiento -- · Descarga -- · Asignadas --';
    $('#teacher-hours-meter').style.width = '0%';
    return;
  }
  $('#teacher-hours-remaining').textContent = `${hours.horas_restantes} h`;
  $('#teacher-hours-detail').textContent = `Nombramiento ${hours.horas_nombramiento} h · Descarga ${hours.horas_descarga} h · Asignadas ${hours.horas_asignadas} h`;
  const total = Number(hours.horas_disponibles);
  const used = Number(hours.horas_asignadas);
  const percentage = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;
  $('#teacher-hours-meter').style.width = `${percentage}%`;
  $('#teacher-hours-meter').classList.toggle('is-over', used > total);
}

async function loadTeacherAssignments() {
  const teacherId = Number(teacherSelect.value);
  if (!teacherId) {
    state.cargaAssignments = [];
    state.teacherHours = null;
    renderCargaAssignments();
    renderTeacherHours();
    return;
  }
  state.teacherHours = null;
  renderCargaControls();
  try {
    const [assignments, hours] = await Promise.all([
      requestJson(`/api/asignaciones?semesterId=${state.semesterId}&docenteId=${teacherId}`),
      requestJson(`/api/docentes/${teacherId}/horas-disponibles?semesterId=${state.semesterId}`),
    ]);
    state.cargaAssignments = assignments;
    state.teacherHours = hours;
    renderCargaAssignments();
    renderTeacherHours();
    renderCargaControls();
  } catch (error) {
    state.cargaAssignments = [];
    state.teacherHours = null;
    renderCargaAssignments();
    renderCargaControls();
    showMessage(error.message, 'error');
  }
}

function renderCargaAssignments() {
  const body = $('#assignment-table-body');
  const rows = state.cargaAssignments ?? [];
  $('#load-record-count').textContent = `${rows.length} ${rows.length === 1 ? 'asignación' : 'asignaciones'}`;
  const total = rows.reduce((sum, item) => sum + Number(item.horas_materia ?? 0), 0);
  $('#assignment-total').textContent = `${total} h`;
  $('#assignment-total-footer').textContent = `${total} h`;
  body.innerHTML = rows.length
    ? rows.map((item) => `<tr><td>${escapeHtml(item.grupo)}</td><td>${escapeHtml(item.nombre_materia)}</td><td>${Number(item.horas_materia)} h</td></tr>`).join('')
    : '<tr><td class="empty-row" colspan="3">No hay asignaciones para este docente en el periodo.</td></tr>';
}

async function submitCarga(event) {
  event.preventDefault();
  if (!selectedSemesterIsEditable()) {
    showMessage('El periodo está en consulta; no se pueden agregar asignaciones.', 'warning');
    return;
  }
  const payload = {
    id_semestre: Number(state.semesterId),
    id_docente: Number(teacherSelect.value),
    id_materia: Number(subjectSelect.value),
    id_grupo: Number(groupSelect.value),
  };
  $('#add-assignment').disabled = true;
  try {
    const response = await requestJson('/api/asignaciones', { method: 'POST', body: JSON.stringify(payload) });
    showMessage(response.message ?? 'Asignación registrada.', 'success');
    await Promise.all([loadTeacherAssignments(), refreshScheduleWorkspace()]);
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    renderCargaControls();
  }
}

function setScheduleMode(mode) {
  state.scheduleMode = mode;
  $$('.mode-tab').forEach((button) => {
    const active = button.dataset.scheduleMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const subjectsMode = mode === 'subjects';
  $('#schedule-controls').hidden = subjectsMode;
  $('#schedule-grid-container').hidden = subjectsMode;
  $('#subjects-by-semester').hidden = !subjectsMode;
  $('#schedule-group-field').hidden = mode !== 'group';
  $('#schedule-teacher-field').hidden = mode !== 'teacher';
  $('#schedule-assignment-field').hidden = subjectsMode;
  if (subjectsMode) {
    renderSemesterSubjects();
  } else {
    refreshScheduleWorkspace();
  }
}

function renderSemesterSubjects() {
  const body = $('#semester-subjects-body');
  const rows = state.catalogs.materias ?? [];
  body.innerHTML = rows.length
    ? rows.map((item) => `<tr><td>${escapeHtml(item.semestre)}°</td><td>${escapeHtml(item.nombre_materia)}</td><td>${escapeHtml(item.nombre_academia ?? '—')}</td><td>${Number(item.horas)} h</td></tr>`).join('')
    : '<tr><td colspan="4" class="empty-row">No hay materias para este periodo.</td></tr>';
}

function renderScheduleFilters() {
  fillSelect($('#schedule-group-select'), state.catalogs.grupos ?? [], 'id_grupo', (item) => `${item.nombre_grupo} · ${item.turno_descripcion}`, 'Selecciona grupo');
  fillSelect($('#schedule-teacher-select'), state.catalogs.docentes ?? [], 'id_docente', (item) => item.nombre_completo, 'Selecciona docente');
}

async function refreshScheduleWorkspace() {
  if (!state.catalogs || state.scheduleMode === 'subjects') {
    return;
  }
  renderScheduleFilters();
  const selector = state.scheduleMode === 'group' ? $('#schedule-group-select') : $('#schedule-teacher-select');
  const filterId = Number(selector.value);
  if (!filterId) {
    $('#schedule-assignment-select').innerHTML = '<option value="">No hay asignaciones disponibles</option>';
    $('#schedule-context').textContent = '';
    renderScheduleGrid(null);
    return;
  }

  try {
    const queryKey = state.scheduleMode === 'group' ? 'grupoId' : 'docenteId';
    const assignments = await requestJson(`/api/asignaciones?semesterId=${state.semesterId}&${queryKey}=${filterId}`);
    state.scheduleAssignments = assignments;
    const selectedAssignment = $('#schedule-assignment-select').value;
    fillSelect(
      $('#schedule-assignment-select'),
      assignments,
      'id_asignacion',
      (item) => `${item.docente_nombre} · ${item.nombre_materia} · ${item.grupo}`,
      'Selecciona asignación',
      selectedAssignment
    );

    const grid = await requestJson(`/api/horario/grid?semesterId=${state.semesterId}&${queryKey}=${filterId}`);
    state.scheduleGrid = grid;
    const selected = assignments.find((item) => String(item.id_asignacion) === $('#schedule-assignment-select').value);
    $('#schedule-context').textContent = selected
      ? `${selected.docente_nombre} · ${selected.nombre_materia} · ${selected.grupo}`
      : `${assignments.length} ${assignments.length === 1 ? 'asignación disponible' : 'asignaciones disponibles'}`;
    renderScheduleGrid(grid);
  } catch (error) {
    showMessage(error.message, 'error');
    renderScheduleGrid(null);
  }
}

function sortBlocksByTime(blocks) {
  return [...blocks].sort((left, right) => String(left.hora_inicio).localeCompare(String(right.hora_inicio)));
}

function renderScheduleGrid(grid) {
  if (!grid || !grid.bloques?.length) {
    scheduleGrid.innerHTML = '<p class="empty-state">Selecciona un grupo o docente para consultar la retícula.</p>';
    return;
  }
  const days = grid.dias ?? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const assignmentId = Number($('#schedule-assignment-select').value ?? 0);
  const cells = new Map((grid.celdas ?? []).map((item) => [`${item.id_bloque}:${item.dia_semana}`, item]));
  const blocks = sortBlocksByTime(grid.bloques);
  let body = '';
  let previousTurn = null;

  for (const block of blocks) {
    const code = String(block.codigo_bloque ?? '');
    const currentTurn = Number(block.id_turno);
    if ((code === 'M4' || code === 'V4') && previousTurn === currentTurn) {
      const pause = code === 'M4' ? '09:30–09:50 · Receso' : '16:30–16:50 · Receso';
      body += `<tr class="break-row"><th scope="row">${pause}</th><td colspan="5">Receso</td></tr>`;
    }
    previousTurn = currentTurn;
    const start = String(block.hora_inicio).slice(0, 5);
    const end = String(block.hora_fin).slice(0, 5);
    const blockLabel = `${escapeHtml(code)} · ${escapeHtml(start)}–${escapeHtml(end)}`;
    body += `<tr><th scope="row" class="time-cell">${blockLabel}</th>`;
    for (const day of days) {
      const item = cells.get(`${block.id_bloque}:${day}`);
      if (item) {
        const sameAssignment = Number(item.id_asignacion) === assignmentId;
        body += `<td><button class="schedule-cell is-occupied${sameAssignment ? ' is-selected-assignment' : ''}" type="button" data-day="${escapeHtml(day)}" data-block="${Number(block.id_bloque)}" data-assignment="${Number(item.id_asignacion)}" aria-label="${escapeHtml(day)}, ${blockLabel}: ${escapeHtml(item.docente_nombre)}, ${escapeHtml(item.nombre_materia)}"><strong>${escapeHtml(item.docente_nombre)}</strong><span>${escapeHtml(item.nombre_materia)}</span><small>${escapeHtml(item.nombre_grupo)}</small></button></td>`;
      } else {
        body += `<td><button class="schedule-cell is-open" type="button" data-day="${escapeHtml(day)}" data-block="${Number(block.id_bloque)}" aria-label="Asignar ${escapeHtml(day)} ${blockLabel}" ${!assignmentId || !selectedSemesterIsEditable() ? 'disabled' : ''}><span class="cell-add" aria-hidden="true">+</span><span class="visually-hidden">Asignar</span></button></td>`;
      }
    }
    body += '</tr>';
  }

  scheduleGrid.innerHTML = `<table class="schedule-table"><thead><tr><th scope="col">Hora</th>${days.map((day) => `<th scope="col">${escapeHtml(day)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  if (!selectedSemesterIsEditable()) {
    scheduleGrid.querySelectorAll('.schedule-cell').forEach((cell) => { cell.disabled = true; });
  }
}

async function toggleScheduleCell(button) {
  if (!selectedSemesterIsEditable()) {
    showMessage('El periodo está en consulta; no se pueden modificar horarios.', 'warning');
    return;
  }
  const assignmentId = Number($('#schedule-assignment-select').value);
  if (!assignmentId) {
    showMessage('Selecciona primero una asignación docente.', 'warning');
    return;
  }
  button.disabled = true;
  try {
    const response = await requestJson('/api/horario', {
      method: 'POST',
      body: JSON.stringify({
        id_semestre: Number(state.semesterId),
        id_asignacion: assignmentId,
        dia_semana: button.dataset.day,
        id_bloque: Number(button.dataset.block),
      }),
    });
    showMessage(response.message, 'success');
    await refreshScheduleWorkspace();
  } catch (error) {
    showMessage(error.message, 'error');
    button.disabled = false;
  }
}

function renderCatalogSelection() {
  const previous = $('#catalog-select').value;
  $('#catalog-select').innerHTML = Object.entries(catalogDefinitions)
    .map(([key, definition]) => `<option value="${key}">${escapeHtml(definition.label)}</option>`)
    .join('');
  if (catalogDefinitions[previous]) {
    $('#catalog-select').value = previous;
  }
}

function catalogEndpoint(definition) {
  if (definition.catalogAll) {
    return `${definition.endpoint}?all=1`;
  }
  return definition.semesterScoped
    ? `${definition.endpoint}?semesterId=${encodeURIComponent(state.semesterId)}`
    : definition.endpoint;
}

async function loadCatalogRows(key = $('#catalog-select').value) {
  const definition = catalogDefinitions[key];
  if (!definition) {
    return;
  }
  state.catalogDescriptor = definition;
  $('#catalog-description').textContent = definition.label;
  try {
    state.catalogRows = await requestJson(catalogEndpoint(definition));
    state.catalogPage = 0;
    state.catalogSort = { key: null, direction: 1 };
    state.selectedCatalogId = null;
    $('#catalog-new').hidden = !definition.mutable;
    $('#catalog-edit').hidden = !definition.mutable;
    $('#catalog-delete').hidden = !definition.mutable;
    $('#catalog-delete').textContent = definition.softDelete ? 'Dar de baja' : 'Eliminar';
    renderCatalogFieldOptions();
    renderCatalogTable();
  } catch (error) {
    state.catalogRows = [];
    state.selectedCatalogId = null;
    renderCatalogTable();
    showMessage(error.message, 'error');
  }
}

function renderCatalogFieldOptions() {
  const columns = state.catalogDescriptor?.columns ?? [];
  $('#catalog-field').innerHTML = columns
    .map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)
    .join('');
}

function filteredCatalogRows() {
  const query = normalizeText($('#catalog-search').value.trim());
  const field = $('#catalog-field').value;
  let rows = state.catalogRows.filter((row) => !query || normalizeText(row[field]).includes(query));
  const { key, direction } = state.catalogSort;
  if (key) {
    rows = [...rows].sort((left, right) => {
      const leftValue = left[key] ?? '';
      const rightValue = right[key] ?? '';
      const leftNumber = Number(leftValue);
      const rightNumber = Number(rightValue);
      const comparison = Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
        ? leftNumber - rightNumber
        : String(leftValue).localeCompare(String(rightValue), 'es', { sensitivity: 'base' });
      return comparison * direction;
    });
  }
  return rows;
}

function renderCatalogTable() {
  const definition = state.catalogDescriptor;
  const head = $('#catalog-table-head');
  const body = $('#catalog-table-body');
  if (!definition) {
    head.innerHTML = '';
    body.innerHTML = '<tr><td class="empty-row">Selecciona un catálogo.</td></tr>';
    return;
  }
  const columns = definition.columns;
  head.innerHTML = `<tr><th class="select-column" scope="col">Sel.</th>${columns.map(([key, label]) => `<th scope="col"><button class="sort-button" type="button" data-sort="${escapeHtml(key)}">${escapeHtml(label)}${state.catalogSort.key === key ? (state.catalogSort.direction > 0 ? ' ↑' : ' ↓') : ''}</button></th>`).join('')}</tr>`;

  const filtered = filteredCatalogRows();
  const pageCount = Math.max(1, Math.ceil(filtered.length / state.catalogPageSize));
  state.catalogPage = Math.min(state.catalogPage, pageCount - 1);
  const start = state.catalogPage * state.catalogPageSize;
  const pageRows = filtered.slice(start, start + state.catalogPageSize);
  body.innerHTML = pageRows.length
    ? pageRows.map((row) => {
      const idKey = definition.idKey ?? columns[0][0];
      const rowId = String(row[idKey] ?? '');
      const checked = state.selectedCatalogId === rowId ? 'checked' : '';
      return `<tr><td class="select-column"><input type="checkbox" class="catalog-row-select" value="${escapeHtml(rowId)}" ${checked} aria-label="Seleccionar ${escapeHtml(rowId)}"></td>${columns.map(([key]) => `<td>${escapeHtml(row[key] ?? '—')}</td>`).join('')}</tr>`;
    }).join('')
    : `<tr><td class="empty-row" colspan="${columns.length + 1}">No hay coincidencias.</td></tr>`;

  $('#catalog-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}`;
  $('#catalog-page-label').textContent = `Página ${state.catalogPage + 1} de ${pageCount}`;
  $('#catalog-prev').disabled = state.catalogPage === 0;
  $('#catalog-next').disabled = state.catalogPage >= pageCount - 1;
  $('#catalog-edit').disabled = !state.selectedCatalogId;
  $('#catalog-delete').disabled = !state.selectedCatalogId;
}

function exportCatalogCsv() {
  const rows = filteredCatalogRows();
  const columns = state.catalogDescriptor?.columns ?? [];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const content = [columns.map(([, label]) => quote(label)).join(','), ...rows.map((row) => columns.map(([key]) => quote(row[key])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${state.catalogDescriptor?.label ?? 'catalogo'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderCatalogEditor(record = {}) {
  const definition = state.catalogDescriptor;
  if (!definition?.mutable) {
    return;
  }
  $('#catalog-editor-title').textContent = state.catalogEditorId ? `Editar ${definition.label.toLocaleLowerCase('es')}` : `Nuevo ${definition.label.toLocaleLowerCase('es')}`;
  const fields = definition.fields.map((field) => {
    const value = record[field.sourceKey ?? field.key] ?? '';
    const isRequired = field.required && !(field.key === 'password' && state.catalogEditorId !== null);
    const attributes = `${isRequired ? 'required' : ''} ${field.maxLength ? `maxlength="${field.maxLength}"` : ''} ${field.minLength ? `minlength="${field.minLength}"` : ''} ${field.min !== undefined ? `min="${field.min}"` : ''} ${field.max !== undefined ? `max="${field.max}"` : ''}`;
    if (field.type === 'select') {
      const options = field.options
        ? field.options.map(([optionValue, label]) => `<option value="${escapeHtml(optionValue)}" ${String(value) === String(optionValue) ? 'selected' : ''}>${escapeHtml(label)}</option>`)
        : (state.catalogs[field.source] ?? []).map((item) => `<option value="${escapeHtml(item[field.valueKey])}" ${String(value) === String(item[field.valueKey]) ? 'selected' : ''}>${escapeHtml(item[field.labelKey])}</option>`);
      return `<label>${escapeHtml(field.label)}<select name="${escapeHtml(field.key)}" ${attributes}><option value="">Selecciona</option>${options.join('')}</select></label>`;
    }
    return `<label>${escapeHtml(field.label)}<input name="${escapeHtml(field.key)}" type="${field.type}" value="${escapeHtml(value)}" ${attributes}></label>`;
  });
  $('#catalog-editor-fields').innerHTML = fields.join('');
  catalogDialog.showModal();
}

async function saveCatalogRecord(event) {
  event.preventDefault();
  const definition = state.catalogDescriptor;
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  for (const field of definition.fields) {
    if (field.type === 'number' || field.type === 'select' && field.valueKey) {
      payload[field.key] = payload[field.key] === '' && !field.required ? null : Number(payload[field.key]);
    }
  }
  const editing = state.catalogEditorId !== null;
  if (editing && $('#catalog-select').value === 'usuarios' && !payload.password) {
    delete payload.password;
  }
  if ($('#catalog-select').value === 'docentes') {
    const appointment = Number(payload.horas_nombramiento);
    const release = Number(payload.horas_descarga);
    if (appointment < 0 || appointment > 40 || release < 0 || release > 10 || release > appointment) {
      showMessage('Verifica las horas: nombramiento máximo 40, descarga máximo 10 y descarga no mayor al nombramiento.', 'error');
      return;
    }
  }
  if ($('#catalog-select').value === 'grupos') {
    payload.tipo_semestre = Number(payload.semestre) % 2 === 0 ? 'P' : 'N';
  }
  const url = editing ? `${definition.endpoint}/${state.catalogEditorId}` : definition.endpoint;
  try {
    const result = await requestJson(url, { method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload) });
    catalogDialog.close();
    showMessage(result?.message ?? 'Cambios guardados.', 'success');
    await loadCatalogs();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

async function deleteCatalogRecord() {
  const definition = state.catalogDescriptor;
  if (!definition?.mutable || !state.selectedCatalogId) {
    return;
  }
  const deleteVerb = definition.softDelete ? 'dar de baja' : 'eliminar';
  if (!window.confirm(`¿${deleteVerb[0].toLocaleUpperCase('es')}${deleteVerb.slice(1)} ${definition.label.toLocaleLowerCase('es')} seleccionado?`)) {
    return;
  }
  try {
    await requestJson(`${definition.endpoint}/${state.selectedCatalogId}`, { method: 'DELETE' });
    state.selectedCatalogId = null;
    showMessage('Registro eliminado.', 'success');
    await loadCatalogs();
  } catch (error) {
    showMessage(error.message, 'error');
  }
}

function activateWorkspace(name) {
  $$('.workspace-tab').forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.workspace-view').forEach((panel) => {
    const active = panel.id === `view-${name}`;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
  if (name === 'schedule') {
    refreshScheduleWorkspace();
  }
  if (name === 'catalogs' && !state.catalogDescriptor) {
    loadCatalogRows($('#catalog-select').value);
  }
}

function bindEvents() {
  semesterSelect.addEventListener('change', async () => {
    state.semesterId = Number(semesterSelect.value);
    try {
      await loadCatalogs();
      showMessage('Periodo actualizado.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  });

  $$('.workspace-tab').forEach((button) => button.addEventListener('click', () => activateWorkspace(button.dataset.view)));
  $$('.mode-tab').forEach((button) => button.addEventListener('click', () => setScheduleMode(button.dataset.scheduleMode)));

  teacherSelect.addEventListener('change', () => {
    state.teacherHours = null;
    renderCargaControls();
    loadTeacherAssignments();
  });
  subjectSelect.addEventListener('change', () => {
    const selectedSubject = state.catalogs.materias?.find((item) => String(item.id_materia) === subjectSelect.value);
    const selectedGroup = state.catalogs.grupos?.find((item) => String(item.id_grupo) === groupSelect.value);
    if (selectedSubject && selectedGroup && Number(selectedSubject.semestre) !== Number(selectedGroup.semestre)) {
      groupSelect.value = '';
    }
    renderCargaControls();
  });
  groupSelect.addEventListener('change', () => {
    const selectedSubject = state.catalogs.materias?.find((item) => String(item.id_materia) === subjectSelect.value);
    const selectedGroup = state.catalogs.grupos?.find((item) => String(item.id_grupo) === groupSelect.value);
    if (selectedSubject && selectedGroup && Number(selectedSubject.semestre) !== Number(selectedGroup.semestre)) {
      subjectSelect.value = '';
    }
    renderCargaControls();
  });
  turnFilter.addEventListener('change', renderCargaControls);
  specialtyFilter.addEventListener('change', renderCargaControls);
  $('#assignment-form').addEventListener('submit', submitCarga);

  $('#schedule-group-select').addEventListener('change', refreshScheduleWorkspace);
  $('#schedule-teacher-select').addEventListener('change', refreshScheduleWorkspace);
  $('#schedule-assignment-select').addEventListener('change', refreshScheduleWorkspace);
  scheduleGrid.addEventListener('click', (event) => {
    const button = event.target.closest('.schedule-cell');
    if (button) {
      toggleScheduleCell(button);
    }
  });

  $('#catalog-select').addEventListener('change', () => loadCatalogRows($('#catalog-select').value));
  $('#catalog-search').addEventListener('input', () => { state.catalogPage = 0; renderCatalogTable(); });
  $('#catalog-field').addEventListener('change', renderCatalogTable);
  $('#catalog-filter').addEventListener('click', () => { state.catalogPage = 0; renderCatalogTable(); });
  $('#catalog-clear').addEventListener('click', () => {
    $('#catalog-search').value = '';
    state.catalogPage = 0;
    renderCatalogTable();
  });
  $('#catalog-table-head').addEventListener('click', (event) => {
    const button = event.target.closest('[data-sort]');
    if (!button) return;
    const key = button.dataset.sort;
    state.catalogSort = { key, direction: state.catalogSort.key === key ? -state.catalogSort.direction : 1 };
    renderCatalogTable();
  });
  $('#catalog-table-body').addEventListener('change', (event) => {
    if (!event.target.matches('.catalog-row-select')) return;
    state.selectedCatalogId = event.target.checked ? event.target.value : null;
    $$('.catalog-row-select').forEach((checkbox) => {
      if (checkbox !== event.target) checkbox.checked = false;
    });
    renderCatalogTable();
  });
  $('#catalog-prev').addEventListener('click', () => {
    state.catalogPage = Math.max(0, state.catalogPage - 1);
    renderCatalogTable();
  });
  $('#catalog-next').addEventListener('click', () => {
    state.catalogPage += 1;
    renderCatalogTable();
  });
  $('#catalog-export').addEventListener('click', exportCatalogCsv);
  $('#catalog-print').addEventListener('click', () => window.print());
  $('#catalog-new').addEventListener('click', () => {
    state.catalogEditorId = null;
    renderCatalogEditor();
  });
  $('#catalog-edit').addEventListener('click', () => {
    const definition = state.catalogDescriptor;
    const row = state.catalogRows.find((item) => String(item[definition.idKey]) === state.selectedCatalogId);
    if (!row) return;
    state.catalogEditorId = state.selectedCatalogId;
    renderCatalogEditor(row);
  });
  $('#catalog-delete').addEventListener('click', deleteCatalogRecord);
  $('#catalog-editor-form').addEventListener('submit', saveCatalogRecord);
  $('#catalog-editor-cancel').addEventListener('click', () => catalogDialog.close());
  $('#catalog-editor-dismiss').addEventListener('click', () => catalogDialog.close());
}

async function bootstrap() {
  bindEvents();
  try {
    const [semesters, session] = await Promise.all([
      requestJson('/api/semestres'),
      requestJson('/api/session/semestre'),
    ]);
    state.semesters = semesters;
    state.semesterId = session.activeSemesterId ?? semesters.find((item) => Number(item.id_status) === 1)?.id_semestre ?? semesters[0]?.id_semestre;
    if (!state.semesterId) {
      throw new Error('No hay periodos escolares configurados.');
    }
    await loadCatalogs();
    renderCatalogSelection();
    await loadCatalogRows($('#catalog-select').value);
  } catch (error) {
    console.error(error);
    showMessage(`No se pudo cargar la configuración inicial: ${error.message}`, 'error');
  }
}

bootstrap();
