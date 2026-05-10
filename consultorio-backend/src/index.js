import express from 'express';
import 'dotenv/config';
import { procesarMensaje } from './agent/index.js';
import { enviarWhatsApp } from './lib/twilio.js';
import {
  obtenerOCrearConversacion,
  guardarMensaje,
  obtenerHistorialReciente,
  iaEstaActiva,
} from './services/conversaciones.js';
import { buscarPorTelefono, crearPacientePreliminar } from './services/pacientes.js';
import { rutaTest } from './routes/test.js';
import { rutaGoogle } from './routes/google.js';

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

// Ruta de testing (sin Twilio) — útil para probar el agente con curl
app.use('/test', rutaTest);

// OAuth Google Calendar
app.use('/auth/google', rutaGoogle);

/**
 * Webhook de Twilio WhatsApp.
 */
app.post('/webhook/whatsapp', async (req, res) => {
  res.type('text/xml').send('<Response></Response>');

  const telefono = req.body.From;
  const mensaje = (req.body.Body || '').trim();

  if (!telefono || !mensaje) return;

  try {
    await manejarMensajeEntrante(telefono, mensaje);
  } catch (err) {
    console.error('Error procesando mensaje:', err);
  }
});

async function manejarMensajeEntrante(telefono, mensaje) {
  let paciente = await buscarPorTelefono(telefono);
  if (!paciente) paciente = await crearPacientePreliminar(telefono);

  const conversacion = await obtenerOCrearConversacion(telefono, paciente.id);

  await guardarMensaje({
    conversacionId: conversacion.id,
    direccion: 'entrante',
    contenido: mensaje,
  });

  const iaActiva = await iaEstaActiva(conversacion.id);
  if (!iaActiva) {
    console.log(`⏸️  IA pausada en conversación ${conversacion.id}`);
    return;
  }

  const historial = await obtenerHistorialReciente(conversacion.id, 20);
  const historialPrev = historial.slice(0, -1);

  const respuesta = await procesarMensaje({
    paciente,
    conversacionId: conversacion.id,
    mensajeUsuario: mensaje,
    historial: historialPrev,
  });

  const envio = await enviarWhatsApp(telefono, respuesta);
  if (envio.ok) {
    await guardarMensaje({
      conversacionId: conversacion.id,
      direccion: 'saliente',
      contenido: respuesta,
      procesadoPorIA: true,
    });
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🦷 Consultorio backend escuchando en puerto ${PORT}`);
  console.log(`   Health:  GET  /health`);
  console.log(`   Test:    POST /test/mensaje  (sin Twilio)`);
  console.log(`   Webhook: POST /webhook/whatsapp`);
  console.log(`   Google:  GET  /auth/google/start?profesional_id=xxx`);
});
