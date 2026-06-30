#!/usr/bin/env node
// Smoke-tests the running fullstack app.
// Usage: node .claude/skills/run-fullstack-app/smoke.mjs
// Requires both apps to already be running (see SKILL.md).

const API = process.env.API_URL ?? 'http://localhost:4000/api';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${label}: ${e.message}`);
    failed++;
  }
}

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function get(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  console.log('Backend API:', API);
  console.log('Frontend:', WEB);
  console.log();

  // --- Backend ---
  await check('GET /api/health returns ok', async () => {
    const data = await get('/health');
    if (data.status !== 'ok') throw new Error(`Expected ok, got ${data.status}`);
  });

  const email = `smoke-${Date.now()}@example.com`;
  let token;

  await check('POST /api/auth/register creates user', async () => {
    const data = await post('/auth/register', { email, name: 'Smoke Test', password: 'Pass123!' });
    if (!data.token) throw new Error('No token in response');
    if (data.user.email !== email) throw new Error('Email mismatch');
    token = data.token;
  });

  await check('POST /api/auth/login returns token', async () => {
    const data = await post('/auth/login', { email, password: 'Pass123!' });
    if (!data.token) throw new Error('No token in response');
    token = data.token;
  });

  await check('GET /api/auth/me returns current user', async () => {
    const data = await get('/auth/me', token);
    if (data.email !== email) throw new Error(`Expected ${email}, got ${data.email}`);
  });

  await check('POST /api/auth/login rejects bad password', async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'wrongpassword' }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  });

  // --- Frontend pages ---
  for (const path of ['/', '/login', '/register']) {
    await check(`GET ${WEB}${path} returns 200`, async () => {
      const res = await fetch(`${WEB}${path}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
  }

  console.log();
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
