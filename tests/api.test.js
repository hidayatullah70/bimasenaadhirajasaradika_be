const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { pool } = require('../src/config/db');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (pool && pool.end) {
    await pool.end();
  }
});

test('1. GET / - Root Endpoint Info', async () => {
  const res = await fetch(`${baseUrl}/`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.status, 'online');
  assert.equal(data.base_url, '/api/v1');
});

test('2. GET /api/v1/public/services - Public Services List', async () => {
  const res = await fetch(`${baseUrl}/api/v1/public/services`);
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
});

test('3. POST /api/v1/auth/login - Fails on invalid credentials', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'direktur@bhimasena.co.id', password: 'wrongpassword' })
  });
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test('4. POST /api/v1/auth/login - Direktur login succeeds with valid token', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'direktur@bhimasena.co.id', password: 'password123' })
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.token);
  assert.equal(data.data.user.role, 'direktur');
});

test('5. RBAC Security: Protected endpoint rejects request without token (401)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/users`);
  const data = await res.json();

  assert.equal(res.status, 401);
  assert.equal(data.success, false);
});

test('6. RBAC Security: HRD token cannot access Users data (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/users`, {
    headers: { Authorization: 'Bearer mock-jwt-token-hrd' }
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test('7. RBAC Security: HRD token cannot create Invoices (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/invoices`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer mock-jwt-token-hrd',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ client_id: 1, amount: 5000000 })
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test('8. RBAC Security: HRD token can access Employees list (200 OK)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/employees`, {
    headers: { Authorization: 'Bearer mock-jwt-token-hrd' }
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
});

test('9. RBAC Security: Finance token cannot access Users data (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/users`, {
    headers: { Authorization: 'Bearer mock-jwt-token-finance' }
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test('10. RBAC Security: Finance token cannot delete Employees (403 Forbidden)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/employees/1`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer mock-jwt-token-finance' }
  });
  const data = await res.json();

  assert.equal(res.status, 403);
  assert.equal(data.success, false);
});

test('11. RBAC Security: Finance token can access Invoices list (200 OK)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/invoices`, {
    headers: { Authorization: 'Bearer mock-jwt-token-finance' }
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
});

test('12. Direktur Dashboard Summary (200 OK)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/dashboard/summary`, {
    headers: { Authorization: 'Bearer mock-jwt-token-direktur' }
  });
  const data = await res.json();

  assert.equal(res.status, 200);
  assert.equal(data.success, true);
  assert.ok(data.data.kpi);
  assert.ok(Array.isArray(data.data.servicesSummary));
});

test('13. 404 Route Not Found handling', async () => {
  const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
  const data = await res.json();

  assert.equal(res.status, 404);
  assert.equal(data.success, false);
});
