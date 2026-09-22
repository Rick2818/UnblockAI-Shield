// Vercel Serverless Function: Lead Capture, Instant Forensic Report & Fiduciary Dispatch
import { dispatchUniversalEmail } from '../lib/universal_email_engine.js';
import { scanDomain, normalizeDomain } from '../lib/header_scanner.js';
import { buildScanEmail } from '../lib/scan_report_email.js';
import { checkRateLimit } from '../lib/fiduciary_core.js';

function escapeForHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getClientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return req.headers['x-real-ip'] || fwd || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Este endpoint envía correos a direcciones arbitrarias: límite estricto por IP
  const rl = checkRateLimit('lead:' + getClientIp(req), 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    res.setHeader('Retry-After', String(rl.remainingSeconds));
    return res.status(429).json({ error: `Demasiadas solicitudes. Intenta de nuevo en ${Math.ceil(rl.remainingSeconds / 60)} min.` });
  }

  try {
    const { email, domain, message, timestamp } = req.body || {};

    // Strict email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: 'Dirección de correo electrónico no válida' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanDomain = String(domain || 'tu empresa').trim().replace(/[^a-zA-Z0-9.-]/g, '') || 'tu empresa';
    const cleanMessage = String(message || '').trim().substring(0, 1000);
    const leadTime = timestamp || new Date().toISOString();

    console.log(`[FIDUCIARY INTAKE] Email: ${cleanEmail} | Domain: ${cleanDomain} | Msg: ${cleanMessage ? 'YES' : 'NO'}`);

    const isCustomSupportInquiry = Boolean(cleanMessage && cleanMessage.length > 5);

    let subject = '';
    let htmlContent = '';
    let textContent = '';

    if (!isCustomSupportInquiry) {
      // DIAGNÓSTICO REAL: se escanea el dominio en este momento y el correo solo contiene lo detectado
      const targetDomain = normalizeDomain(domain);
      if (!targetDomain) {
        return res.status(400).json({ error: 'Ingresa un nombre de dominio público válido (ejemplo: tuempresa.com).' });
      }

      const scan = await scanDomain(targetDomain);
      if (!scan.ok) {
        // Sin escaneo real no se envía ningún "informe"
        return res.status(422).json({ error: scan.error.message, code: scan.error.code });
      }

      const built = buildScanEmail({ domain: targetDomain, email: cleanEmail, scan });
      subject = built.subject;
      textContent = built.text;
      htmlContent = built.html;
    } else {
      // INQUIRY / MENSAJE PERSONALIZADO DE SOPORTE
      subject = `[CONFIRMACIÓN] Solicitud de Soporte Técnico para ${cleanDomain} — Unblock AI Shield`;

      textContent = `Estimado Director / Cliente de ${cleanDomain}:

Hemos recibido su consulta en el Centro de Soporte de Unblock AI Shield:
"${cleanMessage}"

Un ingeniero de soporte técnico y ciberseguridad defensiva revisará su requerimiento y le responderá en menos de 2 horas.

Si su requerimiento es de carácter urgente, puede comunicarse de inmediato a:
Correo Oficial: ricardo.destrabaai@gmail.com
Portal de Monitoreo: https://unblock-shield.vercel.app

Atentamente,
Equipo de Operaciones e Ingeniería Fiduciaria
BolTech Group`;

      htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #030712; color: #f8fafc; padding: 20px; }
    .box { max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 28px; }
    .btn { display: inline-block; background: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="box">
    <h2 style="color: #38bdf8; margin-top: 0;">Solicitud Recibida — Unblock AI Shield</h2>
    <p>Estimado Director de <strong>${cleanDomain}</strong>,</p>
    <p>Hemos recibido su requerimiento:</p>
    <blockquote style="background: #1e293b; padding: 12px 16px; border-left: 3px solid #38bdf8; color: #cbd5e1; font-style: italic;">
      "${escapeForHtml(cleanMessage)}"
    </blockquote>
    <p>Un ingeniero de soporte defensivo evaluará su infraestructura y le responderá en menos de 2 horas hábiles.</p>
    <a href="https://unblock-shield.vercel.app" class="btn">Ir a Unblock AI Shield →</a>
  </div>
</body>
</html>
      `;
    }

    // DISPARO EN RED REAL (LIVE NETWORK OBLIGATORIO)
    const dispatchResult = await dispatchUniversalEmail({
      to: cleanEmail,
      subject,
      text: textContent,
      html: htmlContent
    });

    console.log(`[LIVE EMAIL DISPATCH] Success: ${dispatchResult.success} | Transport: ${dispatchResult.transport} | ID: ${dispatchResult.messageId}`);

    // NOTIFICACIÓN A TELEGRAM (SI ESTÁ CONFIGURADO)
    if (process.env.TELEGRAM_BOT_TOKEN && (process.env.TELEGRAM_AUTHORIZED_USER_ID || process.env.TELEGRAM_CHAT_ID)) {
      const chatId = process.env.TELEGRAM_AUTHORIZED_USER_ID || process.env.TELEGRAM_CHAT_ID;
      try {
        const text = `🎯 *LEAD PROCESADO EN RED REAL (UNBLOCK AI SHIELD)*\n\n📧 *Email:* \`${cleanEmail}\`\n🌐 *Dominio:* \`${cleanDomain}\`\n📨 *Tipo:* ${isCustomSupportInquiry ? 'Consulta de Soporte' : 'Diagnóstico de Blindaje'}\n🚀 *Transporte:* \`${dispatchResult.transport}\`\n🆔 *MessageID:* \`${dispatchResult.messageId}\`\n⏰ *Fecha:* \`${leadTime}\``;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgErr) {
        console.error('[TELEGRAM NOTIFY ERROR]', tgErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Diagnóstico técnico y parches de remediación enviados exitosamente a tu correo corporativo.',
      domain: cleanDomain,
      transport: dispatchResult.transport,
      messageId: dispatchResult.messageId
    });
  } catch (err) {
    console.error('[LEAD HANDLER CRITICAL ERROR]', err);
    return res.status(500).json({ error: 'Error interno al procesar el diagnóstico técnico', details: err.message });
  }
}
