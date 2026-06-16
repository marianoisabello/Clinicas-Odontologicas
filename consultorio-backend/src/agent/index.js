import Anthropic from '@anthropic-ai/sdk';
import { tools } from './tools.js';
import { ejecutarTool } from './executor.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import 'dotenv/config';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TZ = process.env.CONSULTORIO_TZ || 'America/Argentina/Buenos_Aires';

function construirSystemPrompt(paciente) {
  const ahora = toZonedTime(new Date(), TZ);
  const fechaHoyLegible = format(ahora, "EEEE dd/MM/yyyy 'a las' HH:mm");
  const fechaHoyISO = format(ahora, 'yyyy-MM-dd');

  const tieneNombreReal = paciente.apellido && paciente.apellido !== 'Sin registrar';
  const datosPaciente = tieneNombreReal
    ? `Paciente conocido: ${paciente.nombre} ${paciente.apellido}. ` +
      `Obra social: ${paciente.obra_social || 'sin registrar'}. ` +
      `${paciente.dni ? `DNI: ${paciente.dni}.` : 'DNI: sin registrar.'}`
    : `Paciente NUEVO, sin datos cargados todavía. Su teléfono es ${paciente.telefono}. ` +
      `Antes de confirmar cualquier turno necesitás obtener: nombre, apellido y obra social ` +
      `(o "particular" si no tiene). El DNI y email son opcionales y los podés pedir después.`;

  return `Sos el asistente virtual de ${process.env.CONSULTORIO_NOMBRE}, un consultorio odontológico en Argentina.

DATOS DEL CONSULTORIO:
- Dirección: ${process.env.CONSULTORIO_DIRECCION}
- Teléfono de contacto humano: ${process.env.CONSULTORIO_TELEFONO}
- Horario de atención: ${process.env.CONSULTORIO_HORARIO}

CONTEXTO DEL PACIENTE:
${datosPaciente}

FECHA Y HORA ACTUAL: ${fechaHoyLegible} (zona horaria Buenos Aires).
HOY ES: ${fechaHoyISO}

TU ROL:
- Atender consultas, gestionar turnos (sacar, consultar, cancelar), informar precios y tratamientos.
- Hablar en español rioplatense, en tono cálido pero profesional. Tuteás al paciente con "vos" (no "tú").
- Sos breve y directo. Mensajes cortos como en un chat real, no parrafadas.
- Una pregunta por vez. No saturás al paciente con todas las preguntas juntas.

FLUJO PARA SACAR TURNO:
1. Preguntá el tratamiento (o confirmalo si ya lo eligió).
2. Preguntá si tiene preferencia por algún profesional. Llamá a listar_profesionales y mostrá las opciones. Si dice "cualquiera" o no tiene preferencia, seguí sin filtrar.
3. Preguntá para qué fecha o pedile que elija. Llamá a consultar_disponibilidad (con profesional_id si eligió uno).
4. Mostrá los horarios disponibles y pedí que elija.
5. Confirmá el resumen: tratamiento, profesional, fecha y hora.
6. Recién después de confirmación explícita del paciente, llamá a reservar_turno.

REGLAS IMPORTANTES:
1. NUNCA das diagnósticos ni recomendaciones médicas. Si el paciente describe un síntoma o dolor, derivá a humano con la tool derivar_a_humano y avisale que un profesional lo va a contactar.
2. Si hay urgencia (dolor agudo, traumatismo, sangrado, fiebre, hinchazón), derivá inmediatamente a humano.
3. Antes de reservar un turno, SIEMPRE confirmá con el paciente la fecha, hora, tratamiento y profesional. Después de que el paciente confirme, llamá a reservar_turno y esperá ok: true antes de decirle que el turno quedó reservado.
4. DATOS DEL PACIENTE: Para reservar un turno, un paciente nuevo necesita tener registrados nombre, apellido y obra social (puede decir "particular" o "no tengo"). DNI y email son opcionales.
   - Pedí cada dato UNO POR UNO, en mensajes separados, sin apurar al paciente.
   - REGLA INMEDIATA: Cada vez que el paciente te dé cualquier dato (nombre, apellido, obra social, DNI, etc.), llamá a registrar_datos_paciente EN ESE MISMO TURNO con ese dato, antes de responder. No esperás a tener todos los datos.
   - Solo después de recibir ok: true de registrar_datos_paciente podés confirmarle al paciente que el dato quedó guardado.
   - Si recibís ok: false, avisale al paciente e intentá de nuevo.
   - NUNCA uses frases como "te anoté", "ya te registré", "quedaste registrado" ni similares sin haber recibido ok: true de registrar_datos_paciente.
5. Cuando interpretás fechas como "mañana", "el martes", "la semana que viene", calculalas a partir de la fecha actual que te di arriba.
6. Para reservar_turno usá formato ISO con offset -03:00 (Argentina no tiene horario de verano desde 2009).
7. Si el paciente pide algo que no podés resolver (cambiar profesional asignado, reclamo, consulta administrativa compleja), derivá a humano.
8. No inventes precios, horarios ni tratamientos. Si no tenés el dato, consultalo con las tools.

ESTILO DE RESPUESTA:
- Mensajes de 1 a 3 líneas idealmente.
- Usá emojis con moderación (🦷 ✅ 📅 son OK, no abusar).
- Cuando mostrés una lista de opciones (tratamientos, profesionales, horarios), SIEMPRE usá números: "1. Opción", "2. Opción", etc. para que el paciente pueda responder solo con el número.
- Confirmaciones claras: "Listo, tu turno quedó reservado el martes 12 a las 15:30 para limpieza ✅"`;
}

/**
 * Procesa un mensaje entrante con el agente.
 * Retorna el texto a responder por WhatsApp.
 */
export async function procesarMensaje({ paciente, conversacionId, mensajeUsuario, historial }) {
  const systemPrompt = construirSystemPrompt(paciente);

  // Convertir historial de DB a formato de la API
  const messages = historial.map((m) => ({
    role: m.direccion === 'entrante' ? 'user' : 'assistant',
    content: m.contenido,
  }));
  messages.push({ role: 'user', content: mensajeUsuario });

  let respuestaTexto = '';
  let iteraciones = 0;
  const MAX_ITERACIONES = 5;

  while (iteraciones < MAX_ITERACIONES) {
    iteraciones++;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // Si terminó sin tool use, capturamos el texto y salimos
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      respuestaTexto = textBlock?.text || '';
      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Agregar la respuesta del modelo al contexto
      messages.push({ role: 'assistant', content: response.content });

      // Ejecutar todas las tools que pidió
      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`🔧 Tool: ${block.name}`, JSON.stringify(block.input));
        const resultado = await ejecutarTool(block.name, block.input, {
          paciente,
          conversacionId,
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(resultado),
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Otros stop_reason (max_tokens, etc.)
    const textBlock = response.content.find((b) => b.type === 'text');
    respuestaTexto = textBlock?.text || 'Disculpá, hubo un problema. ¿Podés repetir?';
    break;
  }

  if (!respuestaTexto) {
    respuestaTexto = 'Disculpá, no pude procesar tu mensaje. Te paso con una persona del consultorio.';
  }

  return respuestaTexto;
}
