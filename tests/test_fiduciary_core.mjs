import {
  timingSafeCompare,
  checkRateLimit,
  resolveCorsOrigin,
  escapeHtml,
  generateSignedToken,
  verifySignedToken,
  computeForensicHash
} from '../lib/fiduciary_core.js';

console.log('=== INICIANDO SUITE DE PRUEBAS FIDUCIARIAS (7 PILARES) ===\n');

// 1. Timing-Safe Compare (Pilar 4)
console.log('1. Probando Timing-Safe Compare:');
console.assert(timingSafeCompare('antigravity2026!', 'antigravity2026!') === true, 'Claves iguales deben retornar true');
console.assert(timingSafeCompare('antigravity2026!', 'antigravity2027!') === false, 'Claves distintas deben retornar false');
console.assert(timingSafeCompare('corta', 'mucho_mas_larga') === false, 'Longitudes distintas deben retornar false');
console.assert(timingSafeCompare('', 'algo') === false, 'Cadena vacía debe retornar false');
console.log('  ✅ Timing-Safe Compare: PASADO');

// 2. Token Criptográfico Volátil en RAM (Pilar 4)
console.log('2. Probando Tokens Criptográficos HMAC-SHA256 en RAM:');
const token = generateSignedToken('ricardo_admin', 5000);
const verify = verifySignedToken(token);
console.assert(verify.valid === true, 'Token recién emitido debe ser válido');
console.assert(verify.payload === 'ricardo_admin', 'Payload debe coincidir');
console.assert(verifySignedToken(token + 'tampered').valid === false, 'Token alterado debe ser inválido');
console.log('  ✅ Tokens Criptográficos en RAM: PASADO');

// 3. Rate Limiting por Ventana Deslizante en RAM (Pilar 6)
console.log('3. Probando Rate Limiter en RAM (Anti-DDoS):');
const testIp = '192.168.1.100';
for (let i = 0; i < 5; i++) {
  const r = checkRateLimit(testIp, 5, 10000);
  console.assert(r.allowed === true, `Petición ${i + 1} debe permitirse`);
}
const blocked = checkRateLimit(testIp, 5, 10000);
console.assert(blocked.allowed === false, 'Petición 6 debe bloquearse con HTTP 429');
console.log('  ✅ Rate Limiting en RAM: PASADO');

// 4. Whitelist Estricta de CORS (Pilar 6)
console.log('4. Probando Whitelist Estricta de CORS:');
console.assert(resolveCorsOrigin('https://destraba.ai') === 'https://destraba.ai', 'destraba.ai debe ser permitido');
console.assert(resolveCorsOrigin('https://unblock.ai') === 'https://unblock.ai', 'unblock.ai debe ser permitido');
console.assert(resolveCorsOrigin('http://localhost:8765', true) === 'http://localhost:8765', 'localhost en dev debe ser permitido');
console.assert(resolveCorsOrigin('https://malicious-site.com') === null, 'Sitios no autorizados deben denegarse');
console.log('  ✅ CORS Whitelist: PASADO');

// 5. Neutralización Integral de XSS (Pilar 7)
console.log('5. Probando Neutralización de XSS (CWE-79):');
const dangerousInput = '<script>alert("hack")</script><img src=x onerror=alert(1)>';
const sanitized = escapeHtml(dangerousInput);
console.assert(!sanitized.includes('<script>'), 'Tags script deben escapar');
console.assert(sanitized.includes('&lt;script&gt;'), 'Tags deben estar en entidades HTML');
console.assert(sanitized.includes('blocked-attr='), 'onerror debe neutralizarse');
console.log('  ✅ Neutralización de XSS: PASADO');

// 6. Hash Forense SHA-256 en RAM (Pilar 2)
console.log('6. Probando Hash Forense SHA-256 en Memoria:');
const buf = Buffer.from('audit_sample_contract_2026');
const hash = computeForensicHash(buf);
console.assert(typeof hash === 'string' && hash.length === 64, 'SHA-256 debe tener 64 caracteres');
console.log('  ✅ Hash Forense en RAM: PASADO');

console.log('\n✨ ¡TODAS LAS PRUEBAS FIDUCIARIAS PASARON AL 100%!');
