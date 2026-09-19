/**
 * =============================================================================
 * DESTRABA AI â€” SERVIDOR DE PASARELAS Y WEBHOOKS BLINDADOS
 * Pasarelas: Wompi SV y Strike Lightning (rick2818@strike.me)
 * =============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  StrikeLightningGateway,
  WompiGateway,
  CATALOGO_PRECIOS_USD,
  applyBankingSecurityHeaders,
  checkRateLimit,
  recordAndVerifyIdempotency
} from '../lib/payment_security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.PAYMENTS_PORT || 8766;

const strike = new StrikeLightningGateway({
  lightningAddress: 'rick2818@strike.me'
});

const wompi = new WompiGateway({
  appId: process.env.WOMPI_APP_ID || '',
  apiSecret: process.env.WOMPI_API_SECRET || '',
  webhookSecret: process.env.WOMPI_WEBHOOK_SECRET || ''
});

const server = http.createServer(async (req, res) => {
  applyBankingSecurityHeaders(res);

  // CORS blindado con whitelist fiduciaria
  const ALLOWED_ORIGINS = new Set([
    'https://destraba.ai',
    'https://app.destraba.ai',
    'https://rick2818.github.io',
    'http://localhost:8765',
    'http://localhost:8766',
    'http://127.0.0.1:8765'
  ]);
  const reqOrigin = req.headers.origin;
  if (reqOrigin && ALLOWED_ORIGINS.has(reqOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  } else if (!reqOrigin) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Herramientas locales o curl sin cabecera origin
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://destraba.ai');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Signature, X-Strike-Signature, X-Event-Checksum, X-Idempotency-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  // Anti-DDoS / Anti-Carding
  if (!checkRateLimit(clientIp, 15, 60000)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Demasiadas solicitudes. Límite de seguridad alcanzado.' }));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (req.method === 'GET' && url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'destraba-ai-gateway', timestamp: new Date().toISOString() }));
    return;
  }

  // Servir frontend web: /, /index.html o /dashboard.html
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '/dashboard.html')) {
    const targetFile = url.pathname === '/dashboard.html' ? 'dashboard.html' : 'index.html';
    const filePath = path.join(ROOT_DIR, targetFile);
    if (fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(filePath));
      return;
    }
  }

  // Endpoint 1: Catálogo Oficial de Precios en USD
  if (req.method === 'GET' && url.pathname === '/api/payments/catalog') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, catalog: CATALOGO_PRECIOS_USD }));
    return;
  }

  // Leer cuerpo de la solicitud con protecci?n anti-DoS (l?mite 512 KB)
  const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 KB max
  let bodyStr = '';
  let bodyOverflow = false;

  req.on('data', chunk => {
    bodyStr += chunk;
    if (Buffer.byteLength(bodyStr) > MAX_PAYLOAD_BYTES) {
      bodyOverflow = true;
      res.writeHead(413, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Payload Too Large. L?mite de seguridad de 512 KB excedido.' }));
      req.destroy();
    }
  });

  req.on('error', err => {
    console.error('?? [HTTP ERROR]: Error en stream entrante:', err.message);
  });

  req.on('end', async () => {
    if (bodyOverflow) return;
    let payload = {};
    if (bodyStr) {
      try { payload = JSON.parse(bodyStr); } catch (e) { payload = {}; }
    }

    // Endpoint 2: Crear Cobro Strike Lightning (rick2818@strike.me)
    if (req.method === 'POST' && url.pathname === '/api/payments/strike') {
      try {
        const { product_id, email } = payload;
        const result = await strike.createLightningPayment(product_id, email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Endpoint 3: Crear Enlace Wompi SV
    if (req.method === 'POST' && url.pathname === '/api/payments/wompi') {
      try {
        const { product_id, email, redirect_url } = payload;
        const result = await wompi.createPaymentLink(product_id, email, redirect_url);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Endpoint 4: Webhook Listener Wompi SV (Firmado HMAC SHA-256)
    if (req.method === 'POST' && url.pathname === '/api/webhooks/wompi') {
      const signature = req.headers['x-wompi-signature'] || '';
      const isValid = wompi.verifyWebhookSignature(bodyStr, signature);

      if (!isValid) {
        console.warn('[SEGURIDAD]: Firma inválida en Wompi Webhook. Petición rechazada.');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firma criptográfica inválida o no autorizada.' }));
        return;
      }

      const txId = payload.idTransaccion || payload.referencia || `tx_${Date.now()}`;
      const idempotency = recordAndVerifyIdempotency(txId);

      if (idempotency.isDuplicate) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ACKNOWLEDGED_DUPLICATE', txId }));
        return;
      }

      console.log(`âœ… [WOMPI WEBHOOK]: Pago recibido y validado. TxId: ${txId}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'SUCCESS', verified: isValid, txId }));
      return;
    }

    // Endpoint 5: Webhook Listener Strike (Firmado HMAC SHA-256 con verificaci?n obligatoria)
    if (req.method === 'POST' && url.pathname === '/api/webhooks/strike') {
      const signature = req.headers['x-strike-signature'] || '';
      const isValid = strike.verifyWebhookSignature(bodyStr, signature);

      // Bloqueo inmediato de fraude (SEC-PAY-01) — se aplica siempre, no solo en producción
      if (!isValid) {
        console.warn('[SEGURIDAD]: Firma inválida en Strike Webhook. Petición rechazada.');
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Firma criptográfica inválida o no autorizada.' }));
        return;
      }

      const txId = payload.data?.id || `strike_${Date.now()}`;
      const idempotency = recordAndVerifyIdempotency(txId);

      if (idempotency.isDuplicate) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ACKNOWLEDGED_DUPLICATE', txId }));
        return;
      }

      console.log(`âš¡ [STRIKE LIGHTNING WEBHOOK]: Satoshis acreditados a rick2818@strike.me. TxId: ${txId}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'SUCCESS', destination: 'rick2818@strike.me', txId }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint no encontrado.' }));
  });
});

server.listen(PORT, () => {
  console.log(`ðŸ›¡ï¸ [DESTRABA AI] Servidor de Pasarelas Bancarias activo en http://localhost:${PORT}`);
  console.log(`âš¡ Strike Lightning Address: rick2818@strike.me`);
  console.log(`ðŸ’³ Wompi SV Router: Preparado para liquidaciones en USD`);
});

