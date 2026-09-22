/**
 * ==============================================================================
 * ENDPOINT SERVERLESS: HUBSPOT BIDIRECTIONAL WEBHOOK (BOLTECH GROUP)
 * ==============================================================================
 * Recibe eventos de HubSpot CRM (cambios de etapa de Deals, nuevos contactos)
 * y ejecuta aprovisionamiento de la Cabina Cloud en tiempo real.
 * ==============================================================================
 */

import { handleHubSpotWebhookEvent } from '../lib/bidirectional_commercial_sync.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-HubSpot-Signature, X-HubSpot-Signature-v3');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'OPERATIONAL',
      service: 'Boltech Group HubSpot Bidirectional Webhook',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    let events = Array.isArray(payload) ? payload : [payload];

    const results = [];
    for (const evt of events) {
      if (evt) {
        const processed = await handleHubSpotWebhookEvent(evt);
        results.push(processed);
      }
    }

    return res.status(200).json({
      success: true,
      processedEvents: results.length,
      results
    });
  } catch (err) {
    console.error('[HubSpot Webhook Error]:', err);
    return res.status(500).json({ error: err.message });
  }
}
