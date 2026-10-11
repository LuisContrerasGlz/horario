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

## 2. CONTROL DE ACCESO, AUTENTICACIÓN, ROLES Y RESTRICCIÓN POR CENTRO DE TRABAJO (CCT)

El control de acceso al sistema se gestiona mediante autenticación por correo electrónico y contraseña registrados en la tabla `usuario` de la base de datos `sis_doc`.

### 2.1 Gestión de Sesión e Inactividad
* **Mecanismo:** Autenticación mediante `express-session` con almacenamiento seguro de estado en servidor.
* **Caducidad por Inactividad:** La sesión expirará automáticamente tras **5 minutos de inactividad** (300,000 ms).
* **Renovación:** Cualquier interacción HTTP / solicitud API restablecerá el contador del tiempo de inactividad.
* **Cierre Forzado:** Al expirar el tiempo de inactividad o pulsar "Cerrar Sesión", la sesión se destruirá y redireccionará al usuario a la pantalla de Login con la notificación correspondiente.

### 2.2 Restricción de Centro de Trabajo (CCT) por Usuario
* **Superadministrador (`tipo_usuario = 1`):** Acceso multi-plantel total. Puede visualizar, seleccionar y cambiar libremente entre cualquier Centro de Trabajo (`id_cct`) registrado en la base de datos.
* **Administrador (`tipo_usuario = 2`) y Revisor:** Acceso **estrictamente delimitado a su CCT de adscripción** (definido en `usuario.id_ct`).
  * En la interfaz (Frontend), el desplegable de Centro de Trabajo aparecerá preseleccionado con su CCT y **deshabilitado (`disabled`)**, impidiendo seleccionar cualquier otro plantel.
  * En el Backend, todas las consultas (`WHERE id_cct = ?`), filtrados de catálogos, carga docente y asignación de horarios se forzarán utilizando el `id_ct` almacenado en la sesión activa del usuario. Cualquier intento de enviar o manipular un `id_cct` distinto en la petición responderá con un error HTTP `403 Forbidden`.

### 2.3 Matriz de Permisos por Rol (`tipo_usuario`)

| Módulo / Catálogo | Superadministrador (`tipo_usuario = 1`) | Administrador (`tipo_usuario = 2`) | Revisor (Solo Lectura) | Captura / Docente (`tipo_usuario = 3 / 4`) |
| :--- | :---: | :---: | :---: | :---: |
| **Inicio de Sesión / Login** | Acceso Completo | Acceso Completo | Acceso Completo | Acceso Completo |
| **Selección de Centro de Trabajo (CCT)** | **Todos los CCT** (Libre Selección) | **Fijo a su CCT** (Sin Cambio) | **Fijo a su CCT** (Sin Cambio) | Fijo a su CCT |
| **Carga Docente y Asignación de Horarios** | Acceso Completo (Lectura/Escritura) | Acceso Completo en su CCT | **Solo Consulta en su CCT** | Sin Acceso / Solo Consulta |
| **Catálogos: Docentes, Materias, Grupos, Academias, Especialidades** | Acceso Completo | Acceso Completo en su CCT | **Solo Consulta en su CCT** | Sin Acceso |
| **Catálogos: Semestres, Centros de Trabajo, Bloques Horarios, Turnos** | Acceso Completo | Solo Consulta (Lectura) | **Solo Consulta (Lectura)** | Sin Acceso |
| **Catálogo: Estatus (`status`)** | Acceso Completo | **Sin Acceso** | **Sin Acceso** | Sin Acceso |
| **Catálogo: Tipos de Usuario (`tipo_usuario`)** | Acceso Completo | **Sin Acceso** | **Sin Acceso** | Sin Acceso |
| **Catálogo: Usuarios (`usuario`)** | Acceso Completo | **Sin Acceso** | **Sin Acceso** | Sin Acceso |

