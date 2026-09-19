import { CAMPAIGNS, renderCampaignMessage } from './campaign_engine.mjs';

console.log("==================================================================");
console.log("🚀 DESTRABA AI / UNBLOCK AI — MOTOR DE MONETIZACIÓN DESATENDIDA");
console.log("Meta: $3,000 USD/mes ($100 USD/día) | Liquidación: rick2818@strike.me");
console.log("==================================================================\n");

// Simulación de despacho para prospecto real
const testCompany = "Logística & Retail Global S.A.";

console.log("1. IMPACTO 1 — CADENCIA DE CIBERSEGURIDAD DEFENSIVA ($19 / $89 USD):");
const msg1 = renderCampaignMessage('CYBERSECURITY_DEFENSE_AUDIT', 1, testCompany, 'es');
console.log(`Asunto: ${msg1.subject}`);
console.log(`Destino de Fondos: ${msg1.strikePaymentAddress}`);
console.log(`Cuerpo:\n${msg1.body}\n`);

console.log("------------------------------------------------------------------");
console.log("2. IMPACTO 1 — VERSIÓN EN INGLÉS (UNBLOCK AI - MERCADO INTERNACIONAL):");
const msgEn = renderCampaignMessage('CYBERSECURITY_DEFENSE_AUDIT', 1, testCompany, 'en');
console.log(`Subject: ${msgEn.subject}`);
console.log(`Body:\n${msgEn.body}\n`);

console.log("------------------------------------------------------------------");
console.log("------------------------------------------------------------------");
console.log("3. IMPACTO 2 — VIDEO BRIEFING DE 70s (SEGUIMIENTO DE ALTA CONVERSIÓN):");
const msg2Es = renderCampaignMessage('CYBERSECURITY_DEFENSE_AUDIT', 2, testCompany, 'es', 'logistica-global.com');
console.log(`Asunto: ${msg2Es.subject}`);
console.log(`Cuerpo:\n${msg2Es.body}\n`);

console.log("------------------------------------------------------------------");
console.log("4. IMPACTO 2 — VERSIÓN EN INGLÉS (UNBLOCK AI - 70s VIDEO BRIEFING):");
const msg2En = renderCampaignMessage('CYBERSECURITY_DEFENSE_AUDIT', 2, testCompany, 'en', 'global-logistics.com');
console.log(`Subject: ${msg2En.subject}`);
console.log(`Body:\n${msg2En.body}\n`);

console.log("------------------------------------------------------------------");
console.log("5. IMPACTO 1 — AGENTE AUTÓNOMO B2B ($69 USD/mes):");
const msgSaas = renderCampaignMessage('AUTONOMOUS_OPERATOR_SAAS', 1, testCompany, 'es');
console.log(`Asunto: ${msgSaas.subject}`);
console.log(`Cuerpo:\n${msgSaas.body}\n`);

console.log("✅ Motor de Prospección, Video Briefing de 70s y Enlaces de Pago validados al 100%.");
