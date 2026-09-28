-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 28-09-2026 a las 22:55:42
-- Versión del servidor: 10.4.28-MariaDB
-- Versión de PHP: 8.1.17

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `sis_doc`
--

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_insertar_grupo` (IN `p_semestre` INT, IN `p_grupo` VARCHAR(10), IN `p_id_especialidad` INT, IN `p_id_cct` INT, IN `p_id_turno` INT)   BEGIN

    DECLARE v_tipo_semestre VARCHAR(1);

    -- Validar especialidad
    IF NOT EXISTS (
        SELECT 1
        FROM especialidad
        WHERE id_especialidad = p_id_especialidad
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'id_especialidad no existe';
    END IF;

    -- Validar centro de trabajo
    IF NOT EXISTS (
        SELECT 1
        FROM centro_trabajo
        WHERE id_cct = p_id_cct
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'id_cct no existe';
    END IF;

    -- Validar turno
    IF NOT EXISTS (
        SELECT 1
        FROM turno
        WHERE id_turno = p_id_turno
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'id_turno no existe';
    END IF;

    -- Calcular tipo de semestre
    SET v_tipo_semestre =
        IF(MOD(p_semestre, 2) = 0, 'P', 'N');

    INSERT INTO grupo (
        semestre,
        grupo,
        id_especialidad,
        id_cct,
        id_turno,
        tipo_semestre
    )
    VALUES (
        p_semestre,
        p_grupo,
        p_id_especialidad,
        p_id_cct,
        p_id_turno,
        v_tipo_semestre
    );

END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `academia`
--

CREATE TABLE `academia` (
  `id_academia` int(11) NOT NULL,
  `nombre_academia` varchar(100) NOT NULL,
  `nombre_corto` varchar(10) NOT NULL,
  `id_especialidad` int(11) DEFAULT NULL,
  `id_cct` int(11) DEFAULT NULL,
  `id_status` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `academia`
--

INSERT INTO `academia` (`id_academia`, `nombre_academia`, `nombre_corto`, `id_especialidad`, `id_cct`, `id_status`) VALUES
(1, 'MATEMATICAS', 'MAT', 5, 1, 1),
(3, 'PROGRAMACION', 'PROG', 1, 1, 1),
(4, 'MANTENIMIENTO AUTOMOTRIZ', 'MAN AUT', 3, 1, 1),
(5, 'ADMINISTRACION DE RECURSOS HUMANOS', 'ADM REC HU', 4, 1, 1),
(6, 'SOPORTE Y MANTENIMIENTO DE EQUIPO DE COMPUTO', 'SOP EQ COM', 2, 1, 1),
(7, 'PENSAMIENTO MATEMATICO', 'PEN MAT', 5, 1, 1),
(8, 'LENGUA Y COMUNICACION', 'LEN COM', 5, 1, 1),
(9, 'LENGUA EXTRANJERA', 'LEN EXT', 5, 1, 1),
(10, 'CIENCIAS NATURALES EXPERIMENTALES Y TECNOLOGIA', 'CIEN NAT E', 5, 1, 1),
(11, 'CULTURA DIGITAL', 'CUL DIG', 5, 1, 1),
(12, 'HUMANIDADES', 'HUM', 5, 1, 1),
(13, 'BIOLGIA', 'BIO', 5, 1, 1),
(14, 'FISICA', 'FIS', 5, 1, 1),
(15, 'CIENCIAS SOCIALES', 'CIENC SOC', 5, 1, 1),
(17, 'SIN ACADEMIA', 'SIN ACAD', 5, 1, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `asignacion_docente`
--

CREATE TABLE `asignacion_docente` (
  `id_asignacion` int(11) NOT NULL,
  `id_semestre` int(11) NOT NULL,
  `id_docente` int(11) NOT NULL,
  `id_materia` int(11) NOT NULL,
  `id_grupo` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bloque_horario`
--