### 2.4 Reglas Específicas por Rol
1. **Superadministrador:** Control total sobre la visualización, creación, modificación y eliminación en todos los módulos, catálogos y centros de trabajo de la aplicación.
2. **Administrador:** Puede consultar y modificar la Carga Docente, Horarios y catálogos académicos principales únicamente dentro de su CCT asignado. Tiene acceso de solo lectura a los catálogos globales (Semestres, CCT, Bloques, Turnos) y no tiene acceso a la administración de usuarios, tipos de usuario y estatus.
3. **Revisor (Solo Lectura):** Puede consultar la Carga Docente, Horarios y catálogos académicos restringidos a su CCT asignado, pero con carácter **estrictamente de solo lectura**. No puede agregar, editar ni eliminar nada en el sistema.
4. **Captura / Docente:** Sin acceso a la gestión de catálogos generales, limitado únicamente a consultar su propia información asignada en su CCT.

### 2.5 Validaciones de Seguridad en Backend
1. **Middleware de Autenticación (`authMiddleware`):** Protegerá todas las rutas API (`/api/*`). Si no existe una sesión válida o se excedieron los 5 minutos de inactividad, retornará HTTP `401 Unauthorized`.
2. **Middleware de Autorización y CCT (`roleMiddleware`):** Validará en el backend que el usuario tenga permisos suficientes y que la operación corresponda estrictamente a su `id_ct` (salvo Superadministrador). Cualquier intento de modificación por un **Revisor** o acceso a datos de otro CCT por un **Administrador** será bloqueado inmediatamente con HTTP `403 Forbidden`.
3. **Adaptación de Interfaz en Frontend:** Al iniciar sesión como **Revisor**, el frontend ocultará o deshabilitará todos los botones de acción ("Nuevo", "Editar", "Eliminar", "Guardar", "Agrega"). En **Administrador** y **Revisor**, los selectores de Centro de Trabajo quedarán bloqueados en su CCT asignado.

---

## 3. ESTÁNDAR HOMOGÉNEO DE CAPTURA PARA TODOS LOS CATÁLOGOS

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

### 3.1 Estructura Visual Común de Catálogo

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

## 4. ESPECIFICACIÓN DE CATÁLOGOS BASE

### 4.1 Catálogo de Docentes

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
* Centro de trabajo (bloqueado al CCT del usuario para Administrador/Revisor)
* Estatus

#### Validaciones

* `horas_nombramiento` máximo 40.
* `horas_descarga` máximo 10.
* `horas_descarga` no puede ser mayor que `horas_nombramiento`.

---

### 4.2 Catálogo de Materias

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

### 4.3 Catálogo de Grupos

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

### 4.4 Resto de Catálogos

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

## 5. REGLAS DE NEGOCIO Y FLUJO DE ASIGNACIÓN DE HORARIOS

### 5.1 Selección del Semestre Activo

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

### 5.2 Restricción Par / Impar

El campo:

`semestre.tipo_semestre`

define el tipo de periodo activo.

#### Periodo Par

Si:

`tipo_semestre = 'P'`

únicamente se mostrarán materias y grupos con:

`tipo_semestre = 'P'`

correspondientes normalmente a:

* 2°
* 4°
* 6°

#### Periodo Impar

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

### 5.3 MÓDULO DE CARGA DOCENTE

Tablas / vistas principales:

* `asignacion_docente`
* `vista_asignacion_docente`
* `vista_docente`

#### 5.3.1 Tabla Superior de Docentes

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

#### 5.3.2 Panel de Selección

Mostrar controles para seleccionar:

* **Materia.**
* **Grupo.**

**Inferencia Automática de Datos del Grupo:**
* Dado que el `Turno` (`id_turno`) y la `Especialidad` (`id_especialidad`) están vinculados directamente al `grupo` en la base de datos (`vista_grupos`), **no se requiere captura manual ni selección por parte del usuario** para dichos campos[cite: 18, 19].
* Al seleccionar un `Grupo`, el sistema obtendrá automáticamente su `Turno` y `Especialidad` asociados[cite: 18, 19].
* Los campos de `Turno` y `Especialidad` se mostrarán únicamente como **etiquetas informativas de lectura** (*read-only* / *disabled*) dentro del formulario, actualizándose dinámicamente al cambiar el `Grupo`[cite: 19].

