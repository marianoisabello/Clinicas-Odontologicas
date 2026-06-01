/**
 * Helpers OAuth2 para Google Calendar.
 *
 * Flujo:
 *   1. getAuthUrl()  → redirige al usuario a Google
 *   2. exchangeCode() → intercambia el code por tokens
 *   3. getValidAccessToken() → devuelve un access_token vigente (refresca si venció)
 *
 * Los tokens se encriptan con AES-256-GCM antes de guardarse en Supabase.
 * Clave: GOOGLE_TOKEN_ENCRYPTION_KEY (32 bytes en hex) en el .env
 */

import { google } from 'googleapis';
import crypto from 'crypto';
import { supabase } from '../../lib/supabase.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
];

// AES-256-GCM: IV de 12 bytes, auth tag de 16 bytes
const ALGO = 'aes-256-gcm';

function getEncryptionKey() {
  const hex = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY debe ser 32 bytes en hex (64 caracteres)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encripta texto plano. Devuelve "iv:authTag:ciphertext" en hex.
 */
export function encryptToken(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Desencripta texto producido por encryptToken.
 */
export function decryptToken(encoded) {
  const [ivHex, authTagHex, cipherHex] = encoded.split(':');
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Crea un cliente OAuth2 con las credenciales del .env.
 */
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Genera la URL de autorización de Google.
 * @param {string} profesionalId - UUID del profesional (se pasa como state para recuperarlo en el callback)
 */
export function getAuthUrl(profesionalId) {
  const oAuth2Client = createOAuthClient();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: profesionalId,
    // prompt: 'consent' fuerza que Google siempre devuelva refresh_token
    // (necesario si el usuario ya autorizó antes y el refresh_token no se reenvía)
    prompt: 'consent',
  });
}

/**
 * Intercambia el code de autorización por tokens.
 * @returns {{ access_token, refresh_token, expiry_date, email }}
 */
export async function exchangeCode(code) {
  const oAuth2Client = createOAuthClient();
  const { tokens } = await oAuth2Client.getToken(code);

  // Extraer email del id_token (JWT) — no requiere llamada extra a userinfo
  let email = null;
  if (tokens.id_token) {
    try {
      const base64Payload = tokens.id_token.split('.')[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
      email = payload.email ?? null;
    } catch {
      // Si falla el decode, email queda null
    }
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date, // ms epoch
    email,
  };
}

/**
 * Devuelve un access_token vigente para el profesional dado.
 * Si el token venció (o vence en menos de 5 minutos), lo refresca automáticamente
 * y actualiza las credenciales en Supabase.
 *
 * @param {string} profesionalId
 * @returns {Promise<{ accessToken: string, calendarId: string }>}
 */
export async function getValidAccessToken(profesionalId) {
  const { data: creds, error } = await supabase
    .from('google_calendar_credentials')
    .select('*')
    .eq('profesional_id', profesionalId)
    .single();

  if (error || !creds) {
    throw new Error(`No hay credenciales de Google para el profesional ${profesionalId}`);
  }

  const accessToken = decryptToken(creds.access_token);
  const expiresAt = new Date(creds.expires_at).getTime();
  const ahoraMs = Date.now();
  const cincoMinMs = 5 * 60 * 1000;

  // Si el token es válido por más de 5 minutos, devolver directo
  if (expiresAt - ahoraMs > cincoMinMs) {
    return { accessToken, calendarId: creds.calendar_id };
  }

  // Token vencido o próximo a vencer → refrescar
  console.log(`🔄 Refrescando access_token de Google para profesional ${profesionalId}`);

  const oAuth2Client = createOAuthClient();
  const refreshToken = decryptToken(creds.refresh_token);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oAuth2Client.refreshAccessToken();

  // Actualizar en Supabase
  await supabase
    .from('google_calendar_credentials')
    .update({
      access_token: encryptToken(credentials.access_token),
      expires_at: new Date(credentials.expiry_date).toISOString(),
      last_sync_at: new Date().toISOString(),
    })
    .eq('profesional_id', profesionalId);

  console.log(`✅ Access token refrescado para profesional ${profesionalId}`);

  return {
    accessToken: credentials.access_token,
    calendarId: creds.calendar_id,
  };
}
