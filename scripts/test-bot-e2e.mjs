/**
 * Batería ampliada del bot WhatsApp (prod)
 * Uso: node scripts/test-bot-e2e.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'consultorio-backend/.env' });
import { createClient } from '@supabase/supabase-js';

const BASE = process.env.TEST_BASE_URL || 'https://clinicas-odontologicas.vercel.app';
const TEL = process.argv[2] || '+5491144390930';
const FROM = TEL.replace('+', '') + '@s.whatsapp.net';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const results = [];
const ok = (n, p, d = '') => {
  results.push({ n, p, d });
  console.log(`${p ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`);
};

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function send(text, waitMs = 9000) {
  const body = {
    messages: [{
      id: `t${Date.now()}${Math.random().toString(16).slice(2)}`,
      type: 'text',
      from_me: false,
      from: FROM,
      chat_id: FROM,
      timestamp: Math.floor(Date.now() / 1000),
      text: { body: text },
    }],
  };
  const r = await fetch(`${BASE}/webhook/whapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  console.log(`→ ${JSON.stringify(text)} HTTP ${r.status}`);
  await sleep(waitMs);
  return r.status;
}

async function getConv() {
  const { data } = await sb
    .from('conversaciones_whatsapp')
    .select('*')
    .in('telefono', [TEL, TEL.replace('+', '')])
    .order('ultima_actividad', { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

async function lastOut() {
  const conv = await getConv();
  if (!conv) return { conv: null, out: null };
  const { data: msgs } = await sb
    .from('mensajes_whatsapp')
    .select('*')
    .eq('conversacion_id', conv.id)
    .order('timestamp', { ascending: false })
    .limit(5);
  const out = (msgs || []).find((m) => m.direccion === 'saliente') || null;
  return { conv, out, msgs: msgs || [] };
}

async function resetEstado() {
  await sb.from('conversaciones_whatsapp')
    .update({ bot_estado: 'inicio', bot_contexto: {} })
    .in('telefono', [TEL, TEL.replace('+', '')]);
}

console.log(`\n🧪 E2E ampliado → ${BASE}\n📱 ${TEL}\n`);

const health = await (await fetch(`${BASE}/health`)).json();
ok('Health whapi', health.provider === 'whapi' && health.ok, JSON.stringify(health));

await resetEstado();

// --- Menú ---
await send('hola', 4000);
{
  const { conv, out } = await lastOut();
  ok('Silencio sin trigger', conv?.bot_estado === 'inicio' || !out?.contenido?.includes('Turnos'), `estado=${conv?.bot_estado}`);
}

await send('Hola, quiero sacar un turno');
{
  const { conv, out } = await lastOut();
  ok('Trigger menú', conv?.bot_estado === 'menu_principal' && out?.contenido?.includes('Turnos'), (out?.contenido || 'SIN').slice(0, 80));
}

await send('3️⃣'); // emoji keycap 3 inválido en menú
{
  const { conv, out } = await lastOut();
  ok('Emoji 3 inválido → re-menú', conv?.bot_estado === 'menu_principal' && /entend|Turnos/i.test(out?.contenido || ''), (out?.contenido || 'SIN').slice(0, 80));
}

await send('horarios');
{
  const { conv, out } = await lastOut();
  ok('Texto "horarios"', /horario|9\s*a|Viernes/i.test(out?.contenido || ''), (out?.contenido || 'SIN').slice(0, 100));
  ok('Sigue en menú tras horarios', conv?.bot_estado === 'menu_principal', `estado=${conv?.bot_estado}`);
}

await send('1️⃣');
{
  const { conv, out } = await lastOut();
  ok('Emoji 1 → agenda_ia', conv?.bot_estado === 'agenda_ia', `estado=${conv?.bot_estado}`);
  ok('Bienvenida sin IA', /tratamiento/i.test(out?.contenido || '') && !out?.procesado_por_ia, (out?.contenido || 'SIN').slice(0, 100));
}

await send('menu');
{
  const { conv, out } = await lastOut();
  ok('Volver con "menu"', conv?.bot_estado === 'menu_principal' && out?.contenido?.includes('Turnos'), `estado=${conv?.bot_estado}`);
}

await send('1');
await send('blanqueamiento', 14000);
{
  const { conv, out } = await lastOut();
  ok('IA blanqueamiento responde', !!(out?.contenido && out.contenido.length > 15), (out?.contenido || 'SIN').slice(0, 140));
  ok('IA marcada', out?.procesado_por_ia === true, `ia=${out?.procesado_por_ia}`);
  ok('Sigue agenda_ia', conv?.bot_estado === 'agenda_ia', `estado=${conv?.bot_estado}`);
}

await send('cualquiera', 14000);
{
  const { out } = await lastOut();
  ok('IA pide fecha/profesional', /fecha|día|dia|horario|profesional|cuándo|cuando/i.test(out?.contenido || ''), (out?.contenido || 'SIN').slice(0, 140));
}

await send('el viernes que viene', 16000);
{
  const { out } = await lastOut();
  ok('IA muestra disponibilidad o pide datos', /horario|disponib|nombre|apellido|obra|confir|hora|1\./i.test(out?.contenido || ''), (out?.contenido || 'SIN').slice(0, 160));
}

await send('gracias');
{
  const { conv, out } = await lastOut();
  ok('Cierre gracias → inicio', conv?.bot_estado === 'inicio', `estado=${conv?.bot_estado}`);
  ok('Mensaje de cierre', /turno|Hola/i.test(out?.contenido || ''), (out?.contenido || 'SIN').slice(0, 100));
}

// Re-trigger desde inicio
await send('hola quiero sacar un turno'); // sin coma
{
  const { conv, out } = await lastOut();
  ok('Trigger sin coma', conv?.bot_estado === 'menu_principal' && out?.contenido?.includes('Turnos'), `estado=${conv?.bot_estado}`);
}

const pass = results.filter((r) => r.p).length;
console.log(`\n📊 ${pass}/${results.length}`);
for (const f of results.filter((r) => !r.p)) console.log(' FAIL:', f.n, '—', f.d);
process.exit(pass === results.length ? 0 : 1);
