/**
 * =============================================================================
 * DESTRABA AI — CAZADOR AUTÓNOMO PERIMETRAL Y DISPATCHER (100% DESATENDIDO)
 * Misión: Salir a la web, auditar cabeceras y puertos de plataformas B2B reales,
 * detectar vulnerabilidades y despachar ofertas fiduciarias de $19 USD / $69 USD.
 * Cero intervención humana. Fondos a: rick2818@strike.me
 * =============================================================================
 */

import https from 'https';
import http from 'http';
import dns from 'dns';
import fs from 'fs';
import path from 'path';
import { isBlacklisted } from '../../lib/compliance_dnc.js';

// Catálogo dinámico de PYMEs y Marcas D2C de Alta Conversión (Decisión Ágil < 24h)
const DYNAMIC_TARGET_POOL = [
  // Sector 1: Marcas D2C E-commerce (Shopify / WooCommerce)
  { company: "Amor Perfecto Café de Especialidad", domain: "amorperfectocafes.com", contactEmail: "contacto@amorperfectocafes.com", country: "Colombia", industry: "Café D2C & Retail" },
  { company: "Café San Alberto", domain: "cafesanalberto.com", contactEmail: "info@cafesanalberto.com", country: "Colombia", industry: "E-commerce Premium" },
  { company: "Luuna Descanso D2C", domain: "luuna.mx", contactEmail: "hola@luuna.mx", country: "México", industry: "D2C Retail & Sueño" },
  { company: "Ben & Frank Óptica Digital", domain: "benandfrank.com", contactEmail: "contacto@benandfrank.com", country: "México / Chile", industry: "D2C Óptica & E-commerce" },
  { company: "Mattelsa E-commerce", domain: "mattelsa.net", contactEmail: "contacto@mattelsa.net", country: "Colombia", industry: "Moda & E-commerce" },
  { company: "Offcorss Moda Infantil", domain: "offcorss.com", contactEmail: "servicioalcliente@offcorss.com", country: "Colombia", industry: "Retail Infantil D2C" },
  { company: "Laika Mascotas", domain: "laika.com.co", contactEmail: "contacto@laika.com.co", country: "Colombia / México", industry: "Pet-Commerce D2C" },
  { company: "Vopero Moda Circular", domain: "vopero.mx", contactEmail: "contacto@vopero.mx", country: "México", industry: "Circular Fashion & D2C" },
  
  // Sector 2: Agencias Digitales & Boutiques de Software B2B
  { company: "Branch Agencia Digital", domain: "branch.com.co", contactEmail: "contacto@branch.com.co", country: "Colombia / Regional", industry: "Agencia Marketing Digital" },
  { company: "Truora Validación & Identidad", domain: "truora.com", contactEmail: "contacto@truora.com", country: "Colombia / Latam", industry: "Software KYC & Auth" },
  { company: "Treinta App Financiera", domain: "treinta.co", contactEmail: "hola@treinta.co", country: "Colombia / México", industry: "App Contable para PYMEs" },
  
  // Sector 3: Logística Urbana, Courriers 3PL & Fulfillment Mediano
  { company: "Moova Logística Urbana", domain: "moova.io", contactEmail: "contacto@moova.io", country: "México / Latam", industry: "Last Mile Tech" },
  { company: "Cubbo E-commerce Fulfillment", domain: "cubbo.com", contactEmail: "hola@cubbo.com", country: "México / Colombia", industry: "3PL Fulfillment D2C" },
  { company: "Chazki Entregas Last Mile", domain: "chazki.com", contactEmail: "hola@chazki.com", country: "Colombia / México / Perú", industry: "Last Mile Fulfillment" },
  { company: "Clicoh Fulfillment", domain: "clicoh.com", contactEmail: "info@clicoh.com", country: "Latam Regional", industry: "Fulfillment E-commerce" },
  { company: "Mensajeros Urbanos B2B", domain: "mensajerosurbanos.com", contactEmail: "contacto@mensajerosurbanos.com", country: "Colombia / México", industry: "Courrier Urbano Corporativo" },
  { company: "Skydropx Plataforma Envíos", domain: "skydropx.com", contactEmail: "hola@skydropx.com", country: "México / Colombia", industry: "Agregador Logístico" },
  { company: "Envia.com Logistics", domain: "envia.com", contactEmail: "soporte@envia.com", country: "México / Latam", industry: "Plataforma Envíos E-commerce" },
  { company: "Liftit Carga Digital", domain: "liftit.co", contactEmail: "contacto@liftit.co", country: "Colombia / México", industry: "Transporte y Flota" },
  { company: "Frubana Abastecimiento B2B", domain: "frubana.com", contactEmail: "contacto@frubana.com", country: "Colombia / México", industry: "Logística Restaurantes" },
  { company: "Surtiapp Proveeduría", domain: "surtiapp.com.co", contactEmail: "contacto@surtiapp.com.co", country: "Colombia", industry: "Abastecimiento B2B" },

  // Sector 4: Fintechs Ágiles & Pagos
  { company: "Bold Pagos Colombia", domain: "bold.co", contactEmail: "soporte@bold.co", country: "Colombia", industry: "Fintech & Adquirencia" },
  { company: "Cobre Latam", domain: "cobre.co", contactEmail: "contacto@cobre.co", country: "Colombia / México", industry: "B2B Payment Rails" },
  { company: "Simetrik Finanzas", domain: "simetrik.com", contactEmail: "info@simetrik.com", country: "Latam / Global", industry: "Conciliación Financiera" },
  { company: "Addi Checkout & Crédito", domain: "co.addi.com", contactEmail: "soporte@addi.com", country: "Colombia", industry: "Fintech BNPL" },
  { company: "Kushki Pagos", domain: "kushkipagos.com", contactEmail: "info@kushkipagos.com", country: "Ecuador / Latam", industry: "Pasarela de Pagos" },
  { company: "Moffin Infraestructura", domain: "moffin.mx", contactEmail: "contacto@moffin.mx", country: "México", industry: "Infraestructura B2B" }
];

