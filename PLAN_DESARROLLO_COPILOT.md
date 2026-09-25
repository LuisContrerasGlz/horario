# ESPECIFICACIÓN TÉCNICA Y PLAN DE DESARROLLO (SIS_DOC)

> **Instrucciones para GitHub Copilot:**  
> Utiliza esta especificación como directriz principal de diseño, arquitectura,
> interfaz, reglas de negocio y validación para el desarrollo del sistema web
> de horarios docentes.
>
> Toma como referencia la estructura actual de la base de datos `sis_doc`.

---

## 1. RESUMEN Y ARQUITECTURA DEL PROYECTO

El sistema **sis_doc** gestiona la captura estandarizada de catálogos,
la asignación de carga docente y la planeación de horarios semanales
por grupo para instituciones de Educación Media Superior en México.

* **Backend:** Node.js, TypeScript, Express, `mysql2/promise`, `express-session`.
* **Frontend:** HTML5 semántico, CSS3 Vanilla (CSS Grid/Flexbox),
  JavaScript ES6+ (Fetch API).
* **Base de Datos:** MySQL / MariaDB (`sis_doc`).

La arquitectura debe mantener separación clara entre:

* Presentación / Frontend.
* Rutas HTTP.
* Controladores.
* Servicios o lógica de negocio.
* Acceso a datos.
* Base de datos.

Las reglas de negocio descritas en este documento deben validarse
principalmente en el backend, independientemente de las validaciones
realizadas en el frontend.

---

## 2. ESTÁNDAR HOMOGÉNEO DE CAPTURA PARA TODOS LOS CATÁLOGOS

Todos los módulos de catálogos:

* `centro_trabajo`
* `usuario`
* `tipo_usuario`
* `semestre`
* `especialidad`
* `academia`
* `grupo`
* `materia`
* `docente`
* `status`
* `turno`

deben compartir un patrón de interfaz de usuario y arquitectura CRUD
estrictamente homogéneo.

### 2.1 Estructura Visual Común de Catálogo

#### 1. Encabezado y Barra de Búsqueda

* Desplegable de criterio de búsqueda.
* Caja de texto para búsqueda dinámica por coincidencia.
* Botón de filtro.
* Botón para limpiar búsqueda.

#### 2. Barra de Herramientas Estándar

* **Nuevo:** limpia el formulario y abre el modo de alta.
* **Editar:** carga el registro seleccionado para modificación.
* **Eliminar / Dar de Baja:** cambia el `id_status` a Inactivo/Baja
  cuando corresponda o elimina físicamente el registro si no existen
  dependencias y la regla de negocio lo permite.
* **Guardar / Aceptar:** procesa el formulario mediante POST o PUT.
* **Cancelar:** descarta los cambios y limpia/restablece el formulario.
* **Exportar:** genera archivo `.xlsx` o `.csv` de los datos visibles.
* **Imprimir:** presenta los datos en formato para imprimir.

#### 3. Grilla / Tabla Principal

* Columna inicial con checkbox de selección.
* Columnas ordenables.
* Filtros dinámicos.
* Paginación cuando corresponda.
* Las consultas GET utilizarán prioritariamente las vistas:

  * `vista_docente`
  * `vista_materias`
  * `vista_academias`
  * `vista_grupos`
  * `vista_semestre`
  * `vista_asignacion_docente`

#### 4. Formulario de Captura / Edición

Los campos deben respetar:

* nombres definidos en la base de datos;
* tipos de datos;
* longitudes máximas;
* obligatoriedad;
* claves foráneas.

Los campos relacionados mediante claves foráneas:

* `id_cct`
* `id_status`
* `id_turno`
* `id_academia`
* `id_especialidad`
* `id_semestre`
* `id_docente`
* `id_materia`
* `id_grupo`

se mostrarán mediante controles `<select>` alimentados dinámicamente
desde sus respectivos catálogos o vistas.

---

## 3. ESPECIFICACIÓN DE CATÁLOGOS BASE

### 3.1 Catálogo de Docentes

Tabla:

`docente`

Vista:

`vista_docente`

#### Grilla

Mostrar:

* `id_docente`
* `RFC`
* `nombre_completo`
* `Perfil`
* `correo_e`
* `Telefono`
* `horas_nombramiento`
* `horas_descarga`
* `turno`
* `centro_trabajo`
* `status`

La columna `nombre_completo` deberá mostrarse utilizando el formato:

`Apellido Paterno + Apellido Materno + Nombre`

