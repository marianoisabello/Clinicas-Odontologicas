import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://clinicas-odontologicas.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server o curl
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      /^https:\/\/clinicas-odontologicas(-[a-z0-9-]+)?\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Determinar provider activo
const usarMeta = () => !!process.env.META_ACCESS_TOKEN;
const usarUltraMsg = () => !!(process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN);

// Health check - sin dependencias
app.get('/health', (req, res) => res.json({
  ok: true,
  provider: usarMeta() ? 'meta' : usarUltraMsg() ? 'ultramsg' : 'twilio',
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

app.use('/pagos', async (req, res, next) => {
  const { rutaPagos } = await import('./routes/pagos.js');
  rutaPagos(req, res, next);
});


/**
 * Webhook de Whapi — recibe mensajes entrantes
 */
app.post('/webhook/whapi', async (req, res) => {
  // Verificar token opcional
  const whapiToken = process.env.WHAPI_WEBHOOK_TOKEN;
  if (whapiToken) {
    const tokenHeader = req.headers['x-whapi-token'];
    if (tokenHeader !== whapiToken) {
      return res.sendStatus(401);
    }
  }

  res.sendStatus(200);

  console.log('[Whapi webhook] body:', JSON.stringify(req.body));

  const { extraerMensajesWhapi } = await import('./lib/whapi.js');
  const mensajes = extraerMensajesWhapi(req.body);
  console.log('[Whapi webhook] mensajes extraídos:', mensajes.length);

  for (const { telefono, mensaje } of mensajes) {
    try {
      await manejarMensajeEntrante(telefono, mensaje, 'whapi');
    } catch (err) {
      console.error('Error procesando mensaje Whapi:', err);
    }
  }
});

/**
 * Webhook de UltraMsg — recibe mensajes entrantes
 * UltraMsg envía un token de seguridad en el body que hay que validar
 */
app.post('/webhook/ultramsg', async (req, res) => {
  const token = process.env.ULTRAMSG_TOKEN;
  if (token && req.body.token !== token) {
    console.warn('[UltraMsg webhook] token inválido');
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  console.log('[UltraMsg webhook] body:', JSON.stringify(req.body));

  const { extraerMensajesUltraMsg } = await import('./lib/ultramsg.js');
  const mensajes = extraerMensajesUltraMsg(req.body);
  console.log('[UltraMsg webhook] mensajes extraídos:', mensajes.length);

  for (const { telefono, mensaje } of mensajes) {
    try {
      await manejarMensajeEntrante(telefono, mensaje, 'ultramsg');
    } catch (err) {
      console.error('[UltraMsg] Error procesando mensaje:', err);
    }
  }
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
  const [
    { obtenerOCrearConversacion, guardarMensaje, obtenerHistorialReciente },
    { procesarMenuBot },
    { enviarWhatsApp },
    { enviarWhatsAppMeta },
    { enviarWhatsAppWhapi },
    { enviarWhatsAppUltraMsg },
  ] = await Promise.all([
    import('./services/conversaciones.js'),
    import('./services/bot-menu.js'),
    import('./lib/twilio.js'),
    import('./lib/meta-whatsapp.js'),
    import('./lib/whapi.js'),
    import('./lib/ultramsg.js'),
  ]);

  // Whitelist de prueba: si está definida, solo esos números activan el bot
  const testNumbers = process.env.WHAPI_TEST_NUMBERS;
  if (testNumbers) {
    const permitidos = testNumbers.split(',').map(n => n.trim().replace('+', ''));
    const telefonoLimpio = telefono.replace('+', '').replace('whatsapp:', '').trim();
    if (!permitidos.includes(telefonoLimpio)) {
      console.log(`Número ${telefono} no está en whitelist, mensaje guardado sin respuesta del bot`);
      const conversacionSilenciosa = await obtenerOCrearConversacion(telefono);
      if (conversacionSilenciosa) {
        await guardarMensaje({ conversacionId: conversacionSilenciosa.id, direccion: 'entrante', contenido: mensaje });
      }
      return;
    }
  }

  const conversacion = await obtenerOCrearConversacion(telefono);
  if (!conversacion) {
    console.error('No se pudo crear conversación para', telefono);
    return;
  }

  await guardarMensaje({
    conversacionId: conversacion.id,
    direccion: 'entrante',
    contenido: mensaje,
  });

  const { respuesta: respuestaMenu, usarIA, contexto } = await procesarMenuBot(conversacion.id, mensaje);

  let respuestaFinal = respuestaMenu;

  if (usarIA) {
    try {
      const [
        { buscarPorTelefono, crearPacientePreliminar },
        { procesarMensaje },
      ] = await Promise.all([
        import('./services/pacientes.js'),
        import('./agent/index.js'),
      ]);

      let paciente = await buscarPorTelefono(telefono);
      if (!paciente) paciente = await crearPacientePreliminar(telefono);

      const historial = await obtenerHistorialReciente(conversacion.id, 20);

      respuestaFinal = await procesarMensaje({
        paciente,
        conversacionId: conversacion.id,
        mensajeUsuario: mensaje,
        historial: historial.slice(0, -1),
        contexto,
      });
    } catch (err) {
      console.error('Error en agente IA:', err);
      respuestaFinal = 'En este momento no puedo procesar tu solicitud. Por favor, intentá más tarde.';
    }
  }

  if (!respuestaFinal) return;

  let envio;
  if (provider === 'ultramsg') {
    envio = await enviarWhatsAppUltraMsg(telefono, respuestaFinal);
  } else if (provider === 'whapi') {
    envio = await enviarWhatsAppWhapi(telefono, respuestaFinal);
  } else if (provider === 'meta' || usarMeta()) {
    envio = await enviarWhatsAppMeta(telefono, respuestaFinal);
  } else {
    envio = await enviarWhatsApp(telefono, respuestaFinal);
  }

  if (envio?.ok) {
    await guardarMensaje({
      conversacionId: conversacion.id,
      direccion: 'saliente',
      contenido: respuestaFinal,
      procesadoPorIA: usarIA,
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
