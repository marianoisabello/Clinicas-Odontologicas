import { supabase } from '../lib/supabase.js';
import { addMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

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
  const { error } = await supabase
    .from('turnos')
    .update({ estado: 'cancelado' })
    .eq('id', turnoId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
