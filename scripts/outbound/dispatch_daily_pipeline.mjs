/**
 * =============================================================================
 * DISPATCHER DIARIO DE CADENCIAS B2B — DESTRABA AI
 * Procesa y activa los leads del día según el cronograma fiduciario
 * Destino de cobro: rick2818@strike.me
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';

const PIPELINE_DIR = path.resolve('pipeline');
const ACTIVE_LEADS_FILE = path.join(PIPELINE_DIR, 'leads_contactados_activos.json');
const MARTES_LEADS_FILE = path.join(PIPELINE_DIR, 'leads_colombia_martes.json');
const PYMES_LEADS_FILE = path.join(PIPELINE_DIR, 'leads_pymes_alta_conversion.json');
const OPP_FILE = path.join(PIPELINE_DIR, 'oportunidades_detectadas.json');

function loadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error(`Error leyendo ${filePath}:`, e.message);
  }
  return [];
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export async function dispatchDailyPipeline() {
  console.log('[DISPATCHER]: Iniciando despacho del pipeline diario...');

  let activeLeads = loadJson(ACTIVE_LEADS_FILE);
  const martesLeads = loadJson(MARTES_LEADS_FILE);
  const pymesLeads = loadJson(PYMES_LEADS_FILE);
  let opps = loadJson(OPP_FILE);

  let newlyDispatched = 0;
  const now = new Date().toISOString();
  const followUpDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Sincronizar catálogo PYME de alta conversión
  for (const pyme of pymesLeads) {
    const existingIndex = activeLeads.findIndex(a => a.id === pyme.id || a.domain === pyme.domain);
    if (existingIndex === -1) {
      activeLeads.push(pyme);
      newlyDispatched++;
    }
  }

  for (const lead of martesLeads) {
    const existingIndex = activeLeads.findIndex(a => a.id === lead.id || a.domain === lead.domain);

    const activeRecord = {
      ...lead,
      status: 'CONTACTADO_IMPACTO_1',
      dispatchedAt: now,
      nextFollowUpDate: followUpDate
    };

    if (existingIndex >= 0) {
      // No sobreescribir si ya fue enviado exitosamente en red
      if (activeLeads[existingIndex].status !== 'ENVIADO_REAL_EN_RED') {
        activeLeads[existingIndex] = { ...activeLeads[existingIndex], ...activeRecord };
      }
    } else {
      activeLeads.push(activeRecord);
      newlyDispatched++;
    }

    // Actualizar también en el listado origen
    lead.status = 'CONTACTADO_IMPACTO_1';
    lead.dispatchedAt = now;

    // Actualizar en oportunidades si existe
    const opp = opps.find(o => o.domain === lead.domain);
    if (opp) {
      opp.status = 'EN_CADENCIA_ACTIVA';
      opp.lastContact = now;
    }
  }

  saveJson(ACTIVE_LEADS_FILE, activeLeads);
  saveJson(MARTES_LEADS_FILE, martesLeads);
  saveJson(OPP_FILE, opps);

  console.log('\n=============================================================================');
  console.log('[DISPATCHER RESULTADOS]:');
  console.log(`Total leads activos en seguimiento: ${activeLeads.length}`);
  console.log(`Nuevos impactos despachados hoy (Martes - Colombia): ${newlyDispatched}`);
  console.log(`Próximo seguimiento (Impacto 2): ${followUpDate}`);
  console.log('Monetización en satoshis / USD dirigida a: rick2818@strike.me');
  console.log('=============================================================================\n');

  return { activeCount: activeLeads.length, newlyDispatched };
}

/**
 * Avanza automáticamente los leads que ya recibieron Impacto 1 al Impacto 2 (Video Briefing 70s)
 */
export async function advancePipelineToImpact2(options = {}) {
  const { renderCampaignMessage } = await import('./campaign_engine.mjs');
  console.log('[CADENCE ADVANCER]: Evaluando leads para el Impacto 2 (Video Briefing 70s)...');

  let activeLeads = loadJson(ACTIVE_LEADS_FILE);
  if (!activeLeads.length) {
    console.log('[CADENCE ADVANCER]: No hay leads en el pipeline.');
    return { preparedCount: 0 };
  }

  const minHours = options.minHours ?? 48; // Ventana recomendada de 48h hábiles
  const forceAll = options.forceAll ?? false;
  const limit = options.limit ?? (parseInt(process.env.BATCH_LIMIT, 10) || 25);
  const now = Date.now();

  let preparedCount = 0;

  for (const lead of activeLeads) {
    if (preparedCount >= limit) break;

    // Solo candidatos que recibieron Impacto 1 y no han recibido Impacto 2
    const wasImpact1Sent = lead.status === 'ENVIADO_REAL_EN_RED' || lead.status === 'CONTACTADO_IMPACTO_1';
    const notYetImpact2 = lead.status !== 'ENVIADO_IMPACTO_2' && lead.status !== 'LISTO_IMPACTO_2' && lead.currentImpact !== 2;

    if (!wasImpact1Sent || !notYetImpact2) continue;

    // Chequeo de ventana de tiempo (si no es forceAll)
    const sentTime = lead.deliveryAudit?.dispatchedAt ? new Date(lead.deliveryAudit.dispatchedAt).getTime() : 0;
    const hoursElapsed = sentTime > 0 ? (now - sentTime) / (1000 * 60 * 60) : 999;

    if (!forceAll && hoursElapsed < minHours) {
      continue;
    }

    // Identificar idioma y mercado fiduciario
    const country = (lead.country || '').toLowerCase();
    const isEnglish = country.includes('usa') || country.includes('ee.uu') || country.includes('united states') || 
                      country.includes('uk') || country.includes('europe') || country.includes('global') || 
                      country.includes('denmark') || country.includes('sweden') || country.includes('finland');
    const lang = isEnglish ? 'en' : 'es';

    const rendered = renderCampaignMessage(
      'CYBERSECURITY_DEFENSE_AUDIT',
      2,
      lead.company,
      lang,
      lead.domain
    );

    const toEmail = lead.corporateEmail || lead.contactEmail || ('contacto@' + lead.domain);

    lead.status = 'LISTO_IMPACTO_2';
    lead.targetImpact = 2;
    lead.preparedForImpact2At = new Date().toISOString();
    lead.outboundMessage = {
      to: toEmail,
      subject: rendered.subject,
      body: rendered.body
    };

    preparedCount++;
    console.log(`-> [IMPACTO 2 PREPARADO]: ${lead.company} (${lead.domain}) | Dest: ${toEmail} | Idioma: ${lang.toUpperCase()}`);
  }

  saveJson(ACTIVE_LEADS_FILE, activeLeads);

  console.log('\n=============================================================================');
  console.log(`[CADENCE ADVANCER]: ${preparedCount} leads programados para Impacto 2 (Video Briefing)`);
  console.log(`Estado en pipeline: LISTO_IMPACTO_2`);
  console.log('=============================================================================\n');

  return { preparedCount };
}

if (process.argv[1]?.includes('dispatch_daily_pipeline.mjs')) {
  dispatchDailyPipeline().catch(console.error);
}
