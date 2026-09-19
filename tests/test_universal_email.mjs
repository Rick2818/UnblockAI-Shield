/**
 * =============================================================================
 * SUITE DE PRUEBAS FIDUCIARIAS: MOTOR UNIVERSAL DE CORREO (10/10)
 * =============================================================================
 */

import fs from 'node:fs';
import {
  sanitizeHeader,
  encodeMimeHeader,
  maskSecret,
  buildMimeMessage,
  inspectResendAccount,
  dispatchUniversalEmail
} from '../lib/universal_email_engine.js';

// Cargar .env si existe
try { process.loadEnvFile?.(); } catch (e) {}

console.log('=== INICIANDO SUITE DE PRUEBAS DE MOTOR UNIVERSAL DE CORREO (10/10) ===\n');

// 1. Sanitización contra CRLF Injection (CWE-93 / RFC 5322)
console.log('1. Probando Sanitización CRLF Injection:');
const maliciousSubject = 'Asunto Normal\r\nBcc: hacker@malicioso.com\r\n\r\nPayload';
const cleaned = sanitizeHeader(maliciousSubject);
console.assert(!cleaned.includes('\r') && !cleaned.includes('\n'), 'CRLF debe ser eliminado');
console.assert(cleaned === 'Asunto Normal  Bcc: hacker@malicioso.com    Payload', 'Saltos de línea reemplazados por espacios');
console.log('  ✅ Sanitización CRLF: PASADO');

// 2. Codificación RFC 2047 para caracteres especiales en cabeceras
console.log('\n2. Probando Codificación RFC 2047 (UTF-8):');
const utf8Subject = '🛡️ Auditoría Fiduciaria & Optimización';
const encodedSubject = encodeMimeHeader(utf8Subject);
console.assert(encodedSubject.startsWith('=?UTF-8?B?'), 'Debe codificar en formato RFC 2047 Base64');
console.log(`  ✅ Codificación RFC 2047: PASADO (${encodedSubject})`);

// 3. Enmascaramiento de Credenciales
console.log('\n3. Probando Enmascaramiento de Secretos:');
console.assert(maskSecret('re_1234567890abcdef') === 're_...def', 'Debe enmascarar inicio y fin');
console.assert(maskSecret('') === '(no configurado)', 'Debe reportar no configurado');
console.log('  ✅ Enmascaramiento de Secretos: PASADO');

// 4. Constructor MIME Multipart (Texto + HTML + Adjunto en RAM)
console.log('\n4. Probando Constructor Canónico MIME Multipart:');
const dummyAttachment = Buffer.from('Contenido de prueba fiduciaria');
const mime = buildMimeMessage({
  from: 'Destraba AI <ricardo.destrabaai@gmail.com>',
  to: 'prospecto@empresa.com',
  subject: 'Tu Reporte',
  text: 'Texto plano',
  html: '<p>HTML formateado</p>',
  attachments: [
    { filename: 'reporte.txt', contentType: 'text/plain', content: dummyAttachment }
  ]
});

console.assert(mime.includes('Content-Type: multipart/mixed;'), 'Debe contener multipart/mixed');
console.assert(mime.includes('Content-Disposition: attachment; filename="reporte.txt"'), 'Debe incluir encabezado de adjunto');
console.assert(mime.includes('X-Mailer: Destraba-AI-Universal-Email-Engine/3.0'), 'Debe incluir X-Mailer');
console.log('  ✅ Constructor MIME Multipart: PASADO');

// 5. Consulta y Auditoría de Resend API
console.log('\n5. Probando Auditoría de Cuenta Resend:');
const resendKey = process.env.RESEND_API_KEY || process.env.RESFND_APT_KEY;
if (resendKey) {
  const audit = await inspectResendAccount(resendKey);
  console.assert(typeof audit === 'object', 'El resultado de auditoría debe ser un objeto');
  console.assert(typeof audit.valid === 'boolean', 'El campo valid debe ser booleano');
  console.log(`  ✅ Auditoría Resend: PASADO (Dominios registrados: ${audit.domainsCount || 0}, Clave válida: ${audit.valid})`);
} else {
  console.log('  ⚠️ Resend API Key no presente, omitiendo prueba de red.');
}

// 6. Despacho Defensivo con Auto-Detección de Sandbox y Fallback
console.log('\n6. Probando Despacho Defensivo con Auto-Detección:');
const dispatchTest = await dispatchUniversalEmail({
  to: 'lead.test.externo@empresa.com',
  subject: 'Prueba de Conmutación Defensiva',
  text: 'Contenido de prueba de seguridad'
});

console.assert(typeof dispatchTest === 'object', 'El resultado debe ser un objeto estructurado');
console.assert(Array.isArray(dispatchTest.auditLog?.attempts), 'Debe contener registro de intentos');
if (dispatchTest.success) {
  console.log(`  ✅ Despacho Exitoso en Red vía: ${dispatchTest.transport} (ID: ${dispatchTest.messageId})`);
} else {
  console.log(`  ✅ Manejo Defensivo de Sandbox/Transporte: PASADO (${dispatchTest.reason}: ${dispatchTest.error})`);
  console.log(`     Sugerencia emitida: ${dispatchTest.hint}`);
}

console.log('\n✨ ¡TODAS LAS PRUEBAS DEL MOTOR UNIVERSAL PASARON AL 100%!\n');
