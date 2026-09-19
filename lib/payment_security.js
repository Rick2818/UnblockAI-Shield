/**
 * =============================================================================
 * DESTRABA AI â€” MOTOR FIDUCIARIO DE PASARELAS Y CIBERSEGURIDAD BANCARIA
 * Pasarelas Integradas:
 *   1. Wompi SV (Tarjetas Locales / Internacionales / Transferencias 365)
 *   2. Strike Lightning Network -> Destino Fiduciario: rick2818@strike.me
 * =============================================================================
 */

import crypto from 'crypto';

// Catálogo Inmutable de Precios Fiduciarios en USD (Cero manipulación de montos por el cliente)
export const CATALOGO_PRECIOS_USD = Object.freeze({
  'flash_audit_19': {
    id: 'flash_audit_19',
    name: 'Flash Audit License (Diagnóstico en RAM)',
    amount_usd: 19.00,
    tier: 'flash_audit'
  },
  'support_concierge_49': {
    id: 'support_concierge_49',
    name: 'Agente de Soporte & Concierge Inmediato (WhatsApp/Web)',
    amount_usd: 49.00,
    tier: 'support_concierge'
  },
  'marketing_authority_59': {
    id: 'marketing_authority_59',
    name: 'Agente Directora de Mercadeo & Autoridad en Redes',
    amount_usd: 59.00,
    tier: 'marketing_authority'
  },
  'inventory_logistics_69': {
    id: 'inventory_logistics_69',
    name: 'Agente de Control de Inventario & Envíos (Logística)',
    amount_usd: 69.00,
    tier: 'inventory_logistics'
  },
  'outbound_sales_79': {
    id: 'outbound_sales_79',
    name: 'Agente de Ventas Outbound & Prospección B2B',
    amount_usd: 79.00,
    tier: 'outbound_sales'
  },
  'financial_audit_89': {
    id: 'financial_audit_89',
    name: 'Agente de Cobranza Fiduciaria & Conciliación Bancaria',
    amount_usd: 89.00,
    tier: 'financial_audit'
  },
  'suite_elite_249': {
    id: 'suite_elite_249',
    name: 'Pack Suite Ã‰lite (Los 5 Agentes Integrados + Orquestador)',
    amount_usd: 249.00,
    tier: 'suite_elite'
  }
});

// Ledger de Idempotencia en RAM (Previene ataques de repetición o doble acreditación)
const idempotencyLedger = new Map();

// Rate Limiter en RAM (Anti-Carding / Anti-DDoS)
const ipRequestWindow = new Map();

/**
 * Aplica cabeceras de ciberseguridad bancaria estrictas
 */
export function applyBankingSecurityHeaders(res) {
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' https:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;");
}

/**
 * Limitador de tasa (Anti-Brute Force / Anti-Carding)
 */
export function checkRateLimit(clientIp, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = ipRequestWindow.get(clientIp) || { count: 0, resetAt: now + windowMs };

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }

  ipRequestWindow.set(clientIp, record);
  return record.count <= maxRequests;
}

/**
 * Validación criptográfica Timing-Safe en tiempo constante
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * =============================================================================
 * âš¡ PASARELA 1: STRIKE LIGHTNING NETWORK (Destino: rick2818@strike.me)
 * =============================================================================
 */
export class StrikeLightningGateway {
  constructor(options = {}) {
    this.lightningAddress = options.lightningAddress || 'rick2818@strike.me';
    this.apiKey = options.apiKey || process.env.STRIKE_API_KEY || '';
    this.webhookSecret = options.webhookSecret || process.env.STRIKE_WEBHOOK_SECRET || '';
    this.apiBase = 'https://api.strike.me/v1';
  }

  /**
   * Genera un enlace LNURL / Invoice Lightning para liquidación instantánea en USD hacia rick2818@strike.me
   */
  async createLightningPayment(productId, clientEmail = '') {
    const product = CATALOGO_PRECIOS_USD[productId];
    if (!product) {
      throw new Error(`Producto inválido. ID '${productId}' no existe en el catálogo fiduciario.`);
    }

    const correlationId = `strike_inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Si cuenta con API Key de Strike oficial:
    if (this.apiKey) {
      const strikeRes = await fetch(`${this.apiBase}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          amount: { currency: 'USD', amount: product.amount_usd.toFixed(2) },
          description: `DESTRABA AI - ${product.name} (Ref: ${correlationId})`,
          correlationId: correlationId
        })
      });

      if (strikeRes.ok) {
        const invoiceData = await strikeRes.json();
        return {
          success: true,
          gateway: 'strike_lightning',
          destination: this.lightningAddress,
          invoice_id: invoiceData.invoiceId,
          amount_usd: product.amount_usd,
          bolt11: invoiceData.lnInvoice,
          correlation_id: correlationId,
          qr_data: invoiceData.lnInvoice
        };
      }
    }

    // Protocolo LNURL-Pay estándar hacia rick2818@strike.me (Liquidación Directa)
    const validAddress = (this.lightningAddress && this.lightningAddress.includes('@')) ? this.lightningAddress.trim() : 'rick2818@strike.me';
    const [username, domain] = validAddress.split('@');
    const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${username}`;

    return {
      success: true,
      gateway: 'strike_lightning',
      destination: this.lightningAddress,
      amount_usd: product.amount_usd,
      product_name: product.name,
      correlation_id: correlationId,
      lightning_address: this.lightningAddress,
      lnurl_endpoint: lnurlpUrl,
      payment_instructions: `Enviar equivalente en satoshis de $${product.amount_usd.toFixed(2)} USD a la dirección Lightning: ${this.lightningAddress}`,
      direct_strike_url: `https://strike.me/${username}`
    };
  }

  /**
   * Valida la firma del webhook de Strike mediante HMAC SHA-256 timing-safe
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.webhookSecret || !signatureHeader) return false;
    
    // Parsear formato oficial de Strike: t=<timestamp>,v1=<signature>
    let targetSig = signatureHeader;
    if (signatureHeader.includes('v1=')) {
      const parts = signatureHeader.split(',').reduce((acc, part) => {
        const [k, v] = part.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});
      targetSig = parts.v1 || signatureHeader;
    }

    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return timingSafeCompare(computedSignature, targetSig);
  }
}

/**
 * =============================================================================
 * ðŸ’³ PASARELA 2: WOMPI SV (CentroamÃ©rica & Tarjetas Bancarias)
 * =============================================================================
 */