#### Formulario

Datos:

* No. Control (`id_docente`)
* RFC
* Nombre
* Apellido Paterno
* Apellido Materno
* Perfil
* Correo electrónico
* Teléfono
* Horas de nombramiento
* Horas de descarga
* Turno
* Centro de trabajo
* Estatus

#### Validaciones

* `horas_nombramiento` máximo 40.
* `horas_descarga` máximo 10.
* `horas_descarga` no puede ser mayor que `horas_nombramiento`.

---

### 3.2 Catálogo de Materias

Tabla:

`materia`

Vista:

`vista_materias`

Campos:

* `id_materia`
* `nombre`
* `nombre_corto`
* `semestre`
* `horas`
* `tipo_semestre`
* `id_academia`
* `id_status`
* `id_cct`

#### Reglas

`tipo_semestre` tendrá como valores ordinarios:

* `P` = semestre par.
* `N` = semestre impar.

Los registros históricos o especiales que actualmente utilicen:

* `X`
* `x`

deberán tratarse como registros especiales.

**Antes de implementar el filtrado final se debe definir su comportamiento:**

1. excluirlos de la carga normal;
2. permitirlos en ambos tipos de semestre; o
3. asignarles un comportamiento específico.

Copilot no debe asumir automáticamente el significado de `X/x`.

Siempre que sea posible, las materias utilizadas en asignación docente
deberán tener un `id_academia` válido o null.

---

### 3.3 Catálogo de Grupos

Tabla:

`grupo`

Vista:

`vista_grupos`

Campos:

* `id_grupo`
* `semestre`
* `grupo`
* `id_especialidad`
* `id_cct`
* `id_turno`
* `tipo_semestre`

La relación principal de clasificación del grupo es:

`grupo.id_especialidad -> especialidad.id_especialidad`

No utilizar `id_academia` como clasificación del grupo.

---

### 3.4 Resto de Catálogos

#### centro_trabajo

* `id_cct`
* `CCT`
* `Nombre`

#### semestre

Vista:

`vista_semestre`

Campos:

* `id_semestre`
* `descripcion`
* `fecha_inicio`
* `fecha_fin`
* `id_cct`
* `id_status`
* `tipo_semestre`

#### academia

Vista:

`vista_academias`

Campos:

* `id_academia`
* `nombre_academia`
* `nombre_corto`
* `id_especialidad`
* `id_cct`
* `id_status`

#### especialidad

* `id_especialidad`
* `nombre_especialidad`
* `nombre_corto`
* `id_cct`

#### usuario

* `id_usuario`
* `nombre`
* `correo_electronico`
* `password`
* `tipo_usuario`
* `status`
* `telefono`
* `id_ct`

#### Catálogos simples

* `tipo_usuario`
* `turno`
* `status`

---

# 4. REGLAS DE NEGOCIO Y FLUJO DE ASIGNACIÓN DE HORARIOS

## 4.1 Selección del Semestre Activo

El usuario seleccionará un periodo escolar de la tabla `semestre`.

El semestre seleccionado será considerado editable únicamente cuando:

`id_status = 1`

Si el semestre tiene un status diferente de 1:

* se permitirá consultar información;
* se permitirá visualizar carga docente;
* se permitirá visualizar horarios;
* no se permitirá crear asignaciones;
* no se permitirá modificar asignaciones;
* no se permitirá agregar horarios;
* no se permitirá eliminar horarios.

Esta validación deberá realizarse obligatoriamente en el backend.

---

## 4.2 Restricción Par / Impar

El campo:

`semestre.tipo_semestre`

define el tipo de periodo activo.

### Periodo Par

Si:

`tipo_semestre = 'P'`

únicamente se mostrarán materias y grupos con:

`tipo_semestre = 'P'`

correspondientes normalmente a:

* 2°
* 4°
* 6°

### Periodo Impar

Si:

`tipo_semestre = 'N'`

únicamente se mostrarán materias y grupos con:

`tipo_semestre = 'N'`

correspondientes normalmente a:

* 1°
* 3°
* 5°

La validación deberá hacerse tanto al cargar los combos como al intentar
guardar una asignación.

El backend no debe confiar únicamente en los filtros del frontend.

---

# 4.3 MÓDULO DE CARGA DOCENTE

Tablas / vistas principales:

* `asignacion_docente`
* `vista_asignacion_docente`
* `vista_docente`

## 4.3.1 Tabla Superior de Docentes