También mostrar:

* Contador de grupos Matutinos.
* Contador de grupos Vespertinos.
* Botón **Agregar** (crea el registro en `asignacion_docente` con `id_semestre`, `id_docente`, `id_materia` e `id_grupo`)[cite: 18, 19].
* **Botón Limpiar / Resetear:** Permite restablecer los campos seleccionados en el panel (`Materia`, `Grupo` y sus etiquetas informativas) para comenzar una nueva selección limpiamente[cite: 18, 19].

---

#### 5.3.3 Vista de Asignaciones

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

### 5.4 VALIDACIONES AL CREAR UNA ASIGNACIÓN DOCENTE

Antes de insertar un registro en `asignacion_docente`, el backend debe
realizar las siguientes validaciones.

#### 5.4.1 Semestre Activo

El `id_semestre` seleccionado debe existir y tener:

`id_status = 1`

Si no está activo, cancelar la operación.

---

#### 5.4.2 Correspondencia Par / Impar

Debe cumplirse:

`semestre.tipo_semestre = materia.tipo_semestre`

y:

`semestre.tipo_semestre = grupo.tipo_semestre`

No permitir asignaciones que violen esta regla.

---

#### 5.4.3 Correspondencia del Número de Semestre

Además de ser ambos pares o impares, deberá cumplirse:

`materia.semestre = grupo.semestre`

Ejemplo inválido:

* Materia de 3° semestre.
* Grupo de 5° semestre.

Aunque ambos sean tipo `N`, la asignación no debe permitirse.

---

#### 5.4.4 Compatibilidad de Centro de Trabajo

Los siguientes registros deberán pertenecer al mismo centro de trabajo:

* docente;
* materia;
* grupo;
* semestre.

Debe cumplirse:

`docente.id_cct = materia.id_cct`

`docente.id_cct = grupo.id_cct`

`docente.id_cct = semestre.id_cct`

Para Administrador y Revisor, este CCT debe coincidir estrictamente con su `usuario.id_ct`. No permitir cruces con CCT distintos.

---

#### 5.4.5 Evitar Asignaciones Duplicadas

No debe existir otra asignación con la misma combinación:

* `id_semestre`
* `id_docente`
* `id_materia`
* `id_grupo`

La base de datos debe conservar una restricción UNIQUE para esta
combinación.

---

#### 5.4.6 Límite de Carga Docente

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

#### 5.4.7 Grupo Obligatorio

El flujo normal de asignación se define como:

`semestre + docente + materia + grupo`

Por lo tanto, para nuevas asignaciones:

`id_grupo`

deberá ser obligatorio desde la aplicación.

No crear asignaciones sin grupo.

---

### 5.5 MÓDULO DE HORARIOS

Tablas principales:

* `horario_detalle`
* `bloque_horario`
* `asignacion_docente`

#### 5.5.1 Pestañas

Mostrar:

* Horario de Grupo.
* Horario de Docente.
* Materias por Semestre.

---

#### 5.5.2 Selección del Grupo y Asignación Docente-Materia

1. **Selección de Grupo / Docente:** Mostrar un combo para seleccionar el Grupo (en la pestaña *Horario de grupo*)[cite: 21] o el Docente (en la pestaña *Horario de docente*)[cite: 20], filtrado por `id_semestre` activo, `tipo_semestre` e `id_cct`.
2. **Selección de Asignación (Combo Docente - Materia):**
   * Mostrar un combo con la lista de asignaciones activas en `asignacion_docente`[cite: 20, 21].
   * **Formato del Texto en el Combo:** El texto de cada opción debe construirse explícitamente incluyendo las horas que le corresponden a la materia (`materia.horas`), con la siguiente estructura:
     $$\text{DOCENTE} \cdot \text{MATERIA} \cdot \text{GRUPO} \cdot (\text{horas } h)$$
     *(Ejemplo: `CONTRERAS ROMO MARTIN · CODIFICA SOFTWARE DE SISTEMAS INFORMATICOS · 2° G · (7 h)`)*
   * **Indicador Visual de Horas:** Al seleccionar una asignación, se mostrará dinámicamente un contador con las **horas asignadas en la retícula / horas totales de la materia** (Ejemplo: `Asignadas: 3 / 7 hrs`).
