/**
 * Bot de menú para WhatsApp — máquina de estados simple
 * Reemplaza el agente IA para el flujo inicial
 * La IA solo se usa en el último paso (agenda de turnos)
 */

import { supabase } from '../lib/supabase.js';
import { listarTratamientos, listarProfesionales } from './pacientes.js';

const MENU_PRINCIPAL = `Hola, bienvenido/a a *Sonrisa* 😊 ¿Cómo puedo ayudarte?

1️⃣ Turnos
2️⃣ Horarios
`;

const HORARIOS = `Nuestro horario de atención es:\n📅 *Lunes a viernes de 9 a 18hs*`;

/**
 * Normaliza el input del usuario: quita espacios, convierte emojis numéricos a dígitos
 */
function normalizarInput(texto) {
  return texto
    .trim()
    .replace('1️⃣', '1').replace('2️⃣', '2').replace('3️⃣', '3')
    .replace('4️⃣', '4').replace('5️⃣', '5').replace('6️⃣', '6')
    .replace('7️⃣', '7').replace('8️⃣', '8').replace('9️⃣', '9')
    .replace('0️⃣', '0');
}

function buildListaServicios(servicios) {
  const items = servicios.map((s, i) => `${i + 1}. ${s.nombre}`).join('\n');
  return `¿Qué servicio necesitás?\n\n${items}\n\n0. Volver al menú principal`;
}

function buildListaProfesionales(profesionales) {
  const items = profesionales.map((p, i) => `${i + 1}. ${p.nombre}${p.especialidad ? ` — ${p.especialidad}` : ''}`).join('\n');
  return `¿Con qué profesional preferís atenderte?\n\n${items}\n\n0. Volver atrás`;
}

/**
 * Procesa el mensaje entrante según el estado actual del bot.
 * Devuelve { respuesta, usarIA, contexto }
 *   - respuesta: string a enviar (null si usarIA = true)
 *   - usarIA: true cuando el agente IA debe tomar el control
 *   - contexto: datos acumulados (servicio, profesional elegidos)
 */
export async function procesarMenuBot(conversacionId, mensajeUsuario) {
  const { data: conv } = await supabase
    .from('conversaciones_whatsapp')
    .select('bot_estado, bot_contexto')
    .eq('id', conversacionId)
    .single();

  const estado = conv?.bot_estado || 'inicio';
  const contexto = conv?.bot_contexto || {};
  const input = normalizarInput(mensajeUsuario);

  let respuesta = null;
  let nuevoEstado = estado;
  let nuevoContexto = contexto;
  let usarIA = false;

  // El trigger phrase reinicia el bot desde cualquier estado
  const triggerPhrase = process.env.BOT_TRIGGER_PHRASE || 'Hola, quiero sacar un turno';
  if (input.toLowerCase() === normalizarInput(triggerPhrase).toLowerCase()) {
    await supabase
      .from('conversaciones_whatsapp')
      .update({ bot_estado: 'menu_principal', bot_contexto: {} })
      .eq('id', conversacionId);
    return { respuesta: MENU_PRINCIPAL, usarIA: false, contexto: {} };
  }

  switch (estado) {
    case 'inicio': {
      // Si llega acá, el mensaje no era el trigger phrase → silencio
      return { respuesta: null, usarIA: false, contexto };
    }

    case 'menu_principal': {
      if (input === '1') {
        const servicios = await listarTratamientos();
        if (!servicios.length) {
          respuesta = 'No hay servicios disponibles en este momento. Por favor, contactanos directamente.';
          nuevoEstado = 'menu_principal';
        } else {
          respuesta = buildListaServicios(servicios);
          nuevoEstado = 'menu_servicios';
          nuevoContexto = { servicios };
        }
      } else if (input === '2') {
        respuesta = `${HORARIOS}\n\n¿Puedo ayudarte con algo más?\n\n${MENU_PRINCIPAL}`;
        nuevoEstado = 'menu_principal';
      } else {
        respuesta = MENU_PRINCIPAL;
        nuevoEstado = 'menu_principal';
      }
      break;
    }

    case 'menu_servicios': {
      if (input === '0') {
        respuesta = MENU_PRINCIPAL;
        nuevoEstado = 'menu_principal';
        nuevoContexto = {};
      } else {
        const servicios = contexto.servicios || [];
        const idx = parseInt(input) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < servicios.length) {
          const servicio = servicios[idx];
          const profesionales = await listarProfesionales();
          if (!profesionales.length) {
            respuesta = 'No hay profesionales disponibles. Por favor, contactanos directamente.\n\n' + MENU_PRINCIPAL;
            nuevoEstado = 'menu_principal';
            nuevoContexto = {};
          } else {
            respuesta = buildListaProfesionales(profesionales);
            nuevoEstado = 'menu_profesionales';
            nuevoContexto = { ...nuevoContexto, servicio, profesionales };
          }
        } else {
          respuesta = buildListaServicios(contexto.servicios || []);
        }
      }
      break;
    }

    case 'menu_profesionales': {
      if (input === '0') {
        const servicios = contexto.servicios || [];
        respuesta = buildListaServicios(servicios);
        nuevoEstado = 'menu_servicios';
        nuevoContexto = { servicios };
      } else {
        const profesionales = contexto.profesionales || [];
        const idx = parseInt(input) - 1;
        if (!isNaN(idx) && idx >= 0 && idx < profesionales.length) {
          const profesional = profesionales[idx];
          nuevoEstado = 'agenda_ia';
          nuevoContexto = { ...nuevoContexto, profesional };
          usarIA = true;
          respuesta = null;
        } else {
          respuesta = buildListaProfesionales(contexto.profesionales || []);
        }
      }
      break;
    }

    case 'agenda_ia': {
      if (input === '0') {
        respuesta = MENU_PRINCIPAL;
        nuevoEstado = 'menu_principal';
        nuevoContexto = {};
      } else {
        usarIA = true;
        respuesta = null;
      }
      break;
    }

    default: {
      respuesta = MENU_PRINCIPAL;
      nuevoEstado = 'menu_principal';
      nuevoContexto = {};
    }
  }

  await supabase
    .from('conversaciones_whatsapp')
    .update({ bot_estado: nuevoEstado, bot_contexto: nuevoContexto })
    .eq('id', conversacionId);

  return { respuesta, usarIA, contexto: nuevoContexto };
}
