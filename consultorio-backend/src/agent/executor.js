import {
  obtenerDisponibilidad,
  crearTurno,
  listarTurnosPaciente,
  cancelarTurno,
} from '../services/turnos.js';
import {
  listarTratamientos,
  listarProfesionales,
  actualizarPaciente,
  buscarPorTelefono,
} from '../services/pacientes.js';
import { supabase } from '../lib/supabase.js';

/**
 * Ejecuta una tool por nombre con los argumentos del modelo.
 * Recibe el contexto (paciente, conversación) para no exponerlo al modelo.
 */
export async function ejecutarTool(nombre, args, contexto) {
  const { paciente, conversacionId } = contexto;

  switch (nombre) {
    case 'listar_tratamientos_disponibles': {
      const tratamientos = await listarTratamientos();
      return {
        tratamientos: tratamientos.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          duracion_minutos: t.duracion_minutos,
          precio: t.precio,
        })),
      };
    }

    case 'listar_profesionales': {
      const profesionales = await listarProfesionales();
      return { profesionales };
    }

    case 'consultar_disponibilidad': {
      return await obtenerDisponibilidad(args.fecha, args.tratamiento_id, args.profesional_id ?? null);
    }

    case 'reservar_turno': {
      // Refrescar paciente desde DB por si registrar_datos_paciente fue llamado en este mismo loop
      const pacienteActual = await buscarPorTelefono(paciente.telefono);
      if (!pacienteActual?.apellido || pacienteActual.apellido === 'Sin registrar') {
        return {
          ok: false,
          error: 'El paciente no tiene datos registrados. Llamá primero a registrar_datos_paciente con nombre, apellido y obra_social.',
        };
      }
      let odontologoId = args.profesional_id || args.odontologo_id;
      if (!odontologoId) {
        const profs = await listarProfesionales();
        if (profs.length === 0) return { ok: false, error: 'No hay profesionales disponibles' };
        odontologoId = profs[0].id;
      }
      return await crearTurno({
        pacienteId: paciente.id,
        odontologoId,
        fechaHoraISO: args.fecha_hora_iso,
        tratamientoId: args.tratamiento_id,
        origen: 'whatsapp',
      });
    }

    case 'listar_mis_turnos': {
      return await listarTurnosPaciente(paciente.id);
    }

    case 'cancelar_turno': {
      // Verificar que el turno pertenezca al paciente
      const { data: turno } = await supabase
        .from('turnos')
        .select('paciente_id')
        .eq('id', args.turno_id)
        .single();
      if (!turno || turno.paciente_id !== paciente.id) {
        return { ok: false, error: 'Turno no encontrado o no pertenece al paciente' };
      }
      return await cancelarTurno(args.turno_id);
    }

    case 'registrar_datos_paciente': {
      const campos = {};
      for (const k of ['nombre', 'apellido', 'dni', 'obra_social', 'numero_afiliado']) {
        if (args[k]) campos[k] = args[k];
      }
      if (Object.keys(campos).length === 0) return { ok: false, error: 'No se enviaron campos' };
      return await actualizarPaciente(paciente.id, campos);
    }

    case 'derivar_a_humano': {
      await supabase
        .from('whatsapp_conversations')
        .update({ estado: 'esperando_respuesta' })
        .eq('id', conversacionId);
      return { ok: true, mensaje: 'Conversación derivada al equipo del consultorio' };
    }

    default:
      return { ok: false, error: `Tool desconocida: ${nombre}` };
  }
}