export class WompiGateway {
  constructor(options = {}) {
    this.appId = options.appId || process.env.WOMPI_APP_ID || '';
    this.apiSecret = options.apiSecret || process.env.WOMPI_API_SECRET || '';
    this.webhookSecret = options.webhookSecret || process.env.WOMPI_WEBHOOK_SECRET || '';
    this.apiUrl = options.apiUrl || process.env.WOMPI_API_URL || 'https://api.wompi.sv';
  }

  /**
   * Genera un enlace de cobro fiduciario con montos protegidos y antifraude
   */
  async createPaymentLink(productId, clientEmail, redirectUrl) {
    const product = CATALOGO_PRECIOS_USD[productId];
    if (!product) {
      throw new Error(`Producto inválido. ID '${productId}' no existe en el catálogo.`);
    }

    const referenceId = `wompi_ref_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (!this.apiSecret || !this.appId) {
      // Retorna estructura pre-firmada para formulario protegido
      return {
        success: true,
        gateway: 'wompi_sv',
        status: 'READY_FOR_COMMERCE',
        reference_id: referenceId,
        amount_usd: product.amount_usd,
        product_name: product.name,
        client_email: clientEmail,
        payment_url: `https://wompi.sv/enlace-pago?ref=${referenceId}&monto=${product.amount_usd}`
      };
    }

    const response = await fetch(`${this.apiUrl}/EnlacePago`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiSecret}`,
        'X-App-Id': this.appId
      },
      body: JSON.stringify({
        identificadorEnlaceComercio: referenceId,
        monto: product.amount_usd,
        nombreProducto: `DESTRABA AI - ${product.name}`,
        urlRedirect: redirectUrl || 'https://destraba.ai/success',
        configuracion: {
          esMontoEditable: false, // ðŸ”’ Protección Bancaria: El cliente NUNCA puede modificar el monto
          permiteTarjetaCreditoDebito: true,
          permitePagoConPuntosAgricola: true,
          permiteTransferencia365: true
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.mensaje || 'Error al generar enlace fiduciario en Wompi.');
    }

    return {
      success: true,
      gateway: 'wompi_sv',
      reference_id: referenceId,
      amount_usd: product.amount_usd,
      url_pago: data.urlEnlace
    };
  }

  /**
   * Valida la firma del webhook de Wompi SV (HMAC SHA-256 timing-safe)
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!this.webhookSecret || !signatureHeader) return false;
    
    // Parsear formato oficial de Strike: t=<timestamp>,v1=<signature>
    let targetSig = signatureHeader;
    if (signatureHeader.includes('v1=')) {
      const parts = signatureHeader.split(',').reduce((acc, part) => {
        const [k, v] = part.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});
      targetSig = parts.v1 || signatureHeader;
    }

    const computedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return timingSafeCompare(computedSignature, targetSig);
  }
}

/**
 * Validador universal de idempotencia (Memoria Local + Persistencia en RAM)
 */
export function recordAndVerifyIdempotency(transactionId) {
  if (!transactionId) return { isDuplicate: false };
  if (idempotencyLedger.has(transactionId)) {
    return { isDuplicate: true, firstSeen: idempotencyLedger.get(transactionId) };
  }
  idempotencyLedger.set(transactionId, Date.now());
  
  // Limpieza preventiva si el mapa supera 10,000 entradas
  if (idempotencyLedger.size > 10000) {
    const oldestKeys = Array.from(idempotencyLedger.keys()).slice(0, 1000);
    for (const k of oldestKeys) idempotencyLedger.delete(k);
  }
  
  return { isDuplicate: false };
}

/**
 * Validador distribuido de idempotencia para entornos Cloud Serverless (Upstash Redis REST)
 * Protege contra invocaciones frías o múltiples contenedores concurrentes en Vercel.
 */
export async function recordAndVerifyDistributedIdempotency(transactionId, ttlSeconds = 86400) {
  if (!transactionId) return { isDuplicate: false };

  // 1. Verificación rápida en RAM local (primera línea de defensa)
  const localCheck = recordAndVerifyIdempotency(transactionId);
  if (localCheck.isDuplicate) {
    return localCheck;
  }

  // 2. Verificación distribuida si Upstash Redis REST está disponible
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const endpoint = `${upstashUrl.replace(/\/+$/, '')}/set/${encodeURIComponent(`idemp:${transactionId}`)}/${Date.now()}?nx&ex=${ttlSeconds}`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { Authorization: `Bearer ${upstashToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Si result es null, la clave ya existía (es duplicado distribuido)
        if (data.result === null) {
          return { isDuplicate: true, source: 'DISTRIBUTED_REDIS' };
        }
      }
    } catch (e) {
      console.warn(`[DISTRIBUTED IDEMPOTENCY]: Upstash unreachable (${e.message}), relying on memory ledger.`);
    }
  }

  return { isDuplicate: false, source: 'VALIDATED' };
}