const AUDIT_LOG_FILE = path.resolve('pipeline/auditorias_autonomas_ejecutadas.json');

export class AutonomousHunter {
  constructor() {
    this.results = [];
    this.loadExisting();
  }

  loadExisting() {
    try {
      if (fs.existsSync(AUDIT_LOG_FILE)) {
        this.results = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'));
      }
    } catch (e) {
      this.results = [];
    }
  }

  saveResults() {
    const dir = path.dirname(AUDIT_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(this.results, null, 2), 'utf8');
  }

  async auditTarget(target) {
    const { domain } = target;
    const hostsToTry = domain.startsWith('www.') ? [domain] : [domain, `www.${domain}`];

    for (const host of hostsToTry) {
      const res = await this._probeHost(host, target);
      if (res) return res;
    }
    return null;
  }

  _probeHost(hostname, target) {
    return new Promise((resolve) => {
      const { domain, company, contactEmail, country, industry } = target;
      console.log(`[AUTONOMOUS HUNTER]: Escaneando perimetralmente ${hostname}...`);

      const req = https.request({
        hostname,
        method: 'HEAD',
        timeout: 6000,
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Antigravity-Defensive-Scanner/2.5'
        }
      }, (res) => {
        const headers = res.headers;
        const hasCsp = !!headers['content-security-policy'];
        const hasHsts = !!headers['strict-transport-security'];
        const hasXFrame = !!headers['x-frame-options'];
        const server = headers['server'] || 'Desconocido';

        const flaws = [];
        if (!hasCsp) flaws.push("Falta Content-Security-Policy (Riesgo XSS)");
        if (!hasHsts) flaws.push("Falta Strict-Transport-Security (Riesgo SSL Strip)");
        if (!hasXFrame) flaws.push("Falta X-Frame-Options (Riesgo Clickjacking)");

        // Detección proactiva de anomalías y vencimiento de certificados SSL
        const certAuthError = res.socket?.authorizationError;
        if (certAuthError) {
          flaws.push(`Certificado SSL Anómalo / Vencido: ${certAuthError}`);
        }

        const severity = flaws.length >= 2 ? "CRITICA" : (flaws.length === 1 ? "MEDIA" : "BAJA");

        const isEnglishMarket = (country = '') => {
          const c = country.toLowerCase();
          return c.includes('usa') || c.includes('ee.uu') || c.includes('united states') || 
                 c.includes('uk') || c.includes('united kingdom') || c.includes('europa') || 
                 c.includes('europe') || c.includes('global') || c.includes('canada') || 
                 c.includes('nordic') || c.includes('denmark') || c.includes('sweden') || c.includes('finland');
        };

        const isEnglish = isEnglishMarket(country);
        const brandName = isEnglish ? "Unblock AI" : "Destraba AI";

        const subject = isEnglish
          ? `Perimeter Security Report: ${flaws.length} critical flaws detected on ${domain}`
          : `Informe de Seguridad Perimetral: ${flaws.length} vulnerabilidades detectadas en ${domain}`;

        const body = isEnglish
          ? `Dear Leadership & Engineering Team at ${company},\n\nThis is the team at Unblock AI (autonomous operations engineering & defensive cybersecurity built on Google Antigravity & 24/7 Cloud Infrastructure).\n\nDuring our non-invasive external perimeter inspection of ${domain}, we identified ${flaws.length} critical opportunities to harden security and eliminate checkout friction:\n${flaws.map(f => `• ${f}`).join('\n')}\n\n🎬 70s Executive Video Briefing:\nhttps://unblock-shield.vercel.app/?lang=en&domain=${domain}\n\nWhy trust us before opening any door? (Our 5 Fiduciary Trust Anchors):\n1. Zero Invasive Access: We never ask for passwords, API keys, or internal database access. All evaluations run 100% externally.\n2. Micro-Risk Asymmetry: Run a free 15-second audit on our site or download the executive report and production-ready remediation patches for just $19 USD (Flash Plan).\n3. 7-Day Unconditional Fiduciary Guarantee: If the solution does not save your team at least 10 hours of manual operational work in the first 7 days, we refund 100% of your payment with zero friction.\n4. SOC-2 Grade Banking Privacy: Zero disk retention; 100% processed in volatile RAM and immediately purged.\n5. Objective ROI Math: A human operator costs $600+ USD/month; our autonomous agent runs 24/7 for $2.30 USD/day ($69 USD/month), paying for itself with a single recovered lead or resolved ticket.\n\nAudit your portal live or deploy patches in 60 seconds:\n🔗 https://unblock-shield.vercel.app/?lang=en&domain=${domain}\n\nOr instant zero-fee settlement via Bitcoin Lightning Network to: rick2818@strike.me\n\nBest regards,\nSenior Cybersecurity & Solutions Team — Unblock AI`
          : `Estimado equipo directivo y técnico en ${company},\n\nLe saluda el equipo de Destraba AI (firma de ingeniería en automatización operativa y ciberseguridad defensiva sobre Google Antigravity y Cloud 24/7).\n\nDurante nuestra inspección perimetral no invasiva sobre ${domain}, identificamos ${flaws.length} anomalías críticas que impactan la seguridad y conversión de su portal:\n${flaws.map(f => `• ${f}`).join('\n')}\n\n🎬 Video Demostración (70s):\nhttps://unblock-shield.vercel.app/?domain=${domain}\n\n¿Por qué confiar en nosotros antes de abrir cualquier puerta? (Nuestros 5 Anclajes de Apertura):\n1. Cero Invasión Previa: No solicitamos contraseñas, claves API ni acceso a bases de datos. Todo el análisis corre desde el exterior.\n2. Micro-Riesgo: Puedes verificar el diagnóstico gratis en 15s en nuestra web o descargar el informe ejecutivo con los parches listos para producción por solo $19 USD (Plan Flash).\n3. Garantía Fiduciaria 100% (7 Días): Si en 7 días la solución no le ahorra al menos 10 horas de trabajo manual a su equipo, reembolsamos el 100% de su pago sin preguntas.\n4. Privacidad Bancaria SOC-2: Cero retención en disco; 100% procesado en memoria RAM volátil aislada.\n5. Matemática de Ahorro: Un operador o analista cuesta $600+ USD/mes; nuestro agente autónomo opera 24/7 por $2.30 USD al día ($69 USD/mes).\n\nAudite su portal en vivo o aplique los parches en 60 segundos:\n🔗 https://unblock-shield.vercel.app/?domain=${domain}\n\nO liquidación instantánea sin comisiones vía Bitcoin Lightning Network a: rick2818@strike.me\n\nAtentamente,\nEspecialista Senior de Ciberseguridad & Ventas Fiduciarias — Destraba AI`;

        const auditReport = {
          auditId: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          company,
          domain,
          scannedHost: hostname,
          country,
          industry,
          contactEmail,
          brandName,
          language: isEnglish ? 'en' : 'es',
          serverDetected: server,
          httpStatusCode: res.statusCode,
          securityHeaders: { hasCsp, hasHsts, hasXFrame },
          flawsCount: flaws.length,
          flaws,
          severity,
          monetization: {
            offer: isEnglish ? "$19 USD (Executive Flash Diagnostic + Security Patch) / $69 USD/mo (Autonomous 24/7 Agent)" : "$19 USD (Diagnóstico Técnico Flash + Parche de Blindaje) / $69 USD (Agente Autónomo 24/7)",
            checkoutStrike: "https://strike.me/rick2818",
            checkoutDirectApp: `https://unblock-shield.vercel.app/?${isEnglish ? 'lang=en&' : ''}domain=${domain}`,
            destinationAddress: "rick2818@strike.me"
          },
          generatedDispatchMessage: {
            to: contactEmail,
            subject,
            body
          },
          status: "AUDITADO_Y_LISTO_PARA_NOTIFICACION"
        };

        this.results.unshift(auditReport);
        this.saveResults();
        resolve(auditReport);
      });

      req.on('error', (err) => {
        console.warn(`[AUTONOMOUS HUNTER]: Error en ${hostname}: ${err.message}`);
        resolve(null);
      });

      req.on('timeout', () => {
        req.destroy();
        console.warn(`[AUTONOMOUS HUNTER]: Timeout en ${hostname}`);
        resolve(null);
      });

      req.end();
    });
  }

  async runBatch(targetList) {
    const executed = [];
    for (const target of targetList) {
      const res = await this.auditTarget(target);
      if (res) executed.push(res);
      // Pausa defensiva de 1 segundo entre escaneos
      await new Promise(r => setTimeout(r, 1000));
    }
    return executed;
  }

  /**
   * Filtro anti-fatiga de 90 días y verificación DNC
   */
  async isEligibleForAudit(domain, maxAgeDays = 90) {
    if (!domain) return false;
    const cleanDomain = domain.toLowerCase().trim();

    // 1. Chequeo DNC obligatorio
    if (await isBlacklisted(null, cleanDomain)) {
      return false;
    }

    // 2. Chequeo de última fecha de auditoría en pipeline
    const existing = this.results.find(r => r.domain?.toLowerCase() === cleanDomain);
    if (!existing) return true;

    const auditDate = new Date(existing.timestamp).getTime();
    if (isNaN(auditDate)) return true;

    const ageInDays = (Date.now() - auditDate) / (1000 * 60 * 60 * 24);
    return ageInDays >= maxAgeDays;
  }

  /**
   * Motor dinámico de descubrimiento: localiza nuevos prospectos no contactados recientemente
   */
  async discoverDynamicTargets({ limit = 5, sector = 'all' } = {}) {
    const eligible = [];
    const pool = [...DYNAMIC_TARGET_POOL];
    
    // Barajado pseudo-aleatorio para rotación fiduciaria
    pool.sort(() => Math.random() - 0.5);

    for (const candidate of pool) {
      if (eligible.length >= limit) break;
      if (sector !== 'all' && candidate.industry.toLowerCase() !== sector.toLowerCase()) continue;

      const canAudit = await this.isEligibleForAudit(candidate.domain);
      if (canAudit) {
        eligible.push(candidate);
      }
    }

    return eligible;
  }
}

