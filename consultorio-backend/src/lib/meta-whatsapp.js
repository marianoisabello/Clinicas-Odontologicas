/**
 * Cliente para Meta WhatsApp Business API
 */

const WHATSAPP_API_VERSION = 'v18.0';
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

/**
 * Envia un mensaje de WhatsApp via Meta Business API
 */
export async function enviarWhatsAppMeta(telefono, mensaje) {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.error('META_PHONE_NUMBER_ID o META_ACCESS_TOKEN no configurados');
    return { ok: false, error: 'Configuración de Meta incompleta' };
  }

  // Limpiar el telefono (quitar whatsapp: si viene de formato Twilio)
  const telefonoLimpio = telefono.replace('whatsapp:', '').replace('+', '');

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: telefonoLimpio,
          type: 'text',
          text: {
            preview_url: false,
            body: mensaje,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error enviando mensaje Meta:', data);
      return { ok: false, error: data.error?.message || 'Error desconocido' };
    }

    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('Error en enviarWhatsAppMeta:', error);
    return { ok: false, error: error.message };
  }
}

/**
 * Verifica el webhook de Meta (challenge)
 */
export function verificarWebhookMeta(req) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Webhook de Meta verificado correctamente');
    return { ok: true, challenge };
  }

  return { ok: false };
}

/**
 * Extrae los mensajes de texto del payload de Meta
 */
export function extraerMensajesMeta(body) {
  const mensajes = [];

  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages) return mensajes;

    for (const msg of value.messages) {
      // Solo procesamos mensajes de texto por ahora
      if (msg.type === 'text') {
        mensajes.push({
          telefono: msg.from, // numero sin +
          mensaje: msg.text?.body || '',
          messageId: msg.id,
          timestamp: msg.timestamp,
        });
      }
    }
  } catch (error) {
    console.error('Error extrayendo mensajes de Meta:', error);
  }

  return mensajes;
}
