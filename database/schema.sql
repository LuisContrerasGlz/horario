CREATE DATABASE IF NOT EXISTS `sis_doc` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `sis_doc`;

CREATE TABLE IF NOT EXISTS `turno` (
  `id_turno` INT NOT NULL AUTO_INCREMENT,
  `nombre_turno` VARCHAR(50) NOT NULL,
  PRIMARY KEY (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `bloque_horario` (
  `id_bloque` INT NOT NULL AUTO_INCREMENT,
  `codigo_bloque` VARCHAR(10) NOT NULL UNIQUE,
  `id_turno` INT NOT NULL,
  `hora_inicio` TIME NOT NULL,
  `hora_fin` TIME NOT NULL,
  `orden` INT NOT NULL,
  PRIMARY KEY (`id_bloque`),
  KEY `fk_bloque_turno` (`id_turno`),
  CONSTRAINT `fk_bloque_turno` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `semestre` (
  `id_semestre` INT NOT NULL AUTO_INCREMENT,
  `nombre_semestre` VARCHAR(100) NOT NULL,
  `tipo_semestre` CHAR(1) NOT NULL CHECK (`tipo_semestre` IN ('P', 'N')),
  `activo` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_semestre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `materia` (
  `id_materia` INT NOT NULL AUTO_INCREMENT,
  `nombre_materia` VARCHAR(120) NOT NULL,
  `tipo_semestre` CHAR(1) NOT NULL CHECK (`tipo_semestre` IN ('P', 'N')),
  PRIMARY KEY (`id_materia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `grupo` (
  `id_grupo` INT NOT NULL AUTO_INCREMENT,
  `nombre_grupo` VARCHAR(20) NOT NULL,
  `tipo_semestre` CHAR(1) NOT NULL CHECK (`tipo_semestre` IN ('P', 'N')),
  PRIMARY KEY (`id_grupo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `docente` (
  `id_docente` INT NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(150) NOT NULL,
  `horas_nombramiento` INT NOT NULL DEFAULT 0,
  `horas_descarga` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_docente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `carga_docente` (
  `id_carga` INT NOT NULL AUTO_INCREMENT,
  `id_semestre` INT NOT NULL,
  `id_docente` INT NOT NULL,
  `id_materia` INT NOT NULL,
  `id_grupo` INT NOT NULL,
  `horas_semana` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_carga`),
  KEY `fk_carga_semestre` (`id_semestre`),
  KEY `fk_carga_docente` (`id_docente`),
  KEY `fk_carga_materia` (`id_materia`),
  KEY `fk_carga_grupo` (`id_grupo`),
  CONSTRAINT `fk_carga_semestre` FOREIGN KEY (`id_semestre`) REFERENCES `semestre` (`id_semestre`),
  CONSTRAINT `fk_carga_docente` FOREIGN KEY (`id_docente`) REFERENCES `docente` (`id_docente`),
  CONSTRAINT `fk_carga_materia` FOREIGN KEY (`id_materia`) REFERENCES `materia` (`id_materia`),
  CONSTRAINT `fk_carga_grupo` FOREIGN KEY (`id_grupo`) REFERENCES `grupo` (`id_grupo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `horario_detalle` (
  `id_horario` INT NOT NULL AUTO_INCREMENT,
  `id_semestre` INT NOT NULL,
  `id_docente` INT NOT NULL,
  `id_grupo` INT NOT NULL,
  `id_materia` INT NOT NULL,
  `dia_semana` VARCHAR(20) NOT NULL,
  `id_bloque` INT NOT NULL,
  `horas` INT NOT NULL DEFAULT 2,
  PRIMARY KEY (`id_horario`),
  KEY `fk_horario_semestre` (`id_semestre`),
  KEY `fk_horario_docente` (`id_docente`),
  KEY `fk_horario_grupo` (`id_grupo`),
  KEY `fk_horario_materia` (`id_materia`),
  KEY `fk_horario_bloque` (`id_bloque`),
  CONSTRAINT `fk_horario_semestre` FOREIGN KEY (`id_semestre`) REFERENCES `semestre` (`id_semestre`),
  CONSTRAINT `fk_horario_docente` FOREIGN KEY (`id_docente`) REFERENCES `docente` (`id_docente`),
  CONSTRAINT `fk_horario_grupo` FOREIGN KEY (`id_grupo`) REFERENCES `grupo` (`id_grupo`),
  CONSTRAINT `fk_horario_materia` FOREIGN KEY (`id_materia`) REFERENCES `materia` (`id_materia`),
  CONSTRAINT `fk_horario_bloque` FOREIGN KEY (`id_bloque`) REFERENCES `bloque_horario` (`id_bloque`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