3. **Botón Imprimir Horario y Paginación Optimizada:**
   * Tanto en la pestaña **Horario de Grupo**[cite: 21] como en **Horario de Docente**[cite: 20], incluir un botón **"Imprimir Horario"** en la barra superior.
   * **Reglas de Paginación CSS y Repetición de Encabezado (`@media print`) [NUEVO/ACTUALIZADO]:**
     * **Ajuste de Horario de Grupo (1 Hoja):** El horario de grupo completo debe configurarse mediante CSS (`max-height`, paddings reducidos en celdas, tamaño de fuente optimizado a `10px`/`11px` y `page-break-inside: avoid`) para que quepa **estrictamente en 1 sola página impresa**.
     * **División de Horario de Docente por Turno (2 Hojas) con Encabezado Obligatorio en Cada Página [NUEVO/ACTUALIZADO]:** Cuando un docente imparte clases en ambos turnos, la impresión debe estructurar dos secciones independientes. El Turno Matutino se imprimirá en la **Página 1** y el Turno Vespertino se imprimirá en la **Página 2** mediante la regla CSS `break-before: page` (o `page-break-before: always`). **Cada una de las dos páginas debe incluir de forma obligatoria e independiente el encabezado completo de identificación con el CCT, Plantel, Semestre Activo y Nombre del Docente**, garantizando que ambas hojas sean documentos oficiales autónomos.

---

#### 5.5.3 Selección de Docente / Materia

Mostrar únicamente asignaciones existentes en:

`asignacion_docente`

correspondientes a:

* grupo seleccionado;
* semestre seleccionado.

La información visible deberá incluir:

* docente;
* materia;
* horas asignadas de la materia.

---

#### 5.5.4 Retícula Semanal

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

#### 5.5.5 Bloques Matutinos

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

#### 5.5.6 Bloques Vespertinos

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

### 5.6 OPERACIÓN DE LA MALLA DE HORARIOS

Al hacer clic en una celda disponible:

1. Obtener la asignación docente seleccionada.
2. Obtener `id_asignacion`.
3. Obtener `id_semestre`.
4. Obtener `id_docente`.
5. Obtener `id_grupo`.
6. Validar todas las reglas de disponibilidad y límite de horas.
7. Si no existen conflictos, insertar en `horario_detalle`:

   * `id_asignacion`
   * `dia_semana`
   * `id_bloque`

La información mostrada visualmente en la celda deberá incluir al menos:

* docente;
* materia.

---

#### 5.6.1 Eliminación desde una Celda

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

### 5.7 VALIDACIONES BACKEND AL GUARDAR HORARIO

Todas estas validaciones deberán ejecutarse antes de insertar
`horario_detalle`.

---

#### 5.7.1 Semestre Activo

La asignación deberá pertenecer al semestre seleccionado.

El semestre deberá tener:

`id_status = 1`

Si el semestre está inactivo, no permitir:

* insertar;
* modificar;
* eliminar horarios.

---

#### 5.7.2 Tope de Horas de la Materia por Asignación

* **Validación de Límite de Horas de Materia:** Antes de registrar un nuevo bloque en `horario_detalle` para una `id_asignacion` específica, se debe contar el número total de bloques/módulos que esa `id_asignacion` ya tiene registrados en la tabla `horario_detalle` para el `id_semestre` activo.
* **Regla de Negocio:** La cantidad de bloques asignados en el horario semanal **no puede superar** el valor de `materia.horas` correspondiente a la materia de dicha asignación.
  $$\text{Bloques Asignados} + 1 \le \text{materia.horas}$$

