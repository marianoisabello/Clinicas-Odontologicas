import twilio from 'twilio';
import 'dotenv/config';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function enviarWhatsApp(telefonoDestino, mensaje) {
  // telefonoDestino debe venir en formato +5491123456789
  const to = telefonoDestino.startsWith('whatsapp:')
    ? telefonoDestino
    : `whatsapp:${telefonoDestino}`;

  try {
    const result = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to,
      body: mensaje,
    });
    return { ok: true, sid: result.sid };
  } catch (err) {
    console.error('Error enviando WhatsApp:', err.message);
    return { ok: false, error: err.message };
  }
}
