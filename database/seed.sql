USE `sis_doc`;

INSERT INTO `turno` (`id_turno`, `nombre_turno`) VALUES
  (1, 'Matutino'),
  (2, 'Vespertino')
ON DUPLICATE KEY UPDATE `nombre_turno` = VALUES(`nombre_turno`);

INSERT INTO `bloque_horario` (`id_bloque`, `codigo_bloque`, `id_turno`, `hora_inicio`, `hora_fin`, `orden`) VALUES
  (1, 'M1', 1, '07:00', '08:00', 1),
  (2, 'M2', 1, '08:00', '09:00', 2),
  (3, 'M3', 1, '09:00', '10:00', 3),
  (4, 'V1', 2, '13:00', '14:00', 1),
  (5, 'V2', 2, '14:00', '15:00', 2),
  (6, 'V3', 2, '15:00', '16:00', 3)
ON DUPLICATE KEY UPDATE `codigo_bloque` = VALUES(`codigo_bloque`), `hora_inicio` = VALUES(`hora_inicio`), `hora_fin` = VALUES(`hora_fin`), `orden` = VALUES(`orden`);

INSERT INTO `semestre` (`id_semestre`, `nombre_semestre`, `tipo_semestre`, `activo`) VALUES
  (1, 'Agosto 2026 - Enero 2027', 'P', 1),
  (2, 'Febrero 2027 - Julio 2027', 'N', 0)
ON DUPLICATE KEY UPDATE `nombre_semestre` = VALUES(`nombre_semestre`), `tipo_semestre` = VALUES(`tipo_semestre`), `activo` = VALUES(`activo`);

INSERT INTO `materia` (`id_materia`, `nombre_materia`, `tipo_semestre`) VALUES
  (10, 'Matemáticas II', 'P'),
  (11, 'Física I', 'N'),
  (12, 'Química III', 'P'),
  (13, 'Historia de México', 'N')
ON DUPLICATE KEY UPDATE `nombre_materia` = VALUES(`nombre_materia`), `tipo_semestre` = VALUES(`tipo_semestre`);

INSERT INTO `grupo` (`id_grupo`, `nombre_grupo`, `tipo_semestre`) VALUES
  (20, '601', 'P'),
  (21, '602', 'P'),
  (22, '501', 'N'),
  (23, '502', 'N')
ON DUPLICATE KEY UPDATE `nombre_grupo` = VALUES(`nombre_grupo`), `tipo_semestre` = VALUES(`tipo_semestre`);

INSERT INTO `docente` (`id_docente`, `nombre`, `horas_nombramiento`, `horas_descarga`) VALUES
  (1, 'Mtra. Ana López', 20, 4),
  (2, 'Ing. Carlos Ruiz', 18, 3),
  (3, 'Lic. Beatriz Silva', 18, 2)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `horas_nombramiento` = VALUES(`horas_nombramiento`), `horas_descarga` = VALUES(`horas_descarga`);

INSERT INTO `carga_docente` (`id_carga`, `id_semestre`, `id_docente`, `id_materia`, `id_grupo`, `horas_semana`) VALUES
  (1, 1, 1, 10, 20, 6),
  (2, 1, 2, 12, 21, 4)
ON DUPLICATE KEY UPDATE `id_semestre` = VALUES(`id_semestre`), `id_docente` = VALUES(`id_docente`), `id_materia` = VALUES(`id_materia`), `id_grupo` = VALUES(`id_grupo`), `horas_semana` = VALUES(`horas_semana`);

INSERT INTO `horario_detalle` (`id_horario`, `id_semestre`, `id_docente`, `id_grupo`, `id_materia`, `dia_semana`, `id_bloque`, `horas`) VALUES
  (1, 1, 1, 20, 10, 'Lunes', 1, 2),
  (2, 1, 2, 21, 12, 'Martes', 4, 2)
ON DUPLICATE KEY UPDATE `id_semestre` = VALUES(`id_semestre`), `id_docente` = VALUES(`id_docente`), `id_grupo` = VALUES(`id_grupo`), `id_materia` = VALUES(`id_materia`), `dia_semana` = VALUES(`dia_semana`), `id_bloque` = VALUES(`id_bloque`), `horas` = VALUES(`horas`);