* **Mensaje de Error:** Si la materia requiere 7 horas semanales (`materia.horas = 7`) y el usuario intenta asignar un 8° bloque para esa materia en el horario, el backend rechazará la operación y responderá con el mensaje:
  **"No se puede asignar el horario: la materia ya tiene cubiertas sus X horas semanales permitidas."**

---

#### 5.7.3 Sin Empalme de Docente

Un docente no puede tener más de una clase en:

* mismo `id_semestre`;
* mismo `dia_semana`;
* mismo `id_bloque`.

La combinación lógica de validación será:

`id_docente + id_semestre + dia_semana + id_bloque`

Si ya existe otra asignación, mostrar:

**Horario no disponible: el docente ya tiene una clase asignada en ese horario.**

---

#### 5.7.4 Sin Empalme de Grupo

Un grupo no puede tener más de una clase en:

* mismo `id_semestre`;
* mismo `dia_semana`;
* mismo `id_bloque`.

La combinación lógica será:

`id_grupo + id_semestre + dia_semana + id_bloque`

Si ya existe otra asignación, mostrar:

**Horario no disponible: el grupo ya tiene una clase asignada en ese horario.**

---

#### 5.7.5 Compatibilidad del Turno

El bloque horario deberá corresponder al turno del grupo.

Debe cumplirse:

`grupo.id_turno = bloque_horario.id_turno`

Ejemplo:

Un grupo Matutino no podrá utilizar bloques V1-V8.

Un grupo Vespertino no podrá utilizar bloques M1-M8.

---

#### 5.7.6 Coherencia del Semestre

La asignación, materia y grupo deberán respetar el semestre activo.

Validar:

`asignacion_docente.id_semestre = semestre seleccionado`

y además:

`materia.tipo_semestre = semestre.tipo_semestre`

`grupo.tipo_semestre = semestre.tipo_semestre`

---

#### 5.7.7 Número de Semestre

Validar:

`materia.semestre = grupo.semestre`

No será suficiente que ambos pertenezcan al mismo tipo P/N.

---

#### 5.7.8 Centro de Trabajo

La asignación utilizada deberá pertenecer al mismo CCT del semestre
y del grupo que se está programando. Para Administrador y Revisor, deberá coincidir estrictamente con su `usuario.id_ct`.

---

### 5.8 TRANSACCIONES Y CONCURRENCIA

Las operaciones críticas de horarios deberán realizarse utilizando
transacciones SQL.

Flujo recomendado:

1. Iniciar transacción.
2. Recuperar información de `id_asignacion`.
3. Validar semestre activo.
4. Validar disponibilidad de horas de la materia (`bloques_actuales < materia.horas`).
5. Validar disponibilidad del docente.
6. Validar disponibilidad del grupo.
7. Validar turno.
8. Validar coherencia de semestre.
9. Insertar o eliminar `horario_detalle`.
10. Confirmar transacción.

En caso de error:

`ROLLBACK`

En caso exitoso:

`COMMIT`

Esto evita inconsistencias cuando dos usuarios intenten modificar
el horario simultáneamente.

---

### 5.9 RESPONSABILIDAD DE LAS CAPAS

#### Base de Datos

Responsable de:

* claves primarias;
* claves foráneas;
* restricciones UNIQUE;
* integridad referencial;
* almacenamiento persistente;
* vistas SQL;
* usuarios y contraseñas.

#### Backend

Responsable de:

* autenticación de usuarios y caducidad de sesión (5 min de inactividad);
* middleware de control de acceso, matriz de permisos por rol y restricción estricta por `id_ct` (salvo Superadministrador);
* semestre activo;
* permisos de modificación;
* par / impar;
* compatibilidad materia-grupo;
* compatibilidad de CCT;
* control de horas del docente;
* control de tope de horas por materia (`materia.horas`);
* empalme de docente;
* empalme de grupo;
* compatibilidad de turno;
* transacciones.

#### Frontend

Responsable de:

