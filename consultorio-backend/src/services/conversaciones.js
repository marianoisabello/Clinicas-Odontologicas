import { supabase } from '../lib/supabase.js';

export async function obtenerOCrearConversacion(telefono, pacienteId = null) {
  const telefonoLimpio = telefono.replace('whatsapp:', '').trim();

  let { data: conv } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('telefono', telefonoLimpio)
    .maybeSingle();

  if (!conv) {
    const { data: nueva } = await supabase
      .from('whatsapp_conversations')
      .insert({
        telefono: telefonoLimpio,
        paciente_id: pacienteId,
        estado: 'activa',
        ultimo_mensaje: new Date().toISOString(),
      })
      .select()
      .single();
    conv = nueva;
  } else if (pacienteId && !conv.paciente_id) {
    // Vincular paciente si lo identificamos después
    await supabase
      .from('whatsapp_conversations')
      .update({ paciente_id: pacienteId })
      .eq('id', conv.id);
    conv.paciente_id = pacienteId;
  }

  return conv;
}

export async function guardarMensaje({ conversacionId, direccion, contenido, procesadoPorIA = false }) {
  await supabase.from('whatsapp_messages').insert({
    conversation_id: conversacionId,
    direccion,
    contenido,
    tipo: 'texto',
  });

  await supabase
    .from('whatsapp_conversations')
    .update({
      ultimo_mensaje: new Date().toISOString(),
    })
    .eq('id', conversacionId);
}

export async function obtenerHistorialReciente(conversacionId, limite = 20) {
  const { data } = await supabase
    .from('whatsapp_messages')
    .select('direccion, contenido, created_at')
    .eq('conversation_id', conversacionId)
    .order('created_at', { ascending: false })
    .limit(limite);

  return (data || []).reverse(); // orden cronológico
}

/**
 * Pausa la IA en una conversación cuando un humano del consultorio interviene.
 * Marca la conversación como 'esperando_humano' por 30 minutos.
 */
export async function pausarIA(conversacionId) {
  await supabase
    .from('whatsapp_conversations')
    .update({ estado: 'esperando_respuesta' })
    .eq('id', conversacionId);
}

export async function iaEstaActiva(conversacionId) {
  const { data } = await supabase
    .from('whatsapp_conversations')
    .select('estado, ultimo_mensaje')
    .eq('id', conversacionId)
    .single();

  if (!data) return true;
  if (data.estado === 'cerrada') return false;
  if (data.estado === 'esperando_respuesta') {
    // Reactivar IA después de 30 min sin actividad humana
    const haceMin = (Date.now() - new Date(data.ultimo_mensaje).getTime()) / 60000;
    return haceMin > 30;
  }
  return true;
}
