export function createDemoStore() {
    return {
        semestres: [
            { id_semestre: 1, nombre_semestre: 'Agosto 2026 - Enero 2027', tipo_semestre: 'P', activo: true },
            { id_semestre: 2, nombre_semestre: 'Febrero 2027 - Julio 2027', tipo_semestre: 'N', activo: false }
        ],
        turnos: [
            { id_turno: 1, nombre_turno: 'Matutino' },
            { id_turno: 2, nombre_turno: 'Vespertino' }
        ],
        bloques: [
            { id_bloque: 1, codigo_bloque: 'M1', id_turno: 1, hora_inicio: '07:00', hora_fin: '08:00', orden: 1 },
            { id_bloque: 2, codigo_bloque: 'M2', id_turno: 1, hora_inicio: '08:00', hora_fin: '09:00', orden: 2 },
            { id_bloque: 3, codigo_bloque: 'M3', id_turno: 1, hora_inicio: '09:00', hora_fin: '10:00', orden: 3 },
            { id_bloque: 4, codigo_bloque: 'V1', id_turno: 2, hora_inicio: '13:00', hora_fin: '14:00', orden: 1 },
            { id_bloque: 5, codigo_bloque: 'V2', id_turno: 2, hora_inicio: '14:00', hora_fin: '15:00', orden: 2 },
            { id_bloque: 6, codigo_bloque: 'V3', id_turno: 2, hora_inicio: '15:00', hora_fin: '16:00', orden: 3 }
        ],
        docentes: [
            { id_docente: 1, nombre: 'Mtra. Ana López', horas_nombramiento: 20, horas_descarga: 4 },
            { id_docente: 2, nombre: 'Ing. Carlos Ruiz', horas_nombramiento: 18, horas_descarga: 3 },
            { id_docente: 3, nombre: 'Lic. Beatriz Silva', horas_nombramiento: 18, horas_descarga: 2 }
        ],
        materias: [
            { id_materia: 10, nombre_materia: 'Matemáticas II', tipo_semestre: 'P' },
            { id_materia: 11, nombre_materia: 'Física I', tipo_semestre: 'N' },
            { id_materia: 12, nombre_materia: 'Química III', tipo_semestre: 'P' },
            { id_materia: 13, nombre_materia: 'Historia de México', tipo_semestre: 'N' }
        ],
        grupos: [
            { id_grupo: 20, nombre_grupo: '601', tipo_semestre: 'P' },
            { id_grupo: 21, nombre_grupo: '602', tipo_semestre: 'P' },
            { id_grupo: 22, nombre_grupo: '501', tipo_semestre: 'N' },
            { id_grupo: 23, nombre_grupo: '502', tipo_semestre: 'N' }
        ],
        horario: [
            { id_horario: 1, id_semestre: 1, id_docente: 1, id_grupo: 20, id_materia: 10, dia_semana: 'Lunes', id_bloque: 1, horas: 2 },
            { id_horario: 2, id_semestre: 1, id_docente: 2, id_grupo: 21, id_materia: 12, dia_semana: 'Martes', id_bloque: 4, horas: 2 }
        ]
    };
}
export function getActiveSemesterId(store) {
    return store.semestres.find((semester) => semester.activo)?.id_semestre ?? store.semestres[0]?.id_semestre ?? 1;
}
export function filterBySemesterType(items, semesterType) {
    return items.filter((item) => item.tipo_semestre === semesterType);
}
//# sourceMappingURL=demo-data.js.map