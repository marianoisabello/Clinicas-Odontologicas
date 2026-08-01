import express from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase.js';
import { listarTratamientos, crearPacientePreliminar, buscarPorTelefono, actualizarPaciente } from '../services/pacientes.js';
import { enviarWhatsAppWhapi } from '../lib/whapi.js';
import { requireAuth } from '../middleware/auth.js';

export const rutaLeads = express.Router();

function normalizarTelefono(tel) {
  const raw = String(tel || '').trim();
  // Tokens ManyChat sin resolver / basura
  if (!raw || raw.includes('{{') || raw.includes('}}')) return '';

  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Prefijo internacional 00
  if (digits.startsWith('00')) digits = digits.slice(2);
  // 0 troncal local
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Argentina (+54)
  if (digits.startsWith('54')) {
    let rest = digits.slice(2);
    if (rest.startsWith('0')) rest = rest.slice(1);
    // Móvil WhatsApp: 549 + área + número
    if (!rest.startsWith('9')) rest = `9${rest}`;
    if (rest.length < 11) return ''; // 9 + 10 dígitos mínimos
    return `+54${rest}`;
  }

  // Local AR 10 dígitos (11xxxxxxxx)
  if (digits.length === 10) return `+549${digits}`;
  // Ya con 9 móvil (911xxxxxxxx)
  if (digits.length === 11 && digits.startsWith('9')) return `+54${digits}`;

  // Otros países: exigir al menos 10 dígitos
  if (digits.length >= 10) return `+${digits}`;
  return '';
}

function requireLeadSecret(req, res, next) {
  const secret = process.env.LEADS_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[leads] LEADS_WEBHOOK_SECRET no configurado — endpoint abierto');
    return next();
  }
  const got = req.headers['x-leads-secret'] || req.query.secret;
  if (got !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

const optionalText = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().max(2000).nullable().optional(),
);

const optionalEmail = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.union([z.string().email(), z.null()]).optional(),
);

const ingestSchema = z.object({
  nombre: z.string().min(1).max(120),
  // Guardamos cualquier teléfono; WhatsApp solo si normaliza bien
  telefono: z.preprocess(
    (v) => (v === undefined || v === null ? '' : String(v).trim()),
    z.string().max(40),
  ),
  consulta: optionalText,
  email: optionalEmail,
  fuente: z.enum(['instagram', 'facebook', 'tiktok', 'google', 'manychat', 'web', 'whatsapp', 'otro']).default('manychat'),
  canal: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().max(80).nullable().optional(),
  ),
  campania: z.preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.string().max(120).nullable().optional(),
  ),
  external_id: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? null : String(v)),
    z.string().max(200).nullable().optional(),
  ),
  enviar_whatsapp: z.boolean().optional().default(true),
  raw: z.record(z.string(), z.any()).optional(),
});

/**
 * POST /leads/ingest
 * Entrada desde n8n / ManyChat / Google Form.
 * Guarda lead y opcionalmente manda WhatsApp con catálogo de servicios.
 */
