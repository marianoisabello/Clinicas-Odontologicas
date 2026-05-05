import { supabase } from '../lib/supabase.js';

export async function buscarPorTelefono(telefono) {
  const normalizado = normalizarTelefono(telefono);
  const { data } = await supabase
    .from('pacientes')
    .select('*')
    .eq('telefono', normalizado)
    .maybeSingle();

  return data;
}

export async function crearPacientePreliminar(telefono, nombre = null) {
  const { data, error } = await supabase
    .from('pacientes')
    .insert({
      telefono: normalizarTelefono(telefono),
      nombre: nombre || 'Paciente',
      apellido: 'Sin registrar',
    })
    .select()
    .single();

  if (error) {
    // Si ya existe (carrera), buscarlo
    return await buscarPorTelefono(telefono);
  }
  return data;
}

export async function actualizarPaciente(id, campos) {
  const { data, error } = await supabase
    .from('pacientes')
    .update(campos)
    .eq('id', id)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, paciente: data };
}

export async function listarTratamientos() {
  const { data } = await supabase
    .from('tratamientos')
    .select('id, nombre, duracion_minutos, precio')
    .eq('activo', true)
    .order('nombre');
  return data || [];
}

export async function listarProfesionales() {
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre')
    .eq('rol', 'odontologo')
    .eq('activo', true);
  return data || [];
}

function normalizarTelefono(tel) {
  // Quita "whatsapp:" y espacios. Asegura formato +549...
  let limpio = tel.replace('whatsapp:', '').replace(/\s/g, '').trim();
  if (!limpio.startsWith('+')) limpio = '+' + limpio;
  return limpio;
}
