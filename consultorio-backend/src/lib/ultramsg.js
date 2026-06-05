/**
 * Cliente para UltraMsg — WhatsApp API via WhatsApp Web
 * Docs: https://docs.ultramsg.com
 * Vars requeridas: ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN
 */

const BASE_URL = 'https://api.ultramsg.com';

/**
 * Normaliza el número al formato que espera UltraMsg: +5491123456789
 */
function normalizarTelefono(telefono) {
  return telefono
    .replace('whatsapp:', '')
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .trim();
}

/**
 * Envía un mensaje de texto vía UltraMsg
 */
export async function enviarWhatsAppUltraMsg(telefono, mensaje) {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    console.error('[UltraMsg] ULTRAMSG_INSTANCE_ID o ULTRAMSG_TOKEN no configurados');
    return { ok: false, error: 'UltraMsg no configurado' };
  }

  const to = normalizarTelefono(telefono);

  try {
    const response = await fetch(`${BASE_URL}/${instanceId}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, to, body: mensaje }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error('[UltraMsg] Error enviando mensaje:', data);
      return { ok: false, error: data.error || JSON.stringify(data) };
    }

    console.log('[UltraMsg] Mensaje enviado a', to, '| id:', data.id);
    return { ok: true, messageId: data.id };
  } catch (error) {
    console.error('[UltraMsg] Error en fetch:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Extrae mensajes entrantes del payload del webhook de UltraMsg
 *
 * Payload esperado:
 * {
 *   event_type: "message_received",
 *   instanceId: "...",
 *   data: {
 *     id: "...",
 *     from: "5491123456789@c.us",
 *     body: "Hola",
 *     type: "chat",       // "chat" = texto
 *     fromMe: false,
 *     time: 1234567890
 *   }
 * }
 */
export function extraerMensajesUltraMsg(body) {
  const mensajes = [];

  try {
    // UltraMsg puede enviar un objeto único o un array
    const eventos = Array.isArray(body) ? body : [body];

    for (const evento of eventos) {
      if (evento.event_type !== 'message_received') continue;

      const data = evento.data;
      if (!data) continue;
      if (data.fromMe) continue;
      if (data.type !== 'chat') continue; // solo texto

      const telefono = '+' + data.from.replace('@c.us', '').replace('@s.whatsapp.net', '');
      const mensaje = (data.body || '').trim();

      if (telefono && mensaje) {
        mensajes.push({
          telefono,
          mensaje,
          messageId: data.id,
          timestamp: data.time,
        });
      }
    }
  } catch (error) {
    console.error('[UltraMsg] Error extrayendo mensajes:', error);
  }

  return mensajes;
}
