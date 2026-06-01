import { Router } from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

export const rutaPagos = Router();

function getMPClient() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN no configurado');
  return new MercadoPagoConfig({ accessToken });
}

const isSandbox = () => (process.env.MP_ACCESS_TOKEN ?? '').startsWith('TEST-');

const frontendUrl = process.env.FRONTEND_URL || 'https://clinicas-odontologicas-git-main-pampai.vercel.app';

// POST /pagos/crear-link — genera preferencia de pago en Mercado Pago
rutaPagos.post('/crear-link', requireAuth, async (req, res) => {
  const { factura_id } = req.body;

  if (!factura_id) {
    return res.status(400).json({ error: 'factura_id es requerido' });
  }

  // Traer datos de la factura
  const { data: factura, error: facturaError } = await supabase
    .from('facturas_cliente')
    .select('id, paciente_nombre, paciente_id, concepto, monto, moneda, numero_comprobante, tipo_factura')
    .eq('id', factura_id)
    .maybeSingle();

  if (facturaError || !factura) {
    return res.status(404).json({ error: 'Factura no encontrada' });
  }

  // Email del paciente (opcional, mejora la experiencia en MP)
  let payerEmail = null;
  if (factura.paciente_id) {
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('email')
      .eq('id', factura.paciente_id)
      .maybeSingle();
    payerEmail = paciente?.email ?? null;
  }

  const comprobante = [factura.tipo_factura, factura.numero_comprobante].filter(Boolean).join(' ');
  const titulo = factura.concepto || `Servicio odontológico${comprobante ? ` — ${comprobante}` : ''}`;

  try {
    const client = getMPClient();
    const preferenceClient = new Preference(client);

    const body = {
      items: [
        {
          id: factura.id,
          title: titulo.slice(0, 256),
          quantity: 1,
          unit_price: Number(factura.monto),
          currency_id: factura.moneda || 'ARS',
        },
      ],
      payer: payerEmail ? { email: payerEmail } : undefined,
      external_reference: factura.id,
      back_urls: {
        success: `${frontendUrl}/administracion`,
        failure: `${frontendUrl}/administracion`,
        pending: `${frontendUrl}/administracion`,
      },
      auto_return: 'approved',
      statement_descriptor: 'Consultorio Odonto',
    };

    // Solo agregar notification_url en producción (MP no puede notificar a localhost)
    if (!isSandbox() || process.env.MP_WEBHOOK_URL) {
      body.notification_url = process.env.MP_WEBHOOK_URL || `${frontendUrl}/webhook/mp`;
    }

    const preference = await preferenceClient.create({ body });

    const url = isSandbox()
      ? preference.sandbox_init_point
      : preference.init_point;

    res.json({
      url,
      preference_id: preference.id,
      sandbox: isSandbox(),
    });
  } catch (err) {
    console.error('Error Mercado Pago:', err);
    res.status(500).json({ error: err.message ?? 'Error al crear preferencia de pago' });
  }
});

// POST /webhook/mp — notificación de pago de Mercado Pago
rutaPagos.post('/webhook', async (req, res) => {
  // MP envía notificación inmediata — responder 200 primero
  res.sendStatus(200);

  try {
    const { type, data } = req.body;

    // Solo procesar pagos aprobados
    if (type !== 'payment' || !data?.id) return;

    const client = getMPClient();
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status !== 'approved') return;

    const facturaId = payment.external_reference;
    if (!facturaId) return;

    await supabase
      .from('facturas_cliente')
      .update({ estado: 'cobrada' })
      .eq('id', facturaId);

    console.log(`Factura ${facturaId} marcada como cobrada por pago MP ${data.id}`);
  } catch (err) {
    console.error('Error procesando webhook MP:', err);
  }
});
