import 'dotenv/config';
import { exchangeCode, encryptToken } from '../consultorio-backend/src/services/google/oauth.js';
import { supabase } from '../consultorio-backend/src/lib/supabase.js';

export default async function handler(req, res) {
  const { code, state: profesionalId, error: oauthError } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'https://clinicas-odontologicas.vercel.app';
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
      console.error('[Google OAuth] Google no devolvió refresh_token.');
      return res.redirect(`${redirectBase}?google=error&detalle=sin_refresh_token`);
    }

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
}
