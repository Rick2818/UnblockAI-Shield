/**
 * =============================================================================
 * SCRIPT FIDUCIARIO DE ENLACE TELEGRAM CLOUD WEBHOOK 24/7 (PILARES 1 & 4)
 * =============================================================================
 * Uso:
 *   node scripts/deploy_cloud_webhook.mjs https://tu-dominio.vercel.app
 *   node scripts/deploy_cloud_webhook.mjs --status
 *   node scripts/deploy_cloud_webhook.mjs --delete
 * =============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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
          if (k) process.env[k] = v;
        }
      }
    });
  }
}
loadEnv();

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
if (!BOT_TOKEN) {
  console.error('❌ [ERROR FATAL]: TELEGRAM_BOT_TOKEN no está definido en .env');
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function getWebhookInfo() {
  const res = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
  return await res.json();
}

async function setCloudWebhook(vercelUrl) {
  let webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || '').trim();
  if (!webhookSecret) {
    webhookSecret = `destraba_sec_${crypto.randomBytes(16).toString('hex')}`;
    process.env.TELEGRAM_WEBHOOK_SECRET = webhookSecret;
    // Persistir en .env local
    try {
      let envText = fs.readFileSync(ENV_PATH, 'utf8');
      if (envText.includes('TELEGRAM_WEBHOOK_SECRET=')) {
        envText = envText.replace(/TELEGRAM_WEBHOOK_SECRET=.*/g, `TELEGRAM_WEBHOOK_SECRET=${webhookSecret}`);
      } else {
        envText += `\nTELEGRAM_WEBHOOK_SECRET=${webhookSecret}\n`;
      }
      fs.writeFileSync(ENV_PATH, envText, 'utf8');
      console.log(`🔐 Secreto criptográfico de Webhook generado y guardado en .env`);
    } catch (e) {}
  }

  const cleanUrl = vercelUrl.replace(/\/+$/, '');
  const webhookEndpoint = `${cleanUrl}/api/telegram`;

  console.log(`\n🚀 =======================================================`);
  console.log(`📡 VINCULANDO WEBHOOK CLOUD 24/7 A TELEGRAM...`);
  console.log(`🌐 Destino Serverless: ${webhookEndpoint}`);
  console.log(`🔒 Secret Token: ${webhookSecret.substring(0, 8)}... (Verificación Timing-Safe Activa)`);
  console.log(`🚀 =======================================================\n`);

  const payload = {
    url: webhookEndpoint,
    max_connections: 40,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
    secret_token: webhookSecret
  };

  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.ok) {
    console.log(`✅ ¡WEBHOOK REGISTRADO CON ÉXITO EN TELEGRAM!`);
    console.log(`📡 Telegram ahora entregará tus mensajes directamente a Vercel 24/7.`);
    console.log(`💻 Ya puedes apagar tu computadora: el bot responderá de forma permanente.`);
  } else {
    console.error(`❌ Error al configurar Webhook:`, data.description || JSON.stringify(data));
  }

  const info = await getWebhookInfo();
  console.log(`\n📊 ESTADO ACTUAL DEL WEBHOOK EN TELEGRAM:`);
  console.log(JSON.stringify(info.result, null, 2));
}

async function deleteWebhook() {
  console.log('Purgando webhook de Telegram...');
  const res = await fetch(`${TELEGRAM_API}/deleteWebhook?drop_pending_updates=false`);
  const data = await res.json();
  console.log('deleteWebhook:', JSON.stringify(data));
}

async function main() {
  const arg = process.argv[2];

  if (arg === '--status') {
    const info = await getWebhookInfo();
    console.log('Estado actual del Webhook:', JSON.stringify(info.result, null, 2));
  } else if (arg === '--delete') {
    await deleteWebhook();
  } else if (arg && arg.startsWith('http')) {
    await setCloudWebhook(arg);
  } else {
    console.log('Uso:');
    console.log('  node scripts/deploy_cloud_webhook.mjs https://tu-dominio.vercel.app');
    console.log('  node scripts/deploy_cloud_webhook.mjs --status');
    console.log('  node scripts/deploy_cloud_webhook.mjs --delete');
  }
}

main().catch(console.error);
