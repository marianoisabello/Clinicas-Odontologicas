import express from 'express';
import 'dotenv/config';
import { procesarMensaje } from './agent/index.js';
import { enviarWhatsApp } from './lib/twilio.js';
import { enviarWhatsAppMeta, verificarWebhookMeta, extraerMensajesMeta } from './lib/meta-whatsapp.js';
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

// CORS para permitir requests desde el frontend
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Determinar si usar Meta o Twilio
const usarMeta = () => !!process.env.META_ACCESS_TOKEN;

app.get('/health', (req, res) => res.json({ 
  ok: true, 
  provider: usarMeta() ? 'meta' : 'twilio',
  timestamp: new Date().toISOString()
}));

// Ruta de testing (sin WhatsApp) — útil para probar el agente con curl
app.use('/test', rutaTest);

// OAuth Google Calendar
app.use('/auth/google', rutaGoogle);

/**
 * Webhook de Meta WhatsApp - Verificacion (GET)
 */
app.get('/webhook/whatsapp', (req, res) => {
  const result = verificarWebhookMeta(req);
  if (result.ok) {
    return res.status(200).send(result.challenge);
  }
  return res.sendStatus(403);
});

/**
 * Webhook de WhatsApp (POST) - Soporta Twilio y Meta
 */
app.post('/webhook/whatsapp', async (req, res) => {
  // Detectar si es Meta o Twilio por el formato del body
  const esMeta = req.body.object === 'whatsapp_business_account';

  if (esMeta) {
    // Meta requiere respuesta 200 inmediata
    res.sendStatus(200);

    const mensajes = extraerMensajesMeta(req.body);
    for (const { telefono, mensaje } of mensajes) {
      if (telefono && mensaje) {
        try {
          await manejarMensajeEntrante(`+${telefono}`, mensaje, 'meta');
        } catch (err) {
          console.error('Error procesando mensaje Meta:', err);
        }
      }
    }
  } else {
    // Twilio
    res.type('text/xml').send('<Response></Response>');

    const telefono = req.body.From;
    const mensaje = (req.body.Body || '').trim();

    if (telefono && mensaje) {
      try {
        await manejarMensajeEntrante(telefono, mensaje, 'twilio');
      } catch (err) {
        console.error('Error procesando mensaje Twilio:', err);
      }
    }
  }
});

async function manejarMensajeEntrante(telefono, mensaje, provider = 'twilio') {
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
    console.log(`IA pausada en conversación ${conversacion.id}`);
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

  // Enviar respuesta segun el provider
  let envio;
  if (provider === 'meta' || usarMeta()) {
    envio = await enviarWhatsAppMeta(telefono, respuesta);
  } else {
    envio = await enviarWhatsApp(telefono, respuesta);
  }

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

// Solo iniciar servidor si no estamos en Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Consultorio backend escuchando en puerto ${PORT}`);
    console.log(`   Provider: ${usarMeta() ? 'Meta' : 'Twilio'}`);
    console.log(`   Health:   GET  /health`);
    console.log(`   Test:     POST /test/mensaje`);
    console.log(`   Webhook:  POST /webhook/whatsapp`);
    console.log(`   Google:   GET  /auth/google/start?profesional_id=xxx`);
  });
}

export default app;
