import test from 'node:test';
import assert from 'node:assert/strict';
import { authMiddleware, roleMiddleware, cctMiddleware, getEffectiveCct, ROLES } from '../src/lib/auth.js';

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function makeReq(overrides: Partial<{ path: string; method: string; user: any; query: Record<string, unknown>; body: Record<string, unknown> }>) {
  return {
    path: overrides.path ?? '/docentes',
    method: overrides.method ?? 'GET',
    session: overrides.user === undefined ? {} : { user: overrides.user },
    query: overrides.query ?? {},
    body: overrides.body ?? {},
  } as any;
}

test('authMiddleware allows /health without a session', () => {
  const req = makeReq({ path: '/health' });
  const res = makeRes();
  let called = false;
  authMiddleware(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
});

test('authMiddleware blocks requests without an authenticated session', () => {
  const req = makeReq({ path: '/docentes' });
  const res = makeRes();
  let called = false;
  authMiddleware(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 401);
});

test('roleMiddleware grants Superadministrador full access to /usuarios', () => {
  const req = makeReq({ path: '/usuarios', method: 'POST', user: { tipo_usuario: ROLES.SUPERADMIN } });
  const res = makeRes();
  let called = false;
  roleMiddleware(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
});

test('roleMiddleware blocks Administrador from /usuarios with 403', () => {
  const req = makeReq({ path: '/usuarios', method: 'GET', user: { tipo_usuario: ROLES.ADMIN } });
  const res = makeRes();
  let called = false;
  roleMiddleware(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});

test('roleMiddleware allows Administrador read-only access to /semestres but blocks writes', () => {
  const readReq = makeReq({ path: '/semestres', method: 'GET', user: { tipo_usuario: ROLES.ADMIN } });
  const readRes = makeRes();
  let readCalled = false;
  roleMiddleware(readReq, readRes, () => {
    readCalled = true;
  });
  assert.equal(readCalled, true);

  const writeReq = makeReq({ path: '/semestres', method: 'POST', user: { tipo_usuario: ROLES.ADMIN } });
  const writeRes = makeRes();
  let writeCalled = false;
  roleMiddleware(writeReq, writeRes, () => {
    writeCalled = true;
  });
  assert.equal(writeCalled, false);
  assert.equal(writeRes.statusCode, 403);
});

test('roleMiddleware allows Revisor read access but blocks any write', () => {
  const readReq = makeReq({ path: '/docentes/12', method: 'GET', user: { tipo_usuario: ROLES.REVISOR } });
  const readRes = makeRes();
  let readCalled = false;
  roleMiddleware(readReq, readRes, () => {
    readCalled = true;
  });
  assert.equal(readCalled, true);

  for (const method of ['POST', 'PUT', 'DELETE']) {
    const req = makeReq({ path: '/docentes/12', method, user: { tipo_usuario: ROLES.REVISOR } });
    const res = makeRes();
    let called = false;
    roleMiddleware(req, res, () => {
      called = true;
    });
    assert.equal(called, false, `Revisor should not be allowed to ${method}`);
    assert.equal(res.statusCode, 403);
  }
});

test('roleMiddleware blocks Captura/Docente from academic catalogs entirely', () => {
  for (const role of [ROLES.CAPTURA, ROLES.DOCENTE]) {
    const req = makeReq({ path: '/materias', method: 'GET', user: { tipo_usuario: role } });
    const res = makeRes();
    let called = false;
    roleMiddleware(req, res, () => {
      called = true;
    });
    assert.equal(called, false);
    assert.equal(res.statusCode, 403);
  }
});

test('getEffectiveCct returns null for Superadministrador (sin restricción)', () => {
  const req = makeReq({ user: { tipo_usuario: ROLES.SUPERADMIN, id_ct: 1 } });
  assert.equal(getEffectiveCct(req), null);
});

test('getEffectiveCct returns the session CCT for Administrador/Revisor', () => {
  const adminReq = makeReq({ user: { tipo_usuario: ROLES.ADMIN, id_ct: 7 } });
  assert.equal(getEffectiveCct(adminReq), 7);
  const revisorReq = makeReq({ user: { tipo_usuario: ROLES.REVISOR, id_ct: 3 } });
  assert.equal(getEffectiveCct(revisorReq), 3);
});

test('cctMiddleware lets Superadministrador pass through untouched', () => {
  const req = makeReq({ user: { tipo_usuario: ROLES.SUPERADMIN, id_ct: 1 }, query: { id_cct: '99' } });
  const res = makeRes();
  let called = false;
  cctMiddleware(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.query.id_cct, '99');
});

test('cctMiddleware forces id_cct to the session CCT for Administrador/Revisor', () => {
  const req = makeReq({ user: { tipo_usuario: ROLES.ADMIN, id_ct: 5 } });
  const res = makeRes();
  let called = false;
  cctMiddleware(req, res, () => {
    called = true;
  });
  assert.equal(called, true);
  assert.equal(req.query.id_cct, '5');
  assert.equal(req.body.id_cct, 5);
});

test('cctMiddleware blocks with 403 when Administrador/Revisor request a different CCT', () => {
  for (const provided of [{ query: { id_cct: '9' } }, { body: { id_cct: 9 } }]) {
    const req = makeReq({ user: { tipo_usuario: ROLES.ADMIN, id_ct: 5 }, ...provided });
    const res = makeRes();
    let called = false;
    cctMiddleware(req, res, () => {
      called = true;
    });
    assert.equal(called, false);
    assert.equal(res.statusCode, 403);
  }
});

test('cctMiddleware blocks Administrador/Revisor without an assigned CCT', () => {
  const req = makeReq({ user: { tipo_usuario: ROLES.REVISOR, id_ct: null } });
  const res = makeRes();
  let called = false;
  cctMiddleware(req, res, () => {
    called = true;
  });
  assert.equal(called, false);
  assert.equal(res.statusCode, 403);
});
