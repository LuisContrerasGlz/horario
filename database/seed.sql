USE `sis_doc`;

-- Datos de referencia no personales. El dump completo contiene docentes y
-- usuarios reales; no se duplica esa información en el seed de desarrollo.
INSERT INTO `status` (`id_status`, `descripcion`) VALUES
  (1, 'Activo'),
  (2, 'Inactivo'),
  (3, 'Suspendido'),
  (4, 'Pendiente'),
  (5, 'Baja')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`);

INSERT INTO `tipo_usuario` (`id_tipo_usuario`, `descripcion`) VALUES
  (1, 'Super Administrador'),
  (2, 'Administrador'),
  (3, 'Captura'),
  (4, 'Docente')
ON DUPLICATE KEY UPDATE `descripcion` = VALUES(`descripcion`);

INSERT INTO `turno` (`id_turno`, `Descripcion`) VALUES
  (1, 'Matutino'),
  (2, 'Vespertino'),
  (3, 'Mixto')
ON DUPLICATE KEY UPDATE `Descripcion` = VALUES(`Descripcion`);

INSERT INTO `centro_trabajo` (`id_cct`, `CCT`, `Nombre`) VALUES
  (1, '01DCT0004C', 'CETIS 155')
ON DUPLICATE KEY UPDATE `CCT` = VALUES(`CCT`), `Nombre` = VALUES(`Nombre`);

INSERT INTO `especialidad` (`id_especialidad`, `nombre_especialidad`, `nombre_corto`, `id_cct`) VALUES
  (1, 'BASICAS', 'BAS', 1),
  (2, 'FORMACION PARA EL TRABAJO', 'FORM TRAB', 1),
  (3, 'OPTATIVA', 'OPTATIVA', 1)
ON DUPLICATE KEY UPDATE
  `nombre_especialidad` = VALUES(`nombre_especialidad`),
  `nombre_corto` = VALUES(`nombre_corto`),
  `id_cct` = VALUES(`id_cct`);

INSERT INTO `academia` (`id_academia`, `nombre_academia`, `nombre_corto`, `id_especialidad`, `id_cct`, `id_status`) VALUES
  (1, 'MATEMATICAS', 'MAT', 1, 1, 1),
  (3, 'PROGRAMACION', 'PROG', 2, 1, 1),
  (4, 'MANTENIMIENTO AUTOMOTRIZ', 'MAN AUT', 2, 1, 1),
  (5, 'ADMINISTRACION DE RECURSOS HUMANOS', 'ADM REC HU', 2, 1, 1),
  (6, 'SOPORTE Y MANTENIMIENTO DE EQUIPO DE COMPUTO', 'SOP EQ COM', 2, 1, 1),
  (7, 'PENSAMIENTO MATEMATICO', 'PEN MAT', 1, 1, 1),
  (8, 'LENGUA Y COMUNICACION', 'LEN COM', 1, 1, 1),
  (9, 'LENGUA EXTRANJERA', 'LEN EXT', 1, 1, 1),
  (10, 'CIENCIAS NATURALES EXPERIMENTALES Y TECNOLOGIA', 'CIEN NAT E', 1, 1, 1),
  (11, 'CULTURA DIGITAL', 'CUL DIG', 1, 1, 1),
  (12, 'HUMANIDADES', 'HUM', 1, 1, 1),
  (13, 'BIOLGIA', 'BIO', 1, 1, 1),
  (14, 'FISICA', 'FIS', 1, 1, 1),
  (15, 'CIENCIAS SOCIALES', 'CIENC SOC', 1, 1, 1),
  (17, 'SIN ACADEMIA', 'SIN ACAD', 3, 1, 1)
ON DUPLICATE KEY UPDATE
  `nombre_academia` = VALUES(`nombre_academia`),
  `nombre_corto` = VALUES(`nombre_corto`),
  `id_especialidad` = VALUES(`id_especialidad`),
  `id_cct` = VALUES(`id_cct`),
  `id_status` = VALUES(`id_status`);

INSERT INTO `bloque_horario` (`id_bloque`, `codigo_bloque`, `id_turno`, `hora_inicio`, `hora_fin`, `orden`) VALUES
  (1, 'M1', 1, '07:00:00', '07:50:00', 1),
  (2, 'M2', 1, '07:50:00', '08:40:00', 2),
  (3, 'M3', 1, '08:40:00', '09:30:00', 3),
  (4, 'M4', 1, '09:50:00', '10:40:00', 4),
  (5, 'M5', 1, '10:40:00', '11:30:00', 5),
  (6, 'M6', 1, '11:30:00', '12:20:00', 6),
  (7, 'M7', 1, '12:20:00', '13:10:00', 7),
  (8, 'M8', 1, '13:10:00', '14:00:00', 8),
  (9, 'V1', 2, '14:00:00', '14:50:00', 1),
  (10, 'V2', 2, '14:50:00', '15:40:00', 2),
  (11, 'V3', 2, '15:40:00', '16:30:00', 3),
  (12, 'V4', 2, '16:50:00', '17:40:00', 4),
  (13, 'V5', 2, '17:40:00', '18:30:00', 5),
  (14, 'V6', 2, '18:30:00', '19:20:00', 6),
  (15, 'V7', 2, '19:20:00', '20:10:00', 7),
  (16, 'V8', 2, '20:10:00', '21:00:00', 8)
ON DUPLICATE KEY UPDATE
  `id_turno` = VALUES(`id_turno`),
  `hora_inicio` = VALUES(`hora_inicio`),
  `hora_fin` = VALUES(`hora_fin`),
  `orden` = VALUES(`orden`);

INSERT INTO `semestre` (`id_semestre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `id_cct`, `id_status`, `tipo_semestre`) VALUES
  (1, 'Agosto 2025 - Enero 2026', '2025-09-01', '2026-01-16', 1, 2, 'N'),
  (2, 'Febrero 2026 - Julio 2026', '2026-02-02', '2026-07-10', 1, 1, 'P')
ON DUPLICATE KEY UPDATE
  `descripcion` = VALUES(`descripcion`),
  `fecha_inicio` = VALUES(`fecha_inicio`),
  `fecha_fin` = VALUES(`fecha_fin`),
  `id_cct` = VALUES(`id_cct`),
  `id_status` = VALUES(`id_status`),
  `tipo_semestre` = VALUES(`tipo_semestre`);
