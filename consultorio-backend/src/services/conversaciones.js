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
    procesado_por_ia: procesadoPorIA,
    timestamp: new Date().toISOString(),
  });

  await supabase
    .from('conversaciones_whatsapp')
    .update({ ultima_actividad: new Date().toISOString() })
    .eq('id', conversacionId);
}

export async function obtenerHistorialReciente(conversacionId, limite = 20) {
  const { data } = await supabase
    .from('mensajes_whatsapp')
    .select('direccion, contenido, timestamp')
    .eq('conversacion_id', conversacionId)
    .order('timestamp', { ascending: false })
    .limit(limite);

  return (data || []).reverse();
}

export async function pausarIA(conversacionId) {
  await supabase
    .from('conversaciones_whatsapp')
    .update({ estado: 'esperando_respuesta' })
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
  if (data.estado === 'esperando_respuesta') {
    const haceMin = (Date.now() - new Date(data.ultima_actividad).getTime()) / 60000;
    return haceMin > 30;
  }
  return true;
}
