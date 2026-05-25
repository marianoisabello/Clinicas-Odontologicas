import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://clinicas-odontologicas.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Determinar si usar Meta o Twilio
const usarMeta = () => !!process.env.META_ACCESS_TOKEN;

// Health check - sin dependencias
app.get('/health', (req, res) => res.json({ 
  ok: true, 
  provider: usarMeta() ? 'meta' : 'twilio',
  timestamp: new Date().toISOString()
}));

// Rutas con lazy loading
app.use('/test', async (req, res, next) => {
  const { rutaTest } = await import('./routes/test.js');
  rutaTest(req, res, next);
});

app.use('/auth/google', async (req, res, next) => {
  const { rutaGoogle } = await import('./routes/google.js');
  rutaGoogle(req, res, next);
});

app.use('/admin', async (req, res, next) => {
  const { rutaAdmin } = await import('./routes/admin.js');
  rutaAdmin(req, res, next);
});

/**
 * Webhook de Meta WhatsApp - Verificacion (GET)
 */
app.get('/webhook/whatsapp', async (req, res) => {
  const { verificarWebhookMeta } = await import('./lib/meta-whatsapp.js');
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
  const esMeta = req.body.object === 'whatsapp_business_account';

  if (esMeta) {
    res.sendStatus(200);
    
    const { extraerMensajesMeta } = await import('./lib/meta-whatsapp.js');
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
  // Lazy load de todos los modulos necesarios
  const [
    { buscarPorTelefono, crearPacientePreliminar },
    { obtenerOCrearConversacion, guardarMensaje, obtenerHistorialReciente, iaEstaActiva },
    { procesarMensaje },
    { enviarWhatsApp },
    { enviarWhatsAppMeta },
  ] = await Promise.all([
    import('./services/pacientes.js'),
    import('./services/conversaciones.js'),
    import('./agent/index.js'),
    import('./lib/twilio.js'),
    import('./lib/meta-whatsapp.js'),
  ]);

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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Consultorio backend escuchando en puerto ${PORT}`);
    console.log(`   Provider: ${usarMeta() ? 'Meta' : 'Twilio'}`);
    console.log(`   Health:   GET  /health`);
    console.log(`   Test:     POST /test/mensaje`);
    console.log(`   Webhook:  POST /webhook/whatsapp`);
  });
}

export default app;
