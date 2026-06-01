/**
 * Rutas OAuth para conectar/desconectar Google Calendar.
 *
 * GET  /auth/google/start?profesional_id=xxx  → redirige a Google
 * GET  /auth/google/callback                  → recibe el code, guarda tokens
 * POST /auth/google/disconnect                → borra credenciales
 */

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { getAuthUrl, exchangeCode, encryptToken } from '../services/google/oauth.js';

export const rutaGoogle = Router();

// ---------------------------------------------------------------------------
// GET /auth/google/start?profesional_id=xxx
// ---------------------------------------------------------------------------
rutaGoogle.get('/start', async (req, res) => {
  const { profesional_id } = req.query;

  if (!profesional_id) {
    return res.status(400).json({ error: 'Falta profesional_id' });
  }

  // Verificar que el profesional exista
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
});

// ---------------------------------------------------------------------------
// GET /auth/google/callback
// ---------------------------------------------------------------------------
rutaGoogle.get('/callback', async (req, res) => {
  const { code, state: profesionalId, error: oauthError } = req.query;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const redirectBase = `${frontendUrl}/configuracion`;

  if (oauthError) {
    console.error(`[Google OAuth] Error devuelto por Google: ${oauthError}`);
    return res.redirect(`${redirectBase}?google=error&detalle=${encodeURIComponent(oauthError)}`);
  }

  if (!code || !profesionalId) {
    console.error('[Google OAuth] Callback sin code o state');
    return res.redirect(`${redirectBase}?google=error&detalle=parametros_invalidos`);
  }

  try {
    console.log(`🔄 Intercambiando code por tokens para profesional ${profesionalId}`);
    const { access_token, refresh_token, expiry_date, email } = await exchangeCode(code);

    if (!refresh_token) {
      // Puede pasar si el usuario ya autorizó antes y Google no reenvía el refresh_token.
      // getAuthUrl ya incluye prompt='consent' para evitar esto, pero lo manejamos igual.
      console.error('[Google OAuth] Google no devolvió refresh_token. Pedile al usuario que revoque y reintente.');
      return res.redirect(`${redirectBase}?google=error&detalle=sin_refresh_token`);
    }

    // Guardar en Supabase con tokens encriptados
    const { error: upsertError } = await supabase
      .from('google_calendar_credentials')
      .upsert(
        {
          profesional_id: profesionalId,
          google_email: email,
          refresh_token: encryptToken(refresh_token),
          access_token: encryptToken(access_token),
          expires_at: new Date(expiry_date).toISOString(),
          connected_at: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: 'profesional_id' }
      );

    if (upsertError) {
      console.error('[Google OAuth] Error guardando credenciales:', upsertError.message);
      return res.redirect(`${redirectBase}?google=error&detalle=db_error`);
    }

    console.log(`✅ Google Calendar conectado para profesional ${profesionalId} (${email})`);
    res.redirect(`${redirectBase}?google=conectado`);
  } catch (err) {
    console.error('[Google OAuth] Error inesperado en callback:', err.message);
    res.redirect(`${redirectBase}?google=error&detalle=${encodeURIComponent(err.message)}`);
  }
});

// ---------------------------------------------------------------------------
// POST /auth/google/disconnect
// Body: { profesional_id }
// ---------------------------------------------------------------------------
rutaGoogle.post('/disconnect', async (req, res) => {
  const { profesional_id } = req.body;

  if (!profesional_id) {
    return res.status(400).json({ error: 'Falta profesional_id' });
  }

  const { error } = await supabase
    .from('google_calendar_credentials')
    .delete()
    .eq('profesional_id', profesional_id);

  if (error) {
    console.error('[Google OAuth] Error al desconectar:', error.message);
    return res.status(500).json({ error: 'Error al eliminar credenciales' });
  }

  console.log(`🔌 Google Calendar desconectado para profesional ${profesional_id}`);
  res.json({ ok: true });
});
