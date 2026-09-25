const semesterSelect = document.getElementById('semester-select');
const teacherSelect = document.getElementById('teacher-select');
const subjectSelect = document.getElementById('subject-select');
const groupSelect = document.getElementById('group-select');
const scheduleTeacherSelect = document.getElementById('schedule-teacher-select');
const scheduleSubjectSelect = document.getElementById('schedule-subject-select');
const scheduleGroupSelect = document.getElementById('schedule-group-select');
const blockSelect = document.getElementById('block-select');
const teacherForm = document.getElementById('teacher-form');
const scheduleForm = document.getElementById('schedule-form');
const scheduleTableBody = document.getElementById('schedule-table-body');
const summaryChip = document.getElementById('summary-chip');

let appData = {
  activeSemesterId: 1,
  semestres: [],
  turnos: [],
  bloques: [],
  docentes: [],
  materias: [],
  grupos: [],
  horario: []
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message ?? 'La solicitud falló.');
  }

  return response.json();
}

function renderSemesterOptions() {
  semesterSelect.innerHTML = appData.semestres
    .map((semester) => `<option value="${semester.id_semestre}">${semester.nombre_semestre}</option>`)
    .join('');

  semesterSelect.value = String(appData.activeSemesterId ?? appData.semestres[0]?.id_semestre ?? '');
}

function renderCatalogOptions() {
  teacherSelect.innerHTML = appData.docentes
    .map((docente) => `<option value="${docente.id_docente}">${docente.nombre}</option>`)
    .join('');

  scheduleTeacherSelect.innerHTML = appData.docentes
    .map((docente) => `<option value="${docente.id_docente}">${docente.nombre}</option>`)
    .join('');

  subjectSelect.innerHTML = appData.materias
    .map((materia) => `<option value="${materia.id_materia}">${materia.nombre_materia}</option>`)
    .join('');

  scheduleSubjectSelect.innerHTML = appData.materias
    .map((materia) => `<option value="${materia.id_materia}">${materia.nombre_materia}</option>`)
    .join('');

  groupSelect.innerHTML = appData.grupos
    .map((grupo) => `<option value="${grupo.id_grupo}">${grupo.nombre_grupo}</option>`)
    .join('');

  scheduleGroupSelect.innerHTML = appData.grupos
    .map((grupo) => `<option value="${grupo.id_grupo}">${grupo.nombre_grupo}</option>`)
    .join('');

  blockSelect.innerHTML = appData.bloques
    .map((bloque) => `<option value="${bloque.id_bloque}">${bloque.codigo_bloque} (${bloque.hora_inicio} - ${bloque.hora_fin})</option>`)
    .join('');
}

function renderScheduleRows() {
  if (!appData.horario.length) {
    scheduleTableBody.innerHTML = '<tr><td colspan="5">No hay registros para este semestre.</td></tr>';
    summaryChip.textContent = '0 registros';
    return;
  }

  const rows = appData.horario.map((item) => {
    const docente = appData.docentes.find((d) => d.id_docente === item.id_docente);
    const materia = appData.materias.find((m) => m.id_materia === item.id_materia);
    const grupo = appData.grupos.find((g) => g.id_grupo === item.id_grupo);
    const bloque = appData.bloques.find((b) => b.id_bloque === item.id_bloque);

    return `
      <tr>
        <td>${docente ? docente.nombre : item.id_docente}</td>
        <td>${materia ? materia.nombre_materia : item.id_materia}</td>
        <td>${grupo ? grupo.nombre_grupo : item.id_grupo}</td>
        <td>${item.dia_semana}</td>
        <td>${bloque ? `${bloque.codigo_bloque} (${bloque.hora_inicio}-${bloque.hora_fin})` : item.id_bloque}</td>
      </tr>
    `;
  });

  scheduleTableBody.innerHTML = rows.join('');
  summaryChip.textContent = `${appData.horario.length} registros`;
}

async function refreshCatalogs() {
  const data = await fetchJson(`/api/catalogos?semesterId=${semesterSelect.value}`);
  appData = { ...appData, ...data };
  renderSemesterOptions();
  renderCatalogOptions();
  renderScheduleRows();
}

semesterSelect.addEventListener('change', async () => {
  try {
    await fetchJson('/api/session/semestre', {
      method: 'POST',
      body: JSON.stringify({ semesterId: Number(semesterSelect.value) })
    });
    await refreshCatalogs();
  } catch (error) {
    alert(error.message);
  }
});

teacherForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    id_docente: Number(teacherSelect.value),
    id_materia: Number(subjectSelect.value),
    id_grupo: Number(groupSelect.value),
    id_semestre: Number(semesterSelect.value),
    dia_semana: 'Lunes',
    id_bloque: Number(blockSelect.value),
    horas: 2
  };

  try {
    const response = await fetchJson('/api/horario', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(response.message);
    await refreshCatalogs();
  } catch (error) {
    alert(error.message);
  }
});

scheduleForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    id_docente: Number(scheduleTeacherSelect.value),
    id_grupo: Number(scheduleGroupSelect.value),
    id_materia: Number(scheduleSubjectSelect.value),
    id_semestre: Number(semesterSelect.value),
    dia_semana: document.getElementById('day-select').value,
    id_bloque: Number(blockSelect.value),
    horas: 2
  };

  try {
    const response = await fetchJson('/api/horario', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(response.message);
    await refreshCatalogs();
  } catch (error) {
    alert(error.message);
  }
});

async function bootstrap() {
  try {
    const semesters = await fetchJson('/api/semestres');
    const active = await fetchJson('/api/session/semestre');
    appData.semestres = semesters;
    appData.activeSemesterId = active.activeSemesterId ?? semesters[0]?.id_semestre ?? 1;

    await refreshCatalogs();
  } catch (error) {
    console.error(error);
    alert('No se pudo cargar la configuración inicial del sistema.');
  }
}

bootstrap();
