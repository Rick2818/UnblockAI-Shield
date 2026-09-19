// Vercel Serverless Function: Lead Capture & Fiduciary Support Dispatch
export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, domain, message, timestamp } = req.body || {};

    // Strict email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(String(email).trim())) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const cleanDomain = String(domain || 'No especificado').trim().replace(/[^a-zA-Z0-9.-]/g, '');
    const cleanMessage = String(message || '').trim().substring(0, 1000);
    const cleanEmail = String(email).trim().toLowerCase();
    const leadTime = timestamp || new Date().toISOString();

    console.log(`[FIDUCIARY INTAKE] Email: ${cleanEmail} | Domain: ${cleanDomain} | Msg: ${cleanMessage ? 'YES' : 'NO'} | Time: ${leadTime}`);

    // If TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID exist, notify admin immediately
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const text = `🎯 *NUEVA NOTIFICACIÓN EN UNBLOCK AI SHIELD*\n\n📧 *Email:* \`${cleanEmail}\`\n🌐 *Dominio:* \`${cleanDomain}\`\n💬 *Mensaje:* ${cleanMessage || '_Solicitud de Informe Forense_'}\n⏰ *Fecha:* \`${leadTime}\``;
        await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgErr) {
        console.error('[TELEGRAM NOTIFY ERROR]', tgErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Solicitud procesada exitosamente. Soporte e informe fiduciario programados.',
      domain: cleanDomain
    });
  } catch (err) {
    console.error('[INTAKE HANDLER ERROR]', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