Mostrar:

* nombre completo;
* perfil;
* horas de nombramiento;
* horas de descarga;
* horas disponibles;
* horas actualmente asignadas en el semestre seleccionado.

Las horas disponibles se calculan como:

`horas_nombramiento - horas_descarga`

---

## 4.3.2 Panel de Selección

Mostrar controles para seleccionar:

* Materia.
* Grupo.
* Turno.
* Especialidad.

También mostrar:

* contador de grupos Matutinos;
* contador de grupos Vespertinos;
* botón **Agregar**.

Al presionar **Agregar**, se creará un registro en:

`asignacion_docente`

con:

* `id_semestre`
* `id_docente`
* `id_materia`
* `id_grupo`

---

## 4.3.3 Vista de Asignaciones

Utilizar:

`vista_asignacion_docente`

La tabla inferior deberá mostrar al menos:

* `grupo`
* `nombre_materia`
* `horas_materia`

Las asignaciones visibles deberán corresponder exclusivamente al:

* docente seleccionado;
* `id_semestre` seleccionado.

Al pie de la columna:

`horas_materia`

mostrar la suma de las horas asignadas durante el semestre seleccionado.

---

# 4.4 VALIDACIONES AL CREAR UNA ASIGNACIÓN DOCENTE

Antes de insertar un registro en `asignacion_docente`, el backend debe
realizar las siguientes validaciones.

## 4.4.1 Semestre Activo

El `id_semestre` seleccionado debe existir y tener:

`id_status = 1`

Si no está activo, cancelar la operación.

---

## 4.4.2 Correspondencia Par / Impar

Debe cumplirse:

`semestre.tipo_semestre = materia.tipo_semestre`

y:

`semestre.tipo_semestre = grupo.tipo_semestre`

No permitir asignaciones que violen esta regla.

---

## 4.4.3 Correspondencia del Número de Semestre

Además de ser ambos pares o impares, deberá cumplirse:

`materia.semestre = grupo.semestre`

Ejemplo inválido:

* Materia de 3° semestre.
* Grupo de 5° semestre.

Aunque ambos sean tipo `N`, la asignación no debe permitirse.

---

## 4.4.4 Compatibilidad de Centro de Trabajo

Los siguientes registros deberán pertenecer al mismo centro de trabajo:

* docente;
* materia;
* grupo;
* semestre.

Debe cumplirse:

`docente.id_cct = materia.id_cct`

`docente.id_cct = grupo.id_cct`

`docente.id_cct = semestre.id_cct`

No permitir asignaciones entre registros pertenecientes a CCT diferentes.

---

## 4.4.5 Evitar Asignaciones Duplicadas

No debe existir otra asignación con la misma combinación:

* `id_semestre`
* `id_docente`
* `id_materia`
* `id_grupo`

La base de datos debe conservar una restricción UNIQUE para esta
combinación.

---

## 4.4.6 Límite de Carga Docente

La suma de las horas de las materias asignadas al docente durante
el semestre seleccionado no deberá superar:

`horas_nombramiento - horas_descarga`

La validación se realizará por:

* `id_docente`
* `id_semestre`

Ejemplo:

Horas nombramiento: 40  
Horas descarga: 5

Máximo asignable:

35 horas.

---

## 4.4.7 Grupo Obligatorio

El flujo normal de asignación se define como:

`semestre + docente + materia + grupo`

Por lo tanto, para nuevas asignaciones:

`id_grupo`

deberá ser obligatorio desde la aplicación.

No crear asignaciones sin grupo.

---

# 4.5 MÓDULO DE HORARIOS

Tablas principales:

* `horario_detalle`
* `bloque_horario`
* `asignacion_docente`

## 4.5.1 Pestañas

Mostrar:

* Horario de Grupo.
* Horario de Docente.
* Materias por Semestre.

---

## 4.5.2 Selección del Grupo

Mostrar un combo para seleccionar el grupo.

Los grupos deberán filtrarse por:

* `id_semestre` seleccionado;
* `tipo_semestre`;
* `id_cct`.

Una vez seleccionado un grupo, obtener:

`grupo.id_turno`

para determinar los bloques horarios disponibles.

---

## 4.5.3 Selección de Docente / Materia

Mostrar únicamente asignaciones existentes en:

`asignacion_docente`

correspondientes a:

* grupo seleccionado;
* semestre seleccionado.

La información visible deberá incluir:

* docente;
* materia.

---

