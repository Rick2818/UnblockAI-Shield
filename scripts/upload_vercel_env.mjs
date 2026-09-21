import fs from 'fs';
import { execSync } from 'child_process';

const KEYS_TO_UPLOAD = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'RESEND_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_AUTHORIZED_USER_ID',
  'OFFICIAL_SUPPORT_EMAIL',
  'STRIKE_LIGHTNING_ADDRESS',
  'CRON_SECRET'
];

const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx > 0) {
    const k = trimmed.substring(0, idx).trim();
    let v = trimmed.substring(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.substring(1, v.length - 1);
    }
    envVars[k] = v;
  }
}

console.log(`Cargadas ${Object.keys(envVars).length} variables de .env`);

for (const k of KEYS_TO_UPLOAD) {
  if (envVars[k]) {
    const val = envVars[k];
    for (const target of ['production', 'preview']) {
      try {
        const cmd = `npx vercel env add ${k} ${target} --value "${val.replace(/"/g, '\\"')}" --yes --force`;
        execSync(cmd, { stdio: 'ignore' });
        console.log(`[OK] ${k} -> ${target}`);
      } catch (err) {
        console.error(`[ERR] ${k} -> ${target}: ${err.message}`);
      }
    }
  } else {
    console.warn(`[WARN] ${k} no encontrada en .env`);
  }
}

console.log('Sincronización con Vercel finalizada.');
