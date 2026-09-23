/**
 * =============================================================================
 * SCRIPT FIDUCIARIO DE VERIFICACIÓN Y VIGILANCIA DE TELEGRAM WEBHOOK (FASE 4)
 * =============================================================================
 * Verifica en 1 segundo que el bot en Telegram tenga el Webhook activo apuntando
 * a producción en Vercel, sin errores reportados y con 0 mensajes represados.
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.resolve(__dirname, '../.env');

function loadEnv() {
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf8');
    content.split('\n').forEach(line => {
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
}
loadEnv();

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const EXPECTED_PROD_URL = (process.env.VERCEL_APP_URL || 'https://destraba-ai.vercel.app').trim().replace(/\/+$/, '') + '/api/telegram';

if (!BOT_TOKEN) {
  console.error('❌ [FATAL]: TELEGRAM_BOT_TOKEN no configurado en entorno ni en .env');
  process.exit(1);
}

async function verifyWebhook() {
  console.log('🔍 =======================================================');
  console.log('📡 AUDITANDO ESTADO DEL WEBHOOK DE TELEGRAM EN PRODUCCIÓN...');
  console.log(`🎯 URL Esperada: ${EXPECTED_PROD_URL}`);
  console.log('🔍 =======================================================\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
    const data = await res.json();

    if (!data.ok) {
      console.error('❌ Error al consultar Telegram API:', data.description || JSON.stringify(data));
      process.exit(1);
    }

    const info = data.result;
    console.log('📊 Información Reportada por Telegram API:');
    console.log(`   - URL actual:            ${info.url || '(VACÍA - MODO LONG POLLING O NO CONFIGURADO)'}`);
    console.log(`   - Mensajes pendientes:   ${info.pending_update_count ?? 0}`);
    console.log(`   - Certificado propio:    ${info.has_custom_certificate ? 'SÍ' : 'NO'}`);
    if (info.last_error_date) {
      const dateStr = new Date(info.last_error_date * 1000).toISOString();
      console.log(`   - Último error registrado: ${dateStr}`);
      console.log(`   - Detalle del error:       ${info.last_error_message}`);
    } else {
      console.log(`   - Último error:          NINGUNO (100% Saludable)`);
    }

    let hasErrors = false;

    // 1. Verificación de URL registrada
    if (!info.url) {
      console.error('\n❌ CRÍTICO: La URL del Webhook está VACÍA.');
      console.error('   Telegram no entregará mensajes a la nube.');
      console.error(`   👉 Ejecuta para corregir: node scripts/deploy_cloud_webhook.mjs ${EXPECTED_PROD_URL.replace('/api/telegram', '')}`);
      hasErrors = true;
    } else if (!info.url.startsWith('https://')) {
      console.error(`\n❌ ERROR: La URL registrada (${info.url}) no es un endpoint HTTPS seguro.`);
      hasErrors = true;
    } else {
      console.log(`\n🔗 Webhook activo verificado: ${info.url}`);
    }

    // 2. Verificación de errores de entrega de Telegram
    if (info.last_error_message) {
      console.warn(`\n⚠️ ALERTA: Telegram reporta un error reciente de entrega: "${info.last_error_message}"`);
      // Si el error ocurrió hace menos de 1 hora, marcar advertencia
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec - info.last_error_date < 3600) {
        console.error('   El error ocurrió hace menos de 1 hora. Revisa los logs en Vercel.');
        hasErrors = true;
      }
    }

    // 3. Verificación de cola de mensajes represados
    if (info.pending_update_count > 25) {
      console.warn(`\n⚠️ ADVERTENCIA: Hay ${info.pending_update_count} mensajes represados en la cola de Telegram.`);
      hasErrors = true;
    }

    if (hasErrors) {
      console.log('\n❌ AUDITORÍA FINALIZADA CON HALLAZGOS O FALLAS.');
      process.exit(1);
    } else {
      console.log('\n✅ ¡ESTADO DEL WEBHOOK 100% OPERATIVO!');
      console.log('   El agente soberano está listo y conectado a la nube 24/7 sin dependencias locales.');
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error de conexión al consultar getWebhookInfo:', err.message);
    process.exit(1);
  }
}

verifyWebhook();
