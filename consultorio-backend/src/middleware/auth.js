import { supabase } from '../lib/supabase.js';

/**
 * Middleware que verifica que el request viene de un usuario autenticado con rol 'admin'.
 * Espera: Authorization: Bearer <access_token>
 */
export async function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado: falta token' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return res.status(401).json({ error: 'Token inválido o expirado' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: se requiere rol admin' });
  }

  req.user = data.user;
  next();
}