## 4.5.4 Retícula Semanal

Columnas:

* Hora
* LUNES
* MARTES
* MIÉRCOLES
* JUEVES
* VIERNES

Las filas se cargarán desde:

`bloque_horario`

---

## 4.5.5 Bloques Matutinos

Para:

`id_turno = 1`

mostrar:

* M1 — 07:00-07:50
* M2 — 07:50-08:40
* M3 — 08:40-09:30

Receso:

09:30-09:50

Continuar con:

* M4 — 09:50-10:40
* M5 — 10:40-11:30
* M6 — 11:30-12:20
* M7 — 12:20-13:10
* M8 — 13:10-14:00

---

## 4.5.6 Bloques Vespertinos

Para:

`id_turno = 2`

mostrar:

* V1 — 14:00-14:50
* V2 — 14:50-15:40
* V3 — 15:40-16:30

Receso:

16:30-16:50

Continuar con:

* V4 — 16:50-17:40
* V5 — 17:40-18:30
* V6 — 18:30-19:20
* V7 — 19:20-20:10
* V8 — 20:10-21:00

---

# 4.6 OPERACIÓN DE LA MALLA DE HORARIOS

Al hacer clic en una celda disponible:

1. Obtener la asignación docente seleccionada.
2. Obtener `id_asignacion`.
3. Obtener `id_semestre`.
4. Obtener `id_docente`.
5. Obtener `id_grupo`.
6. Validar todas las reglas de disponibilidad.
7. Si no existen conflictos, insertar en `horario_detalle`:

   * `id_asignacion`
   * `dia_semana`
   * `id_bloque`

La información mostrada visualmente en la celda deberá incluir al menos:

* docente;
* materia.

---

## 4.6.1 Eliminación desde una Celda

Si la celda ya contiene exactamente la misma:

`id_asignacion`

que el usuario está intentando colocar, el nuevo clic podrá eliminar
el registro correspondiente de `horario_detalle`.

Si la celda contiene una asignación distinta:

* no eliminar automáticamente;
* mostrar mensaje:

**Horario no disponible.**

No utilizar únicamente la coincidencia del docente para decidir
la eliminación, ya que un mismo docente puede impartir diferentes materias.

---

# 4.7 VALIDACIONES BACKEND AL GUARDAR HORARIO

Todas estas validaciones deberán ejecutarse antes de insertar
`horario_detalle`.

---

## 4.7.1 Semestre Activo

La asignación deberá pertenecer al semestre seleccionado.

El semestre deberá tener:

`id_status = 1`

Si el semestre está inactivo, no permitir:

* insertar;
* modificar;
* eliminar horarios.

---

## 4.7.2 Sin Empalme de Docente

Un docente no puede tener más de una clase en:

* mismo `id_semestre`;
* mismo `dia_semana`;
* mismo `id_bloque`.

La combinación lógica de validación será:

`id_docente + id_semestre + dia_semana + id_bloque`

Si ya existe otra asignación, mostrar:

**Horario no disponible: el docente ya tiene una clase asignada en ese horario.**

---

## 4.7.3 Sin Empalme de Grupo

Un grupo no puede tener más de una clase en:

* mismo `id_semestre`;
* mismo `dia_semana`;
* mismo `id_bloque`.

La combinación lógica será:

`id_grupo + id_semestre + dia_semana + id_bloque`

Si ya existe otra asignación, mostrar:

**Horario no disponible: el grupo ya tiene una clase asignada en ese horario.**

---

## 4.7.4 Compatibilidad del Turno

El bloque horario deberá corresponder al turno del grupo.

Debe cumplirse:

`grupo.id_turno = bloque_horario.id_turno`

Ejemplo:

Un grupo Matutino no podrá utilizar bloques V1-V8.

Un grupo Vespertino no podrá utilizar bloques M1-M8.

---

## 4.7.5 Coherencia del Semestre

La asignación, materia y grupo deberán respetar el semestre activo.

Validar:

`asignacion_docente.id_semestre = semestre seleccionado`

y además:

`materia.tipo_semestre = semestre.tipo_semestre`

`grupo.tipo_semestre = semestre.tipo_semestre`

---

## 4.7.6 Número de Semestre

Validar:

`materia.semestre = grupo.semestre`

No será suficiente que ambos pertenezcan al mismo tipo P/N.

---

## 4.7.7 Centro de Trabajo

La asignación utilizada deberá pertenecer al mismo CCT del semestre
y del grupo que se está programando.

