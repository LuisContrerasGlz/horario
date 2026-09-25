# sis_doc

Sistema de captura de catálogos, carga docente y asignación de horarios para educación media superior.

## Requisitos

- Node.js 20+
- MySQL o MariaDB

## Instalación

1. Copia `.env.example` a `.env` y ajusta los valores de conexión.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Crea la base de datos y ejecuta el script SQL:
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```
4. Inicia la aplicación:
   ```bash
   npm run dev
   ```

## Validaciones clave

- El semestre activo filtra los módulos y grupos según `tipo_semestre`.
- Se valida que una materia y un grupo coincidan con el tipo del semestre activo.
- Se impide el empalme de docente y de grupo en el mismo día y bloque.
- Se valida que no se excedan las horas disponibles del docente.

## Estructura

- `src/server.ts`: punto de entrada del servidor Express.
- `src/routes/api.ts`: endpoints de catálogo y horario.
- `src/lib/validation.ts`: reglas de negocio del horario.
- `public/`: interfaz HTML, CSS y JavaScript.
- `database/`: scripts de MySQL para esquema y datos iniciales.
