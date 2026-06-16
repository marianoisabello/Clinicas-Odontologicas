import { supabase } from '../lib/supabase.js';
import { addMinutes, format, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { crearEvento, eliminarEvento, listarEventosDelDia } from './google/calendar.js';

const TZ = process.env.CONSULTORIO_TZ || 'America/Argentina/Buenos_Aires';

/**
 * Devuelve los slots disponibles en una fecha para un tratamiento dado.
 * @param {string} fecha - 'yyyy-MM-dd'
 * @param {string} tratamientoId - UUID del tratamiento
 */
export async function obtenerDisponibilidad(fecha, tratamientoId) {
  // 1. Buscar duración del tratamiento
  const { data: tratamiento } = await supabase
    .from('tratamientos')
    .select('id, nombre, duracion_minutos')
    .eq('id', tratamientoId)
    .eq('activo', true)
    .single();

  if (!tratamiento) return { ok: false, error: 'Tratamiento no encontrado' };

  // 2. Verificar que haya al menos un profesional activo
  const { data: profesionales } = await supabase
    .from('profiles')
    .select('id')
    .eq('rol', 'odontologo')
    .eq('activo', true);

  if (!profesionales || profesionales.length === 0) {
    return { ok: false, error: 'No hay profesionales configurados en el sistema' };
  }

  const duracion = tratamiento.duracion_minutos;

  // 3. Horario laboral del día
  const diaSemana = toZonedTime(parseISO(fecha), TZ).getDay();
  let horaInicio, horaFin;
  if (diaSemana === 0) return { ok: true, slots: [] }; // domingo cerrado
  if (diaSemana === 6) { horaInicio = 9; horaFin = 13; }
  else { horaInicio = 9; horaFin = 20; }

  // 4. Obtener turnos ocupados del día (usando timestamps reales de la DB)
  const diaInicioUTC = new Date(`${fecha}T00:00:00-03:00`).toISOString();
  const diaFinUTC = new Date(`${fecha}T23:59:59-03:00`).toISOString();

  const { data: turnos } = await supabase
    .from('turnos')
    .select('fecha_hora_inicio, fecha_hora_fin')
    .gte('fecha_hora_inicio', diaInicioUTC)
    .lte('fecha_hora_inicio', diaFinUTC)
    .in('estado', ['pendiente', 'confirmado']);

  // 5. Generar slots cada 30 minutos y filtrar los que chocan
  const slots = [];
  for (let h = horaInicio; h < horaFin; h++) {
    for (const m of [0, 30]) {
      const slotInicioStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const slotInicio = fromZonedTime(`${fecha}T${slotInicioStr}:00`, TZ);
      const slotFin = addMinutes(slotInicio, duracion);

      // No ofrecer slots que se pasan del horario de cierre
      const slotFinLocal = toZonedTime(slotFin, TZ);
      if (
        slotFinLocal.getHours() > horaFin ||
        (slotFinLocal.getHours() === horaFin && slotFinLocal.getMinutes() > 0)
      ) continue;

      // No ofrecer slots en el pasado
      if (slotInicio < new Date()) continue;

      // Verificar que no choque con turno existente
      const choca = (turnos || []).some(t => {
        const tInicio = new Date(t.fecha_hora_inicio);
        const tFin = new Date(t.fecha_hora_fin);
        return slotInicio < tFin && slotFin > tInicio;
      });

      if (!choca) {
        slots.push({
          inicio: slotInicio.toISOString(),
          hora: slotInicioStr,
          inicio_legible: format(toZonedTime(slotInicio, TZ), 'HH:mm'),
        });
      }
    }
  }

  // 6. Bloquear slots que se superponen con eventos de Google Calendar
  try {
    const { data: gcCredsList } = await supabase
      .from('google_calendar_credentials')
      .select('profesional_id')
      .limit(1);

    const gcCreds = gcCredsList?.[0] ?? null;

    if (gcCreds) {
      const eventosGoogle = await listarEventosDelDia(gcCreds.profesional_id, fecha);
      if (eventosGoogle.length > 0) {
        const antes = slots.length;
        const filtrados = slots.filter(slot => {
          const si = new Date(slot.inicio);
          const sf = addMinutes(si, duracion);
          return !eventosGoogle.some(ev => {
            const ei = new Date(ev.inicio);
            const ef = new Date(ev.fin);
            return si < ef && sf > ei;
          });
        });
        console.log(`📅 Google Calendar bloqueó ${antes - filtrados.length} slots para ${fecha}`);
        slots.length = 0;
        slots.push(...filtrados);
      }
    }
  } catch (gcErr) {
    console.error(`⚠️  No se pudo consultar Google Calendar (${fecha}):`, gcErr.message);
  }

  return { ok: true, tratamiento: tratamiento.nombre, duracion, slots };
}

/**
 * Crea un turno en la DB y sincroniza con Google Calendar si está configurado.
 */
export async function crearTurno({ pacienteId, odontologoId, fechaHoraISO, tratamientoId, origen = 'whatsapp' }) {
  const { data: tratamiento } = await supabase
    .from('tratamientos')
    .select('duracion_minutos, nombre')
    .eq('id', tratamientoId)
    .single();

  if (!tratamiento) return { ok: false, error: 'Tratamiento inexistente' };

  const inicio = parseISO(fechaHoraISO);
  const fin = addMinutes(inicio, tratamiento.duracion_minutos);

  const { data, error } = await supabase
    .from('turnos')
    .insert({
      paciente_id: pacienteId,
      profesional_id: odontologoId,
      fecha_hora_inicio: inicio.toISOString(),
      fecha_hora_fin: fin.toISOString(),
      tratamiento: tratamiento.nombre,
      estado: 'pendiente',
      origen: origen === 'whatsapp' ? 'whatsapp' : 'manual',
      notas: `Agendado vía WhatsApp`,
    })
    .select()
    .single();

  if (error) return { ok: false, error: error.message };

  // ── SYNC GOOGLE CALENDAR (no-crítico) ──────────────────────────────────────
  try {
    const { data: gcCreds } = await supabase
      .from('google_calendar_credentials')
      .select('profesional_id')
      .eq('profesional_id', odontologoId)
      .single();

    if (gcCreds) {
      const { data: paciente } = await supabase
        .from('pacientes')
        .select('nombre, apellido')
        .eq('id', pacienteId)
        .single();

      const nombrePaciente = paciente
        ? `${paciente.nombre} ${paciente.apellido}`.trim()
        : 'Paciente';

      const googleEventId = await crearEvento(odontologoId, {
        inicio: inicio.toISOString(),
        fin: fin.toISOString(),
        titulo: `Turno: ${nombrePaciente} - ${tratamiento.nombre}`,
        descripcion: `Origen: WhatsApp\nPaciente ID: ${pacienteId}\nTurno ID: ${data.id}`,
        colorId: '7',
      });

      // Guardar el event ID en notas ya que la tabla no tiene columna google_event_id
      await supabase
        .from('turnos')
        .update({ notas: `Agendado vía WhatsApp | google_event_id: ${googleEventId}` })
        .eq('id', data.id);

      data.google_event_id = googleEventId;
    }
  } catch (gcErr) {
    console.error(`⚠️  No se pudo sincronizar con Google Calendar (turno ${data.id}):`, gcErr.message);
  }
  // ───────────────────────────────────────────────────────────────────────────

  return {
    ok: true,
    turno: data,
    legible: format(toZonedTime(inicio, TZ), "EEEE dd/MM 'a las' HH:mm"),
  };
}

export async function listarTurnosPaciente(pacienteId) {
  const hoy = new Date().toISOString();

  const { data } = await supabase
    .from('turnos')
    .select('id, fecha_hora_inicio, fecha_hora_fin, tratamiento, estado')
    .eq('paciente_id', pacienteId)
    .gte('fecha_hora_inicio', hoy)
    .order('fecha_hora_inicio', { ascending: true });

  return {
    ok: true,
    turnos: (data || []).map(t => ({
      id: t.id,
      fecha: format(toZonedTime(new Date(t.fecha_hora_inicio), TZ), 'yyyy-MM-dd'),
      hora: format(toZonedTime(new Date(t.fecha_hora_inicio), TZ), 'HH:mm'),
      tratamiento: t.tratamiento || 'Consulta',
      estado: t.estado,
    })),
  };
}

export async function cancelarTurno(turnoId) {
  // Buscar el google_event_id guardado en notas (workaround hasta agregar la columna)
  const { data: turno } = await supabase
    .from('turnos')
    .select('notas, profesional_id')
    .eq('id', turnoId)
    .single();

  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', turnoId);

  if (error) return { ok: false, error: error.message };

  // Intentar eliminar de Google Calendar si hay event ID en notas
  if (turno?.notas && turno?.profesional_id) {
    const match = turno.notas.match(/google_event_id: ([^\s|]+)/);
    if (match) {
      try {
        await eliminarEvento(turno.profesional_id, match[1]);
      } catch (gcErr) {
        console.error(`⚠️  No se pudo eliminar evento de Google Calendar (turno ${turnoId}):`, gcErr.message);
      }
    }
  }

  return { ok: true };
}
