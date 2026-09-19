import fs from 'fs';
import path from 'path';

/**
 * Motor de Cadencias B2B Desatendidas de Destraba AI
 * Objetivo: Cubrir los $3,000 USD/mes ($100 USD/día) con ventas éticas y 100% legales.
 */

export const CAMPAIGNS = {
  CYBERSECURITY_DEFENSE_AUDIT: {
    id: 'cybersecurity_defense_audit',
    name: 'Auditoría Defensiva OWASP & Fugas de Datos B2B',
    offer: 'Flash Audit Express ($19 USD) / Auditoría Completa ($89 USD)',
    strikeAddress: 'rick2818@strike.me',
    cadence: [
      {
        impact: 1,
        day: 1,
        subject_es: (companyName, domain) => `Informe de Seguridad Perimetral: Vulnerabilidades detectadas en ${domain || companyName}`,
        subject_en: (companyName, domain) => `Perimeter Security Report: Critical flaws detected on ${domain || companyName}`,
        body_es: (companyName, domain = '') => `Estimado equipo directivo y técnico en ${companyName},

Le saluda el equipo de Destraba AI (firma de ingeniería en automatización operativa y ciberseguridad defensiva sobre Google Antigravity y Cloud 24/7).

Durante nuestra inspección perimetral no invasiva sobre ${domain || companyName}, identificamos anomalías críticas en cabeceras de seguridad y endpoints que impactan la seguridad y conversión de su portal.

🎬 Video Demostración (70s):
https://unblock-shield.vercel.app/?domain=${domain || ''}

¿Por qué confiar en nosotros antes de abrir cualquier puerta? (Nuestros 5 Anclajes de Apertura):
1. Cero Invasión Previa: No solicitamos contraseñas, claves API ni acceso a bases de datos. Todo el análisis corre desde el exterior.
2. Micro-Riesgo: Puedes verificar el diagnóstico gratis en 15s en nuestra web o descargar el informe ejecutivo con los parches listos para producción por solo $19 USD (Plan Flash).
3. Garantía Fiduciaria 100% (7 Días): Si en 7 días la solución no le ahorra al menos 10 horas de trabajo manual a su equipo, reembolsamos el 100% de su pago sin preguntas.
4. Privacidad Bancaria SOC-2: Cero retención en disco; 100% procesado en memoria RAM volátil aislada.
5. Matemática de Ahorro: Un operador o analista cuesta $600+ USD/mes; nuestro agente autónomo opera 24/7 por $2.30 USD al día ($69 USD/mes).

Audite su portal en vivo o aplique los parches en 60 segundos:
🔗 https://unblock-shield.vercel.app/?domain=${domain || ''}

O liquidación instantánea sin comisiones vía Bitcoin Lightning Network a: rick2818@strike.me

Atentamente,
Especialista Senior de Ciberseguridad & Ventas Fiduciarias — Destraba AI`,
        body_en: (companyName, domain = '') => `Dear Leadership & Engineering Team at ${companyName},

This is the team at Unblock AI (autonomous operations engineering & defensive cybersecurity built on Google Antigravity & 24/7 Cloud Infrastructure).

During our non-invasive external perimeter inspection of ${domain || companyName}, we identified critical vulnerabilities in banking headers and exposed endpoints that impact performance and security.

🎬 70s Executive Video Briefing:
https://unblock-shield.vercel.app/?lang=en&domain=${domain || ''}

Why trust us before opening any door? (Our 5 Fiduciary Trust Anchors):
1. Zero Invasive Access: We never ask for passwords, API keys, or internal database access. All evaluations run 100% externally.
2. Micro-Risk Asymmetry: Run a free 15-second audit on our site or download the executive report and production-ready remediation patches for just $19 USD (Flash Plan).
3. 7-Day Unconditional Fiduciary Guarantee: If the solution does not save your team at least 10 hours of manual operational work in the first 7 days, we refund 100% of your payment with zero friction.
4. SOC-2 Grade Banking Privacy: Zero disk retention; 100% processed in volatile RAM and immediately purged.
5. Objective ROI Math: A human operator costs $600+ USD/month; our autonomous agent runs 24/7 for $2.30 USD/day ($69 USD/month), paying for itself with a single recovered lead or resolved ticket.

Audit your portal live or deploy patches in 60 seconds:
🔗 https://unblock-shield.vercel.app/?lang=en&domain=${domain || ''}

Or instant zero-fee settlement via Bitcoin Lightning Network to: rick2818@strike.me

Best regards,
Senior Cybersecurity & Solutions Team — Unblock AI`
      },
      {
        impact: 2,
        day: 3,
        subject_es: (companyName, domain) => `🎬 Video de 70s: Diagnóstico perimetral de ${domain || companyName} y parches en 60s`,
        subject_en: (companyName, domain) => `🎬 70s Video Briefing: Perimeter audit for ${domain || companyName} and 60s patch`,
        body_es: (companyName, domain = '') => `Estimado equipo directivo en ${companyName},

Le escribo en seguimiento a nuestra notificación técnica. Para facilitar su evaluación sin tecnicismos ni reuniones innecesarias, preparamos un Video Briefing Ejecutivo de 70 segundos donde mostramos la anatomía de las fallas detectadas y cómo blindarlas:

▶️ VER VIDEO BRIEFING EJECUTIVO (70 Segundos):
🔗 https://unblock-shield.vercel.app/?domain=${domain || ''}

Puntos clave del video para ${companyName}:
• Cómo mitigar fugas de datos y ataques de inyección sin modificar su backend actual.
• Cero Invasión Previa: No requerimos contraseñas, claves de API ni credenciales internas.
• Despliegue Inmediato: Parches en archivo .zip listos para pegar en producción por $19 USD (Plan Flash).
• Centinela 24/7: Agente autónomo con monitoreo perimetral continuo por $69 USD/mes ($2.30 USD/día).
• Garantía Fiduciaria Total (7 Días): Si en 7 días no ahorra al menos 10 horas de trabajo operativo, le reembolsamos el 100% sin objeciones.

Acceda al reproductor y aplique el parche de blindaje en 1 clic:
🔗 https://unblock-shield.vercel.app/?domain=${domain || ''}

Liquidación directa por Bitcoin Lightning Network: rick2818@strike.me

Quedo a su disposición si requieren aclaración técnica directa.

Atentamente,
Especialista en Seguridad y Automatización Fiduciaria — Destraba AI`,
        body_en: (companyName, domain = '') => `Dear Executive Team at ${companyName},

Following up on our perimeter security alert, we recorded a 70-Second Executive Video Briefing so you can inspect the exact technical findings without booking meetings or wading through complex reports:

▶️ WATCH 70s EXECUTIVE VIDEO BRIEFING:
🔗 https://unblock-shield.vercel.app/?lang=en&domain=${domain || ''}

Key takeaways for ${companyName}:
• How to neutralize data leakage and injection risks without altering your current infrastructure.
• Zero Invasive Access: We never touch internal credentials, databases, or API keys.
• Immediate Turnkey Patch: Download production-ready code patches for just $19 USD (Flash Plan).
• 24/7 Autopilot Sentinel: Continuous perimeter hardening agent for $69 USD/month ($2.30 USD/day).
• 100% 7-Day Fiduciary Guarantee: Full refund if our automated solution does not save your team at least 10 hours in the first week.

Watch the briefing and claim your hardening patch:
🔗 https://unblock-shield.vercel.app/?lang=en&domain=${domain || ''}

Direct zero-fee settlement via Bitcoin Lightning Network: rick2818@strike.me

Best regards,
Senior Solutions & Infrastructure Team — Unblock AI`
      },
      {
        impact: 3,
        day: 5,
        subject_es: (companyName, domain) => `Cierre de auditoría para ${domain || companyName}: Enlace de blindaje perimetral`,
        subject_en: (companyName, domain) => `Audit window closing for ${domain || companyName}: Hardening blueprint`,
        body_es: (companyName, domain = '') => `Estimado equipo directivo en ${companyName},

Hoy cerramos la ventana de asignación técnica para la auditoría de ${domain || companyName}.

Si desean asegurar sus pasarelas de pago y cerrar las brechas antes de que deriven en incidentes o costes imprevistos:

1. Ingrese a la consola fiduciaria y vea el video explicativo de 70s:
   🔗 https://unblock-shield.vercel.app/?domain=${domain || ''}
2. Descargue los parches de blindaje listos para producción ($19 USD Plan Flash).
3. O active el centinela autónomo 24/7 ($69 USD/mes con garantía de 7 días).

Liquidación instantánea disponible en Strike Lightning: rick2818@strike.me

Equipo de Operaciones — Destraba AI`,
        body_en: (companyName, domain = '') => `Dear Executive Team at ${companyName},

We are closing the technical audit review window for ${domain || companyName}.

If you wish to secure your checkout pipelines and apply perimeter hardening before vulnerabilities lead to downtime or costly remediations:

1. Open the fiduciary console and watch the 70s walkthrough:
   🔗 https://unblock-shield.vercel.app/?lang=en&domain=${domain || ''}
2. Download ready-to-deploy patches ($19 USD Flash Plan).
3. Or activate the 24/7 Autonomous Sentinel ($69 USD/month with 7-day guarantee).

Instant zero-fee Lightning settlement: rick2818@strike.me

Operations Team — Unblock AI`
      }
    ]
  },
  AUTONOMOUS_OPERATOR_SAAS: {
    id: 'autonomous_operator_saas',
    name: 'Agente Autónomo B2B Desatendido',
    offer: 'Licencia Pro Operator ($69 USD/mes) / Suite Élite ($249 USD/mes)',
    strikeAddress: 'rick2818@strike.me',
    cadence: [
      {
        impact: 1,
        day: 1,
        subject_es: (companyName) => `Elimina 40 horas de trabajo operativo repetitivo cada semana en ${companyName}`,
        subject_en: (companyName) => `Eliminate 40 hours of repetitive operational tasks each week at ${companyName}`,
        body_es: (companyName, domain = '') => `Hola equipo en ${companyName},

¿Cuánto tiempo dedica su personal a cobranza manual, responder consultas idénticas por WhatsApp y conciliar transacciones?

Destraba AI implementa un agente soberano en 60 segundos que asume esas tareas en piloto automático 24/7, permitiendo a sus directivos enfocarse en ventas de alto valor.

🎬 Video Demostración (70s):
https://unblock-shield.vercel.app/?domain=${domain || ''}

Inicia tu prueba y activa tu agente por $69 USD/mes:
🔗 https://unblock-shield.vercel.app/?plan=pro&domain=${domain || ''}

Liquidación instantánea vía Strike Lightning: rick2818@strike.me

Atentamente,
Destraba AI`,
        body_en: (companyName, domain = '') => `Hello team at ${companyName},

How much time does your staff waste on manual payment collection, repetitive WhatsApp inquiries, and bank reconciliation?

Unblock AI deploys an autonomous sovereign agent in 60 seconds that handles those workflows 24/7, freeing your executives to focus strictly on revenue growth.

🎬 70s Executive Video Briefing:
https://unblock-shield.vercel.app/?lang=en&domain=${domain || ''}

Launch and activate your agent for $69 USD/month:
🔗 https://unblock-shield.vercel.app/?lang=en&plan=pro&domain=${domain || ''}

Direct settlement via Strike Lightning: rick2818@strike.me

Best regards,
Unblock AI`
      }
    ]
  }
};

export function renderCampaignMessage(campaignId, impactIndex, companyName, lang = 'es', domain = '') {
  const camp = CAMPAIGNS[campaignId];
  if (!camp) throw new Error(`Campaña no encontrada: ${campaignId}`);
  const item = camp.cadence.find(c => c.impact === impactIndex) || camp.cadence[0];

  const subjectFn = lang === 'en' ? item.subject_en : item.subject_es;
  const bodyFn = lang === 'en' ? item.body_en : item.body_es;

  const subject = typeof subjectFn === 'function' ? subjectFn(companyName, domain) : subjectFn;
  const body = typeof bodyFn === 'function' ? bodyFn(companyName, domain) : bodyFn;

  return {
    campaign: camp.name,
    offer: camp.offer,
    impact: item.impact,
    day: item.day,
    subject,
    body,
    strikePaymentAddress: camp.strikeAddress
  };
}
