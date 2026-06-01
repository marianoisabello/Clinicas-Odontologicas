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