* formulario de inicio de sesión (Login);
* presentación según rol del usuario logueado;
* fijar y deshabilitar la selección de Centro de Trabajo (CCT) para Administrador y Revisor;
* autocompletar dinámicamente Turno y Especialidad informativos al seleccionar un Grupo en Carga Docente[cite: 18, 19];
* incluir el número de horas de la materia en las opciones del combo Asignación en la vista de Horarios;
* mostrar el contador dinámico de horas asignadas vs. horas semanales permitidas;
* **ajustar la maquetación de impresión mediante CSS `@media print` para forzar que el Horario de Grupo ocupe 1 sola página y separar el Horario de Docente en 2 páginas (Matutino/Vespertino) asegurando que el encabezado con CCT y datos del docente se repita en la parte superior de cada página [NUEVO/ACTUALIZADO]**[cite: 22];
* ocultar / deshabilitar botones de edición para perfiles restringidos o rol Revisor (solo lectura);
* selects dependientes;
* filtros;
* búsqueda;
* tablas;
* contadores;
* mensajes al usuario;
* representación de la malla;
* bloqueo visual de acciones cuando el semestre no sea editable o el rol no tenga permisos de escritura.

Las restricciones críticas siempre deben volver a validarse en backend.

---

## 6. CATÁLOGO DE BLOQUES DE HORARIO

### Turno Matutino — id_turno = 1

* M1 — 07:00-07:50
* M2 — 07:50-08:40
* M3 — 08:40-09:30
* Receso — 09:30-09:50
* M4 — 09:50-10:40
* M5 — 10:40-11:30
* M6 — 11:30-12:20
* M7 — 12:20-13:10
* M8 — 13:10-14:00

### Turno Vespertino — id_turno = 2

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

## 7. CRITERIOS GENERALES DE IMPLEMENTACIÓN

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

## 8. CRITERIO DE ÉXITO DEL MÓDULO DE AUTENTICACIÓN Y CONTROL DE ACCESO

El módulo se considerará funcionalmente correcto cuando:

1. El inicio de sesión valide credenciales directamente contra la tabla `usuario` en MySQL.
2. La sesión expire automáticamente tras **5 minutos de inactividad**.
3. El Superadministrador tenga acceso total a la consulta, edición, creación y libre selección entre cualquier Centro de Trabajo (CCT) registrado.
4. El Administrador y el Revisor queden estrictamente limitados al Centro de Trabajo registrado en su cuenta (`usuario.id_ct`), sin poder seleccionar o modificar datos de ningún otro CCT.
5. El Administrador pueda editar/agregar en la Carga Docente, Horarios y catálogos de docente, materia, grupo, academia y especialidad de su CCT, con acceso de solo lectura a los catálogos globales (semestre, CCT, bloques, turno) y bloqueo total a usuarios, tipos de usuario y estatus.
6. El **Revisor** pueda consultar la Carga Docente, Horarios y catálogos permitidos únicamente de su CCT, pero con un bloqueo **estricto a nivel de backend y frontend de cualquier acción de creación, edición o eliminación (modo 100% solo lectura)**.
7. El backend rechace con HTTP 401 o 403 cualquier petición `POST`, `PUT` o `DELETE` realizada por usuarios no autenticados, con rol **Revisor**, o que intente acceder/modificar registros pertenecientes a un CCT distinto al asignado en la sesión del usuario.
8. En la vista de Horarios, el combo de asignación muestre explícitamente las horas correspondientes a la materia y se impida visualmente y en backend asignar más celdas/bloques en la retícula que el límite semanal permitido por la materia (`materia.horas`).
9. **El Horario de Grupo se imprima ajustado a 1 sola página, mientras que el Horario de Docente se separe en 2 páginas (Página 1: Turno Matutino, Página 2: Turno Vespertino) incluyendo el encabezado de identificación (CCT, Plantel, Semestre Activo y Nombre del Docente) en la parte superior de cada una de las dos páginas [NUEVO/ACTUALIZADO]**[cite: 22].