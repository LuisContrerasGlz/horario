# sis_doc

Sistema de captura de catálogos, carga docente y asignación de horarios para educación media superior.

## Requisitos

- Node.js 20+
- MySQL o MariaDB

## Esquema de referencia

El esquema canónico es el dump `sis_doc bd.sql` ubicado en la raíz del
repositorio. `database/schema.sql` contiene el DDL de las tablas, claves,
restricciones y vistas del dump, sin los registros personales del volcado.
`database/seed.sql` carga catálogos de referencia y bloques horarios para una
instalación local nueva; no carga docentes, usuarios, materias ni asignaciones.

El esquema usa `semestre.id_status` (1 = Activo), `grupo.id_especialidad`,
`materia.nombre`, la tabla `asignacion_docente` y un `horario_detalle` formado
por `id_horario`, `id_asignacion`, `dia_semana` e `id_bloque`. No usa las
columnas/tablas antiguas `semestre.activo`, `grupo.id_academia`,
`materia.nombre_materia`, `carga_docente` ni campos docentes duplicados en
`horario_detalle`.

El dump raíz incluye datos institucionales, docentes y cuentas. Trátalo como
información sensible y no lo importes en una base con datos que deban
conservarse. Los scripts de abajo son para una base local nueva; no son una
migración ni deben ejecutarse sobre una base existente.

## Instalación

1. Copia `.env.example` a `.env` y ajusta los valores de conexión.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Crea una base local nueva y carga el esquema y los datos de referencia:
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```
   Para una copia de referencia completa, importa `sis_doc bd.sql` en una base
   vacía separada; ese dump incluye los datos presentes al 25-09-2026.
4. Inicia la aplicación:
   ```bash
   npm run dev
   ```

## Estructura

- `src/server.ts`: punto de entrada del servidor Express.
- `src/routes/api.ts`: endpoints de catálogo y horario.
- `src/lib/validation.ts`: reglas de negocio del horario.
- `public/`: interfaz HTML, CSS y JavaScript.
- `database/schema.sql`: DDL basado en el dump raíz.
- `database/seed.sql`: catálogos de referencia y bloques para una base local nueva.
