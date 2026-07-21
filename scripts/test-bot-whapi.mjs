/**
 * Batería de pruebas del bot WhatsApp vía webhook Whapi + DB.
 * Uso: node scripts/test-bot-whapi.mjs [telefono]
 * Default telefono: +5491199000011 (solo simulación)
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'consultorio-backend/.env' });
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.TEST_BASE_URL || 'https://clinicas-odontologicas.vercel.app';
const TEL = process.argv[2] || '+5491199000011';
const TEL_WHAPI = TEL.replace('+', '') + '@s.whatsapp.net';

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const results = [];
function ok(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function reset() {
  const variantes = [TEL, TEL.replace('+', '')];
  const { data: convs } = await sb.from('conversaciones_whatsapp').select('id').in('telefono', variantes);
  for (const c of convs || []) {
    await sb.from('mensajes_whatsapp').delete().eq('conversacion_id', c.id);
  }
  await sb.from('conversaciones_whatsapp').delete().in('telefono', variantes);
}

async function sendWhapiWebhook(texto, { fromMe = false } = {}) {
  const body = {
    messages: [
      {
        id: `test-${Date.now()}`,
        type: 'text',
        from_me: fromMe,
        from: TEL_WHAPI,
        chat_id: TEL_WHAPI,
        timestamp: Math.floor(Date.now() / 1000),
        text: { body: texto },
      },
    ],
  };
  const res = await fetch(`${BASE}/webhook/whapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

async function getConv() {
  const variantes = [TEL, TEL.replace('+', '')];
  const { data } = await sb
    .from('conversaciones_whatsapp')
    .select('*')
    .in('telefono', variantes)
    .order('ultima_actividad', { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

async function getMsgs(convId) {
  const { data } = await sb
    .from('mensajes_whatsapp')
    .select('direccion, contenido, procesado_por_ia, timestamp')
    .eq('conversacion_id', convId)
    .order('timestamp', { ascending: true });
  return data || [];
}

async function lastSaliente(convId) {
  const msgs = await getMsgs(convId);
  return [...msgs].reverse().find((m) => m.direccion === 'saliente') || null;
}

async function testAiEndpoint() {
  const res = await fetch(`${BASE}/test/mensaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telefono: TEL,
      mensaje: '¿Qué tratamientos tienen?',
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

console.log(`\n🧪 Bot test → ${BASE}`);
console.log(`📱 Teléfono: ${TEL}\n`);

// 0) Health
const health = await (await fetch(`${BASE}/health`)).json();
ok('Health responde', health.ok === true, JSON.stringify(health));

await reset();
ok('Reset conversación', true);

await sleep(500);

// 1) Mensaje sin trigger → silencio
{
  const r = await sendWhapiWebhook('hola');
  await sleep(2500);
  const conv = await getConv();
  const msgs = conv ? await getMsgs(conv.id) : [];
  const salientes = msgs.filter((m) => m.direccion === 'saliente');
  ok('Webhook status 200 (hola)', r.status === 200, `status=${r.status}`);
  ok('Sin trigger: no responde (o no crea saliente)', salientes.length === 0, `salientes=${salientes.length}, estado=${conv?.bot_estado}`);
  await reset();
  await sleep(300);
}

// 2) Trigger → menú
{
  const r = await sendWhapiWebhook('Hola, quiero sacar un turno');
  await sleep(4000);
  const conv = await getConv();
  const out = conv ? await lastSaliente(conv.id) : null;
  ok('Trigger: webhook 200', r.status === 200);
  ok('Trigger: bot_estado = menu_principal', conv?.bot_estado === 'menu_principal', `estado=${conv?.bot_estado}`);
  ok('Trigger: responde menú con Turnos/Horarios', !!(out?.contenido?.includes('Turnos') && out?.contenido?.includes('Horarios')), out?.contenido?.slice(0, 80));
}

// 3) Opción 2 → horarios
{
  const r = await sendWhapiWebhook('2');
  await sleep(4000);
  const conv = await getConv();
  const out = await lastSaliente(conv.id);
  ok('Opción 2: webhook 200', r.status === 200);
  ok('Opción 2: menciona horario', /9\s*a\s*18|horario/i.test(out?.contenido || ''), out?.contenido?.slice(0, 100));
  ok('Opción 2: sigue en menu_principal', conv?.bot_estado === 'menu_principal', `estado=${conv?.bot_estado}`);
}

// 4) Opción inválida en menú → vuelve a inicio (comportamiento actual)
{
  const r = await sendWhapiWebhook('xyz');
  await sleep(3000);
  const conv = await getConv();
  const msgsBefore = await getMsgs(conv.id);
  const salientesAntes = msgsBefore.filter((m) => m.direccion === 'saliente').length;
  ok('Opción inválida: webhook 200', r.status === 200);
  ok('Opción inválida: bot_estado = inicio', conv?.bot_estado === 'inicio', `estado=${conv?.bot_estado}`);
  // no nueva saliente esperada
  const msgsAfter = await getMsgs(conv.id);
  const salientesDespues = msgsAfter.filter((m) => m.direccion === 'saliente').length;
  ok('Opción inválida: no manda respuesta', salientesDespues === salientesAntes, `${salientesAntes}→${salientesDespues}`);
}

// Re-activar y probar opción 1 (IA)
await reset();
await sleep(300);
await sendWhapiWebhook('Hola, quiero sacar un turno');
await sleep(4000);

{
  const r = await sendWhapiWebhook('1');
  await sleep(12000); // IA puede tardar
  const conv = await getConv();
  const out = await lastSaliente(conv.id);
  ok('Opción 1: webhook 200', r.status === 200);
  ok('Opción 1: bot_estado = agenda_ia', conv?.bot_estado === 'agenda_ia', `estado=${conv?.bot_estado}`);
  ok('Opción 1: IA responde algo', !!(out?.contenido && out.contenido.length > 5), out?.contenido?.slice(0, 120));
  ok('Opción 1: marcado procesado_por_ia', out?.procesado_por_ia === true, `ia=${out?.procesado_por_ia}`);
}

// 5) Continuación IA
{
  const r = await sendWhapiWebhook('Quiero una limpieza dental');
  await sleep(12000);
  const conv = await getConv();
  const out = await lastSaliente(conv.id);
  ok('IA follow-up: webhook 200', r.status === 200);
  ok('IA follow-up: responde', !!(out?.contenido && out.contenido.length > 5), out?.contenido?.slice(0, 120));
}

// 6) Endpoint /test/mensaje (bypass menú)
{
  await reset();
  await sleep(300);
  const { status, data } = await testAiEndpoint();
  ok('/test/mensaje status 200', status === 200, `status=${status}`);
  ok('/test/mensaje tiene respuesta', !!(data.respuesta && data.respuesta.length > 5), data.respuesta?.slice(0, 100) || data.error);
}

// 7) from_me debe ignorarse
{
  await reset();
  await sleep(300);
  await sendWhapiWebhook('Hola, quiero sacar un turno', { fromMe: true });
  await sleep(2500);
  const conv = await getConv();
  ok('from_me: no crea conversación (o sin msgs)', !conv || (await getMsgs(conv.id)).length === 0, `conv=${!!conv}`);
}

// Resumen
const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass);
console.log(`\n📊 Resultado: ${passed}/${results.length} OK`);
if (failed.length) {
  console.log('\nFallos:');
  for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
