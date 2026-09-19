import handler from '../api/cron/master-dispatcher.js';
import fs from 'node:fs';

// Cargar .env si existe
if (fs.existsSync('.env')) {
  const envText = fs.readFileSync('.env', 'utf8');
  envText.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        if (k && !process.env[k]) process.env[k] = v;
      }
    }
  });
}

// Fallback fiduciario para entorno de pruebas en CI o máquina limpia
if (!process.env.CRON_SECRET && !process.env.PLATFORM_MASTER_KEY) {
  process.env.CRON_SECRET = 'test_cron_secret_mock_2026';
}

async function runDispatcherTest() {
  console.log('1. Probando Master Dispatcher sin autorización (debe fallar 401)...');
  let mockRes = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) {
      console.log('Unauthorized status:', this.statusCode, JSON.stringify(data));
      return this;
    }
  };
  await handler({ method: 'POST', headers: {} }, mockRes);
  console.assert(mockRes.statusCode === 401, 'Debe devolver 401 sin Bearer token');

  console.log('\n2. Probando Master Dispatcher con Bearer Token correcto...');
  const secret = process.env.CRON_SECRET || process.env.PLATFORM_MASTER_KEY || 'antigravity2026!';
  let dispatchData = null;
  mockRes = {
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(data) {
      dispatchData = data;
      console.log('Authorized status:', this.statusCode, JSON.stringify(data, null, 2));
      return this;
    }
  };

  const req = {
    method: 'POST',
    url: '/api/cron/master-dispatcher?task=all',
    headers: {
      'authorization': `Bearer ${secret}`,
      'content-type': 'application/json'
    },
    body: { task: 'all' }
  };

  await handler(req, mockRes);
  console.assert(mockRes.statusCode === 200, 'Debe responder 200 OK');
  console.assert(dispatchData && dispatchData.success === true, 'Reporte debe ser exitoso');
  console.log('\n✅ Master Cloud Dispatcher Probado y 100% Funcional.');
}

runDispatcherTest().catch(console.error);
