/**
 * Job que se ejecuta cada hora y envía recordatorios de turnos.
 * Para correr en producción: configurar como cron job o usar un scheduler (Render Cron, Railway cron, etc.)
 *
 * Lógica:
 * - Busca turnos confirmados o pendientes que sean en aproximadamente 24hs (entre 23 y 25 horas).
 * - Envía un recordatorio por WhatsApp solicitando confirmación.
 * - Marca el turno con un flag para no duplicar.
 *
 * IMPORTANTE: Para mensajes proactivos fuera de la ventana de 24hs de WhatsApp, se requiere
 * usar una plantilla aprobada por Meta (HSM). En el sandbox de Twilio podés probar libremente.
 */

import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { enviarWhatsApp } from '../lib/twilio.js';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TZ = process.env.CONSULTORIO_TZ || 'America/Argentina/Buenos_Aires';

async function enviarRecordatorios() {
  const ahora = new Date();
  const en23h = new Date(ahora.getTime() + 23 * 60 * 60 * 1000);
  const en25h = new Date(ahora.getTime() + 25 * 60 * 60 * 1000);

  const { data: turnos, error } = await supabase
    .from('turnos')
    .select(`
      id,
      fecha_hora_inicio,
      tratamiento,
      recordatorio_enviado,
      pacientes ( nombre, apellido, telefono )
    `)
    .in('estado', ['pendiente', 'confirmado'])
    .gte('fecha_hora_inicio', en23h.toISOString())
    .lte('fecha_hora_inicio', en25h.toISOString())
    .or('recordatorio_enviado.is.null,recordatorio_enviado.eq.false');

  if (error) {
    console.error('Error consultando turnos:', error);
    return;
  }

  console.log(`📨 Encontrados ${turnos?.length || 0} turnos para recordar`);

  for (const turno of turnos || []) {
    const paciente = turno.pacientes;
    if (!paciente?.telefono) continue;

    const fechaLocal = toZonedTime(turno.fecha_hora_inicio, TZ);
    const fechaLegible = format(fechaLocal, "EEEE dd/MM 'a las' HH:mm");

    const mensaje =
      `Hola ${paciente.nombre} 🦷\n\n` +
      `Te recordamos que mañana ${fechaLegible} tenés tu turno para ${turno.tratamiento} ` +
      `en ${process.env.CONSULTORIO_NOMBRE}.\n\n` +
      `Respondé *SI* para confirmar o *NO* si necesitás cancelar.`;

    const r = await enviarWhatsApp(paciente.telefono, mensaje);
    if (r.ok) {
      await supabase
        .from('turnos')
        .update({ recordatorio_enviado: true })
        .eq('id', turno.id);
      console.log(`✅ Recordatorio enviado a ${paciente.nombre} (${paciente.telefono})`);
    } else {
      console.error(`❌ Falló envío a ${paciente.telefono}: ${r.error}`);
    }
  }
}

// Ejecutar inmediatamente si se corre como script
if (import.meta.url === `file://${process.argv[1]}`) {
  enviarRecordatorios()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { enviarRecordatorios };
