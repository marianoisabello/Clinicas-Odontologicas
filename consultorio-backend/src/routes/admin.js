import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAdmin } from '../middleware/auth.js';

export const rutaAdmin = Router();

// GET /admin/profesionales — lista todos los profesionales
rutaAdmin.get('/profesionales', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre, email, rol, especialidad, color_calendario, foto_url, bio, activo, created_at')
    .order('nombre');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /admin/profesionales — crea usuario en Auth + perfil
rutaAdmin.post('/profesionales', requireAdmin, async (req, res) => {
  const { nombre, email, password, rol, especialidad, color_calendario } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Campos requeridos: nombre, email, password' });
  }

  // 1. Crear usuario en Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (authError) return res.status(400).json({ error: authError.message });

  const userId = authData.user.id;

  // 2. Upsert del perfil — por si el trigger handle_new_user ya lo creó o no.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      nombre,
      email,
      rol: rol ?? 'odontologo',
      especialidad: especialidad ?? null,
      color_calendario: color_calendario ?? '#0F4C5C',
      activo: true,
    })
    .select()
    .single();

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return res.status(500).json({ error: profileError.message });
  }

  res.status(201).json(profile);
});

// PUT /admin/profesionales/:id — actualiza perfil
rutaAdmin.put('/profesionales/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, rol, especialidad, color_calendario, activo, bio, foto_url } = req.body;

  const { data, error } = await supabase
    .from('profiles')
    .update({ nombre, rol, especialidad, color_calendario, activo, bio, foto_url })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /admin/profesionales/:id/invitar — genera magic link y devuelve datos para el mail
rutaAdmin.post('/profesionales/:id/invitar', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('nombre, email')
    .eq('id', id)
    .maybeSingle();

  if (profileError || !profile) {
    return res.status(404).json({ error: 'Profesional no encontrado' });
  }
  if (!profile.email) {
    return res.status(400).json({ error: 'El profesional no tiene email registrado' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://clinicas-odontologicas.vercel.app';

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: profile.email,
    options: { redirectTo: frontendUrl },
  });

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    nombre: profile.nombre,
    email: profile.email,
    link: data.properties.action_link,
  });
});

// PUT /admin/turnos/:id/profesional — asigna o reasigna profesional a un turno + sync Google Calendar
rutaAdmin.put('/turnos/:id/profesional', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { profesional_id } = req.body;

  if (!profesional_id) {
    return res.status(400).json({ error: 'Falta profesional_id' });
  }

  // Obtener turno actual para poder limpiar el calendario viejo
  const { data: turnoActual, error: errTurno } = await supabase
    .from('turnos')
    .select('profesional_id, notas, fecha_hora_inicio, fecha_hora_fin, tratamiento, paciente_id')
    .eq('id', id)
    .single();

  if (errTurno || !turnoActual) {
    return res.status(404).json({ error: 'Turno no encontrado' });
  }

  // Actualizar profesional en DB
  const { data, error } = await supabase
    .from('turnos')
    .update({ profesional_id })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // ── SYNC GOOGLE CALENDAR (no-crítico) ────────────────────────────────────
  try {
    const { crearEvento, eliminarEvento } = await import('../services/google/calendar.js');

    // 1. Eliminar evento del calendario del profesional anterior
    if (turnoActual.profesional_id && turnoActual.notas) {
      const match = turnoActual.notas.match(/google_event_id: ([^\s|]+)/);
      if (match) {
        try {
          await eliminarEvento(turnoActual.profesional_id, match[1]);
        } catch { /* ignorar si ya no existe */ }
      }
    }

    // 2. Crear evento en el calendario del nuevo profesional
    const { data: gcCredsList } = await supabase
      .from('google_calendar_credentials')
      .select('profesional_id')
      .eq('profesional_id', profesional_id);

    if (gcCredsList?.length > 0) {
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('nombre, apellido')
        .eq('id', turnoActual.paciente_id)
        .single();

      const nombrePaciente = paciente
        ? `${paciente.nombre} ${paciente.apellido}`.trim()
        : 'Paciente';

      const googleEventId = await crearEvento(profesional_id, {
        inicio: turnoActual.fecha_hora_inicio,
        fin: turnoActual.fecha_hora_fin,
        titulo: `Turno: ${nombrePaciente} - ${turnoActual.tratamiento || 'Consulta'}`,
        descripcion: `Asignado desde panel admin\nPaciente ID: ${turnoActual.paciente_id}\nTurno ID: ${id}`,
        colorId: '10',
      });

      await supabase
        .from('turnos')
        .update({ notas: `Asignado vía admin | google_event_id: ${googleEventId}` })
        .eq('id', id);

      data.google_event_id = googleEventId;
    }
  } catch (gcErr) {
    console.error(`⚠️  Error sincronizando Google Calendar al reasignar turno ${id}:`, gcErr.message);
  }
  // ─────────────────────────────────────────────────────────────────────────

  res.json(data);
});

// DELETE /admin/profesionales/:id — desactiva (no elimina datos)
rutaAdmin.delete('/profesionales/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('profiles')
    .update({ activo: false })
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});
