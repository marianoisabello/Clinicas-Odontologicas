import { supabase } from '../lib/supabase.js';

export async function obtenerOCrearConversacion(telefono, pacienteId = null) {
  const telefonoLimpio = telefono.replace('whatsapp:', '').trim();

  let { data: conv } = await supabase
    .from('conversaciones_whatsapp')
    .select('*')
    .eq('telefono', telefonoLimpio)
    .maybeSingle();

  if (!conv) {
    const { data: nueva } = await supabase
      .from('conversaciones_whatsapp')
      .insert({
        telefono: telefonoLimpio,
        paciente_id: pacienteId,
        estado: 'activa',
        ultima_actividad: new Date().toISOString(),
      })
      .select()
      .single();
    conv = nueva;
  } else if (pacienteId && !conv.paciente_id) {
    // Vincular paciente si lo identificamos después
    await supabase
      .from('conversaciones_whatsapp')
      .update({ paciente_id: pacienteId })
      .eq('id', conv.id);
    conv.paciente_id = pacienteId;
  }

  return conv;
}

export async function guardarMensaje({ conversacionId, direccion, contenido, procesadoPorIA = false }) {
  await supabase.from('mensajes_whatsapp').insert({
    conversacion_id: conversacionId,
    direccion,
    contenido,
    timestamp: new Date().toISOString(),
    procesado_por_ia: procesadoPorIA,
  });

  await supabase
    .from('conversaciones_whatsapp')
    .update({
      ultimo_mensaje: contenido.substring(0, 200),
      ultima_actividad: new Date().toISOString(),
    })
    .eq('id', conversacionId);
}

export async function obtenerHistorialReciente(conversacionId, limite = 20) {
  const { data } = await supabase
    .from('mensajes_whatsapp')
    .select('direccion, contenido, timestamp')
    .eq('conversacion_id', conversacionId)
    .order('timestamp', { ascending: false })
    .limit(limite);

  return (data || []).reverse(); // orden cronológico
}

/**
 * Pausa la IA en una conversación cuando un humano del consultorio interviene.
 * Marca la conversación como 'esperando_humano' por 30 minutos.
 */
export async function pausarIA(conversacionId) {
  await supabase
    .from('conversaciones_whatsapp')
    .update({ estado: 'esperando_humano' })
    .eq('id', conversacionId);
}

export async function iaEstaActiva(conversacionId) {
  const { data } = await supabase
    .from('conversaciones_whatsapp')
    .select('estado, ultima_actividad')
    .eq('id', conversacionId)
    .single();

  if (!data) return true;
  if (data.estado === 'cerrada') return false;
  if (data.estado === 'esperando_humano') {
    // Reactivar IA después de 30 min sin actividad humana
    const haceMin = (Date.now() - new Date(data.ultima_actividad).getTime()) / 60000;
    return haceMin > 30;
  }
  return true;
}
