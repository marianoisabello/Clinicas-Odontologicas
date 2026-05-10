/**
 * Helpers para interactuar con Google Calendar API.
 *
 * Funciones:
 *   crearEvento()       → crea un evento y devuelve su googleEventId
 *   eliminarEvento()    → borra un evento (ignora 404 si ya no existe)
 *   listarEventosDelDia() → trae eventos del día para bloquear slots (cacheado 60s)
 *
 * El manejo de tokens (refresco automático) lo delega a oauth.js.
 */

import { google } from 'googleapis';

import { getValidAccessToken } from './oauth.js';

// Cache en memoria: "profesionalId:fecha" → { ts: Date.now(), data: [...] }
// Evita llamar a la API de Google en cada consulta de disponibilidad.
const cache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Crea un cliente de Calendar autenticado para el profesional.
 */
async function getCalendarClient(profesionalId) {
  const { accessToken, calendarId } = await getValidAccessToken(profesionalId);

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return {
    calendar: google.calendar({ version: 'v3', auth }),
    calendarId,
  };
}

/**
 * Crea un evento en el Google Calendar del profesional.
 *
 * @param {string} profesionalId
 * @param {{ inicio: string, fin: string, titulo: string, descripcion: string, colorId?: string }} params
 * @returns {Promise<string>} googleEventId
 */
export async function crearEvento(profesionalId, { inicio, fin, titulo, descripcion, colorId }) {
  const { calendar, calendarId } = await getCalendarClient(profesionalId);

  const event = {
    summary: titulo,
    description: descripcion,
    start: { dateTime: inicio, timeZone: 'America/Argentina/Buenos_Aires' },
    end: { dateTime: fin, timeZone: 'America/Argentina/Buenos_Aires' },
    ...(colorId && { colorId }),
  };

  const { data } = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });

  console.log(`📅 Evento creado en Google Calendar: ${data.id} (${titulo})`);
  return data.id;
}

/**
 * Elimina un evento del Google Calendar del profesional.
 * Si el evento ya no existe (404), lo ignora silenciosamente.
 *
 * @param {string} profesionalId
 * @param {string} googleEventId
 */
export async function eliminarEvento(profesionalId, googleEventId) {
  const { calendar, calendarId } = await getCalendarClient(profesionalId);

  try {
    await calendar.events.delete({ calendarId, eventId: googleEventId });
    console.log(`🗑️  Evento eliminado de Google Calendar: ${googleEventId}`);
  } catch (err) {
    if (err.code === 404 || err.status === 404) {
      console.log(`⚠️  Evento ${googleEventId} no encontrado en Google Calendar (ya fue borrado)`);
      return;
    }
    throw err;
  }
}

/**
 * Lista los eventos del día en el Google Calendar del profesional.
 * Resultado cacheado por 60 segundos para no saturar la API.
 *
 * @param {string} profesionalId
 * @param {string} fecha - formato 'YYYY-MM-DD'
 * @returns {Promise<Array<{ inicio: string, fin: string }>>}
 */
export async function listarEventosDelDia(profesionalId, fecha) {
  const cacheKey = `${profesionalId}:${fecha}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log(`⚡ Cache hit de Google Calendar para ${fecha} (profesional ${profesionalId})`);
    return cached.data;
  }

  const { calendar, calendarId } = await getCalendarClient(profesionalId);

  // timeMin y timeMax en UTC para cubrir el día completo en Buenos Aires (UTC-3)
  const timeMin = new Date(`${fecha}T00:00:00-03:00`).toISOString();
  const timeMax = new Date(`${fecha}T23:59:59-03:00`).toISOString();

  const { data } = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,   // expande eventos recurrentes
    orderBy: 'startTime',
  });

  const eventos = (data.items || [])
    .filter(e => e.start?.dateTime && e.end?.dateTime) // ignorar eventos de día completo
    .map(e => ({
      inicio: e.start.dateTime,
      fin: e.end.dateTime,
    }));

  cache.set(cacheKey, { ts: Date.now(), data: eventos });
  console.log(`📆 ${eventos.length} eventos de Google Calendar para ${fecha} (profesional ${profesionalId})`);

  return eventos;
}
