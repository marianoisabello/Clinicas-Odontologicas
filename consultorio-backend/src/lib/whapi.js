/**
 * Cliente para Whapi.cloud — WhatsApp API alternativa
 * Usada como solución interim mientras Meta Business está en revisión
 */

const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';

/**
 * Envía un mensaje de texto vía Whapi
 */
export async function enviarWhatsAppWhapi(telefono, mensaje) {
  const token = process.env.WHAPI_TOKEN;

  if (!token) {
    console.error('WHAPI_TOKEN no configurado');
    return { ok: false, error: 'WHAPI_TOKEN no configurado' };
  }

  // Whapi espera formato: 5491123456789@s.whatsapp.net
  const telefonoLimpio = telefono.replace('whatsapp:', '').replace('+', '').replace('@s.whatsapp.net', '');
  const to = `${telefonoLimpio}@s.whatsapp.net`;

  try {
    const response = await fetch(`${WHAPI_API_URL}/messages/text`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, body: mensaje }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error enviando mensaje Whapi:', data);
      return { ok: false, error: data.error?.message || JSON.stringify(data) };
    }

    return { ok: true, messageId: data.id };
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
      // Ignorar mensajes propios (outgoing)
      if (msg.from_me) continue;
      if (msg.type !== 'text') continue;

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
