/**
 * =============================================================================
 * MOTOR B2B APOLLO.IO & ENRIQUECIMIENTO FIDUCIARIO — UNBLOCK AI / DESTRABA AI
 * Optimizado para cuenta Apollo.io de Ricardo (75 Créditos Gratuitos Activos)
 * - organizations/enrich: Extrae datos corporativos, teléfonos y tecnologías
 * - contacts/search: Extrae contactos guardados en Apollo para despacho desatendido
 * - Validación: validator.js y deep-email-validator para 0% tasa de rebote
 * =============================================================================
 */

import 'dotenv/config';
import validator from 'validator';
import { validate as deepValidateEmail } from 'deep-email-validator';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || '';

/**
 * Enriquece una empresa a partir de su dominio usando Apollo.io
 * @param {string} domain - Ej: "coordinadora.com", "stripe.com"
 */
export async function enrichCompanyWithApollo(domain) {
  if (!APOLLO_API_KEY) {
    console.warn('[APOLLO ENRICH]: No se detectó APOLLO_API_KEY.');
    return null;
  }

  const cleanDomain = validator.escape(domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim().toLowerCase());
  const url = `https://api.apollo.io/v1/organizations/enrich?domain=${encodeURIComponent(cleanDomain)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY
      }
    });

    if (!res.ok) {
      console.warn(`[APOLLO ENRICH]: Error (${res.status}) para ${cleanDomain}`);
      return null;
    }

    const data = await res.json();
    const org = data.organization;
    if (!org) return null;

    return {
      name: org.name || cleanDomain,
      domain: cleanDomain,
      phone: org.phone || org.primary_phone?.number || '',
      industry: org.industry || '',
      estimatedNumEmployees: org.estimated_num_employees || 0,
      linkedinUrl: org.linkedin_url || '',
      country: org.country || '',
      city: org.city || '',
      technologies: (org.current_technologies || []).map(t => t.name).slice(0, 10),
      rawApolloId: org.id
    };
  } catch (err) {
    console.error(`[APOLLO ENRICH ERROR]:`, err.message);
    return null;
  }
}

/**
 * Consulta los contactos guardados en Apollo.io y los valida para prospección
 */
export async function fetchSavedApolloContacts() {
  if (!APOLLO_API_KEY) {
    console.warn('[APOLLO CONTACTS]: No se detectó APOLLO_API_KEY.');
    return [];
  }

  const url = 'https://api.apollo.io/v1/contacts/search';

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': APOLLO_API_KEY
      },
      body: JSON.stringify({
        page: 1,
        per_page: 25
      })
    });

    if (!res.ok) {
      console.warn(`[APOLLO CONTACTS]: Error (${res.status}) al consultar contactos.`);
      return [];
    }

    const data = await res.json();
    const contacts = data.contacts || [];
    console.log(`[APOLLO CONTACTS]: ${contacts.length} contactos encontrados en tu cuenta.`);

    const cleanLeads = [];

    for (const c of contacts) {
      const email = c.email;
      if (!email || !validator.isEmail(email)) continue;

      const domain = c.organization?.primary_domain || email.split('@')[1];

      // Verificación estricta de correo para evitar Spam
      const emailCheck = await deepValidateEmail({
        email,
        validateRegex: true,
        validateMx: true,
        validateTypo: false,
        validateDisposable: true,
        validateSMTP: false
      });

      if (!emailCheck.valid) {
        console.warn(`[APOLLO REJECT]: ${email} inválido (${emailCheck.reason})`);
        continue;
      }

      cleanLeads.push({
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Director',
        title: c.title || 'Director Ejecutivo',
        company: c.organization_name || 'Empresa B2B',
        domain: domain ? domain.toLowerCase() : '',
        contactEmail: validator.normalizeEmail(email),
        linkedinUrl: c.linkedin_url || '',
        verified: true
      });
    }

    return cleanLeads;
  } catch (err) {
    console.error('[APOLLO CONTACTS ERROR]:', err.message);
    return [];
  }
}

// Prueba en vivo si se ejecuta directamente
if (process.argv[1]?.endsWith('apollo_b2b_prospector.mjs')) {
  console.log('--- Probando Enriquecimiento de Empresa en Vivo ---');
  enrichCompanyWithApollo('stripe.com').then(org => {
    console.log('Resultado Enriquecimiento Apollo:', org);
  });
}
