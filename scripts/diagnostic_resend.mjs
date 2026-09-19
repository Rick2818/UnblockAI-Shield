/**
 * =============================================================================
 * AUDITOR Y DIAGNÓSTICO PROFUNDO DE CORREO & RESEND (DESTRABA AI)
 * =============================================================================
 * Verifica en tiempo real:
 *  1. Resolución DNS IPv4/IPv6 hacia api.resend.com y smtp.gmail.com
 *  2. Estado de la API Key de Resend y dominios registrados en Resend API
 *  3. Conexión TLS SMTPS nativa a smtp.gmail.com:465
 *  4. Matriz de transporte activa y recomendaciones accionables
 * =============================================================================
 */

import dns from 'node:dns';
import tls from 'node:tls';
import fs from 'node:fs';
import path from 'node:path';
import {
  inspectResendAccount,
  maskSecret,
  sendViaSmtps
} from '../lib/universal_email_engine.js';

// Cargar variables locales
try { process.loadEnvFile?.(); } catch (e) {}

console.log(`\n=============================================================================`);
console.log(`🛡️  AUDITORÍA FORENSE DE TRANSPORTE DE CORREO (DESTRABA AI 3.0)`);
console.log(`=============================================================================\n`);

// 1. Diagnóstico DNS
console.log(`1. [DNS] Verificando resolución de nombres con IPv4 First...`);
try {
  dns.setDefaultResultOrder('ipv4first');
  const resendLookup = await dns.promises.lookup('api.resend.com', { family: 4 });
  console.log(`  ✅ api.resend.com resuelto a IPv4: ${resendLookup.address}`);
} catch (e) {
  console.error(`  ❌ Error resolviendo api.resend.com: ${e.message}`);
}

try {
  const gmailLookup = await dns.promises.lookup('smtp.gmail.com', { family: 4 });
  console.log(`  ✅ smtp.gmail.com resuelto a IPv4: ${gmailLookup.address}`);
} catch (e) {
  console.error(`  ❌ Error resolviendo smtp.gmail.com: ${e.message}`);
}

// 2. Diagnóstico de Resend API
console.log(`\n2. [RESEND API] Verificando estado de cuenta y dominios...`);
const resendKey = process.env.RESEND_API_KEY || process.env.RESFND_APT_KEY;
console.log(`  • API Key configurada: ${maskSecret(resendKey)}`);

if (resendKey) {
  const resendAudit = await inspectResendAccount(resendKey);
  if (resendAudit.valid) {
    console.log(`  • Clave Resend válida: SÍ`);
    console.log(`  • Dominios registrados en Resend: ${resendAudit.domainsCount}`);
    if (resendAudit.domainsCount === 0) {
      console.log(`  ⚠️  MODO SANDBOX ACTIVO: No hay dominios registrados en Resend.`);
      console.log(`     - Resend SÓLO permite enviar correos a la cuenta propietaria (rick28191@gmail.com).`);
      console.log(`     - Envíos directos a terceros (leads corporativos) serán rechazados por Resend (HTTP 403).`);
    } else {
      resendAudit.domains.forEach(d => {
        console.log(`     - Dominio: ${d.name} | Estado: ${d.status}`);
      });
    }
  } else {
    console.log(`  ❌ Fallo consultando Resend: ${resendAudit.error || resendAudit.networkError}`);
  }
} else {
  console.log(`  ❌ RESEND_API_KEY no encontrada en entorno.`);
}

// 3. Diagnóstico de Gmail SMTP
console.log(`\n3. [GMAIL SMTP] Verificando transporte SMTPS nativo...`);
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 465;
const smtpUser = process.env.SMTP_USER || 'ricardo.destrabaai@gmail.com';
const smtpPass = process.env.SMTP_PASS;

console.log(`  • Servidor: ${smtpHost}:${smtpPort}`);
console.log(`  • Usuario: ${smtpUser}`);
console.log(`  • Contraseña configurada: ${smtpPass ? maskSecret(smtpPass) : '(Falta configurar en .env)'}`);

if (smtpPass && smtpPass.trim().length >= 8) {
  console.log(`  • Probando handshake TLS con ${smtpHost}...`);
  try {
    await new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: smtpHost,
        port: smtpPort,
        rejectUnauthorized: true,
        timeout: 8000
      }, () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', reject);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Timeout en handshake TLS'));
      });
    });
    console.log(`  ✅ Conexión TLS con ${smtpHost}:${smtpPort} exitosa.`);
  } catch (err) {
    console.error(`  ❌ Error de conexión TLS con ${smtpHost}: ${err.message}`);
  }
} else {
  console.log(`  ℹ️  Gmail SMTP no activado aún porque falta SMTP_PASS en .env.`);
  console.log(`     Para activar despacho 100% inmediato a cualquier lead sin dominio:`);
  console.log(`     1. Ve a: https://myaccount.google.com/apppasswords`);
  console.log(`     2. Genera una 'Contraseña de aplicación' (16 letras).`);
  console.log(`     3. En tu .env agrega:`);
  console.log(`        SMTP_HOST=smtp.gmail.com`);
  console.log(`        SMTP_PORT=465`);
  console.log(`        SMTP_USER=ricardo.destrabaai@gmail.com`);
  console.log(`        SMTP_PASS=tu_contraseña_de_16_letras`);
}

console.log(`\n=============================================================================`);
console.log(`📋 RESUMEN DE ARQUITECTURA DE DESPACHO:`);
if (smtpPass && smtpPass.trim().length >= 8) {
  console.log(`🟢 TRANSPORTE ACTIVO: GMAIL SMTPS (Envío directo ilimitado a clientes y leads)`);
} else {
  console.log(`🟡 TRANSPORTE ACTIVO: MODO DUAL CONTINGENCIA (Digest a Ricardo + Resend Sandbox)`);
}
console.log(`=============================================================================\n`);
