import { supabase } from '../lib/supabase.js';
import { addMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { crearEvento, eliminarEvento, listarEventosDelDia } from './google/calendar.js';

const TZ = process.env.CONSULTORIO_TZ || 'America/Argentina/Buenos_Aires';

/**
 * Devuelve los slots disponibles en una fecha para un tratamiento dado.
 * fecha en formato 'yyyy-MM-dd' (interpretada en TZ Buenos Aires)
 */
export async function obtenerDisponibilidad(fecha, tratamientoId) {
  // 1. Buscar duración del tratamiento
  const { data: tratamiento, error: errTrat } = await supabase
    .from('tratamientos')
    .select('id, nombre, duracion_minutos')
    .eq('id', tratamientoId)
    .eq('activo', true)
    .single();

  if (errTrat || !tratamiento) {
    return { ok: false, error: 'Tratamiento no encontrado' };
  }

  const duracion = tratamiento.duracion_minutos;

  // 2. Definir horario laboral del día (simplificado: hardcodeado)
  // En producción esto sale de la tabla configuracion
  const diaSemana = toZonedTime(parseISO(fecha), TZ).getDay();
  let horaInicio, horaFin;

  if (diaSemana === 0) return { ok: true, slots: [] }; // domingo cerrado
  if (diaSemana === 6) {
    horaInicio = 9;
    horaFin = 13;
  } else {
    horaInicio = 9;
    horaFin = 20;
  }

  // 3. Obtener turnos ocupados de ese día
  const inicioDia = fromZonedTime(`${fecha}T00:00:00`, TZ);
  const finDia = fromZonedTime(`${fecha}T23:59:59`, TZ);

  const { data: turnos } = await supabase
    .from('turnos')
    .select('fecha_hora_inicio, fecha_hora_fin, profesional_id')
    .gte('fecha_hora_inicio', inicioDia.toISOString())
    .lte('fecha_hora_inicio', finDia.toISOString())
    .in('estado', ['pendiente', 'confirmado']);

  // 4. Generar slots cada 30 minutos y filtrar los que chocan
  const slots = [];
  for (let h = horaInicio; h < horaFin; h++) {
    for (const m of [0, 30]) {
      const slotInicio = fromZonedTime(
        `${fecha}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
        TZ
      );
      const slotFin = addMinutes(slotInicio, duracion);

      // No ofrecer slots que se pasan del horario de cierre
      const slotFinLocal = toZonedTime(slotFin, TZ);
      if (slotFinLocal.getHours() > horaFin ||
          (slotFinLocal.getHours() === horaFin && slotFinLocal.getMinutes() > 0)) {
        continue;
      }

      // No ofrecer slots en el pasado
      if (slotInicio < new Date()) continue;

      // Verificar que no choque con turno existente
      const choca = (turnos || []).some((t) => {
        const tInicio = parseISO(t.fecha_hora_inicio);
        const tFin = parseISO(t.fecha_hora_fin);
        return slotInicio < tFin && slotFin > tInicio;
      });

      if (!choca) {
        slots.push({
          inicio: slotInicio.toISOString(),
          inicio_legible: format(toZonedTime(slotInicio, TZ), 'HH:mm'),
        });
      }
    }
  }

  // 5. Bloquear slots que se superponen con eventos de Google Calendar del profesional.
  // obtenerDisponibilidad() no recibe profesionalId todavía (diseño actual es mono-profesional).
  // Tomamos el primer profesional con Google conectado. Cuando haya selección de profesional
  // en el flujo del agente, este paso recibirá el profesionalId directamente.
  // Si Google falla por cualquier motivo, se usan solo los slots de Supabase (degradación elegante).
  try {
    const { data: gcCreds } = await supabase
      .from('google_calendar_credentials')
      .select('profesional_id')
      .limit(1)
      .single();

    if (gcCreds) {
      const eventosGoogle = await listarEventosDelDia(gcCreds.profesional_id, fecha);

      if (eventosGoogle.length > 0) {
        const slotsAntesGoogle = slots.length;

        // Filtrar slots que se superponen con cualquier evento de Google Calendar
        const slotsFiltrados = slots.filter(slot => {
          const slotInicio = new Date(slot.inicio);
          const slotFin = addMinutes(slotInicio, duracion);

          return !eventosGoogle.some(ev => {
            const evInicio = new Date(ev.inicio);
            const evFin = new Date(ev.fin);
            return slotInicio < evFin && slotFin > evInicio;
          });
        });

        console.log(
          `📅 Google Calendar bloqueó ${slotsAntesGoogle - slotsFiltrados.length} slots para ${fecha}`
        );

        slots.length = 0;
        slots.push(...slotsFiltrados);
      }
    }
  } catch (gcErr) {
    console.error(`⚠️  No se pudo consultar Google Calendar para disponibilidad (${fecha}):`, gcErr.message);
  }

  return { ok: true, tratamiento: tratamiento.nombre, duracion, slots };
}

/**
 * Crea un turno. Hace doble verificación de disponibilidad para evitar race conditions.
 */
export async function crearTurno({ pacienteId, profesionalId, fechaHoraISO, tratamientoId, origen = 'whatsapp' }) {
  const { data: tratamiento } = await supabase
    .from('tratamientos')
    .select('duracion_minutos, nombre')
    .eq('id', tratamientoId)
    .single();

  if (!tratamiento) return { ok: false, error: 'Tratamiento inexistente' };

  const inicio = parseISO(fechaHoraISO);
  const fin = addMinutes(inicio, tratamiento.duracion_minutos);

  // Verificar conflictos antes de insertar
  const { data: conflictos } = await supabase
    .from('turnos')
    .select('id')
    .in('estado', ['pendiente', 'confirmado'])
    .lt('fecha_hora_inicio', fin.toISOString())
    .gt('fecha_hora_fin', inicio.toISOString());

  if (conflictos && conflictos.length > 0) {
    return { ok: false, error: 'El horario ya no está disponible' };
  }

  const { data, error } = await supabase
    .from('turnos')
    .insert({
      paciente_id: pacienteId,
      profesional_id: profesionalId,
      fecha_hora_inicio: inicio.toISOString(),
      fecha_hora_fin: fin.toISOString(),
      tratamiento: tratamiento.nombre,
      estado: 'pendiente',
      origen,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  // ── SYNC GOOGLE CALENDAR (no-crítico) ──────────────────────────────────────
  // Si falla, el turno en Supabase sigue válido. Solo se loguea el error.
  try {
    // Obtener nombre del paciente para el título del evento
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('nombre, apellido')
      .eq('id', pacienteId)
      .single();

    const nombrePaciente = paciente
      ? `${paciente.nombre} ${paciente.apellido}`.trim()
      : 'Paciente';

    // Verificar si el profesional tiene Google Calendar conectado
    const { data: gcCreds } = await supabase
      .from('google_calendar_credentials')
      .select('profesional_id')
      .eq('profesional_id', profesionalId)
      .single();

    if (gcCreds) {
      // colorId: 7 (Peacock/azul) para WhatsApp, 10 (Basil/verde) para manual/web
      const colorId = origen === 'whatsapp' ? '7' : '10';

      const googleEventId = await crearEvento(profesionalId, {
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        titulo: `Turno: ${nombrePaciente} - ${tratamiento.nombre}`,
        descripcion: `Origen: ${origen}\nPaciente ID: ${pacienteId}\nTurno ID: ${data.id}`,
        colorId,
      });

      // Guardar el googleEventId en el turno para poder borrarlo al cancelar
      await supabase
        .from('turnos')
        .update({ google_event_id: googleEventId })
        .eq('id', data.id);

      data.google_event_id = googleEventId;
    }
  } catch (gcErr) {
    console.error(`⚠️  No se pudo sincronizar turno ${data.id} con Google Calendar:`, gcErr.message);
  }
  // ───────────────────────────────────────────────────────────────────────────

  return {
    ok: true,
    turno: data,
    legible: format(toZonedTime(inicio, TZ), "EEEE dd/MM 'a las' HH:mm"),
  };
}

export async function listarTurnosPaciente(pacienteId) {
  const { data } = await supabase
    .from('turnos')
    .select('id, fecha_hora_inicio, tratamiento, estado')
    .eq('paciente_id', pacienteId)
    .gte('fecha_hora_inicio', new Date().toISOString())
    .order('fecha_hora_inicio', { ascending: true });

  return { ok: true, turnos: data || [] };
}

export async function cancelarTurno(turnoId) {
  // Leer datos del turno antes de cancelar (necesitamos google_event_id y profesional_id)
  const { data: turno } = await supabase
    .from('turnos')
    .select('google_event_id, profesional_id')
    .eq('id', turnoId)
    .single();

  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', turnoId);

  if (error) return { ok: false, error: error.message };

  // ── SYNC GOOGLE CALENDAR (no-crítico) ──────────────────────────────────────
  if (turno?.google_event_id && turno?.profesional_id) {
    try {
      await eliminarEvento(turno.profesional_id, turno.google_event_id);
    } catch (gcErr) {
      console.error(`⚠️  No se pudo eliminar evento de Google Calendar (turno ${turnoId}):`, gcErr.message);
    }
  }
  // ───────────────────────────────────────────────────────────────────────────

  return { ok: true };
}