No permitir cruces entre centros de trabajo diferentes.

---

# 4.8 TRANSACCIONES Y CONCURRENCIA

Las operaciones críticas de horarios deberán realizarse utilizando
transacciones SQL.

Flujo recomendado:

1. Iniciar transacción.
2. Recuperar información de `id_asignacion`.
3. Validar semestre activo.
4. Validar disponibilidad del docente.
5. Validar disponibilidad del grupo.
6. Validar turno.
7. Validar coherencia de semestre.
8. Insertar o eliminar `horario_detalle`.
9. Confirmar transacción.

En caso de error:

`ROLLBACK`

En caso exitoso:

`COMMIT`

Esto evita inconsistencias cuando dos usuarios intenten modificar
el horario simultáneamente.

---

# 4.9 RESPONSABILIDAD DE LAS CAPAS

## Base de Datos

Responsable de:

* claves primarias;
* claves foráneas;
* restricciones UNIQUE;
* integridad referencial;
* almacenamiento persistente;
* vistas SQL.

## Backend

Responsable de:

* semestre activo;
* permisos de modificación;
* par / impar;
* compatibilidad materia-grupo;
* compatibilidad de CCT;
* control de horas;
* empalme de docente;
* empalme de grupo;
* compatibilidad de turno;
* transacciones.

## Frontend

Responsable de:

* presentación;
* selects dependientes;
* filtros;
* búsqueda;
* tablas;
* contadores;
* mensajes al usuario;
* representación de la malla;
* bloqueo visual de acciones cuando el semestre no sea editable.

Las restricciones críticas siempre deben volver a validarse en backend.

---

# 5. CATÁLOGO DE BLOQUES DE HORARIO

## Turno Matutino — id_turno = 1

* M1 — 07:00-07:50
* M2 — 07:50-08:40
* M3 — 08:40-09:30
* Receso — 09:30-09:50
* M4 — 09:50-10:40
* M5 — 10:40-11:30
* M6 — 11:30-12:20
* M7 — 12:20-13:10
* M8 — 13:10-14:00

## Turno Vespertino — id_turno = 2

* V1 — 14:00-14:50
* V2 — 14:50-15:40
* V3 — 15:40-16:30
* Receso — 16:30-16:50
* V4 — 16:50-17:40
* V5 — 17:40-18:30
* V6 — 18:30-19:20
* V7 — 19:20-20:10
* V8 — 20:10-21:00

---

# 6. CRITERIOS GENERALES DE IMPLEMENTACIÓN

1. No duplicar datos que puedan obtenerse mediante relaciones existentes.
2. `horario_detalle` continuará almacenando únicamente:
   * `id_horario`
   * `id_asignacion`
   * `dia_semana`
   * `id_bloque`
3. No agregar `id_docente`, `id_materia`, `id_grupo` ni `id_semestre`
   directamente a `horario_detalle`.
4. Obtener dichos datos mediante `asignacion_docente`.
5. No confiar únicamente en validaciones JavaScript del frontend.
6. Toda regla crítica deberá validarse nuevamente en Node.js antes del INSERT,
   UPDATE o DELETE.
7. Utilizar consultas parametrizadas con `mysql2/promise`.
8. No concatenar datos proporcionados por el usuario directamente en SQL.
9. Mantener las rutas, controladores y lógica de acceso a datos separados.
10. Utilizar las vistas SQL para consultas de presentación cuando corresponda.
11. Los mensajes de error enviados al frontend deberán ser claros y
    específicos.
12. Las operaciones que afecten simultáneamente disponibilidad y horario
    deberán utilizar transacciones.

---

# 7. CRITERIO DE ÉXITO DEL MÓDULO DE CARGA Y HORARIOS

El módulo se considerará funcionalmente correcto cuando:

1. Un docente pueda recibir materias únicamente dentro de un semestre activo.
2. Materia y grupo correspondan al mismo número de semestre.
3. Materia y grupo sean compatibles en P/N.
4. Los registros pertenezcan al mismo CCT.
5. La carga total del docente no exceda su disponibilidad.
6. No puedan existir asignaciones exactamente duplicadas.
7. No pueda existir empalme de docente dentro del mismo semestre.
8. No pueda existir empalme de grupo dentro del mismo semestre.
9. Los bloques correspondan al turno del grupo.
10. Los semestres inactivos sean únicamente de consulta.
11. La malla refleje inmediatamente los cambios realizados en
    `horario_detalle`.