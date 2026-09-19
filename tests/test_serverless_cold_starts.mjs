/**
 * =============================================================================
 * SUITE DE VALIDACIÓN: COLD-STARTS SERVERLESS, DNC Y DESCUBRIMIENTO DINÁMICO
 * =============================================================================
 * Certificación de Estándar Fiduciario 10/10
 * =============================================================================
 */

import assert from 'node:assert/strict';
import { recordAndVerifyDistributedIdempotency } from '../lib/payment_security.js';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  addToDncBlacklist,
  isBlacklisted,
  generateComplianceFooterHtml,
  generateComplianceFooterText
} from '../lib/compliance_dnc.js';
import { dispatchUniversalEmail } from '../lib/universal_email_engine.js';
import { AutonomousHunter } from '../scripts/outbound/autonomous_hunter.mjs';
import { ExecutiveAssistantMCPHub } from '../lib/mcp_executive_assistant.js';

console.log('\n=== INICIANDO SUITE DE RESILIENCIA SERVERLESS & CUMPLIMIENTO (10/10) ===\n');

async function runSuite() {
  // ---------------------------------------------------------------------------
  // 1. IDEMPOTENCIA DISTRIBUIDA Y SIMULACIÓN DE CONCURRENCIA COLD START
  // ---------------------------------------------------------------------------
  console.log('1. Probando Idempotencia Concurrente (Simulación Cold Start):');
  const testTxId = `tx_coldstart_${Date.now()}_${Math.random()}`;

  // Simular 5 solicitudes concurrentes que compiten por el mismo ID de transacción
  const concurrentAttempts = await Promise.all([
    recordAndVerifyDistributedIdempotency(testTxId),
    recordAndVerifyDistributedIdempotency(testTxId),
    recordAndVerifyDistributedIdempotency(testTxId),
    recordAndVerifyDistributedIdempotency(testTxId),
    recordAndVerifyDistributedIdempotency(testTxId)
  ]);

  const approved = concurrentAttempts.filter(r => !r.isDuplicate);
  const blocked = concurrentAttempts.filter(r => r.isDuplicate);

  assert.equal(approved.length, 1, 'Exactamente 1 solicitud debe ser aprobada en concurrencia');
  assert.equal(blocked.length, 4, 'Las 4 solicitudes restantes deben ser rechazadas como duplicadas');
  console.log('  ✅ Idempotencia Concurrente: PASADO (1 aprobada, 4 bloqueadas)');

  // ---------------------------------------------------------------------------
  // 2. TOKEN CRIPTOGRÁFICO DE DESUSCRIPCIÓN HMAC-SHA256
  // ---------------------------------------------------------------------------
  console.log('\n2. Probando Tokens Criptográficos de Desuscripción:');
  const targetEmail = 'director.operaciones@logistica-andina.com';
  const unsubToken = generateUnsubscribeToken(targetEmail);
  assert.ok(unsubToken && unsubToken.length > 20, 'El token debe ser generado en base64url');

  const verified = verifyUnsubscribeToken(unsubToken);
  assert.equal(verified.valid, true, 'El token debe ser válido criptográficamente');
  assert.equal(verified.email, targetEmail, 'El email extraído debe coincidir exactamente');

  const tamperedToken = unsubToken.substring(0, unsubToken.length - 4) + 'abcd';
  const tamperedCheck = verifyUnsubscribeToken(tamperedToken);
  assert.equal(tamperedCheck.valid, false, 'Un token alterado debe ser rechazado');
  console.log('  ✅ Tokens HMAC-SHA256 de Desuscripción: PASADO');

  // ---------------------------------------------------------------------------
  // 3. REGISTRO EN BLACKLIST DNC & SUPRESIÓN OBLIGATORIA
  // ---------------------------------------------------------------------------
  console.log('\n3. Probando Supresión DNC (Do Not Contact):');
  const blacklistEmail = `optout_${Date.now()}_${Math.floor(Math.random() * 10000)}@unique-test-${Date.now()}.com`;
  assert.equal(await isBlacklisted(blacklistEmail), false, 'Antes de añadir, no debe estar en blacklist');

  await addToDncBlacklist(blacklistEmail, 'TEST_OPTOUT');
  assert.equal(await isBlacklisted(blacklistEmail), true, 'Tras añadir, debe estar bloqueado');

  // Verificar que el motor de correo lo suprime inmediatamente
  const dispatchAttempt = await dispatchUniversalEmail({
    to: blacklistEmail,
    subject: 'Intento hacia contacto excluido',
    text: 'Cuerpo de prueba'
  });

  assert.equal(dispatchAttempt.success, false, 'El despacho debe fallar/cancelarse');
  assert.equal(dispatchAttempt.suppressed, true, 'Debe marcarse como suprimido por DNC');
  assert.equal(dispatchAttempt.reason, 'DNC_BLACKLISTED', 'La razón debe ser DNC_BLACKLISTED');
  console.log('  ✅ Supresión Defensiva DNC: PASADO');

  // ---------------------------------------------------------------------------
  // 4. GENERACIÓN DE PIE DE PÁGINA INSTITUCIONAL CAN-SPAM
  // ---------------------------------------------------------------------------
  console.log('\n4. Probando Pie de Página Institucional de Cumplimiento:');
  const footerHtml = generateComplianceFooterHtml('ceo@empresa.com');
  const footerText = generateComplianceFooterText('ceo@empresa.com');

  assert.ok(footerHtml.includes('/api/unsubscribe?token='), 'El HTML debe contener el link de desuscripción');
  assert.ok(footerText.includes('/api/unsubscribe?token='), 'El texto plano debe contener el link de desuscripción');
  console.log('  ✅ Pie de Página CAN-SPAM / GDPR: PASADO');

  // ---------------------------------------------------------------------------
  // 5. MOTOR DE DESCUBRIMIENTO DINÁMICO DE LEADS (ANTI-FATIGA 90 DÍAS)
  // ---------------------------------------------------------------------------
  console.log('\n5. Probando Motor Dinámico de Descubrimiento de Leads:');
  const hunter = new AutonomousHunter();
  const dynamicTargets = await hunter.discoverDynamicTargets({ limit: 3 });

  assert.ok(Array.isArray(dynamicTargets), 'Debe retornar un array de objetivos');
  assert.ok(dynamicTargets.length > 0, 'Debe descubrir prospectos dinámicos en el catálogo');
  assert.ok(dynamicTargets[0].domain, 'Cada prospecto debe tener un dominio válido');
  console.log(`  ✅ Descubrimiento Dinámico: PASADO (${dynamicTargets.length} candidatos localizados: ${dynamicTargets.map(t => t.domain).join(', ')})`);

  // ---------------------------------------------------------------------------
  // 6. HERRAMIENTAS MCP CONCIERGE (CLIMA EN VIVO & FECHAS DINÁMICAS)
  // ---------------------------------------------------------------------------
  console.log('\n6. Probando Conexión en Vivo MCP (Clima San Salvador & Vuelos):');
  const mcpHub = new ExecutiveAssistantMCPHub();
  const weather = await mcpHub.getLiveSanSalvadorWeather();

  assert.equal(weather.success, true, 'La consulta de clima debe ser exitosa');
  assert.ok(weather.temperature_celsius !== undefined, 'Debe retornar temperatura');
  console.log(`  ✅ Clima en Vivo San Salvador: PASADO (${weather.temperature_celsius}°C - ${weather.condition})`);

  const flightSearch = await mcpHub.searchFlightsFromSAL('Madrid');
  assert.equal(flightSearch.success, true, 'La búsqueda de vuelos debe ser exitosa');
  assert.ok(flightSearch.departure_date, 'Debe tener fecha de salida dinámica calculada');
  assert.ok(flightSearch.booking_action_url.includes(flightSearch.departure_date), 'La URL debe incluir la fecha real calculada');
  console.log(`  ✅ Búsqueda Dinámica de Vuelos: PASADO (Salida calculada: ${flightSearch.departure_date})`);

  console.log('\n✨ ¡TODAS LAS PRUEBAS DE RESILIENCIA Y CALIDAD 10/10 PASARON AL 100%!\n');
}

runSuite().catch((err) => {
  console.error('\n❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
});