rutaLeads.post('/ingest', requireLeadSecret, async (req, res) => {
  try {
    const parsed = ingestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', detalle: parsed.error.flatten() });
    }

    const body = parsed.data;
    const telefonoWa = normalizarTelefono(body.telefono);
    // Si no es WhatsApp válido, igual guardamos el valor crudo (lead sin chatbox)
    const telefono = telefonoWa || body.telefono || null;

    const row = {
      nombre: body.nombre.trim(),
      telefono,
      email: body.email || null,
      fuente: body.fuente,
      canal: body.canal || (body.fuente === 'manychat' ? 'manychat' : null),
      campania: body.campania || null,
      mensaje: body.consulta?.trim() || null,
      interes: body.consulta?.trim() || null,
      external_id: body.external_id || null,
      raw: body.raw || req.body,
      estado: 'nuevo',
      updated_at: new Date().toISOString(),
    };

    let lead;
    if (row.external_id) {
      const { data: existing } = await supabase
        .from('leads')
        .select('*')
        .eq('fuente', row.fuente)
        .eq('external_id', row.external_id)
        .maybeSingle();
      if (existing) {
        const { data: updated, error } = await supabase
          .from('leads')
          .update(row)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        lead = updated;
      }
    }

    if (!lead) {
      const { data: created, error } = await supabase.from('leads').insert(row).select().single();
      if (error) throw error;
      lead = created;
    }

    let whatsapp = { ok: false, skipped: true, reason: null };
    // Solo chatbox/WhatsApp si el número normaliza a WA válido
    if (body.enviar_whatsapp !== false && telefonoWa) {
      whatsapp = await enviarCatalogoServicios(telefonoWa, body.nombre.trim());
      if (whatsapp.ok) {
        await supabase
          .from('leads')
          .update({ estado: 'contactado', updated_at: new Date().toISOString() })
          .eq('id', lead.id);
        lead.estado = 'contactado';
      }
    } else if (!telefonoWa) {
      whatsapp = { ok: false, skipped: true, reason: 'telefono_no_whatsapp' };
    }

    return res.json({ ok: true, lead, whatsapp });
  } catch (err) {
    console.error('[leads/ingest]', err);
    return res.status(500).json({ error: err.message || 'Error interno' });
  }
});

async function enviarCatalogoServicios(telefono, nombre) {
  const tratamientos = await listarTratamientos();
  const lista = tratamientos.length
    ? tratamientos
        .slice(0, 12)
        .map((t, i) => `${i + 1}. ${t.nombre}${t.precio != null ? ` — $${Number(t.precio).toLocaleString('es-AR')}` : ''}`)
        .join('\n')
    : '1. Consulta inicial\n2. Limpieza\n3. Blanqueamiento';

  const trigger = process.env.BOT_TRIGGER_PHRASE || 'Hola, quiero sacar un turno';
  const mensaje =
    `Hola ${nombre} 👋 Somos *Sonrisa*.\n\n` +
    `Gracias por tu consulta. Estos son algunos de nuestros servicios:\n\n` +
    `${lista}\n\n` +
    `Para agendar un turno, respondé exactamente:\n*${trigger}*`;

  return enviarWhatsAppWhapi(telefono, mensaje);
}

/**
 * POST /leads/:id/convert — convierte lead en paciente (auth)
 */
rutaLeads.post('/:id/convert', requireAuth, async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead no encontrado' });

    let paciente = lead.telefono ? await buscarPorTelefono(lead.telefono) : null;
    if (!paciente) {
      paciente = await crearPacientePreliminar(lead.telefono, lead.nombre);
    } else if (lead.nombre && (!paciente.nombre || paciente.nombre === 'Paciente')) {
      const parts = lead.nombre.trim().split(/\s+/);
      await actualizarPaciente(paciente.id, {
        nombre: parts[0],
        apellido: parts.slice(1).join(' ') || paciente.apellido,
        email: lead.email || paciente.email,
      });
      paciente = await buscarPorTelefono(lead.telefono);
    }

    const { data: updated, error: e2 } = await supabase
      .from('leads')
      .update({
        estado: 'paciente',
        paciente_id: paciente.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .select()
      .single();
    if (e2) throw e2;

    return res.json({ ok: true, lead: updated, paciente });
  } catch (err) {
    console.error('[leads/convert]', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /leads/:id/reenviar-whatsapp — reenvía catálogo (auth)
 */
rutaLeads.post('/:id/reenviar-whatsapp', requireAuth, async (req, res) => {
  try {
    const { data: lead, error } = await supabase.from('leads').select('*').eq('id', req.params.id).single();
    if (error || !lead) return res.status(404).json({ error: 'Lead no encontrado' });
    const whatsapp = await enviarCatalogoServicios(lead.telefono, lead.nombre || 'hola');
    if (whatsapp.ok) {
      await supabase.from('leads').update({ estado: 'contactado', updated_at: new Date().toISOString() }).eq('id', lead.id);
    }
    return res.json({ ok: whatsapp.ok, whatsapp });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
