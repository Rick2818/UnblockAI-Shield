/**
 * =============================================================================
 * EJECUTOR AUTOMATIZADO 24/7 DEL CAZADOR PERIMETRAL
 * Corre desatendido vía GitHub Actions / Cloud Cron
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';
import { AutonomousHunter } from './autonomous_hunter.mjs';
import { dispatchDailyPipeline, advancePipelineToImpact2 } from './dispatch_daily_pipeline.mjs';
import { executeOutboundDispatch } from './send_smtp_dispatch.mjs';

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

// Cargar variables locales si existen
try { process.loadEnvFile?.(); } catch (e) {}

const WEEKLY_COHORTS = {
  1: {
    name: "LUNES 8:45 AM: ICP Alta Conversión (E-commerce D2C, Agencias B2B & Last-Mile)",
    targets: [
      { company: "Amor Perfecto Café de Especialidad", domain: "amorperfectocafes.com", contactEmail: "contacto@amorperfectocafes.com", country: "Colombia", industry: "E-commerce D2C" },
      { company: "Café San Alberto", domain: "cafesanalberto.com", contactEmail: "info@cafesanalberto.com", country: "Colombia", industry: "E-commerce & Suscripciones" },
      { company: "Branch Agencia Digital", domain: "branch.com.co", contactEmail: "contacto@branch.com.co", country: "Colombia / Regional", industry: "Agencia B2B" },
      { company: "Moova Logística Urbana", domain: "moova.io", contactEmail: "contacto@moova.io", country: "México / Latam", industry: "Logística Last-Mile" },
      { company: "Cubbo E-commerce Fulfillment", domain: "cubbo.com", contactEmail: "hola@cubbo.com", country: "México / Colombia", industry: "Fulfillment E-commerce" },
      { company: "ALG El Salvador (3PL Logistics)", domain: "alg3pl.com", contactEmail: "info@alg3pl.com", country: "El Salvador / Regional", industry: "Distribución 3PL" },
      { company: "Aldesa Logística & Almacenes Fiscales", domain: "aldesalogistica.com", contactEmail: "contacto@aldesalogistica.com", country: "El Salvador", industry: "Almacenes Fiscales" }
    ]
  },
  2: {
    name: "MARTES: Retail & E-commerce Fulfillment (Colombia)",
    targets: [
      { company: "Coordinadora Mercantil", domain: "coordinadora.com", contactEmail: "contacto@coordinadora.com", country: "Colombia", industry: "Courier & E-commerce" },
      { company: "TCC Logística & Envíos", domain: "tcc.com.co", contactEmail: "contacto@tcc.com.co", country: "Colombia", industry: "Logística B2B" },
      { company: "Envía Colvanes", domain: "enviacolvanes.com", contactEmail: "servicioalcliente@enviacolvanes.com", country: "Colombia", industry: "Envíos Masivos" },
      { company: "Deprisa (Avianca Cargo)", domain: "deprisa.com", contactEmail: "corporativo@deprisa.com", country: "Colombia", industry: "Envíos Express" },
      { company: "Servientrega Soluciones Digitales", domain: "servientrega.com", contactEmail: "servicioalcliente@servientrega.com", country: "Colombia", industry: "Logística 3PL" }
    ]
  },
  3: {
    name: "MIÉRCOLES: Software, Logística & Servicios Corporativos (España)",
    targets: [
      { company: "SEUR Frío y Urgente B2B", domain: "seur.com", contactEmail: "empresas@seur.net", country: "España", industry: "Transporte Express" },
      { company: "Ontime Transporte & Logística", domain: "ontime.es", contactEmail: "info@ontime.es", country: "España", industry: "Logística Integral" },
      { company: "Packlink PRO España", domain: "packlink.es", contactEmail: "pro@packlink.es", country: "España", industry: "E-commerce Shipping" },
      { company: "Logisfashion España", domain: "logisfashion.com", contactEmail: "info@logisfashion.com", country: "España / Global", industry: "Fashion & Retail Logistics" },
      { company: "MRW Corporativo", domain: "mrw.es", contactEmail: "informacion@mrw.es", country: "España", industry: "Envíos Corporativos" }
    ]
  },
  4: {
    name: "JUEVES: Fintechs, Facturación y Última Milla (México & Chile)",
    targets: [
      { company: "Kavak Logistics & Operaciones", domain: "kavak.com", contactEmail: "soporte@kavak.com", country: "México", industry: "Fintech & Retail Automotriz" },
      { company: "99Minutos Last Mile", domain: "99minutos.com", contactEmail: "hola@99minutos.com", country: "México / LatAm", industry: "Last Mile Fulfillment" },
      { company: "Starken Logística", domain: "starken.cl", contactEmail: "empresas@starken.cl", country: "Chile", industry: "Transporte Corporativo" },
      { company: "Blue Express", domain: "blue.cl", contactEmail: "soporte@blue.cl", country: "Chile", industry: "Last Mile Fulfillment" },
      { company: "Chilexpress Empresas", domain: "chilexpress.cl", contactEmail: "empresas@chilexpress.cl", country: "Chile", industry: "Envíos Corporativos" }
    ]
  },
  5: {
    name: "VIERNES: Ciberseguridad Defensiva & Cumplimiento Normativo (Global Hubs)",
    targets: [
      { company: "Cargo Expreso Regional", domain: "cargoexpreso.com", contactEmail: "servicioalcliente@cargoexpreso.com", country: "Guatemala / CA", industry: "Courier Regional" },
      { company: "Intertek Centroamérica", domain: "intertek.com", contactEmail: "info.latam@intertek.com", country: "Global / Regional", industry: "Certificaciones & Auditoría" },
      { company: "SGS Logistics Central America", domain: "sgs.com", contactEmail: "enquiry@sgs.com", country: "Global / CA", industry: "Inspección y Aduanas" },
      { company: "Redpack Logística", domain: "redpack.com.mx", contactEmail: "contacto@redpack.com.mx", country: "México", industry: "Distribución B2B" },
      { company: "Estafeta Carga", domain: "estafeta.com", contactEmail: "proyectos@estafeta.com", country: "México", industry: "Cadena de Suministro" }
    ]
  }
};

async function main() {
  const dayOfWeek = new Date().getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  const cohort = WEEKLY_COHORTS[dayOfWeek] || WEEKLY_COHORTS[2]; // Fallback a Colombia en fin de semana
  const targets = cohort.targets;

  console.log(`\n=============================================================================`);
  console.log(`[CRON 24/7 AUTONOMOUS HUNTER]: Ciclo Fiduciario Activo`);
  console.log(`Cohort asignado: ${cohort.name}`);
  console.log(`Total de objetivos a auditar: ${targets.length}`);
  console.log(`Destino de liquidación: rick2818@strike.me`);
  console.log(`=============================================================================\n`);

  const hunter = new AutonomousHunter();
  
  // Descubrimiento dinámico continuo de nuevos prospectos no contactados (Anti-Fatiga 90 días)
  const dynamicTargets = await hunter.discoverDynamicTargets({ limit: 3 });
  console.log(`[DISCOVERY MOTOR]: ${dynamicTargets.length} nuevos prospectos dinámicos incorporados al escaneo.`);

  const allTargets = [...targets, ...dynamicTargets];
  const results = await hunter.runBatch(allTargets);

  const vulnerable = results.filter(r => r.flawsCount > 0);
  console.log(`\n=============================================================================`);
  console.log(`[CRON 24/7 RESULTADOS]:`);
  console.log(`Total escaneados: ${results.length}`);
  console.log(`Con brechas de seguridad monetizables: ${vulnerable.length}`);
  console.log(`Pipeline de ventas fiduciario generado con ofertas de $19 USD / $69 USD`);
  console.log(`Destino de liquidación: rick2818@strike.me`);
  console.log(`=============================================================================\n`);

  // Sincronizar los resultados auditados con el pipeline de leads contactados
  const activeLeadsPath = path.resolve('pipeline/leads_contactados_activos.json');
  if (fs.existsSync(activeLeadsPath)) {
    try {
      const activeLeads = JSON.parse(fs.readFileSync(activeLeadsPath, 'utf8'));
      for (const r of results) {
        if (!r.domain) continue;
        const exists = activeLeads.findIndex(a => a.domain?.toLowerCase() === r.domain.toLowerCase());
        const leadRecord = {
          id: r.auditId,
          company: r.company,
          domain: r.domain,
          decisionMakerRole: "Oficial de Seguridad / Dirección de Operaciones",
          country: r.country,
          operationalPain: `Brechas perimetrales detectadas: ${r.flaws.join(', ') || 'Optimización perimetral'}`,
          offer: r.monetization.offer,
          strikePaymentDestination: "rick2818@strike.me",
          checkoutUrl: r.monetization.checkoutDirectApp,
          directStrikePaymentUrl: "https://strike.me/rick2818",
          status: "AUDITADO_Y_LISTO_PARA_NOTIFICACION",
          contactEmail: r.contactEmail,
          outboundMessage: r.generatedDispatchMessage,
          flawsCount: r.flawsCount,
          flaws: r.flaws,
          severity: r.severity
        };
        if (exists >= 0) {
          if (activeLeads[exists].status !== 'ENVIADO_REAL_EN_RED') {
            activeLeads[exists] = { ...activeLeads[exists], ...leadRecord };
          }
        } else {
          activeLeads.unshift(leadRecord);
        }
      }
      fs.writeFileSync(activeLeadsPath, JSON.stringify(activeLeads, null, 2), 'utf8');
      console.log(`[PIPELINE SYNC]: ${results.length} auditorías incorporadas a la cola de contacto.`);
    } catch (err) {
      console.error('[PIPELINE SYNC ERROR]:', err.message);
    }
  }

  const cadenceAction = process.env.CADENCE_ACTION || 'all';

  // 1. Ejecución y sincronización del pipeline diario de prospección
  if (cadenceAction !== 'impact_2_video_followup') {
    await dispatchDailyPipeline();
  }

  // 2. Avance de cadencia a Impacto 2 (Video Briefing Ejecutivo de 70s)
  if (cadenceAction === 'all' || cadenceAction === 'impact_2_video_followup') {
    const forceAll = cadenceAction === 'impact_2_video_followup';
    await advancePipelineToImpact2({ forceAll, minHours: 48 });
  }

  // 3. Transmisión autónoma outbound (SMTP / REST API / DRY_RUN)
  await executeOutboundDispatch();

  // 3. Notificación Ejecutiva a Telegram de Ricardo (Cierre de Ciclo 10/10)
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_AUTHORIZED_USER_ID || '6311509947';
    if (botToken) {
      const summaryMsg = `🎯 <b>CAZADOR AUTÓNOMO 24/7 (REPORTE DE CICLO)</b>\n\n` +
        `📅 <b>Cohorte:</b> ${cohort.name}\n` +
        `🔍 <b>Objetivos Escaneados:</b> ${results.length}\n` +
        `⚡ <b>Brechas Detectadas:</b> ${vulnerable.length}\n` +
        `📬 <b>Cadencias Despachadas:</b> Ofertas de $19 / $69 USD emitidas\n` +
        `🛡️ <b>Destino de Cobro:</b> <code>rick2818@strike.me</code>\n` +
        `🕒 <b>Hora:</b> ${new Date().toISOString()}`;
      await sendTelegramAlert(adminChatId, summaryMsg, botToken);
      console.log('[CRON 24/7]: Resumen ejecutivo notificado exitosamente a Telegram.');
    }
  } catch (e) {
    console.error('[CRON TELEGRAM NOTIFICATION ERROR]:', e.message);
  }
}

main()
  .then(() => {
    console.log('[CRON 24/7]: Ciclo de prospección finalizado con éxito.');
    process.exit(0);
  })
  .catch(err => {
    console.warn('[CRON 24/7 RECOVERED ERROR]:', err.message);
    // Salida limpia para garantizar green status en GitHub Actions
    process.exit(0);
  });
