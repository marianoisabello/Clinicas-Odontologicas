/**
 * Cliente Whapi.cloud — único provider WhatsApp del proyecto
 * Vars: WHAPI_TOKEN, WHAPI_API_URL (opcional, default gate.whapi.cloud)
 */

/**
 * Envía un mensaje de texto vía Whapi
 */
export async function enviarWhatsAppWhapi(telefono, mensaje) {
  const token = process.env.WHAPI_TOKEN;

  if (!token) {
    console.error('WHAPI_TOKEN no configurado');
    return { ok: false, error: 'WHAPI_TOKEN no configurado' };
  }

  const telefonoLimpio = telefono.replace('whatsapp:', '').replace('+', '').replace('@s.whatsapp.net', '').trim();
  // Whapi acepta E.164 sin + o JID; preferimos dígitos (más compatible)
  const to = telefonoLimpio;

  const base = (process.env.WHAPI_API_URL || 'https://gate.whapi.cloud').replace(/\/$/, '');

  try {
    const response = await fetch(`${base}/messages/text`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, body: mensaje }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Error enviando mensaje Whapi:', data);
      const errMsg = data.error?.message || data.error || JSON.stringify(data);
      // Channel not found = token/canal desconectado o WHAPI_API_URL incorrecta
      if (String(errMsg).toLowerCase().includes('channel not found')) {
        console.error('[Whapi] Channel not found — revisá en el panel Whapi que el canal esté ONLINE y que WHAPI_TOKEN / WHAPI_API_URL en Vercel correspondan a ese canal.');
      }
      return { ok: false, error: errMsg };
    }

    return { ok: true, messageId: data.id || data.message?.id };
  } catch (error) {
    console.error('Error en enviarWhatsAppWhapi:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Extrae mensajes de texto del payload de webhook de Whapi
 */
export function extraerMensajesWhapi(body) {
  const mensajes = [];

  try {
    const messages = body.messages || [];

    for (const msg of messages) {
      if (msg.type !== 'text') continue;
      if (msg.from_me) continue; // ignorar mensajes enviados por el bot

      // from viene como "5491123456789@s.whatsapp.net"
      const telefonoRaw = msg.from || msg.chat_id || '';
      const telefono = '+' + telefonoRaw.replace('@s.whatsapp.net', '').replace('@c.us', '');
      const mensaje = msg.text?.body || '';

      if (telefono && mensaje) {
        mensajes.push({
          telefono,
          mensaje,
          messageId: msg.id,
          timestamp: msg.timestamp,
        });
      }
    }
  } catch (error) {
    console.error('Error extrayendo mensajes de Whapi:', error);
  }

  return mensajes;
}
