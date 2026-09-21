// Ejecutar con:  node --test tests/test_header_scanner.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  normalizeDomain, isPublicIp, parseCsp, analyzeHeaders, buildPatches, scanDomain
} from '../lib/header_scanner.js';
import { buildScanEmail } from '../lib/scan_report_email.js';

// ---------------------------------------------------------------------------
// Validación de dominio (SSRF)
// ---------------------------------------------------------------------------
test('normalizeDomain acepta dominios públicos y normaliza', () => {
  assert.equal(normalizeDomain('Example.COM'), 'example.com');
  assert.equal(normalizeDomain('https://www.tuempresa.com/ruta?x=1#a'), 'www.tuempresa.com');
  assert.equal(normalizeDomain('  sub.dominio.co.sv. '), 'sub.dominio.co.sv');
});

test('normalizeDomain rechaza IPs, localhost, puertos, credenciales y TLD internos', () => {
  for (const bad of [
    '127.0.0.1', '10.0.0.5', '169.254.169.254', '[::1]', '::1', 'localhost', 'localhost.localdomain',
    'servidor.local', 'db.internal', 'router.lan', 'example.com:8080', 'user@example.com', 'http://user:pw@example.com',
    '2130706433', '1.2.3.4', 'a b.com', 'exa_mple.com', '', null, undefined, 42, 'x'.repeat(300) + '.com', 'solo-una-etiqueta'
  ]) {
    assert.equal(normalizeDomain(bad), null, `debió rechazar: ${bad}`);
  }
});

test('isPublicIp bloquea rangos privados / reservados y acepta públicas', () => {
  for (const ip of [
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1',
    '0.0.0.0', '224.0.0.1', '255.255.255.255', '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1', '64:ff9b::7f00:1', '2001:db8::1', 'fe80::1%eth0', 'no-es-ip'
  ]) {
    assert.equal(isPublicIp(ip), false, `debió bloquear: ${ip}`);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '2606:4700:4700::1111', '2a00:1450:4001:81b::200e']) {
    assert.equal(isPublicIp(ip), true, `debió permitir: ${ip}`);
  }
});

test('scanDomain bloquea dominios que resuelven a IPs privadas (sin conectar)', async () => {
  const lookup = async () => [{ address: '169.254.169.254', family: 4 }];
  const r = await scanDomain('metadata-trick.dev', { lookup });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'blocked');
});

test('scanDomain bloquea si CUALQUIERA de las IPs es privada (mezcla pública + privada)', async () => {
  const lookup = async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }];
  const r = await scanDomain('mixed.dev', { lookup });
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 'blocked');
});

test('scanDomain devuelve invalid_domain y dns_failed sin lanzar excepciones', async () => {
  assert.equal((await scanDomain('127.0.0.1')).error.code, 'invalid_domain');
  const lookup = async () => { const e = new Error('nx'); e.code = 'ENOTFOUND'; throw e; };
  assert.equal((await scanDomain('no-existe.dev', { lookup })).error.code, 'dns_failed');
});

// ---------------------------------------------------------------------------
// Análisis de cabeceras
// ---------------------------------------------------------------------------
const byId = (analysis, id) => analysis.checks.find((c) => c.id === id);

test('sin cabeceras: todo falla/avisa y la calificación es F', () => {
  const a = analyzeHeaders({});
  assert.equal(byId(a, 'csp').status, 'fail');
  assert.equal(byId(a, 'hsts').status, 'fail');
  assert.equal(byId(a, 'clickjacking').status, 'fail');
  assert.equal(a.grade, 'F');
  assert.equal(a.score, 13); // CSP/HSTS/clickjacking = 0; xcto, referrer y permissions en 'warn' suman 5 + 4 + 4
});

test('cabeceras completas y estrictas: calificación A', () => {
  const a = analyzeHeaders({
    'content-security-policy': "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'",
    'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=()'
  });
  assert.equal(a.grade, 'A');
  assert.equal(a.score, 100);
  assert.equal(a.summary.failed, 0);
  assert.equal(buildPatches(a.checks), null);
});

