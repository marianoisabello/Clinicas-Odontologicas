/**
 * Cliente para Whapi.cloud - WhatsApp API
 * Documentación: https://whapi.cloud/docs
 */

const WHAPI_API_URL = process.env.WHAPI_API_URL || 'https://gate.whapi.cloud';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

/**
 * Enviar mensaje de texto por WhatsApp via Whapi
 */
export async function enviarWhatsAppWhapi(telefono, mensaje) {
  if (!WHAPI_TOKEN) {
    console.error('WHAPI_TOKEN no configurado');
    return { success: false, error: 'WHAPI_TOKEN no configurado' };
  }

  // Formatear número (quitar whatsapp: prefix si existe, agregar @s.whatsapp.net)
  let numero = telefono.replace('whatsapp:', '').replace(/[^0-9]/g, '');
  
  // Si no tiene código de país, asumir Argentina (+54)
  if (!numero.startsWith('54') && numero.length === 10) {
    numero = '54' + numero;
  }

  try {
    const response = await fetch(`${WHAPI_API_URL}/messages/text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: `${numero}@s.whatsapp.net`,
        body: mensaje,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error Whapi:', data);
      return { success: false, error: data };
    }

    return { success: true, messageId: data.message?.id };
  } catch (error) {
    console.error('Error enviando mensaje Whapi:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verificar webhook de Whapi (GET request)
 */
export function verificarWebhookWhapi(req, res) {
  // Whapi no requiere verificación especial, solo responder 200
  return res.status(200).json({ status: 'ok' });
}

/**
 * Extraer mensajes del payload de Whapi
 * Whapi envía los mensajes en un formato específico
 */
export function extraerMensajesWhapi(body) {
  const mensajes = [];

  // Whapi puede enviar diferentes tipos de eventos
  if (!body || !body.messages) {
    // Puede ser un evento de estado o conexión
    if (body?.event) {
      console.log('Evento Whapi:', body.event);
    }
    return mensajes;
  }

  for (const msg of body.messages) {
    // Solo procesar mensajes entrantes (no enviados por nosotros)
    if (msg.from_me) continue;
    
    // Solo procesar mensajes de texto por ahora
    if (msg.type !== 'text') {
      console.log('Mensaje no es texto, tipo:', msg.type);
      continue;
    }

    // Extraer número de teléfono (formato: 5491112345678@s.whatsapp.net)
    const telefono = msg.chat_id?.replace('@s.whatsapp.net', '') || 
                     msg.from?.replace('@s.whatsapp.net', '');

    if (!telefono) continue;

    mensajes.push({
      telefono: telefono,
      mensaje: msg.text?.body || msg.body || '',
      messageId: msg.id,
      timestamp: msg.timestamp,
    });
  }

  return mensajes;
}

/**
 * Verificar si el token de Whapi está configurado
 */
export function whapiConfigurado() {
  return !!WHAPI_TOKEN;
}