CREATE TABLE `bloque_horario` (
  `id_bloque` int(11) NOT NULL,
  `codigo_bloque` varchar(10) NOT NULL,
  `id_turno` int(11) NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `orden` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `bloque_horario`
--

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
(16, 'V8', 2, '20:10:00', '21:00:00', 8);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `centro_trabajo`
--

CREATE TABLE `centro_trabajo` (
  `id_cct` int(11) NOT NULL,
  `CCT` varchar(10) NOT NULL,
  `Nombre` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `centro_trabajo`
--

INSERT INTO `centro_trabajo` (`id_cct`, `CCT`, `Nombre`) VALUES
(1, '01DCT0004C', 'CETIS 155'),
(2, '01DCTXXXXX', 'PRUEBA');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `docente`
--

CREATE TABLE `docente` (
  `id_docente` int(11) NOT NULL,
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
  `id_status` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `docente`
--

INSERT INTO `docente` (`id_docente`, `RFC`, `Nombre`, `Apellido_pat`, `Apellido_mat`, `Perfil`, `correo_e`, `Telefono`, `horas_nombramiento`, `horas_descarga`, `id_turno`, `id_cct`, `id_status`) VALUES
(1, 'AAMP600211E43', 'PEDRO', 'ALCALA', 'MARTINEZ', 'M', 'alcalapedro@hotmail.com', '4491514748', 0, 0, 1, 1, 1),
(2, 'AEDL710625ST0', 'LUZ AURORA', 'ALENCASTRO', 'DURON', 'I', 'e_dusa@hotmail.com', '4491099168', 0, 0, 3, 1, 1),
(3, 'BAMC7409035Q3', 'CARMEN ROSALBA', 'BARBA', 'MACIAS', 'I', 'rosalba.barba@hotmail.com', '4491141784', 0, 0, 3, 1, 1),
(4, 'COMA5812092Z5', 'ARTURO', 'CORONA', 'MONTES', 'M', 'anlope85@hotmail.com', '4492321141', 0, 0, 1, 1, 1),
(5, 'DIVG880109DG9', 'GERARDO JESUS', 'DIAZ', 'VELA', 'V', 'gerardo.diaz.vela@gmail.com', '4492094476', 0, 0, 2, 1, 1),
(6, 'DILM771216LS9', 'MARCELA ESTHELA', 'DIAZ', 'LIMON', 'M', 'markiela3012@hotmail.com', '', 0, 0, 1, 1, 1),
(7, 'DOLP721020I52', 'PEDRO', 'DOMINGUEZ', 'LOPEZ', 'M', 'yopedro72@live.com.mx', '', 0, 0, 1, 1, 1),
(8, 'DUME680417TW0', 'ELBA ELIZABETH', 'DURON', 'MACIAS', 'I', 'eliz_duron@yahoo.com.mx', '', 0, 0, 3, 1, 1),
(9, 'LOOF691212ECA', 'FABIOLA GUADALUPE', 'LOPEZ', 'OCHOA', 'M', 'fabilupis@yahoo.com.mx', '4491094794', 0, 0, 1, 1, 1),
(10, 'BACM8210133S9', 'MARTHA ELIZABETH', 'BRAMBILA', 'CASTILLO', 'M', 'vicky23222008@hotmail.com', '', 0, 0, 1, 1, 1),
(11, 'MEGG690303RM4', 'MA. GUADALUPE', 'MENDOZA', 'GONZALEZ', 'V', 'mendozgl@gmail.com', '', 0, 0, 2, 1, 1),
(12, 'MOAL6303017G8', 'MA. LETICIA', 'MORALES', 'ACOSTA', 'I', 'mariel_shell@hotmail.com', '4491787136', 0, 0, 3, 1, 1),
(13, 'MOEU640726VB1', 'URIEL', 'MORALES', 'ELIAS', 'M', 'urimoraeli@hotmail.com', '4491378997', 0, 0, 1, 1, 1),
(15, 'JAPA8009252M9', 'AMIRA', 'JAUREGUI', 'PEREZ', 'DRA', 'eriosparra@yahoo.com', '449 999 9999', 0, 0, 2, 1, 5),
(16, 'ROSP820128EC7', 'PAMELA VIRIDIANA', 'ROBLEDO', 'SAMANO', 'M', 'pamikitty@hotmail.com', '', 0, 0, 1, 1, 1),
(17, 'CAMJ840102S86', 'JANETTE DEL ROSARIO', 'CAMPOS', 'M RQUEZ', 'M', 'cecilia_1309@hotmail.com', '4492310718', 0, 0, 1, 1, 1),
(18, 'TITA670625G21', 'ANABEL', 'TRINIDAD', 'TRINIDAD', 'M', 'aniytt@yahoo.com.mx', '4493000488', 0, 0, 1, 1, 1),
(19, 'CAOM630224RI5', 'MARICELA', 'CAMACHO', 'OVALLE', 'I', 'urzana660@yahoo.com.mx', '', 0, 0, 3, 1, 1),
(20, 'LUGJ921118NZA', 'JUAN MANUEL', 'LUEVANO', 'GOMEZ', 'I', 'vhas58@hotmail.com', '', 0, 0, 3, 1, 1),
(21, 'CACJ670802F64', 'J. ANGEL', 'CARRANZA', 'CARLIN', 'M', 'carranzacarlinl.angel@yahoo.com', '', 0, 0, 1, 1, 1),
(23, 'COAJ810226E94', 'JOSEFINA', 'CONTRERAS', 'ARRIAGA', 'M', 'yulery@hotmail.com', '4491827174', 0, 0, 1, 1, 1),
(24, 'CORM6410047G9', 'MARTIN', 'CONTRERAS', 'ROMO', 'V', 'conromo64@hotmail.com', '4491118793', 40, 10, 2, 1, 1),
(25, 'TOSJ641125R23', 'JAIME', 'DE LA TORRE', 'SIFUENTES', 'I', 'jaimerutilio@msn.com', '4491981786', 0, 0, 3, 1, 1),
(26, '', ' ALBERTO', 'QUEZADA', ' VAZQUEZ', 'I', 'maester56@hotmail.com', '4491027162', 0, 0, 3, 1, 1),
(27, 'HEMA631216DV8', 'MARIA ALICIA', 'HERNANDEZ', 'MORAN', 'V', 'aliferic@yahoo.com.mx', '', 0, 0, 2, 1, 1),
(28, 'MOOA840616DAA', 'ANA LAURA', 'MONTES', 'ORTEGA', 'M', 'anylu38@hotmail.com', '', 0, 0, 1, 1, 1),
(29, '', 'ARY ISRAEL', 'HERNANDEZ', 'LAZCANO', 'I', 'marcolino.nava@gmail.com', '4491556989', 0, 0, 3, 1, 1),
(30, '', 'SERGIO LUIS', 'PALACIO', 'IBARROLA', 'V', '', '', 0, 0, 2, 1, 1),
(32, 'ROTB620901N91', 'BERNARDO', 'RODRIGUEZ', 'TAPIA', 'V', 'joseph-pozos@hotmail.com', '4491735905', 0, 0, 2, 1, 1),
(33, 'ROGH7601068V4', 'HILDA LUCIA', 'RODRIGUEZ', 'GOMEZ', 'V', 'hildardz76@hotmail.com', '', 0, 0, 2, 1, 1),
(34, 'ROES620528EKA', 'SERGIO ENRIQUE', 'ROMERO', 'ESCOBOSA', 'I', 'serenrique62@gmail.com', '4491107054', 0, 0, 3, 1, 1),
(35, 'QUGK801111UA3', 'KARLA ALEJANDRA', 'QUEZADA', 'GALVAN', 'V', '', '', 0, 0, 2, 1, 1),
(36, 'VARL7107197Z8', 'LAURA', 'VARGAS', 'RIVERA', 'V', '', '4492128801', 0, 0, 2, 1, 1),
(37, 'LODG7107077T2', 'GUILLERMO', 'LOPEZ', 'DIEGO', 'M', 'guillermo_l_d@hotmail.com', '', 0, 0, 1, 1, 1),
(38, '', 'JANELY ANAYENZI', 'GARCIA', 'QUIROZ', 'I', '', '', 0, 0, 3, 1, 1),
(39, 'AASP9308261U8', 'PRISCILA GABRIELA', 'ANDRADE', 'SANCHEZ', 'V', '', '', 0, 0, 2, 1, 1),
(40, '', 'ERNESTO ROMEO', 'GARIBAY', 'MARTINEZ', 'V', '', '', 0, 0, 2, 1, 1),
(41, '', 'VICTOR HUGO', 'MARIN', 'RAMIREZ', 'I', '', '', 0, 0, 3, 1, 1),
(42, '', 'FABIOLA GUADALUPE', 'ARELLANO', 'RANGEL', 'V', '', '', 0, 0, 2, 1, 1),
(43, '', 'MARIA GUADALUPE', 'MANCILLA', 'ROMO', 'V', '', '', 0, 0, 2, 1, 1),
(44, 'AESC999999', 'CARLOS ALBERTO', 'ACEVEDO', 'SANCHEZ', 'contador', 'aec@gmail.com', '449 999 9999', 0, 0, 1, 1, 1),
(45, 'FORV999999TTT', 'VERONICA DEL ROCIO', 'FLORES', 'REYES', 'M', 'fovr@gmail.com', '449 999 9999', 0, 0, 1, 1, 1),
(46, '', 'LETICIA ANGELICA', 'LEDESMA', 'ESPINOZA', 'M', '', '', 0, 0, 1, 1, 1),
(47, '', 'ERIKA LILIANA', 'PADILLA', 'CONTRERAS', 'V', '', '', 0, 0, 2, 1, 1),
(48, '', 'MANUEL', 'TRINIDAD', 'RODRIGUEZ', 'V', '', '', 0, 0, 2, 1, 1),
(49, '', 'MAYRA', 'GUERRERO', 'ARROYO', '', '', '', 0, 0, 1, 1, 1),
(53, '', 'TERESA', 'MORALES', 'ESPARZA', 'M', '', '', 0, 0, 1, 1, 1),
(54, '', 'JOSE FERNANDO', 'MONTANTES', 'CASTA EDA', 'V', '', '', 0, 0, 2, 1, 1),
(55, 'MOSR8707093VA', 'ROSA ARCELIA', 'MONTOYA', 'SANTOYO', 'V', '', '', 0, 0, 2, 1, 1),
(56, '', 'OSCAR EDUARDO', 'ORNELAS', 'URZ A', 'M', '', '', 0, 0, 1, 1, 1),
(59, '', 'DAVID', 'ACOSTA', 'MARQUEZ', 'V', '', '', 0, 0, 2, 1, 1),
(64, '', 'LUIS MANUEL', 'RAMOS', 'SANDOVAL', '', '', '', 0, 0, 1, 1, 1),
(70, '', 'JANELY ANAYENZI', 'GARCIA', 'QUIROZ', '', '', '', 0, 0, 1, 1, 1),
(71, '', 'URIEL', 'MORALES', 'ELIAS', 'V', '', '', 0, 0, 2, 1, 1),
(72, '', 'KARLA CECILIA', 'ACEVEDO', 'MORENO', 'V', '', '', 0, 0, 2, 1, 1),
(75, '', 'FERNANDO MISAEL', 'PEREZ', 'HERNANDEZ', 'V', '', '', 0, 0, 2, 1, 1),
(89, '', 'FATIMA ENEDINA', 'SABAD', 'ROSALES', 'I', '', '', 0, 0, 3, 1, 1),
(90, '', ' OMAR GUADALUPE', 'CLAUDIO', 'GOMEZ', 'I', '', '', 0, 0, 3, 1, 1),
(95, 'cct2', 'cct 2', 'cct 2', 'cct 2', 'prueba de cct 2 ', 'cct2@gmail.com', '449 999 9999', 0, 0, 1, 2, 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `especialidad`
--

CREATE TABLE `especialidad` (
  `id_especialidad` int(11) NOT NULL,
  `nombre_especialidad` varchar(100) NOT NULL,
  `nombre_corto` varchar(20) NOT NULL,
  `id_cct` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `especialidad`
--

INSERT INTO `especialidad` (`id_especialidad`, `nombre_especialidad`, `nombre_corto`, `id_cct`) VALUES
(1, 'PROGRAMACION', 'PROG', 1),
(2, 'SOPORTE Y MTTO. EQ. COMP.', 'SOP.M.E.C', 1),
(3, 'MANTENIMIENTO AUTOMOTRIZ', 'MTTO.AUT.', 1),
(4, 'ADMINISTRACION DE RRHH', 'ARH', 1),
(5, 'BASICAS', 'BAS', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `grupo`
--

CREATE TABLE `grupo` (
  `id_grupo` int(11) NOT NULL,
  `semestre` int(11) NOT NULL,
  `grupo` varchar(10) NOT NULL,
  `id_especialidad` int(11) NOT NULL,
  `id_cct` int(11) NOT NULL,
  `id_turno` int(11) NOT NULL,
  `tipo_semestre` varchar(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `grupo`
--

INSERT INTO `grupo` (`id_grupo`, `semestre`, `grupo`, `id_especialidad`, `id_cct`, `id_turno`, `tipo_semestre`) VALUES
(1, 1, 'A', 1, 1, 1, 'N'),
(2, 1, 'G', 1, 1, 2, 'N'),
(3, 1, 'B', 2, 1, 1, 'N'),
(4, 1, 'H', 2, 1, 2, 'N'),
(5, 2, 'A', 1, 1, 1, 'P'),
(6, 2, 'B', 2, 1, 1, 'P'),
(7, 1, 'C', 2, 1, 1, 'N'),
(8, 3, 'A', 1, 1, 1, 'N'),
(9, 5, 'A', 1, 1, 1, 'N'),
(10, 1, 'D', 4, 1, 1, 'N'),
(11, 1, 'E', 4, 1, 1, 'N'),
(12, 1, 'F', 3, 1, 1, 'N'),
(13, 1, 'I', 3, 1, 2, 'N'),
(14, 1, 'J', 3, 1, 2, 'N'),
(15, 1, 'K', 4, 1, 2, 'N'),
(16, 1, 'L', 4, 1, 2, 'N'),
(17, 2, 'C', 2, 1, 1, 'P'),
(18, 2, 'D', 4, 1, 1, 'P'),
(19, 2, 'E', 4, 1, 1, 'P'),
(20, 2, 'F', 3, 1, 1, 'P'),
(21, 2, 'G', 1, 1, 2, 'P'),
(22, 2, 'H', 2, 1, 2, 'P'),
(23, 2, 'I', 3, 1, 2, 'P'),
(24, 2, 'J', 3, 1, 2, 'P'),
(25, 2, 'K', 4, 1, 2, 'P'),
(26, 2, 'L', 4, 1, 2, 'P'),
(27, 3, 'B', 2, 1, 1, 'N'),
(28, 3, 'C', 2, 1, 1, 'N'),
(29, 3, 'D', 4, 1, 1, 'N'),
(30, 3, 'E', 4, 1, 1, 'N'),
(31, 3, 'F', 3, 1, 1, 'N'),
(32, 3, 'G', 1, 1, 2, 'N'),
(33, 3, 'H', 2, 1, 2, 'N'),
(34, 3, 'I', 3, 1, 2, 'N'),
(35, 3, 'J', 3, 1, 2, 'N'),
(36, 3, 'K', 4, 1, 2, 'N'),
(37, 3, 'L', 4, 1, 2, 'N'),
(38, 5, 'B', 2, 1, 1, 'N'),
(39, 5, 'C', 2, 1, 1, 'N'),
(40, 5, 'D', 4, 1, 1, 'N'),
(41, 5, 'E', 4, 1, 1, 'N'),
(42, 5, 'F', 3, 1, 1, 'N'),
(43, 5, 'G', 1, 1, 2, 'N'),
(44, 5, 'H', 2, 1, 2, 'N'),
(45, 5, 'I', 3, 1, 2, 'N'),
(46, 5, 'J', 3, 1, 2, 'N'),
(47, 5, 'K', 4, 1, 2, 'N'),
(48, 5, 'L', 3, 1, 2, 'N'),
(49, 4, 'A', 1, 1, 1, 'P');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `horario_detalle`
--

CREATE TABLE `horario_detalle` (
  `id_horario` int(11) NOT NULL,
  `id_asignacion` int(11) NOT NULL,
  `dia_semana` enum('Lunes','Martes','Miercoles','Jueves','Viernes') NOT NULL,
  `id_bloque` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `materia`
--

CREATE TABLE `materia` (
  `id_materia` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `nombre_corto` varchar(20) NOT NULL,
  `semestre` int(11) NOT NULL,
  `horas` int(11) NOT NULL,
  `tipo_semestre` enum('P','N') NOT NULL,
  `id_academia` int(11) DEFAULT NULL,
  `id_status` int(11) NOT NULL,
  `id_cct` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `materia`
--

INSERT INTO `materia` (`id_materia`, `nombre`, `nombre_corto`, `semestre`, `horas`, `tipo_semestre`, `id_academia`, `id_status`, `id_cct`) VALUES
(1, 'GEOMETRIA Y TRIGONOMETRIA', 'GEO Y TRIGO', 2, 4, 'P', 1, 1, 1),
(2, 'INGLES II', 'INGLES II', 2, 3, 'P', 1, 1, 1),
(3, 'CONSERVACION DE LA ENERGIA Y SUS INTERACCIONES CON LA MATERIA', 'CONS ENE IM', 2, 4, 'P', 1, 1, 1),
(4, 'LECTURA, EXPRESION ORAL Y ESCRITA II', 'LEOYE II', 2, 4, 'P', 1, 1, 1),
(5, 'DESARROLLA SOFTWARE UTILIZANDO PROGRAMACION ESTRUCTURADA', 'PROG. ESTRUC.', 2, 10, 'P', 3, 1, 1),
(6, 'DISE¥A Y ADMINISTRA BDD SIMPLES', 'D. BASE DATOS', 2, 7, 'P', 3, 1, 1),
(7, 'ENSAMBLA E INSTALA CONTROLADORES Y DISPOSITIVOS PERIFERICOS', 'ENS. INST. CONT', 2, 10, 'P', 6, 1, 1),
(8, 'INSTALA Y CONFIGURA SOFTWARE', 'INS. CONF. SOFTW', 2, 7, 'P', 6, 1, 1),
(9, 'INSTALA Y CONFIGURA SOFTWARE DE ACUERDO A LAS ESPECIFICACIONES Y REQUERIMIENTOS DEL USUARIO', 'INS. SOFT.', 2, 5, 'P', 6, 1, 1),
(10, 'DISTINGUE LOS DIFERENTES TIPOS DE EMPRESAS, DOCUMENTOS, ADMINISTRACIONN Y RECURSOS', 'DIS.TIP.EMP.', 2, 10, 'P', 5, 1, 1),
(11, 'ELABORA ESTRARTEGIAS PARA REALIZAR ACTIVIDADES EN SU AREA', 'ELAB. ESTRATEGIAS', 2, 7, 'P', 5, 1, 1),
(12, 'MANTIENE EL SISTEMA ELECTRICO DEL AUTOMOVIL CON BASE EN EL MANUAL DEL FABRICANTE', 'M.S. ELECT.', 2, 6, 'P', 4, 1, 1),
(13, 'MANTIENE EL SISTEMA ELECTRONICO DEL AUTOMOVIL', 'M. SIS. EL. AUT', 2, 11, 'P', 4, 1, 1),
(14, 'CALCULO DIFERENCIAL', 'CALCULO DIF', 4, 4, 'P', 1, 1, 1),
(15, 'INGLES IV', 'INGLES IV', 4, 3, 'P', 1, 1, 1),
(16, 'FISICA I', 'FISICA', 4, 4, 'P', 1, 1, 1),
(17, 'ECOLOGIA', 'ECOLOGIA', 4, 4, 'P', 1, 1, 1),
(18, 'DESARROLLA APLICACIONES M?VILES PARA ANDROID', 'DES. AP. ANDROID', 6, 6, 'P', 3, 1, 1),
(19, 'DESARROLLA APLICACIONES MOVILES PARA IOS', 'DES. AP. IOS', 6, 6, 'P', 3, 1, 1),
(20, 'BRINDA SOPORTE TECNICO DE MANERA PRESENCIAL', 'SOP.TEC.PRE.', 4, 6, 'P', 6, 1, 1),
(21, 'BRINDA SOPORTE TECNICO A DISTANCIA', 'SOP.TEC.DIS.', 4, 11, 'P', 6, 1, 1),
(22, 'ASISTE EN LAS ACTIVIDADES DE CAPACITACION PARA EL DESARROLLO DEL CAPITAL HUMANO', 'ASIS.CAP. C.H', 4, 7, 'P', 5, 1, 1),
(23, 'EVALUA EL DESEMPE¥O DE LA ORGANIZACION UTILIZANDO HERRAMIENTAS DE CALIDAD', 'EV.DES.ORG.H.C', 4, 10, 'P', 5, 1, 1),
(24, 'CORRIGE FALLAS DE LOS SISTEMAS DE INYECCION ELECTRONICA DE LOS MOTORES DE GASOLINA Y DIESEL', 'CORR.INY.ELECT.', 4, 7, 'P', 4, 1, 1),
(25, 'MANTIENE LAS EMISIONES CONTAMINANTES DENTRO DE LAS ESPECIFICACIONES DEL FABRICANTE', 'MAN.EM.CON.E.F', 4, 4, 'P', 4, 1, 1),
(26, 'DIAGNOSTICA EL FUNCIONAMIENTO DE LOS SISTEMAS DE ENCENDIDO ELECTRONICO Y COMPUTARIZADO DEL MOTOR', 'DIAG.F.S.E.CONT.', 4, 6, 'P', 4, 1, 1),
(27, 'GESTIONA LOS PROCESOS DE CAPACITACI?N PARA EL DESARROLLO DEL TALENTO HUMANO', 'GES P CAP DTH', 4, 10, 'P', 5, 1, 1),
(28, 'PROMUEVE CONDICIONES DE TRABAJO SALUDABLES EN LA ORGANIZACI?N', 'PCT SALUD ORG', 4, 7, 'P', 5, 1, 1),
(29, 'PROBABILIDAD Y ESTADISTICA', 'PROB. Y EST.', 6, 5, 'P', 1, 1, 1),
(30, 'TEMAS DE FILOSOFIA', 'T. DE FILOSOFIA', 6, 5, 'P', 1, 1, 1),
(31, 'ADMINISTRA Y CONFIGURA PLATAFORMAS DE E-LEARNING', 'A Y C P.ELEARNING', 6, 6, 'P', 3, 1, 1),
(32, 'TEMAS SELECTOS DE MATEM?TICAS I', 'T.SEL MATE I', 4, 4, 'P', 1, 1, 1),
(33, 'INSTALA UNA RED LAN', 'INST. RED LAN', 6, 6, 'P', 6, 1, 1),
(34, 'OPERA UNA RED LAN', 'OPERA RED LAN', 6, 6, 'P', 6, 1, 1),
(35, 'DETERMINA LA NOMINA DEL PERSONAL DE LA ORGANIZACION TOMANDO EN CUENTA LA NORMATIVIDAD LABORAL', 'DET.NOM.NORM.', 6, 8, 'P', 5, 1, 1),
(36, 'DETERMINA REMUNERACIONES DEL PERSONAL EN SITUACIONES EXTRAORDINARIAS', 'DET.REM.P.S.EXT.', 6, 4, 'P', 5, 1, 1),
(37, 'MANTIENE LOS SISTEMAS DE SUSPENSION Y DIRECCION DEL AUTOMOVIL', 'MAN.SIS.SUSP Y DIR', 6, 5, 'P', 4, 1, 1),
(38, 'MANTIENE LOS SISTEMAS DE FRENOS EN CONDICIONES DE OPERACION', 'MAN. SIST. FRENOS', 6, 7, 'P', 4, 1, 1),
(39, 'IMPLEMENTA BASE DE DATOS NO RELACIONALES EN UN SISTEMA DE INFORMACI?N', 'IMPLE BD NO REL SI', 4, 8, 'P', 3, 1, 1),
(40, 'REACCIONES QU?MICAS: CONSERVACI?N DE LA MATERIA EN LA FORMACI?N DE NUEVAS SUSTANCIAS', 'REACC QUIMICAS', 4, 4, 'P', 1, 1, 1),
(41, 'TEMAS DE ADMINISTRACION', 'ADMINISTRACION', 6, 5, 'P', 1, 1, 1),
(42, 'INTRODUCCION A LA ECONOMIA', 'ECONOMIA', 6, 5, 'P', 1, 1, 1),
(43, 'TEMAS DE FISICA', 'TEM. FISICA', 6, 5, 'P', 1, 1, 1),
(44, 'IMPLEMENTA BASE DE DATOS RELACIONALES EN UN SISTEMA DE INFORMACI?N', 'IMPLE BD REL SI', 4, 9, 'P', 3, 1, 1),
(45, 'MATEMATICAS APLICADAS', 'MAT. APL.', 6, 5, 'P', 1, 1, 1),
(46, 'BIOLOGIA CONTEMPORANEA', 'BIOLOGIA C.', 6, 5, 'P', 1, 1, 1),
(47, 'CIENCIAS SOCIALES II', 'CIEN SOC  II', 2, 2, 'P', 1, 1, 1),
(48, 'CIENCIAS SOCIALES III', 'CIEN SOC  III', 4, 2, 'P', 1, 1, 1),
(49, 'CONCIENCIA HIST?RICA I. PERSPECTIVAS DEL MXICO ANTIGUO EN LOS CONTEXTOS GLOBALES', 'CONC HIST I', 4, 3, 'P', 1, 1, 1),
(50, 'CULTURA DIGITAL II', 'CULT DIGITAL II', 2, 2, 'P', 1, 1, 1),
(51, 'DISE¥A SOFTWARE DE SISTEMAS INFORM?TICOS', 'DISE¥A SOFT SI', 2, 5, 'P', 3, 1, 1),
(52, 'CODIFICA SOFTWARE DE SISTEMAS INFORM?TICOS', 'CODIFICA SOFT SI', 2, 7, 'P', 3, 1, 1),
(53, 'IMPLEMENTA SOFTWARE DE SISTEMAS INFORM?TICOS', 'IMPLEMENTA SOFT SI', 2, 5, 'P', 3, 1, 1),
(54, 'PENSAMIENTO MATEM?TICO II', 'PENS. MATE. II', 2, 4, 'P', 1, 1, 1),
(55, 'MANTIENE EL SISTEMA DE INYECCI?N ELECTR?NICA DE LOS MOTORES DE GASOLINA Y DISEL', 'MSIEMGD', 4, 7, 'P', 4, 1, 1),
(56, 'MANTIENE EL SISTEMA DE EMISIONES CONTAMINANTES DEL AUTOM?VIL', 'MSECA', 4, 4, 'P', 4, 1, 1),
(57, 'MANTIENE EL SISTEMA DE ENCENDIDO ELECTR?NICO Y COMPUTARIZADO DEL AUTOM?VIL', 'MSEECA', 4, 6, 'P', 4, 1, 1),
(58, 'EJECUTA PROCEDIMIENTOS ADMINISTRATIVOS DEL ?REA DE RECURSOS HUMANOS', 'EJECUTA PAARH', 2, 10, 'P', 5, 1, 1),
(59, 'GESTIONA DOCUMENTACI?N DEL ?REA DE RECURSOS HUMANOS', 'GEST DOC ARH', 2, 7, 'P', 5, 1, 1),
(60, 'LENGUA Y COMUNICACI?N', 'LENG Y COMUN II', 2, 3, 'P', 1, 1, 1),
(61, 'TUTOR?A', 'TUTOR?A', 0, 1, 'P', 1, 1, 1),
(62, 'ESCOLTA', 'ESCOLTA', 0, 1, 'P', 1, 1, 1),
(63, 'ACT. INTEGRAL BANDA DE GUERRA', 'BANDA DE GUERRA', 0, 1, 'N', 17, 1, 1),
(64, 'ACT. INTEGRAL GUITARRA', 'GUITARRA', 0, 1, 'N', 17, 1, 1),
(65, 'ACT. INTEGRAL DIBUJO, PINTURA O COMICS (EAC)', 'EAC', 0, 1, 'N', 1, 1, 1),
(66, 'ACT. INTEGRAL MEDIOAMBIENTAL', 'MEDIOAMBIENTAL', 0, 1, 'P', 1, 1, 1),
(67, 'DEPORTES', 'DEPORTES', 0, 1, 'P', 1, 1, 1),
(69, 'PENSAMIENTO MATEMÁTICO III', 'PENS. MAT III', 3, 4, 'N', 1, 1, 1),
(70, 'INGLES III', 'INGLES III', 3, 3, 'N', 1, 1, 1),
(71, 'ECOSISTEMAS: INTERACCIONES, ENERGÍA Y DINÁMICA', 'ECO ENE Y DIN', 3, 4, 'N', 1, 1, 1),
(72, 'LENGUA Y COMUNICACIÓN III', 'LENG Y COM III', 3, 3, 'N', 1, 1, 1),
(73, 'PROBABILIDAD', 'PROBABILIDAD', 5, 5, 'N', 1, 1, 1),
(74, 'INGLES V', 'INGLES V', 5, 5, 'N', 1, 1, 1),
(75, 'FISICA II', 'FISICA II', 5, 4, 'N', 4, 1, 1),
(76, 'C.T.S y V.', 'C.T.S y V.', 5, 4, 'N', 5, 1, 1),
(77, 'EMPLEA FRAMEWORKS PARA EL DESARROLLO DE SOFTWARE', 'FRAMW SOFT', 3, 9, 'N', 3, 1, 1),
(78, 'APLICA METODOLOGIAS ÁGILES PARA EL DESARROLO DE SOFTWARE', 'MET AGILES', 3, 8, 'N', 3, 1, 1),
(79, 'ADMINISTRA SISTEMAS OPERATIVOS', 'ADM. SIST OP.', 5, 6, 'N', 3, 1, 1),
(80, 'INSTALA Y CONFIGURA APLICACIONES Y SERVICIOS', 'ICAYS', 5, 6, 'N', 3, 1, 1),
(81, 'GESTIONA EL PROCESO DE RECLUTAMIENTO, SELECCION Y ADMISIÓN DE TALENTO HUMANO', 'SEL Y ADM T H', 3, 9, 'N', 5, 1, 1),
(82, 'GESTIONA LOS PROCESOS DE INDUCCIÓN Y PERMANENCIA DEL TALENTO HUMANO', 'IND Y PERM TH', 3, 8, 'N', 5, 1, 1),
(83, 'SUPERVISA EL CUMPLIMIENTO DE LAS MEDIDAS DE HIGIENE Y SEGURIDAD EN LA ORGANIZACIàN', 'SCMHYSO', 5, 6, 'N', 5, 1, 1),
(84, 'SUPERVISA EL CUMPLIMIENTO DE TAREAS Y PROCESOS PARA EVALUAR LA PRODUCTIVIDAD EN LA ORGANIZACIàN', 'SCTPEPO', 5, 6, 'N', 5, 1, 1),
(85, 'REALIZA MANTENIMIENTO PREVENTIVO', 'MATTO. PREV.', 3, 7, 'N', 6, 1, 1),
(86, 'REALIZA MANTENIMIENTO CORRECTIVO', 'MTTO. CORREC.', 3, 10, 'N', 6, 1, 1),
(87, 'ESTABLECE LA SEGURIDAD EN EL EQUIPO DE COMPUTO', 'E. SEG. EQ. COMPUTO', 3, 5, 'N', 6, 1, 1),
(88, 'DISEÑA LA RED LAN DE ACUERDO A LAS CONDICIONES Y REQUERIMIENTOS DE LA ORGANIZACIàN', 'DRLACRO', 5, 7, 'N', 6, 1, 1),
(89, 'INSTALA Y MANTIENE UNA RED LAD ', 'IMRLAEO', 5, 7, 'N', 6, 1, 1),
(90, 'CONTROLA LOS MOVIMIENTOS DE BIENES EN EL ALMACEN', 'CONT. BIENES ALMCEN', 3, 8, 'N', 1, 1, 1),
(91, 'ORGANIZA OPERACIONES Y ESPACIOS DEL ALMACEN', 'OPER. ESP  ALMACEN', 3, 5, 'N', 1, 1, 1),
(92, 'SUPERVISA MOVIMIENTOS DE MERCANCIAS DEL ALMACEN', 'SUS.MERCANCIAS ALM', 3, 4, 'N', 1, 1, 1),
(93, 'PROPORCIONA SERVICIO Y ATENCION AL CLIENTE SOBRE EL ESTADO QUE GUARDAN LOS ENVIOS', 'PSACSEGE', 5, 6, 'N', 1, 1, 1),
(94, 'ELABORA REPORTES PARA PROPORCIONAR SERVICIO DE INFORMACION DE LA CARGA AL CLIENTE', 'ERPSICC', 5, 6, 'N', 1, 1, 1),
(95, 'MANTIENE EL MOTOR DE GASOLINA Y DIESEL', 'MMGYD', 3, 8, 'N', 4, 1, 1),
(96, 'MANTIENE EL SISTEMA DE CALEFACCION Y AIRE ACONDICIONADO DEL AUTOMOVIL', 'MSCYAAA', 3, 4, 'N', 4, 1, 1),
(97, 'MANTIENE EL SISTEMA DE ENFRIAMIENTO Y LUBRICACION DEL MOTOR', 'MSEYLM', 3, 5, 'N', 4, 1, 1),
(98, 'REALIZA SERVICIO DE MANTENIMIENTO AL SISTEMA DE TRANSMISION TRANSEJE MANUAL SEGéN ESPECIFICACIONES D', 'RSMSTTMSEF', 5, 6, 'N', 4, 1, 1),
(99, 'MANTIENE AL SISTEMA DE TRANSMISION Y TRANSEJE AUTOMATICO SEGUN ESPECIFICACIONES DEL FABRICANTE', 'MSTTAUTOSEFAB', 5, 6, 'N', 4, 1, 1),
(100, 'CALCULO INTEGRAL', 'C. INTEGRAL', 5, 5, 'N', 1, 1, 1),
(101, 'PENSAMIENTO MATEMATICO I', 'PEN.MAT.', 1, 4, 'N', 1, 1, 1),
(102, 'INGLES I', 'INGLES I', 1, 3, 'N', 1, 1, 1),
(103, 'LA MATERIA Y SUS INTERACCIONES', 'MAT INT', 1, 4, 'N', 1, 1, 1),
(104, 'HUMANIDADES I', 'HUMAN I', 1, 4, 'N', 4, 1, 1),
(105, 'RECURSOS SOCIOEMOCIONALES I', 'SOCIOEMO I', 1, 2, 'N', 4, 1, 1),
(106, 'CIENCIAS SOCIALES I', 'CIENC. SOC. I', 1, 2, 'N', 4, 1, 1),
(107, 'LENGUA Y COMUNICACIÓN I', 'LENG. Y COM I', 1, 3, 'N', 1, 1, 1),
(108, 'CULTURA DIGITAL', 'CULT. DIG.', 1, 3, 'N', 1, 1, 1),
(109, 'APLICA LA METODOLOGÍA ESPIRAL CON PROGRAMACION ORIENTADA A OBJETOS', 'APL.MET.ESP. OBJETOS', 3, 9, 'N', 3, 1, 1),
(110, 'APLICA LA METODOLOGÍA DE DESARROLLO RÁPIDO DE APLICACIONES CON PROGRAMACIÓN ORIENTADA A EVENTOS', 'APL.MET.DES. EVENTOS', 3, 8, 'N', 3, 1, 1),
(111, 'CONSTRUYE BASES DE DATOS PARA APLICACIONES WEB', 'CONST BD PAPLIC WEB', 5, 6, 'N', 3, 1, 1),
(112, 'DESARROLLA APLICACIONES WEB CON CONEXION A BASES DE DATOS', 'DES.APLIC.WEB CXBD', 5, 6, 'N', 3, 1, 1),
(113, 'MANTIENE EL SISTEMA DE TRANSMISIÓN Y TRANSEJE MANUAL DEL AUTOMÓVIL', 'TRAN.MANUAL', 5, 6, 'N', 4, 1, 1),
(114, 'CLASIFICA LOS ELEMENTOS BÁSICOS DE LA RED LAN', 'CLASIFICA RED LAN', 5, 5, 'N', 6, 1, 1),
(115, 'TUTORÍA Y SOCIOEMOCIONALES', 'TUTO Y SOCIO', 3, 1, 'N', 3, 1, 1),
(116, 'DEPORTES', 'DEPORTES', 1, 1, 'N', 1, 1, 1),
(117, 'ACTIVIDAD CIVICO CULTURAL BANDA DE GUERRA', 'BANDA', 1, 1, 'N', 4, 1, 1),
(118, 'ACTIVIDAD CIVICO CULTURAL (ESCOLTA)', 'ESCOLTA', 0, 1, 'N', 17, 1, 1),
(119, 'ENCUENTRO DE ARTE Y CULTURA', 'EAC', 1, 1, 'N', 1, 1, 1),
(120, 'ACTIVIDAD CÍVICO CULTURAL (GUITARRA)', 'GUITARRA', 1, 1, 'N', 3, 1, 1),
(121, 'EMPLEA FRAMEWORKS PARA EL DESARROLLO DE SOFTWARE', 'EMPLEA FRAMEWORKS', 3, 9, 'N', 3, 1, 1),
(122, 'RECURSOS SOCIOEMOCIONALES III', 'SOCIOEMO III', 3, 1, 'N', 1, 1, 1),
(123, 'HUMANIDADES II', 'HUMANIDADES II', 3, 4, 'N', 1, 1, 1),
(124, 'ACTIVIDAD MEDIOAMBIENTAL', 'ACT. MEDIOAMBIENTAL', 1, 1, 'N', 5, 1, 1),
(125, 'DIBUJO PINTURA Y FOTOGRAFÍA', 'DIBUJO PINTUR Y FOTO', 1, 1, 'N', 5, 1, 1),
(126, 'ACTIVIDAD COMICS Y VIDEO', 'COMICS Y VIDEO', 1, 1, 'N', 1, 1, 1),
(127, 'DEPORTES Y SOCIOEMOCIONALES I', 'DEP Y SOCIO I', 1, 1, 'N', 1, 1, 1),
(128, 'DEPORTES Y SOCIOEMOCIONALES III', 'DEP Y SOCIO III', 3, 2, 'N', 1, 1, 1),
(129, 'ACTIVIDAD CÍVICO CULTURAL (BANDA DE GUERRA)', 'BANDA DE GUERRA', 3, 1, 'N', 4, 1, 1),
(130, 'ACTIVIDAD CÍVICO CULTURAL (ESCOLTA)', 'ESCOLTA', 3, 1, 'N', 3, 1, 1),
(131, 'PORRA', 'PORRA', 0, 1, 'N', 1, 1, 1),
(136, 'materia de prueba cct 2 ', 'mat pCCT2', 1, 1, 'N', 1, 1, 2);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `semestre`
--

CREATE TABLE `semestre` (
  `id_semestre` int(11) NOT NULL,
  `descripcion` varchar(100) NOT NULL,
  `fecha_inicio` date NOT NULL DEFAULT current_timestamp(),
  `fecha_fin` date NOT NULL DEFAULT current_timestamp(),
  `id_cct` int(11) NOT NULL,
  `id_status` int(11) NOT NULL,
  `tipo_semestre` enum('P','N') NOT NULL DEFAULT 'P'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `semestre`
--

INSERT INTO `semestre` (`id_semestre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `id_cct`, `id_status`, `tipo_semestre`) VALUES
(1, 'Agosto 2025 - Enero 2026', '2025-09-01', '2026-01-16', 1, 2, 'N'),
(2, 'Febrero 2026 - Julio 2026', '2026-02-02', '2026-07-10', 1, 1, 'P');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `status`
--

CREATE TABLE `status` (
  `id_status` int(20) NOT NULL,
  `descripcion` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `status`
--

INSERT INTO `status` (`id_status`, `descripcion`) VALUES
(1, 'Activo'),
(2, 'Inactivo'),
(3, 'Suspendido'),
(4, 'Pendiente'),
(5, 'Baja');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tipo_usuario`
--

CREATE TABLE `tipo_usuario` (
  `id_tipo_usuario` int(20) NOT NULL,
  `descripcion` varchar(200) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `tipo_usuario`
--

INSERT INTO `tipo_usuario` (`id_tipo_usuario`, `descripcion`) VALUES
(1, 'Super Administrador'),
(2, 'Administrador'),
(3, 'Captura'),
(4, 'Docente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `turno`
--

CREATE TABLE `turno` (
  `id_turno` int(11) NOT NULL,
  `Descripcion` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `turno`
--

INSERT INTO `turno` (`id_turno`, `Descripcion`) VALUES
(1, 'Matutino'),
(2, 'Vespertino'),
(3, 'Mixto');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(20) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `correo_electronico` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `tipo_usuario` int(20) NOT NULL,
  `status` int(20) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `id_ct` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nombre`, `correo_electronico`, `password`, `tipo_usuario`, `status`, `telefono`, `id_ct`) VALUES
(1, 'Super Administrador', 'superAdm@gmail.com', '$2b$12$aXt.urKj5OgRLGnATTloj.siVIgmasf7uCVdWndWHyK/raktqif3a', 1, 1, '449 429 6282', 1),
(2, 'Martin', 'martin@gmail.com', '$2b$12$1SGgp4REQ8oF178B55IgfeEzFvx4gD2L1wAH6lQTW5dANqBN8X8SK', 2, 1, '449 223 9955', 1),
(3, 'Bernado', 'bernardo@gmail.com', '$2b$12$cZp3DQIUwFj8rKttO3lxC.CdFzpCvQeSE7TsMgup6iYb2osX/GMZ.', 2, 1, '449 107 7654', 2);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_academias`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_academias` (
`id_academia` int(11)
,`nombre_academia` varchar(100)
,`nombre_corto` varchar(10)
,`id_cct` int(11)
,`centro_trabajo` varchar(100)
,`id_status` int(20)
,`status_academia` varchar(100)
,`id_especialidad` int(11)
,`nombre_especialidad` varchar(100)
,`nombre_corto_especialidad` varchar(20)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_asignacion_docente`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_asignacion_docente` (
`id_asignacion` int(11)
,`id_semestre` int(11)
,`semestre` varchar(100)
,`id_docente` int(11)
,`nombre_docente` varchar(302)
,`id_materia` int(11)
,`nombre_materia` varchar(100)
,`horas_materia` int(11)
,`id_grupo` int(11)
,`grupo` varchar(23)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_docente`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_docente` (
`id_docente` int(11)
,`RFC` varchar(13)
,`Nombre` varchar(100)
,`Apellido_pat` varchar(100)
,`Apellido_mat` varchar(100)
,`nombre_completo` varchar(302)
,`Perfil` text
,`correo_e` varchar(100)
,`Telefono` varchar(100)
,`horas_nombramiento` int(11)
,`horas_descarga` int(11)
,`id_turno` int(11)
,`id_cct` int(11)
,`turno` varchar(100)
,`centro_trabajo` varchar(100)
,`id_status` int(11)
,`status` varchar(100)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_grupos`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_grupos` (
`id_grupo` int(11)
,`grupo` varchar(10)
,`semestre` int(11)
,`tipo_semestre` varchar(1)
,`id_especialidad` int(11)
,`nombre_especialidad` varchar(100)
,`especialidad_corta` varchar(20)
,`id_cct` int(11)
,`CCT` varchar(10)
,`centro_trabajo` varchar(100)
,`id_turno` int(11)
,`turno` varchar(100)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_materias`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_materias` (
`id_materia` int(11)
,`nombre_materia` varchar(100)
,`nombre_corto` varchar(20)
,`semestre` int(11)
,`horas` int(11)
,`tipo_semestre` enum('P','N')
,`id_academia` int(11)
,`nombre_academia` varchar(100)
,`academia_corto` varchar(10)
,`id_status` int(20)
,`status_materia` varchar(100)
,`id_cct` int(11)
);

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_semestre`
-- (Véase abajo para la vista actual)
--
CREATE TABLE `vista_semestre` (
`id_semestre` int(11)
,`descripcion_semestre` varchar(100)
,`fecha_inicio` date
,`fecha_fin` date
,`tipo_semestre` enum('P','N')
,`id_cct` int(11)
,`CCT` varchar(10)
,`nombre_centro_trabajo` varchar(100)
,`id_status` int(20)
,`descripcion_status` varchar(100)
);

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_academias`
--
DROP TABLE IF EXISTS `vista_academias`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_academias`  AS SELECT `a`.`id_academia` AS `id_academia`, `a`.`nombre_academia` AS `nombre_academia`, `a`.`nombre_corto` AS `nombre_corto`, `ct`.`id_cct` AS `id_cct`, `ct`.`Nombre` AS `centro_trabajo`, `s`.`id_status` AS `id_status`, `s`.`descripcion` AS `status_academia`, `e`.`id_especialidad` AS `id_especialidad`, `e`.`nombre_especialidad` AS `nombre_especialidad`, `e`.`nombre_corto` AS `nombre_corto_especialidad` FROM (((`academia` `a` left join `centro_trabajo` `ct` on(`a`.`id_cct` = `ct`.`id_cct`)) left join `status` `s` on(`a`.`id_status` = `s`.`id_status`)) left join `especialidad` `e` on(`a`.`id_especialidad` = `e`.`id_especialidad`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_asignacion_docente`
--
DROP TABLE IF EXISTS `vista_asignacion_docente`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_asignacion_docente`  AS SELECT `ad`.`id_asignacion` AS `id_asignacion`, `ad`.`id_semestre` AS `id_semestre`, `s`.`descripcion` AS `semestre`, `ad`.`id_docente` AS `id_docente`, `vd`.`nombre_completo` AS `nombre_docente`, `ad`.`id_materia` AS `id_materia`, `m`.`nombre` AS `nombre_materia`, `m`.`horas` AS `horas_materia`, `ad`.`id_grupo` AS `id_grupo`, concat(`g`.`semestre`,'° ',`g`.`grupo`) AS `grupo` FROM ((((`asignacion_docente` `ad` join `semestre` `s` on(`ad`.`id_semestre` = `s`.`id_semestre`)) join `vista_docente` `vd` on(`ad`.`id_docente` = `vd`.`id_docente`)) join `materia` `m` on(`ad`.`id_materia` = `m`.`id_materia`)) left join `grupo` `g` on(`ad`.`id_grupo` = `g`.`id_grupo`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_docente`
--
DROP TABLE IF EXISTS `vista_docente`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_docente`  AS SELECT `d`.`id_docente` AS `id_docente`, `d`.`RFC` AS `RFC`, `d`.`Nombre` AS `Nombre`, `d`.`Apellido_pat` AS `Apellido_pat`, `d`.`Apellido_mat` AS `Apellido_mat`, concat(`d`.`Apellido_pat`,' ',coalesce(`d`.`Apellido_mat`,''),' ',`d`.`Nombre`) AS `nombre_completo`, `d`.`Perfil` AS `Perfil`, `d`.`correo_e` AS `correo_e`, `d`.`Telefono` AS `Telefono`, `d`.`horas_nombramiento` AS `horas_nombramiento`, `d`.`horas_descarga` AS `horas_descarga`, `d`.`id_turno` AS `id_turno`, `d`.`id_cct` AS `id_cct`, `t`.`Descripcion` AS `turno`, `c`.`Nombre` AS `centro_trabajo`, `d`.`id_status` AS `id_status`, `st`.`descripcion` AS `status` FROM (((`docente` `d` left join `turno` `t` on(`d`.`id_turno` = `t`.`id_turno`)) left join `centro_trabajo` `c` on(`d`.`id_cct` = `c`.`id_cct`)) left join `status` `st` on(`d`.`id_status` = `st`.`id_status`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_grupos`
--
DROP TABLE IF EXISTS `vista_grupos`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_grupos`  AS SELECT `g`.`id_grupo` AS `id_grupo`, `g`.`grupo` AS `grupo`, `g`.`semestre` AS `semestre`, `g`.`tipo_semestre` AS `tipo_semestre`, `e`.`id_especialidad` AS `id_especialidad`, `e`.`nombre_especialidad` AS `nombre_especialidad`, `e`.`nombre_corto` AS `especialidad_corta`, `ct`.`id_cct` AS `id_cct`, `ct`.`CCT` AS `CCT`, `ct`.`Nombre` AS `centro_trabajo`, `t`.`id_turno` AS `id_turno`, `t`.`Descripcion` AS `turno` FROM (((`grupo` `g` left join `especialidad` `e` on(`g`.`id_especialidad` = `e`.`id_especialidad`)) left join `centro_trabajo` `ct` on(`g`.`id_cct` = `ct`.`id_cct`)) left join `turno` `t` on(`g`.`id_turno` = `t`.`id_turno`)) ORDER BY `g`.`grupo` ASC ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_materias`
--
DROP TABLE IF EXISTS `vista_materias`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_materias`  AS SELECT `m`.`id_materia` AS `id_materia`, `m`.`nombre` AS `nombre_materia`, `m`.`nombre_corto` AS `nombre_corto`, `m`.`semestre` AS `semestre`, `m`.`horas` AS `horas`, `m`.`tipo_semestre` AS `tipo_semestre`, `a`.`id_academia` AS `id_academia`, `a`.`nombre_academia` AS `nombre_academia`, `a`.`nombre_corto` AS `academia_corto`, `s`.`id_status` AS `id_status`, `s`.`descripcion` AS `status_materia`, `m`.`id_cct` AS `id_cct` FROM ((`materia` `m` left join `academia` `a` on(`m`.`id_academia` = `a`.`id_academia`)) left join `status` `s` on(`m`.`id_status` = `s`.`id_status`)) ;

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_semestre`
--
DROP TABLE IF EXISTS `vista_semestre`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_semestre`  AS SELECT `s`.`id_semestre` AS `id_semestre`, `s`.`descripcion` AS `descripcion_semestre`, `s`.`fecha_inicio` AS `fecha_inicio`, `s`.`fecha_fin` AS `fecha_fin`, `s`.`tipo_semestre` AS `tipo_semestre`, `ct`.`id_cct` AS `id_cct`, `ct`.`CCT` AS `CCT`, `ct`.`Nombre` AS `nombre_centro_trabajo`, `st`.`id_status` AS `id_status`, `st`.`descripcion` AS `descripcion_status` FROM ((`semestre` `s` join `centro_trabajo` `ct` on(`s`.`id_cct` = `ct`.`id_cct`)) join `status` `st` on(`s`.`id_status` = `st`.`id_status`)) ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `academia`
--
ALTER TABLE `academia`
  ADD PRIMARY KEY (`id_academia`),
  ADD KEY `fk_academia_ct` (`id_cct`) USING BTREE,
  ADD KEY `fk_academia_status` (`id_status`),
  ADD KEY `id_especialidad` (`id_especialidad`);

--
-- Indices de la tabla `asignacion_docente`
--
ALTER TABLE `asignacion_docente`
  ADD PRIMARY KEY (`id_asignacion`),
  ADD UNIQUE KEY `uk_asignacion_docente` (`id_semestre`,`id_docente`,`id_materia`,`id_grupo`),
  ADD KEY `fk_asignacion_semestre` (`id_semestre`),
  ADD KEY `fk_asignacion_docente` (`id_docente`),
  ADD KEY `fk_asignacion_materia` (`id_materia`),
  ADD KEY `fk_asignacion_grupo` (`id_grupo`);

--
-- Indices de la tabla `bloque_horario`
--
ALTER TABLE `bloque_horario`
  ADD PRIMARY KEY (`id_bloque`),
  ADD UNIQUE KEY `codigo_bloque` (`codigo_bloque`),
  ADD KEY `fk_bloque_turno` (`id_turno`);

--
-- Indices de la tabla `centro_trabajo`
--
ALTER TABLE `centro_trabajo`
  ADD PRIMARY KEY (`id_cct`);

--
-- Indices de la tabla `docente`
--
ALTER TABLE `docente`
  ADD PRIMARY KEY (`id_docente`),
  ADD KEY `fk_docente_turnp` (`id_turno`),
  ADD KEY `fk_docente_cct` (`id_cct`),
  ADD KEY `fk_docente_status` (`id_status`);

--
-- Indices de la tabla `especialidad`
--
ALTER TABLE `especialidad`
  ADD PRIMARY KEY (`id_especialidad`),
  ADD KEY `fk_especialidad_centro_trabajo` (`id_cct`);

--
-- Indices de la tabla `grupo`
--
ALTER TABLE `grupo`
  ADD PRIMARY KEY (`id_grupo`),
  ADD KEY `fk_grupo_cct` (`id_cct`),
  ADD KEY `fk_grupo_turno` (`id_turno`),
  ADD KEY `fk_grupo_especialidad` (`id_especialidad`);

--
-- Indices de la tabla `horario_detalle`
--
ALTER TABLE `horario_detalle`
  ADD PRIMARY KEY (`id_horario`),
  ADD UNIQUE KEY `uk_asignacion_dia_bloque` (`id_asignacion`,`dia_semana`,`id_bloque`),
  ADD KEY `fk_horario_asignacion` (`id_asignacion`),
  ADD KEY `fk_horario_bloque` (`id_bloque`);

--
-- Indices de la tabla `materia`
--
ALTER TABLE `materia`
  ADD PRIMARY KEY (`id_materia`),
  ADD KEY `fk_materia_status` (`id_status`),
  ADD KEY `fk_materia_academia` (`id_academia`),
  ADD KEY `fk_materia_cct` (`id_cct`) USING BTREE;

--
-- Indices de la tabla `semestre`
--
ALTER TABLE `semestre`
  ADD PRIMARY KEY (`id_semestre`),
  ADD KEY `fk_semestre_ct` (`id_cct`),
  ADD KEY `fk_semestre_status` (`id_status`);

--
-- Indices de la tabla `status`
--
ALTER TABLE `status`
  ADD PRIMARY KEY (`id_status`);

--
-- Indices de la tabla `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  ADD PRIMARY KEY (`id_tipo_usuario`);

--
-- Indices de la tabla `turno`
--
ALTER TABLE `turno`
  ADD PRIMARY KEY (`id_turno`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD KEY `FK_usuarios_tipo` (`tipo_usuario`),
  ADD KEY `FK_usuarios_status` (`status`),
  ADD KEY `fk_usuario_ct` (`id_ct`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `academia`
--
ALTER TABLE `academia`
  MODIFY `id_academia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `asignacion_docente`
--
ALTER TABLE `asignacion_docente`
  MODIFY `id_asignacion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `bloque_horario`
--
ALTER TABLE `bloque_horario`
  MODIFY `id_bloque` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT de la tabla `centro_trabajo`
--
ALTER TABLE `centro_trabajo`
  MODIFY `id_cct` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `docente`
--
ALTER TABLE `docente`
  MODIFY `id_docente` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT de la tabla `especialidad`
--
ALTER TABLE `especialidad`
  MODIFY `id_especialidad` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `grupo`
--
ALTER TABLE `grupo`
  MODIFY `id_grupo` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT de la tabla `horario_detalle`
--
ALTER TABLE `horario_detalle`
  MODIFY `id_horario` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `materia`
--
ALTER TABLE `materia`
  MODIFY `id_materia` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=137;

--
-- AUTO_INCREMENT de la tabla `semestre`
--
ALTER TABLE `semestre`
  MODIFY `id_semestre` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `status`
--
ALTER TABLE `status`
  MODIFY `id_status` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `tipo_usuario`
--
ALTER TABLE `tipo_usuario`
  MODIFY `id_tipo_usuario` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `turno`
--
ALTER TABLE `turno`
  MODIFY `id_turno` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `academia`
--
ALTER TABLE `academia`
  ADD CONSTRAINT `fk_academia_ct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  ADD CONSTRAINT `fk_academia_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`),
  ADD CONSTRAINT `id_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id_especialidad`);

--
-- Filtros para la tabla `asignacion_docente`
--
ALTER TABLE `asignacion_docente`
  ADD CONSTRAINT `fk_asignacion_docente` FOREIGN KEY (`id_docente`) REFERENCES `docente` (`id_docente`),
  ADD CONSTRAINT `fk_asignacion_grupo` FOREIGN KEY (`id_grupo`) REFERENCES `grupo` (`id_grupo`),
  ADD CONSTRAINT `fk_asignacion_materia` FOREIGN KEY (`id_materia`) REFERENCES `materia` (`id_materia`),
  ADD CONSTRAINT `fk_asignacion_semestre` FOREIGN KEY (`id_semestre`) REFERENCES `semestre` (`id_semestre`);

--
-- Filtros para la tabla `bloque_horario`
--
ALTER TABLE `bloque_horario`
  ADD CONSTRAINT `fk_bloque_turno` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`);

--
-- Filtros para la tabla `docente`
--
ALTER TABLE `docente`
  ADD CONSTRAINT `fk_docente_cct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  ADD CONSTRAINT `fk_docente_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`),
  ADD CONSTRAINT `fk_docente_turnp` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`);

--
-- Filtros para la tabla `especialidad`
--
ALTER TABLE `especialidad`
  ADD CONSTRAINT `fk_especialidad_centro_trabajo` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`);

--
-- Filtros para la tabla `grupo`
--
ALTER TABLE `grupo`
  ADD CONSTRAINT `fk_grupo_cct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  ADD CONSTRAINT `fk_grupo_especialidad` FOREIGN KEY (`id_especialidad`) REFERENCES `especialidad` (`id_especialidad`),
  ADD CONSTRAINT `fk_grupo_turno` FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`);

--
-- Filtros para la tabla `horario_detalle`
--
ALTER TABLE `horario_detalle`
  ADD CONSTRAINT `fk_horario_asignacion` FOREIGN KEY (`id_asignacion`) REFERENCES `asignacion_docente` (`id_asignacion`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_horario_bloque` FOREIGN KEY (`id_bloque`) REFERENCES `bloque_horario` (`id_bloque`);

--
-- Filtros para la tabla `materia`
--
ALTER TABLE `materia`
  ADD CONSTRAINT `fk_materia_academia` FOREIGN KEY (`id_academia`) REFERENCES `academia` (`id_academia`),
  ADD CONSTRAINT `fk_materia_cct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  ADD CONSTRAINT `fk_materia_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`);

--
-- Filtros para la tabla `semestre`
--
ALTER TABLE `semestre`
  ADD CONSTRAINT `fk_semestre_ct` FOREIGN KEY (`id_cct`) REFERENCES `centro_trabajo` (`id_cct`),
  ADD CONSTRAINT `fk_semestre_status` FOREIGN KEY (`id_status`) REFERENCES `status` (`id_status`);

--
-- Filtros para la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD CONSTRAINT `FK_usuarios_status` FOREIGN KEY (`status`) REFERENCES `status` (`id_status`),
  ADD CONSTRAINT `FK_usuarios_tipo` FOREIGN KEY (`tipo_usuario`) REFERENCES `tipo_usuario` (`id_tipo_usuario`),
  ADD CONSTRAINT `fk_usuario_ct` FOREIGN KEY (`id_ct`) REFERENCES `centro_trabajo` (`id_cct`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
