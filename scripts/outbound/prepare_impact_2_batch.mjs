/**
 * =============================================================================
 * PREPARADOR Y DISPARADOR DEL LOTE DE IMPACTO 2 (VIDEO BRIEFING 70s)
 * =============================================================================
 * Avanza la cadencia de leads contactados al Impacto 2 incorporando el video
 * ejecutivo alojado en https://unblock-shield.vercel.app/?domain={domain}
 * y los 5 Anclajes de Confianza Fiduciaria.
 * =============================================================================
 */

import { advancePipelineToImpact2 } from './dispatch_daily_pipeline.mjs';
import { executeOutboundDispatch } from './send_smtp_dispatch.mjs';

// Cargar .env si existe
try { process.loadEnvFile?.(); } catch (e) {}

async function run() {
  const isForce = process.argv.includes('--force');
  const shouldDispatch = process.argv.includes('--dispatch');
  const isDryRun = process.argv.includes('--dry-run');

  const limitArg = process.argv.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 25;

  console.log('=============================================================================');
  console.log('🎬 PREPARADOR DE CADENCIA — IMPACTO 2 (VIDEO BRIEFING 70s)');
  console.log(`Modo Forzar Avance: ${isForce ? 'SÍ' : 'NO (Solo >= 48h hábiles)'}`);
  console.log(`Límite de Lote: ${limit} prospectos`);
  console.log(`Despacho Inmediato: ${shouldDispatch ? (isDryRun ? 'SÍ (DRY_RUN)' : 'SÍ (LIVE)') : 'NO (Solo preparación)'}`);
  console.log('=============================================================================\n');

  const { preparedCount } = await advancePipelineToImpact2({
    forceAll: isForce,
    minHours: isForce ? 0 : 48,
    limit
  });

  console.log(`\n[RESULTADO]: ${preparedCount} leads actualizados a LISTO_IMPACTO_2 con la plantilla del video.`);

  if (shouldDispatch && preparedCount > 0) {
    console.log('\n[INICIANDO TRANSMISIÓN OUTBOUND DEL LOTE]...');
    await executeOutboundDispatch({ dryRun: isDryRun, batchLimit: limit });
  } else if (!shouldDispatch) {
    console.log('\n💡 El lote quedó guardado en pipeline/leads_contactados_activos.json.');
    console.log('Para transmitirlo en red ejecuta:');
    console.log('  node scripts/outbound/prepare_impact_2_batch.mjs --dispatch');
    console.log('O para simular sin enviar correos reales:');
    console.log('  node scripts/outbound/prepare_impact_2_batch.mjs --dispatch --dry-run');
  }
}

run().catch(console.error);
