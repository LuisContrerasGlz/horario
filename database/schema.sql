-- Esquema de sis_doc según el dump de referencia sis_doc bd.sql.
-- Este archivo crea objetos para una base nueva; no es una migración.
CREATE DATABASE IF NOT EXISTS `sis_doc` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `sis_doc`;

CREATE TABLE IF NOT EXISTS `status` (
  `id_status` int(20) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) NOT NULL,
  PRIMARY KEY (`id_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tipo_usuario` (
  `id_tipo_usuario` int(20) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(200) NOT NULL,
  PRIMARY KEY (`id_tipo_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `turno` (
  `id_turno` int(11) NOT NULL AUTO_INCREMENT,
  `Descripcion` varchar(100) NOT NULL,
  PRIMARY KEY (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `centro_trabajo` (
  `id_cct` int(11) NOT NULL AUTO_INCREMENT,
  `CCT` varchar(10) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  PRIMARY KEY (`id_cct`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `especialidad` (
  `id_especialidad` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_especialidad` varchar(100) NOT NULL,
  `nombre_corto` varchar(20) NOT NULL,
  `id_cct` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_especialidad`),
  KEY `fk_especialidad_centro_trabajo` (`id_cct`),
  CONSTRAINT `fk_especialidad_centro_trabajo` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `academia` (
  `id_academia` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_academia` varchar(100) NOT NULL,
  `nombre_corto` varchar(10) NOT NULL,
  `id_especialidad` int(11) DEFAULT NULL,
  `id_cct` int(11) DEFAULT NULL,
  `id_status` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_academia`),
  KEY `fk_academia_ct` (`id_cct`),
  KEY `fk_academia_status` (`id_status`),
  KEY `id_especialidad` (`id_especialidad`),
  CONSTRAINT `fk_academia_ct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  CONSTRAINT `fk_academia_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`),
  CONSTRAINT `id_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id_especialidad`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `semestre` (
  `id_semestre` int(11) NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(100) NOT NULL,
  `fecha_inicio` date NOT NULL DEFAULT current_timestamp(),
  `fecha_fin` date NOT NULL DEFAULT current_timestamp(),
  `id_cct` int(11) NOT NULL,
  `id_status` int(11) NOT NULL,
  `tipo_semestre` enum('P','N') NOT NULL DEFAULT 'P',
  PRIMARY KEY (`id_semestre`),
  KEY `fk_semestre_ct` (`id_cct`),
  KEY `fk_semestre_status` (`id_status`),
  CONSTRAINT `fk_semestre_ct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  CONSTRAINT `fk_semestre_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `docente` (
  `id_docente` int(11) NOT NULL AUTO_INCREMENT,
  `RFC` varchar(13) NOT NULL,
  `Nombre` varchar(100) NOT NULL,
  `Apellido_pat` varchar(100) NOT NULL,
  `Apellido_mat` varchar(100) DEFAULT NULL,
  `Perfil` text DEFAULT NULL,
  `correo_e` varchar(100) DEFAULT NULL,
  `Telefono` varchar(100) DEFAULT NULL,
  `horas_nombramiento` int(11) NOT NULL DEFAULT 0,
  `horas_descarga` int(11) NOT NULL DEFAULT 0,
  `id_turno` int(11) NOT NULL,
  `id_cct` int(11) NOT NULL,
  `id_status` int(11) NOT NULL,
  PRIMARY KEY (`id_docente`),
  KEY `fk_docente_turnp` (`id_turno`),
  KEY `fk_docente_cct` (`id_cct`),
  KEY `fk_docente_status` (`id_status`),
  CONSTRAINT `fk_docente_cct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  CONSTRAINT `fk_docente_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`),
  CONSTRAINT `fk_docente_turnp` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `materia` (
  `id_materia` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `nombre_corto` varchar(20) NOT NULL,
  `semestre` int(11) NOT NULL,
  `horas` int(11) NOT NULL,
  `tipo_semestre` varchar(1) DEFAULT NULL,
  `id_academia` int(11) DEFAULT NULL,
  `id_status` int(11) NOT NULL,
  `id_cct` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_materia`),
  KEY `fk_materia_status` (`id_status`),
  KEY `fk_materia_academia` (`id_academia`),
  KEY `fk_materia_cct` (`id_cct`),
  CONSTRAINT `fk_materia_academia` FOREIGN KEY (`id_academia`) REFERENCES `academia` (`id_academia`),
  CONSTRAINT `fk_materia_cct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  CONSTRAINT `fk_materia_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `grupo` (
  `id_grupo` int(11) NOT NULL AUTO_INCREMENT,
  `semestre` int(11) NOT NULL,
  `grupo` varchar(10) NOT NULL,
  `id_especialidad` int(11) NOT NULL,
  `id_cct` int(11) NOT NULL,
  `id_turno` int(11) NOT NULL,
  `tipo_semestre` varchar(1) NOT NULL,
  PRIMARY KEY (`id_grupo`),
  KEY `fk_grupo_cct` (`id_cct`),
  KEY `fk_grupo_turno` (`id_turno`),
  KEY `fk_grupo_especialidad` (`id_especialidad`),
  CONSTRAINT `fk_grupo_cct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  CONSTRAINT `fk_grupo_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id_especialidad`),
  CONSTRAINT `fk_grupo_turno` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `bloque_horario` (
  `id_bloque` int(11) NOT NULL AUTO_INCREMENT,
  `codigo_bloque` varchar(10) NOT NULL,
  `id_turno` int(11) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `orden` int(11) NOT NULL,
  PRIMARY KEY (`id_bloque`),
  UNIQUE KEY `codigo_bloque` (`codigo_bloque`),
  KEY `fk_bloque_turno` (`id_turno`),
  CONSTRAINT `fk_bloque_turno` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `asignacion_docente` (
  `id_asignacion` int(11) NOT NULL AUTO_INCREMENT,
  `id_semestre` int(11) NOT NULL,
  `id_docente` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `id_grupo` int(11) NOT NULL,
  PRIMARY KEY (`id_asignacion`),
  UNIQUE KEY `uk_asignacion_docente` (`id_semestre`,`id_docente`,`id_materia`,`id_grupo`),
  KEY `fk_asignacion_semestre` (`id_semestre`),
  KEY `fk_asignacion_docente` (`id_docente`),
  KEY `fk_asignacion_materia` (`id_materia`),
  KEY `fk_asignacion_grupo` (`id_grupo`),
  CONSTRAINT `fk_asignacion_docente` FOREIGN KEY (`id_docente`) REFERENCES `docente` (`id_docente`),
  CONSTRAINT `fk_asignacion_grupo` FOREIGN KEY (`id_grupo`) REFERENCES `grupo` (`id_grupo`),
  CONSTRAINT `fk_asignacion_materia` FOREIGN KEY (`id_materia`) REFERENCES `materia` (`id_materia`),
  CONSTRAINT `fk_asignacion_semestre` FOREIGN KEY (`id_semestre`) REFERENCES `semestre` (`id_semestre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `horario_detalle` (
  `id_horario` int(11) NOT NULL AUTO_INCREMENT,
  `id_asignacion` int(11) NOT NULL,
  `dia_semana` enum('Lunes','Martes','Miercoles','Jueves','Viernes') NOT NULL,
  `id_bloque` int(11) NOT NULL,
  PRIMARY KEY (`id_horario`),
  UNIQUE KEY `uk_asignacion_dia_bloque` (`id_asignacion`,`dia_semana`,`id_bloque`),
  KEY `fk_horario_asignacion` (`id_asignacion`),
  KEY `fk_horario_bloque` (`id_bloque`),
  CONSTRAINT `fk_horario_asignacion` FOREIGN KEY (`id_asignacion`) REFERENCES `asignacion_docente` (`id_asignacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_horario_bloque` FOREIGN KEY (`id_bloque`) REFERENCES `bloque_horario` (`id_bloque`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `usuario` (
  `id_usuario` int(20) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `correo_electronico` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `tipo_usuario` int(20) NOT NULL,
  `status` int(20) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `id_ct` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  KEY `FK_usuarios_tipo` (`tipo_usuario`),
  KEY `FK_usuarios_status` (`status`),
  KEY `fk_usuario_ct` (`id_ct`),
  CONSTRAINT `FK_usuarios_status` FOREIGN KEY (`status`) REFERENCES `status` (`id_status`),
  CONSTRAINT `FK_usuarios_tipo` FOREIGN KEY (`tipo_usuario`) REFERENCES `tipo_usuario` (`id_tipo_usuario`),
  CONSTRAINT `fk_usuario_ct` FOREIGN KEY (`id_ct`) REFERENCES `centro_trabajo` (`id_cct`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE OR REPLACE VIEW `vista_academias` AS
SELECT a.id_academia, a.nombre_academia, a.nombre_corto, ct.id_cct, ct.Nombre AS centro_trabajo,
       s.id_status, s.descripcion AS status_academia, e.id_especialidad,
       e.nombre_especialidad, e.nombre_corto AS nombre_corto_especialidad
  FROM academia a
  LEFT JOIN centro_trabajo ct ON a.id_cct = ct.id_cct
  LEFT JOIN status s ON a.id_status = s.id_status
  LEFT JOIN especialidad e ON a.id_especialidad = e.id_especialidad;

CREATE OR REPLACE VIEW `vista_docente` AS
SELECT d.id_docente, d.RFC, d.Nombre, d.Apellido_pat, d.Apellido_mat,
       CONCAT(d.Apellido_pat, ' ', COALESCE(d.Apellido_mat, ''), ' ', d.Nombre) AS nombre_completo,
       d.Perfil, d.correo_e, d.Telefono, d.horas_nombramiento, d.horas_descarga,
       d.id_turno, d.id_cct, t.Descripcion AS turno, c.Nombre AS centro_trabajo,
       d.id_status, st.descripcion AS status
  FROM docente d
  LEFT JOIN turno t ON d.id_turno = t.id_turno
  LEFT JOIN centro_trabajo c ON d.id_cct = c.id_cct
  LEFT JOIN status st ON d.id_status = st.id_status;

CREATE OR REPLACE VIEW `vista_grupos` AS
SELECT g.id_grupo, g.grupo, g.semestre, g.tipo_semestre,
       e.id_especialidad, e.nombre_especialidad, e.nombre_corto AS especialidad_corta,
       ct.id_cct, ct.CCT, ct.Nombre AS centro_trabajo, t.id_turno, t.Descripcion AS turno
  FROM grupo g
  LEFT JOIN especialidad e ON g.id_especialidad = e.id_especialidad
  LEFT JOIN centro_trabajo ct ON g.id_cct = ct.id_cct
  LEFT JOIN turno t ON g.id_turno = t.id_turno
 ORDER BY g.grupo ASC;

CREATE OR REPLACE VIEW `vista_materias` AS
SELECT m.id_materia, m.nombre AS nombre_materia, m.nombre_corto, m.semestre, m.horas,
       m.tipo_semestre, a.id_academia, a.nombre_academia, a.nombre_corto AS academia_corto,
       s.id_status, s.descripcion AS status_materia, m.id_cct
  FROM materia m
  LEFT JOIN academia a ON m.id_academia = a.id_academia
  LEFT JOIN status s ON m.id_status = s.id_status;

CREATE OR REPLACE VIEW `vista_semestre` AS
SELECT s.id_semestre, s.descripcion AS descripcion_semestre, s.fecha_inicio, s.fecha_fin,
       s.tipo_semestre, ct.id_cct, ct.CCT, ct.Nombre AS nombre_centro_trabajo,
       st.id_status, st.descripcion AS descripcion_status
  FROM semestre s
  JOIN centro_trabajo ct ON s.id_cct = ct.id_cct
  JOIN status st ON s.id_status = st.id_status;

CREATE OR REPLACE VIEW `vista_asignacion_docente` AS
SELECT ad.id_asignacion, ad.id_semestre, s.descripcion AS semestre,
       ad.id_docente, vd.nombre_completo AS nombre_docente, ad.id_materia,
       m.nombre AS nombre_materia, m.horas AS horas_materia, ad.id_grupo,
       CONCAT(g.semestre, '° ', g.grupo) AS grupo
  FROM asignacion_docente ad
  JOIN semestre s ON ad.id_semestre = s.id_semestre
  JOIN vista_docente vd ON ad.id_docente = vd.id_docente
  JOIN materia m ON ad.id_materia = m.id_materia
  LEFT JOIN grupo g ON ad.id_grupo = g.id_grupo;

DELIMITER $$
CREATE PROCEDURE `sp_insertar_grupo` (
  IN `p_semestre` int,
  IN `p_grupo` varchar(10),
  IN `p_id_especialidad` int,
  IN `p_id_cct` int,
  IN `p_id_turno` int
)
BEGIN
  DECLARE v_tipo_semestre varchar(1);

  IF NOT EXISTS (SELECT 1 FROM especialidad WHERE id_especialidad = p_id_especialidad) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'id_especialidad no existe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM centro_trabajo WHERE id_cct = p_id_cct) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'id_cct no existe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM turno WHERE id_turno = p_id_turno) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'id_turno no existe';
  END IF;

  SET v_tipo_semestre = IF(MOD(p_semestre, 2) = 0, 'P', 'N');
  INSERT INTO grupo (semestre, grupo, id_especialidad, id_cct, id_turno, tipo_semestre)
  VALUES (p_semestre, p_grupo, p_id_especialidad, p_id_cct, p_id_turno, v_tipo_semestre);
END$$
DELIMITER ;
