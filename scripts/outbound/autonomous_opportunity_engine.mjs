/**
 * =============================================================================
 * DESTRABA AI — RECOLECTOR AUTÓNOMO DE OPORTUNIDADES B2B EN INTERNET
 * Objetivo: Monitorear vacantes, fricción operativa y prospectos en Colombia,
 * México y Chile para cubrir la meta de $3,000 USD/mes ($100 USD/día).
 * Liquidación fiduciaria: rick2818@strike.me
 * =============================================================================
 */

import fs from 'fs';
import path from 'path';

// Sectores prioritarios con mayor dolor operativo y disposición de pago
const TARGET_SEGMENTS = [
  {
    country: "Colombia",
    industries: ["Logística & Fulfillment 3PL", "E-commerce Retail", "Distribución"],
    typicalPain: "Saturación en WhatsApp para rastreo de guías y reclamos de entrega",
    recommendedAgent: "Concierge de Atención Inmediata & Despacho",
    recommendedPlan: "$69 USD/mes"
  },
  {
    country: "México",
    industries: ["Fintech & Pagos", "Empresas de Servicios B2B", "Last Mile Delivery"],
    typicalPain: "Conciliación bancaria manual, facturación dispersa y clientes morosos",
    recommendedAgent: "Auditor Financiero & Cobranza Fiduciaria",
    recommendedPlan: "$89 USD/mes"
  },
  {
    country: "Chile",
    industries: ["Transporte Corporativo", "Comercio Mayorista", "Operaciones"],
    typicalPain: "Demoras en cotizaciones de fletes y fuga de prospectos por respuesta tardía",
    recommendedAgent: "Closer de Ventas Outbound & Cotizaciones en 60s",
    recommendedPlan: "$69 USD/mes"
  }
];

export class AutonomousOpportunityEngine {
  constructor(pipelineFilePath = './pipeline/oportunidades_detectadas.json') {
    this.pipelineFilePath = pipelineFilePath;
    this.opportunities = [];
    this.loadPipeline();
  }

  loadPipeline() {
    try {
      if (fs.existsSync(this.pipelineFilePath)) {
        const raw = fs.readFileSync(this.pipelineFilePath, 'utf8');
        this.opportunities = JSON.parse(raw);
      }
    } catch (e) {
      this.opportunities = [];
    }
  }

  savePipeline() {
    try {
      const dir = path.dirname(this.pipelineFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.pipelineFilePath, JSON.stringify(this.opportunities, null, 2), 'utf8');
    } catch (e) {
      console.error("Error guardando pipeline:", e.message);
    }
  }

  /**
   * Registra y califica una oportunidad detectada en internet
   */
  ingestOpportunity(companyData) {
    const existing = this.opportunities.find(o => o.domain === companyData.domain);
    if (existing) {
      return { status: "ALREADY_TRACKED", leadId: existing.id };
    }

    const newLead = {
      id: `opp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      company: companyData.name,
      domain: companyData.domain,
      country: companyData.country || "Colombia",
      industry: companyData.industry || "E-commerce & Logística",
      decisionMakerRole: companyData.decisionMakerRole || "Director de Operaciones",
      detectedPain: companyData.pain || "Tiempos de respuesta lentos en atención al cliente",
      estimatedLossUsdMonth: companyData.loss || 1480,
      matchedOffer: companyData.offer || "$69 USD/mes (Pro Operator)",
      checkoutUrl: "https://rick2818.github.io/Agents/?plan=pro",
      strikePaymentUrl: "https://strike.me/rick2818",
      detectedAt: new Date().toISOString(),
      status: "CALIFICADO_LISTO_PARA_DESPACHO",
      outboundCadence: {
        impact1: {
          subject: `Elimina cuellos de botella en la operación de ${companyData.name}`,
          body: `Hola,\n\nIdentificamos que empresas en el sector de ${companyData.industry} pierden hasta 90 horas mensuales atendiendo consultas manuales y rastreos.\n\nDestraba AI implementa un agente soberano en 60 segundos que asume la operación 24/7.\n\nActiva tu agente aquí por $69 USD/mes:\nhttps://rick2818.github.io/Agents/?plan=pro\n\nO liquidación directa vía Lightning a rick2818@strike.me.\n\nAtentamente,\nDestraba AI`
        }
      }
    };

    this.opportunities.push(newLead);
    this.savePipeline();
    return { status: "INGESTED_SUCCESSFULLY", lead: newLead };
  }

  /**
   * Genera el resumen financiero del valor atrapado en el pipeline
   */
  getFinancialSummary() {
    const totalLeads = this.opportunities.length;
    const potentialMRR = totalLeads * 69;
    const dailyTargetProgress = (potentialMRR / 3000) * 100;

    return {
      activeOpportunities: totalLeads,
      potentialMRR: `$${potentialMRR} USD`,
      monthlyCostCoverage: `${dailyTargetProgress.toFixed(1)}% de los $3,000 USD/mes`,
      readyForOutbound: this.opportunities.filter(o => o.status.includes('LISTO')).length
    };
  }
}
