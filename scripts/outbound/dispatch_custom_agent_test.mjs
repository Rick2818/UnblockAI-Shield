/**
 * =============================================================================
 * DESPACHO DE AGENTE FIDUCIARIO PERSONALIZADO PARA RICARDO — DESTRABA AI
 * =============================================================================
 * Genera el paquete de arquitectura .agents en RAM y lo transmite a rick28191@gmail.com
 * =============================================================================
 */

import { createInMemoryZip } from '../../lib/fiduciary_zip.js';
import { dispatchUniversalEmail } from '../../lib/universal_email_engine.js';
import { purgeMemoryBuffer, escapeHtml } from '../../lib/fiduciary_core.js';

// Cargar variables de entorno locales de .env si existe
try { process.loadEnvFile?.(); } catch (e) {}

async function run() {
  const targetEmail = 'rick28191@gmail.com';
  console.log(`[DISPATCH AGENT]: Iniciando síntesis y despacho para: ${targetEmail}`);

  // 1. Arquitectura Fiduciaria del Agente
  const agentSpec = {
    'AGENTE_ARQUITECTO_SCRIPTS_FIDUCIARIO.md': `# 🛡️ Agente: Arquitecto de Scripts en la Nube y Auditor Antialucinación
> **Rol:** Especialista Fiduciario Senior en Arquitectura de Software, Scripts Cloud y Control de Calidad Riguroso.
> **Modelo:** Gemini Flash 2.5 / Gemini 3.6 Flash
> **Objetivo:** Auditar, diseñar y aprobar scripts para despliegues en la nube, erradicando alucinaciones, falsos positivos y complacencia artificial.

---

## 🏛️ Filosofía de Operación
1. **Cero Complacencia Servil:** Prohibido decir "Todo está listo" si no se ha verificado empíricamente con comandos de prueba o validación sintáctica.
2. **Cero Datos Simulados no Declarados:** Si se usan datos de prueba, deben etiquetarse explícitamente como [SIMULACIÓN]. Prohibido inventar clientes, empresas o transacciones falsas presentándolas como reales.
3. **Voz Activa y Recomendación Libre:** No eres una grabadora de texto ni un simple formateador de scripts. Tienes libertad de pensamiento crítico para:
   - Detectar cuellos de botella antes de escribir una sola línea de código.
   - Recomendar arquitecturas alternativas más simples, económicas o robustas.
   - Alertar sobre fallos silenciosos, problemas de DNS, puertos bloqueados o fugas de memoria.
4. **Validación en 3 Pasos para Scripts:**
   - Paso A: Análisis estático de dependencias y sintaxis.
   - Paso B: Análisis de modos de fallo (¿qué pasa si la API se cae o no hay conexión?).
   - Paso C: Emisión de veredicto fiduciario: [APROBADO PARA PRODUCCIÓN] o [RECHAZADO: REQUIERE AJUSTES].
`,

    'REGLAS_INMUTABLES_VERIFICACION.md': `# ⚖️ Reglas Inmutables de Verificación y Honestidad Técnica

1. **Principio de Verdad Empírica:** Ningún script se considerará funcional hasta que exista una prueba de ejecución real verificable o un plan de contingencia formal.
2. **Desactivación de Alucinaciones:** Ante una duda o falta de parámetros en una API externa, el agente DEBE preguntar o consultar documentación oficial, en lugar de inventar parámetros ficticios.
3. **Protección Perimetral de Secretos:** Nunca almacenar claves privadas o tokens en código plano. Siempre usar inyección de variables de entorno seguras (fail-closed).
4. **Honestidad Radical:** Si una solución solicitada por el usuario es insegura o propensa a errores, el agente tiene la obligación ética de advertirlo y proponer la mejor práctica de la industria.
`,

    'SKILL_APROBACION_SCRIPTS_CLOUD.md': `# ⚙️ Habilidad Operativa: Auditoría y Aprobación de Scripts Cloud

## Procedimiento Paso a Paso:
1. **Recepción del Requerimiento:**
   - Identificar el sistema operativo de destino (Windows / Linux / Docker).
   - Identificar el entorno de ejecución (Node.js, Bash, PowerShell, Python).
2. **Inspección Defensiva:**
   - ¿Tiene manejo de excepciones (try/catch o trap)?
   - ¿Qué sucede si el proceso se cuelga? ¿Tiene timeouts o buffers limitados en RAM?
   - ¿Evita la retención innecesaria de archivos en disco?
3. **Prueba de Resistencia:**
   - Formular la pregunta: *¿Cómo falla este script en el peor escenario posible?*
4. **Recomendación Proactiva:**
   - Presentar al usuario:
     * 1. Script optimizado y comentado.
     * 2. Riesgos potenciales detectados.
     * 3. Recomendación estratégica de arquitectura para el futuro.
`,

    'README_INSTRUCCIONES_RICARDO.txt': `=============================================================================
DESTRABA AI — AGENTE ARQUITECTO DE SCRIPTS FIDUCIARIO
Licencia VIP: LIC-VIP-RICARDO-TRUTH-2026
Destinatario: Ricardo (rick28191@gmail.com)
=============================================================================

Estimado Ricardo:

Este agente fue diseñado específicamente para erradicar la frustración de:
- Agentes que alucinan o inventan datos.
- Agentes complacientes que dicen "todo está listo" sin haber probado nada.
- Scripts que fallan al subirse a la nube por falta de previsión técnica.

CÓMO USARLO EN LA PLATAFORMA EN LA NUBE 24/7:
1. Ingresa a: https://destraba-ai.vercel.app/?licencia=LIC-VIP-RICARDO-TRUTH-2026&plan=custom_script_architect&email=rick28191@gmail.com
2. Verás tu licencia cargada automáticamente.
3. Puedes conversar libremente con él en la consola interactiva:
   - Pídele que revise cualquier script de tu app.
   - Pregúntale su opinión honesta sobre la arquitectura.
   - Exígele que te diga qué puntos débiles tiene tu sistema.

¡Cero simulación y verdad fiduciaria garantizada!
=============================================================================
`
  };

  // 2. Comprimir en RAM volátil
  const zipBuffer = createInMemoryZip(agentSpec);
  console.log(`[DISPATCH AGENT]: Paquete ZIP ensamblado en RAM (${zipBuffer.length} bytes)`);

  const activationUrl = `https://destraba-ai.vercel.app/?licencia=LIC-VIP-RICARDO-TRUTH-2026&plan=custom_script_architect&email=${encodeURIComponent(targetEmail)}`;

  // 3. HTML del Correo Institucional Formal
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; color: #1e293b; background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; width: 52px; height: 52px; line-height: 52px; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; font-size: 26px; border-radius: 14px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">🛡️</div>
        <h1 style="color: #0f172a; margin: 0 0 6px 0; font-size: 22px; font-weight: 800;">Destraba AI • Entrega de Agente Fiduciario</h1>
        <p style="color: #64748b; margin: 0; font-size: 13px; font-weight: 500;">Arquitecto de Scripts Cloud & Auditor Antialucinación (Licencia VIP)</p>
      </div>

      <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #cbd5e1; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <p style="margin: 0 0 14px 0; font-size: 15px; line-height: 1.5;">
          Hola <strong>Ricardo</strong>,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569; line-height: 1.6;">
          Aquí tienes el agente especializado que solicitaste para resolver el cuello de botella de <strong>scripts no aprobados, alucinaciones y complacencia falsa</strong>.
        </p>

        <!-- Tarjeta de Activación Cloud 1-Clic -->
        <div style="background: linear-gradient(135deg, #0f172a, #1e1b4b); padding: 22px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #38bdf8;">
          <span style="color: #38bdf8; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;">Acceso Directo a tu Plataforma Cloud 24/7</span>
          <h3 style="color: #ffffff; margin: 0 0 12px 0; font-size: 17px;">Activa e Interactúa con tu Agente Ahora Mismo</h3>
          <p style="color: #cbd5e1; font-size: 12px; margin: 0 0 18px 0; line-height: 1.5;">
            Haz clic en el siguiente botón para abrir tu cabina en la nube. Tu licencia VIP ya está precargada:
          </p>
          <a href="${activationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #06b6d4); color: #ffffff; font-weight: bold; font-size: 13px; text-decoration: none; padding: 13px 26px; border-radius: 8px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);">
            🚀 Abrir Consola del Agente en la Nube 24/7 →
          </a>
        </div>

        <!-- Capacidades del Agente -->
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; font-size: 13px; color: #334155; margin-bottom: 16px;">
          <strong style="color: #0f172a; display: block; margin-bottom: 8px;">🧠 ¿Qué puede hacer este agente?</strong>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
            <li><strong>Recomienda y Habla Libremente:</strong> No es un script rígido. Analiza tus requerimientos, te sugiere mejores arquitecturas y te dice la verdad sin rodeos.</li>
            <li><strong>Cero Alucinación:</strong> Prohibido inventar datos o decir que algo funciona si no ha sido comprobado.</li>
            <li><strong>Auditoría de Scripts:</strong> Revisa la lógica de Node.js, Python, PowerShell y despliegues en Vercel/Docker para anticipar fallos.</li>
          </ul>
        </div>

        <div style="font-size: 12px; color: #64748b; line-height: 1.5;">
          <strong>📦 Adjunto a este correo:</strong>
          <p style="margin: 4px 0 0 0;">Encontrarás el archivo <code>paquete_agente_arquitecto_fiduciario.zip</code> con la arquitectura completa (.agents) lista para importar en tu dashboard o en Google Antigravity.</p>
        </div>
      </div>

      <div style="text-align: center; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0 0 4px 0;"><strong>Destraba AI / Unblock AI</strong> • Sistema Multi-Agente Soberano</p>
        <p style="margin: 0;">Soporte Oficial: <code>soporte@destraba.ai</code></p>
      </div>
    </div>
  `;

  const textContent = `Destraba AI • Entrega de Agente Fiduciario\nLicencia VIP para Ricardo (rick28191@gmail.com)\n\nTu agente Arquitecto de Scripts Cloud & Auditor Antialucinación está listo.\n\nPara activarlo e interactuar con él en la nube 24/7 ingresa a:\n${activationUrl}\n\nAdjunto encontrarás paquete_agente_arquitecto_fiduciario.zip.\nSoporte: soporte@destraba.ai`;

  // 4. Despacho Vía Motor Universal
  try {
    const result = await dispatchUniversalEmail({
      to: targetEmail,
      subject: `🛡️ Tu Agente Fiduciario: Arquitecto de Scripts Cloud & Auditor Antialucinación`,
      text: textContent,
      html: htmlContent,
      attachments: [
        {
          filename: 'paquete_agente_arquitecto_fiduciario.zip',
          contentType: 'application/zip',
          content: zipBuffer
        }
      ]
    });

    console.log('[DISPATCH RESULT]:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('[DISPATCH ERROR]:', err);
  } finally {
    purgeMemoryBuffer(zipBuffer);
  }
}

run();