test("CSP con 'unsafe-inline' o https: en script-src se marca como débil (no como correcta)", () => {
  const inline = analyzeHeaders({ 'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'" });
  assert.equal(byId(inline, 'csp').status, 'warn');
  const anyHttps = analyzeHeaders({ 'content-security-policy': "default-src 'self'; script-src 'self' https:" });
  assert.equal(byId(anyHttps, 'csp').status, 'warn');
  const viaDefault = analyzeHeaders({ 'content-security-policy': "default-src * 'unsafe-inline'" });
  assert.equal(byId(viaDefault, 'csp').status, 'warn');
  const noScriptRules = analyzeHeaders({ 'content-security-policy': "img-src 'self'" });
  assert.equal(byId(noScriptRules, 'csp').status, 'warn');
});

test("'unsafe-inline' junto a nonce se considera aceptable (los navegadores lo ignoran)", () => {
  const a = analyzeHeaders({ 'content-security-policy': "script-src 'nonce-abc123' 'unsafe-inline'; object-src 'none'" });
  assert.equal(byId(a, 'csp').status, 'ok');
});

test('CSP solo en modo Report-Only cuenta como aviso, no como protección', () => {
  const a = analyzeHeaders({ 'content-security-policy-report-only': "default-src 'self'" });
  assert.equal(byId(a, 'csp').status, 'warn');
});

test('HSTS: ausente=fail, max-age corto=warn, largo=ok', () => {
  assert.equal(byId(analyzeHeaders({}), 'hsts').status, 'fail');
  assert.equal(byId(analyzeHeaders({ 'strict-transport-security': 'max-age=300' }), 'hsts').status, 'warn');
  assert.equal(byId(analyzeHeaders({ 'strict-transport-security': 'max-age=31536000' }), 'hsts').status, 'ok');
});

test('Clickjacking: X-Frame-Options o frame-ancestors cuentan; frame-ancestors * no', () => {
  assert.equal(byId(analyzeHeaders({ 'x-frame-options': 'DENY' }), 'clickjacking').status, 'ok');
  assert.equal(byId(analyzeHeaders({ 'x-frame-options': 'sameorigin' }), 'clickjacking').status, 'ok');
  assert.equal(byId(analyzeHeaders({ 'content-security-policy': "frame-ancestors 'self'" }), 'clickjacking').status, 'ok');
  assert.equal(byId(analyzeHeaders({ 'content-security-policy': 'frame-ancestors *' }), 'clickjacking').status, 'warn');
  assert.equal(byId(analyzeHeaders({}), 'clickjacking').status, 'fail');
});

test('parseCsp ignora directivas duplicadas (vale la primera, como en los navegadores)', () => {
  const d = parseCsp("script-src 'self'; script-src *");
  assert.deepEqual(d['script-src'], ["'self'"]);
});

// ---------------------------------------------------------------------------
// Parches: solo lo que falta
// ---------------------------------------------------------------------------
test('buildPatches incluye solo cabeceras faltantes y entrega la CSP en modo Report-Only', () => {
  const a = analyzeHeaders({ 'strict-transport-security': 'max-age=63072000', 'x-frame-options': 'DENY' });
  const p = buildPatches(a.checks);
  assert.ok(p.nginx.includes('Content-Security-Policy-Report-Only'));
  assert.ok(!/Strict-Transport-Security/.test(p.nginx), 'HSTS ya estaba bien: no debe repetirse');
  assert.ok(!/X-Frame-Options/.test(p.nginx));
  const cspValue = /Content-Security-Policy-Report-Only "([^"]+)"/.exec(p.nginx)[1];
  const scriptSrc = parseCsp(cspValue)['script-src'];
  assert.deepEqual(scriptSrc, ["'self'"], "script-src del parche no debe llevar 'unsafe-inline' ni https:");
  const parsed = JSON.parse(p.vercel); // debe ser JSON válido, listo para vercel.json
  assert.equal(parsed.headers[0].source, '/(.*)');
  assert.ok(p.apache.includes('<IfModule mod_headers.c>'));
  assert.ok(p.cloudflare.includes('export default'));
});

// ---------------------------------------------------------------------------
// Correo: solo datos reales y HTML escapado
// ---------------------------------------------------------------------------
test('el correo refleja el resultado real y escapa contenido del sitio escaneado', () => {
  const analysis = analyzeHeaders({ 'content-security-policy-report-only': '<script>alert(1)</script>' });
  const scan = { ok: true, domain: 'demo.dev', scannedAt: new Date().toISOString(), finalHost: 'demo.dev', caveats: [], tls: null, ...analysis, patches: buildPatches(analysis.checks) };
  const { subject, text, html } = buildScanEmail({ domain: 'demo.dev', email: 'a@b.co', scan });
  assert.ok(subject.includes('demo.dev'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
  for (const forbidden of ['SOC-2', '68%', 'CVSS', 'Harvard']) {
    assert.ok(!text.includes(forbidden) && !html.includes(forbidden), `no debe contener "${forbidden}"`);
  }
});

// ---------------------------------------------------------------------------
// Integración: servidor HTTPS local con certificado autofirmado
// ---------------------------------------------------------------------------
test('integración: lee cabeceras reales por HTTPS, sigue redirecciones y reporta TLS inválido', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'scan-test-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem'),
    '-days', '2', '-subj', '/CN=site.dev', '-addext', 'subjectAltName=DNS:site.dev,DNS:www.site.dev'], { stdio: 'ignore' });

  const server = https.createServer({ key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')) }, (req, res) => {
    if (req.headers.host.split(':')[0] === 'site.dev') {
      res.writeHead(301, { Location: 'https://www.site.dev/' });
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      'X-Frame-Options': 'DENY'
    });
    res.end('<html></html>');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  t.after(() => server.close());
  const port = server.address().port;
  const lookup = async () => [{ address: '127.0.0.1', family: 4 }];

  // a) Confiando en el cert de prueba: sigue la redirección y analiza la respuesta final
  const ok = await scanDomain('site.dev', { lookup, isAllowedIp: () => true, port, tlsOptions: { ca: readFileSync(join(dir, 'c.pem')) } });
  assert.equal(ok.ok, true, JSON.stringify(ok.error));
  assert.equal(ok.finalHost, 'www.site.dev');
  assert.equal(ok.redirects, 1);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.checks.find((c) => c.id === 'hsts').status, 'ok');
  assert.equal(ok.checks.find((c) => c.id === 'clickjacking').status, 'ok');
  assert.equal(ok.checks.find((c) => c.id === 'csp').status, 'fail');
  assert.ok(ok.tls && ok.tls.protocol);
  assert.ok(ok.patches && ok.patches.nginx.includes('Content-Security-Policy-Report-Only'));

  // b) Sin confiar en el cert (comportamiento real): debe reportar error TLS, no "todo bien"
  const bad = await scanDomain('site.dev', { lookup, isAllowedIp: () => true, port });
  assert.equal(bad.ok, false);
  assert.equal(bad.error.code, 'tls_error');
});
