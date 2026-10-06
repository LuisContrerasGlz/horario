import type { NextFunction, Request, Response } from 'express';

// Roles de `tipo_usuario` (ver PLAN_DESARROLLO_COPILOT.md §2.2). `Revisor` es
// un rol nuevo (id_tipo_usuario = 5, agregado en database/seed.sql) sin
// precedente en el dump original de `sis_doc`.
export const ROLES = {
  SUPERADMIN: 1,
  ADMIN: 2,
  CAPTURA: 3,
  DOCENTE: 4,
  REVISOR: 5,
} as const;

export type RoleId = number;

interface RoutePermission {
  prefix: string;
  read: RoleId[];
  write: RoleId[];
}

const ACADEMIC_READ = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.REVISOR];
const ACADEMIC_WRITE = [ROLES.SUPERADMIN, ROLES.ADMIN];
const SYSTEM_READ = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.REVISOR];
const SYSTEM_WRITE = [ROLES.SUPERADMIN];
const SUPERADMIN_ONLY = [ROLES.SUPERADMIN];

// Prefijos evaluados en orden; se usa el más específico que coincida con
// `req.path` (relativo al router montado en `/api`).
const ROUTE_PERMISSIONS: RoutePermission[] = [
  { prefix: '/usuarios', read: SUPERADMIN_ONLY, write: SUPERADMIN_ONLY },
  { prefix: '/tipos-usuario', read: SUPERADMIN_ONLY, write: SUPERADMIN_ONLY },
  { prefix: '/status', read: SUPERADMIN_ONLY, write: SUPERADMIN_ONLY },
  { prefix: '/semestres', read: SYSTEM_READ, write: SYSTEM_WRITE },
  { prefix: '/centros-trabajo', read: SYSTEM_READ, write: SYSTEM_WRITE },
  { prefix: '/bloques', read: SYSTEM_READ, write: SYSTEM_WRITE },
  { prefix: '/turnos', read: SYSTEM_READ, write: SYSTEM_WRITE },
  { prefix: '/docentes', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
  { prefix: '/materias', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
  { prefix: '/grupos', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
  { prefix: '/academias', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
  { prefix: '/especialidades', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
  { prefix: '/asignaciones', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
  { prefix: '/horario', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
  { prefix: '/catalogos', read: ACADEMIC_READ, write: [] },
  { prefix: '/session', read: ACADEMIC_READ, write: ACADEMIC_WRITE },
];

// Rutas que no requieren sesión activa (montadas bajo /api).
const PUBLIC_PATHS = new Set(['/health']);

function matchPermission(path: string): RoutePermission | undefined {
  return ROUTE_PERMISSIONS.find((permission) => path === permission.prefix || path.startsWith(`${permission.prefix}/`));
}

// Bloquea cualquier petición sin sesión válida o cuya inactividad expiró
// (express-session ya descarta la sesión almacenada una vez vencido su
// `cookie.maxAge`, ver server.ts) - §2.4.1.
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.has(req.path)) {
    return next();
  }
  if (!req.session?.user) {
    return res.status(401).json({ message: 'Sesión no iniciada o expirada.', code: 'UNAUTHENTICATED' });
  }
  return next();
}

// Aplica la matriz de permisos por rol - §2.2/§2.4.2. Debe ejecutarse después
// de `authMiddleware`.
export function roleMiddleware(req: Request, res: Response, next: NextFunction) {
  if (PUBLIC_PATHS.has(req.path)) {
    return next();
  }
  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({ message: 'Sesión no iniciada o expirada.', code: 'UNAUTHENTICATED' });
  }

  const permission = matchPermission(req.path);
  const isWrite = !['GET', 'HEAD'].includes(req.method);
  const allowedRoles = permission ? (isWrite ? permission.write : permission.read) : [];

  if (!allowedRoles.includes(user.tipo_usuario)) {
    return res.status(403).json({ message: 'No tiene permisos para realizar esta acción.', code: 'FORBIDDEN' });
  }
  return next();
}

// Roles restringidos a su propio centro de trabajo (`id_ct` de sesión) - §2.
const CCT_RESTRICTED_ROLES: RoleId[] = [ROLES.ADMIN, ROLES.REVISOR];

// CCT efectivo que debe aplicarse a la petición: `null` significa "sin
// restricción" (Superadministrador, o sin sesión). Administrador y Revisor
// siempre quedan acotados a `session.user.id_ct`.
export function getEffectiveCct(req: Request): number | null {
  const user = req.session?.user;
  if (!user || !CCT_RESTRICTED_ROLES.includes(user.tipo_usuario)) {
    return null;
  }
  return user.id_ct ?? null;
}

// Fuerza que cualquier `id_cct` enviado por Administrador/Revisor coincida con
// su CCT de sesión y lo inyecta en query/body para que las rutas lo utilicen
// como filtro/valor de forma transparente - §2 (Restricción por CCT).
export function cctMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = req.session?.user;
  if (!user || !CCT_RESTRICTED_ROLES.includes(user.tipo_usuario)) {
    return next();
  }

  if (user.id_ct === null || user.id_ct === undefined) {
    return res.status(403).json({ message: 'El usuario no tiene un centro de trabajo (CCT) asignado.', code: 'FORBIDDEN_CCT' });
  }

  const bodyCct = req.body && typeof req.body === 'object' ? req.body.id_cct : undefined;
  const queryCct = (req.query as Record<string, unknown>)?.id_cct;
  for (const provided of [bodyCct, queryCct]) {
    if (provided !== undefined && provided !== null && provided !== '' && Number(provided) !== Number(user.id_ct)) {
      return res.status(403).json({ message: 'No tiene acceso al centro de trabajo (CCT) solicitado.', code: 'FORBIDDEN_CCT' });
    }
  }

  if (req.body && typeof req.body === 'object') {
    req.body.id_cct = user.id_ct;
  }
  (req.query as Record<string, unknown>).id_cct = String(user.id_ct);
  return next();
}
