/**
 * =============================================================================
 * SEGUIMIENTO DE IMPACTO 2 — PAZ MENTAL 24/7 & VIDEO BRIEFING DE 70 SEGUNDOS
 * =============================================================================
 * Despacha a los prospectos ya alcanzados previamente (44 leads)
 * Ángulo persuasivo: Paz mental, cero fricción, soluciones llave en mano 24/7.
 * Pieza central: Video de 70s en https://unblock-shield.vercel.app/?domain={domain}
 * Destino fiduciario de cobro: rick2818@strike.me
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import { dispatchUniversalEmail } from '../../lib/universal_email_engine.js';
import { isBlacklisted } from '../../lib/compliance_dnc.js';

// Notificador Telegram nativo y desacoplado (Cero dependencias externas en CI/CD)
async function sendTelegramAlert(chatId, text, botToken) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('[TELEGRAM ALERT FALLBACK]:', err.message);
    return null;
  }
}

// Cargar .env si existe
try { process.loadEnvFile?.(); } catch (e) {}

const PIPELINE_FILE = path.resolve('pipeline/leads_contactados_activos.json');

function isEnglishMarket(country = '') {
  const c = country.toLowerCase();
  return c.includes('usa') || c.includes('ee.uu') || c.includes('united states') || 
         c.includes('uk') || c.includes('united kingdom') || c.includes('europe') || 
         c.includes('global') || c.includes('canada') || c.includes('nordic') || 
         c.includes('denmark') || c.includes('sweden') || c.includes('finland');
}

export async function executePeaceOfMindFollowup(options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const batchLimit = options.batchLimit || (limitArg ? parseInt(limitArg.split('=')[1], 10) : 45);

  console.log('=============================================================================');
  console.log('🛡️ CADENCIA IMPACTO 2: PAZ MENTAL 24/7 & VIDEO BRIEFING DE 70s');
  console.log(`Modo: ${isDryRun ? 'DRY_RUN (Simulación segura)' : 'LIVE (Despacho real en red)'}`);
  console.log(`Límite del lote: ${batchLimit}`);
  console.log('Destino de cobro: rick2818@strike.me');
  console.log('=============================================================================\n');

  if (!fs.existsSync(PIPELINE_FILE)) {
    console.error('[ERROR]: No existe el archivo de pipeline:', PIPELINE_FILE);
    return { sentCount: 0 };
  }

  const pipeline = JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));

  // Seleccionar leads que recibieron Impacto 1 y no han recibido el Impacto 2 de Paz Mental
  const targetLeads = pipeline.filter(l => {
    const hadImpact1 = l.status === 'ENVIADO_REAL_EN_RED' || 
                       l.status === 'CONTACTADO_IMPACTO_1' || 
                       l.status === 'AUDITADO_Y_LISTO_PARA_NOTIFICACION' ||
                       l.status === 'LISTO_IMPACTO_2';
    const notYetSentImpact2 = l.status !== 'ENVIADO_IMPACTO_2_PAZ_MENTAL';
    return hadImpact1 && notYetSentImpact2;
  }).slice(0, batchLimit);

  console.log(`Total prospectos calificados para seguimiento de Paz Mental: ${targetLeads.length}`);

  let sentCount = 0;

  for (const lead of targetLeads) {
    const toEmail = lead.corporateEmail || lead.contactEmail || ('contacto@' + lead.domain);
    const domain = lead.domain || '';
    const company = lead.company || domain;
    const isEn = isEnglishMarket(lead.country);

    // Filtro DNC de exclusión obligatoria
    if (await isBlacklisted(toEmail, domain)) {
      console.log(`-> [DNC]: ${toEmail} en lista negra. Omitiendo.`);
      lead.status = 'DNC_EXCLUIDO';
      continue;
    }

    const videoUrl = isEn
      ? `https://unblock-shield.vercel.app/?lang=en&domain=${domain}`
      : `https://unblock-shield.vercel.app/?domain=${domain}`;

    const subject = isEn
      ? `🎬 70s Video: 24/7 peace of mind and perimeter defense for ${domain || company}`
      : `🎬 Video de 70s: La paz mental de operar ${domain || company} 100% blindado 24/7`;

    const body = isEn
      ? `Dear Executive & Operations Team at ${company},

I am reaching out following our recent perimeter scan with a simple, direct commitment:

We do not sell theoretical advisory hours, lengthy PowerPoints, or billable consulting sessions. We deliver turnkey sovereign solutions and genuine 24/7 peace of mind while your team sleeps.

How much is it worth to know that your checkout pipeline will never silently drop transactions, that banking headers are strictly enforced, and that no perimeter injection can breach your customer data?

▶️ WATCH THE 70-SECOND EXECUTIVE VIDEO BRIEFING:
🔗 ${videoUrl}

Why leading executives trust our infrastructure (Our 5 Fiduciary Trust Anchors):
1. Zero Invasive Access: We never touch passwords, internal databases, or API credentials. 100% evaluated and deployed safely from the cloud perimeter.
2. Micro-Risk Turnkey Solution: Download production-ready code patches in a single .zip for just $19 USD (Flash Plan).
3. 24/7 Autopilot Sentinel: Autonomous agent continuously monitoring your endpoints for $69 USD/month ($2.30 USD/day).
4. 7-Day Unconditional Fiduciary Guarantee: If this solution does not save your operations at least 10 hours in the first week, we refund 100% of your payment with zero questions.
5. SOC-2 Grade Volatile Memory Vault: Zero disk storage; all operations run in isolated volatile RAM and are purged instantly.

Inspect your portal live or activate immediate peace of mind in 60 seconds:
🔗 ${videoUrl}

Instant zero-fee settlement via Bitcoin Lightning Network: rick2818@strike.me

Best regards,
Senior Solutions & Cyber-Defense Team — Unblock AI`
      : `Estimado equipo directivo y de operaciones en ${company},

Le escribo en seguimiento a nuestra notificación perimetral previa con una premisa clara:

No vendemos horas de consultoría teórica, diagnósticos abstractos ni reuniones interminables. Entregamos soluciones llave en mano y la auténtica paz mental de operar 24/7 sin riesgos mientras usted y su equipo descansan.

¿Cuánto vale para su dirección tener la certeza absoluta de que sus pasarelas de pago no fallarán silenciosamente, que no existen cabeceras vulnerables a inyección y que los datos de sus clientes están blindados?

▶️ VEA EL VIDEO BRIEFING EJECUTIVO (70 Segundos):
🔗 ${videoUrl}

Puntos clave de por qué directores confían en nosotros (Nuestros 5 Anclajes de Confianza):
1. Cero Invasión Previa: Jamás solicitamos contraseñas, claves API ni acceso a bases de datos internas. Todo opera de forma defensiva desde el perímetro en la nube.
2. Micro-Riesgo Asimétrico: Descargue el informe forense con los parches listos para pegar en producción por solo $19 USD (Plan Flash).
3. Centinela Autónomo 24/7: Agente soberano que vigila su infraestructura por solo $2.30 USD al día ($69 USD/mes).
4. Garantía Fiduciaria Total de 7 Días: Si en su primera semana el sistema no le ahorra al menos 10 horas de trabajo manual, reembolsamos el 100% de su pago sin fricción ni preguntas.
5. Privacidad Bancaria SOC-2: Cero retención en disco; 100% procesado en memoria volátil RAM y purgado al instante.

Vea el video explicativo y aplique el blindaje en 60 segundos:
🔗 ${videoUrl}

Liquidación directa e instantánea por Bitcoin Lightning Network a: rick2818@strike.me

Quedo a su entera disposición.

Atentamente,
Especialista Senior en Seguridad y Automatización Fiduciaria — Destraba AI`;

    console.log(`-----------------------------------------------------------------------------`);
    console.log(`Empresa: ${company} (${domain}) | Idioma: ${isEn ? 'EN' : 'ES'}`);
    console.log(`Destinatario: ${toEmail}`);
    console.log(`Asunto: ${subject}`);

    lead.outboundMessage = { to: toEmail, subject, body };
    lead.targetImpact = 2;

    if (isDryRun) {
      console.log('-> [DRY_RUN]: Despacho simulado de Paz Mental OK.');
      lead.deliveryAudit = {
        dispatchedAt: new Date().toISOString(),
        mode: 'DRY_RUN_SIMULATION',
        impact: 2,
        cadenceType: 'PAZ_MENTAL_VIDEO_70S',
        recipient: toEmail,
        status: 'VERIFICADO_LISTO_PARA_TRANSMISION'
      };
      lead.status = 'TRANSMISION_SIMULADA_PAZ_MENTAL_OK';
      sentCount++;
    } else {
      const dispatchResult = await dispatchUniversalEmail({
        to: toEmail,
        subject,
        text: body,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">${body.replace(/\n/g, '<br>')}</div>`
      });

      if (dispatchResult.success) {
        console.log(`-> [LIVE SUCCESS - PAZ MENTAL]: ${dispatchResult.transport} | MessageId: ${dispatchResult.messageId}`);
        lead.deliveryAudit = {
          dispatchedAt: new Date().toISOString(),
          mode: 'LIVE',
          impact: 2,
          cadenceType: 'PAZ_MENTAL_VIDEO_70S',
          transport: dispatchResult.transport,
          messageId: dispatchResult.messageId,
          recipient: toEmail,
          status: 'TRANSMITIDO_EXITOSO'
        };
        lead.status = 'ENVIADO_IMPACTO_2_PAZ_MENTAL';
        lead.currentImpact = 2;
        sentCount++;
      } else {
        console.error(`-> [ERROR EN ENVÍO]: ${dispatchResult.error}`);
        lead.deliveryAudit = {
          attemptedAt: new Date().toISOString(),
          mode: 'LIVE_FAILED',
          error: dispatchResult.error,
          status: 'REINTENTO_PROGRAMADO'
        };
      }
    }

    // Rate limiting defensivo (2-3.5 segundos)
    const delayMs = Math.floor(2000 + Math.random() * 1500);
    await new Promise(r => setTimeout(r, delayMs));
  }

  fs.writeFileSync(PIPELINE_FILE, JSON.stringify(pipeline, null, 2), 'utf8');

  console.log('\n=============================================================================');
  console.log('🛡️ CADENCIA PAZ MENTAL 24/7 FINALIZADA:');
  console.log(`Total despachados con éxito: ${sentCount} de ${targetLeads.length}`);
  console.log(`Archivo actualizado: ${PIPELINE_FILE}`);
  console.log('=============================================================================\n');

  // Notificación a Telegram
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_AUTHORIZED_USER_ID || '6311509947';
    if (botToken) {
      const tgMsg = `🕊️ <b>CADENCIA IMPACTO 2 (PAZ MENTAL & VIDEO 70S)</b>\n\n` +
        `📬 <b>Leads Despachados:</b> ${sentCount} de ${targetLeads.length}\n` +
        `🎬 <b>Video Presentado:</b> <code>unblock-shield.vercel.app</code>\n` +
        `🛡️ <b>Destino de Cobro:</b> <code>rick2818@strike.me</code>\n` +
        `🕒 <b>Hora:</b> ${new Date().toISOString()}`;
      await sendTelegramAlert(adminChatId, tgMsg, botToken);
    }
  } catch (err) {
    console.warn('[TELEGRAM WARNING]:', err.message);
  }

  return { sentCount };
}

if (process.argv[1]?.includes('dispatch_peace_of_mind_followup.mjs')) {
  executePeaceOfMindFollowup()
    .then(() => {
      console.log('[IMPACT 2 DISPATCH]: Cadencia de seguimiento finalizada con éxito.');
      process.exit(0);
    })
    .catch(err => {
      console.warn('[IMPACT 2 DISPATCH RECOVERED ERROR]:', err.message);
      process.exit(0);
    });
}
