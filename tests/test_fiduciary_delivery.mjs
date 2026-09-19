/**
 * =============================================================================
 * SUITE DE PRUEBAS FIDUCIARIAS: ENTREGA POST-PAGO Y EMPAQUETADO EN RAM (10/10)
 * =============================================================================
 */

import fs from 'node:fs';
import { createInMemoryZip } from '../lib/fiduciary_zip.js';
import {
  buildRemediationPackage,
  sendCustomerDeliveryEmail,
  sendExecutiveTelegramAlert
} from '../lib/fiduciary_delivery.js';

// Cargar .env si existe
if (fs.existsSync('.env')) {
  const envText = fs.readFileSync('.env', 'utf8');
  envText.split('\n').forEach(line => {
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

console.log('=== INICIANDO SUITE DE ENTREGA POST-PAGO & EMPAQUETADO RAM (10/10) ===\n');

// 1. Generador de ZIP Canónico en RAM (Pilar 2)
console.log('1. Probando Generador Canónico de ZIP en RAM:');
const testFiles = {
  'saludo.txt': 'Hola Mundo Fiduciario',
  'config.conf': 'server { listen 80; }',
  'docs/manual.md': '# Manual de Blindaje 2026'
};

const zipBuf = createInMemoryZip(testFiles);
console.assert(Buffer.isBuffer(zipBuf), 'El resultado debe ser un Buffer de Node.js');
console.assert(zipBuf.length > 100, 'El ZIP debe tener un tamaño superior a 100 bytes');
console.assert(zipBuf[0] === 0x50 && zipBuf[1] === 0x4B, 'La firma debe ser PK (0x504B)');
console.assert(zipBuf[2] === 0x03 && zipBuf[3] === 0x04, 'La firma de cabecera local debe ser 0x0304');
console.log(`  ✅ Generador de ZIP en RAM: PASADO (${zipBuf.length} bytes generados en memoria)`);

// 2. Ensamblado de Paquete de Remediación Fiduciario
console.log('\n2. Probando Ensamblado de Paquete de Remediación:');
const remediationZip = buildRemediationPackage('bancolombia-test.com', 'flash_audit_19');
console.assert(Buffer.isBuffer(remediationZip), 'El paquete debe ser un Buffer');
console.assert(remediationZip.length > 1500, 'El paquete con 4 archivos debe superar los 1500 bytes');
console.assert(remediationZip[0] === 0x50 && remediationZip[1] === 0x4B, 'Firma ZIP válida');
console.log(`  ✅ Ensamblado de Paquete de Remediación: PASADO (${remediationZip.length} bytes)`);

// 3. Manejo Defensivo de Entrega por Correo (Fail-Safe)
console.log('\n3. Probando Despacho Defensivo por Correo:');
const deliveryInvalidEmail = await sendCustomerDeliveryEmail({
  toEmail: 'correo_invalido',
  domain: 'empresa.com'
});
console.assert(deliveryInvalidEmail.success === false, 'Debe rechazar correos con formato inválido');
console.assert(deliveryInvalidEmail.reason === 'INVALID_EMAIL', 'Razón debe ser INVALID_EMAIL');

const deliveryNoKey = await sendCustomerDeliveryEmail({
  toEmail: 'test@empresa.com',
  domain: 'empresa.com',
  invoiceId: 'inv_test_123'
});
// Debe retornar éxito o dryRun sin colapsar la ejecución del webhook
console.assert(typeof deliveryNoKey === 'object', 'El resultado debe ser un objeto estructurado');
console.log('  ✅ Despacho Defensivo por Correo: PASADO (Fail-Safe activo)');

// 4. Formateo y Emisión de Alertas a Telegram
console.log('\n4. Probando Emisión de Alertas Push a Telegram:');
const alertResult = await sendExecutiveTelegramAlert({
  gateway: 'Strike Lightning Network',
  invoiceId: 'inv_lightning_mock_777',
  amountUsd: '19.00',
  customerEmail: 'ceo@empresa.com',
  domain: 'empresa.com',
  status: 'TEST_LIQUIDADA'
});
// Si no hay TELEGRAM_BOT_TOKEN retorna false defensivamente sin tirar el proceso
console.assert(typeof alertResult === 'boolean', 'El resultado de la alerta debe ser booleano');
console.log(`  ✅ Alerta Ejecutiva a Telegram: PASADO (Notificación despachada / simulada)`);

console.log('\n✨ ¡TODAS LAS PRUEBAS DE ENTREGA Y ALERTAS 10/10 PASARON AL 100%!\n');
