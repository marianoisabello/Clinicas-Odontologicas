import 'dotenv/config';
import { getAuthUrl } from '../consultorio-backend/src/services/google/oauth.js';
import { supabase } from '../consultorio-backend/src/lib/supabase.js';

export default async function handler(req, res) {
  const { profesional_id } = req.query;

  if (!profesional_id) {
    return res.status(400).json({ error: 'Falta profesional_id' });
  }

  const { data: profesional, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profesional_id)
    .maybeSingle();

  if (error) {
    console.error(`[Google OAuth] Error Supabase: ${error.message}`);
    return res.status(500).json({ error: `Error base de datos: ${error.message}` });
  }
  if (!profesional) {
    console.error(`[Google OAuth] Profesional no encontrado: ${profesional_id}`);
    return res.status(404).json({ error: 'Profesional no encontrado' });
  }

  const authUrl = getAuthUrl(profesional_id);
  console.log(`🔐 Iniciando OAuth de Google para profesional ${profesional_id}`);
  res.redirect(authUrl);
}
