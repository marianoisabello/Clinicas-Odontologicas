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

app.get('/health', (req, res) => res.json({
  ok: true,
  provider: 'whapi',
  whapi_configured: !!(process.env.WHAPI_TOKEN && process.env.WHAPI_API_URL),
  whapi_channel_id: process.env.WHAPI_CHANNEL_ID || null,
  timestamp: new Date().toISOString(),
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
 * Webhook Whapi — único canal WhatsApp.
 * Procesamos antes de responder para que Vercel no corte el trabajo.
 */
app.post('/webhook/whapi', async (req, res) => {
  console.log('[webhook/whapi] body:', JSON.stringify(req.body));

  const whapiToken = process.env.WHAPI_WEBHOOK_TOKEN;
  if (whapiToken && req.headers['x-whapi-token'] !== whapiToken) {
    console.warn('[Whapi] token inválido');
    return res.sendStatus(403);
  }

  try {
    const { extraerMensajesWhapi } = await import('./lib/whapi.js');
    const mensajes = extraerMensajesWhapi(req.body);
    console.log('[Whapi webhook] mensajes extraídos:', mensajes.length);

    for (const { telefono, mensaje } of mensajes) {
      try {
        await manejarMensajeEntrante(telefono, mensaje);
      } catch (err) {
        console.error('Error procesando mensaje Whapi:', err);
      }
    }
  } catch (err) {
    console.error('[Whapi webhook] Error general:', err);
  }

  res.sendStatus(200);
});

function variantesTelefono(telefono) {
  const raw = telefono.replace('whatsapp:', '').trim();
  return [...new Set([
    raw,
    raw.startsWith('+') ? raw.slice(1) : `+${raw}`,
  ])].filter(Boolean);
}

async function manejarMensajeEntrante(telefono, mensaje) {
  const [
    { obtenerOCrearConversacion, guardarMensaje, obtenerHistorialReciente },
    { procesarMenuBot },
    { enviarWhatsAppWhapi },
  ] = await Promise.all([
    import('./services/conversaciones.js'),
    import('./services/bot-menu.js'),
    import('./lib/whapi.js'),
  ]);

  // Whitelist opcional: si está definida, solo esos números activan el bot
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

  const triggerPhrase = process.env.BOT_TRIGGER_PHRASE || 'Hola, quiero sacar un turno';
  const esTrigger = (() => {
    const norm = (s) => String(s)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return norm(mensaje) === norm(triggerPhrase);
  })();

  if (!esTrigger) {
    const { supabase } = await import('./lib/supabase.js');
    const variantes = variantesTelefono(telefono);
    const { data: convs } = await supabase
      .from('conversaciones_whatsapp')
      .select('bot_estado')
      .in('telefono', variantes)
      .limit(1);

    const estadoActual = convs?.[0]?.bot_estado ?? 'inicio';
    if (estadoActual === 'inicio') {
      console.log(`[bot] Mensaje ignorado de ${telefono} (bot inactivo)`);
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

  const envio = await enviarWhatsAppWhapi(telefono, respuestaFinal);

  if (envio?.ok) {
    await guardarMensaje({
      conversacionId: conversacion.id,
      direccion: 'saliente',
      contenido: respuestaFinal,
      procesadoPorIA: usarIA,
    });
  } else {
    console.error('[Whapi] Falló envío de respuesta:', envio?.error);
  }
}

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Consultorio backend escuchando en puerto ${PORT}`);
    console.log(`   Provider: Whapi`);
    console.log(`   Health:   GET  /health`);
    console.log(`   Test:     POST /test/mensaje`);
    console.log(`   Webhook:  POST /webhook/whapi`);
  });
}

export default app;
