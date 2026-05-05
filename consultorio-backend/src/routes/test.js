/**
 * Endpoint de testing: simula un mensaje entrante de WhatsApp sin pasar por Twilio.
 *
 * Uso:
 *   POST /test/mensaje
 *   { "telefono": "+5491123456001", "mensaje": "Hola, quiero un turno" }
 *
 * Devuelve la respuesta del agente en JSON (no la manda por WhatsApp).
 * Los mensajes igual se persisten en Supabase para que veas el flujo completo.
 */

import express from 'express';
import { procesarMensaje } from '../agent/index.js';
import {
  obtenerOCrearConversacion,
  guardarMensaje,
  obtenerHistorialReciente,
  iaEstaActiva,
} from '../services/conversaciones.js';
import { buscarPorTelefono, crearPacientePreliminar } from '../services/pacientes.js';

export const rutaTest = express.Router();

rutaTest.post('/mensaje', async (req, res) => {
  const { telefono, mensaje } = req.body;

  if (!telefono || !mensaje) {
    return res.status(400).json({ error: 'Faltan telefono o mensaje' });
  }

  try {
    let paciente = await buscarPorTelefono(telefono);
    let pacienteCreado = false;
    if (!paciente) {
      paciente = await crearPacientePreliminar(telefono);
      pacienteCreado = true;
    }

    const conversacion = await obtenerOCrearConversacion(telefono, paciente.id);

    await guardarMensaje({
      conversacionId: conversacion.id,
      direccion: 'entrante',
      contenido: mensaje,
    });

    const iaActiva = await iaEstaActiva(conversacion.id);
    if (!iaActiva) {
      return res.json({
        respuesta: null,
        nota: 'IA pausada en esta conversación',
        paciente,
        conversacion_id: conversacion.id,
      });
    }

    const historial = await obtenerHistorialReciente(conversacion.id, 20);
    const historialPrev = historial.slice(0, -1);

    const inicio = Date.now();
    const respuesta = await procesarMensaje({
      paciente,
      conversacionId: conversacion.id,
      mensajeUsuario: mensaje,
      historial: historialPrev,
    });
    const duracionMs = Date.now() - inicio;

    await guardarMensaje({
      conversacionId: conversacion.id,
      direccion: 'saliente',
      contenido: respuesta,
      procesadoPorIA: true,
    });

    res.json({
      respuesta,
      duracion_ms: duracionMs,
      paciente: {
        id: paciente.id,
        nombre: paciente.nombre,
        apellido: paciente.apellido,
        telefono: paciente.telefono,
      },
      paciente_creado: pacienteCreado,
      conversacion_id: conversacion.id,
    });
  } catch (err) {
    console.error('Error en /test/mensaje:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

/**
 * GET /test/conversacion/:telefono
 * Devuelve el historial completo de una conversación
 */
rutaTest.get('/conversacion/:telefono', async (req, res) => {
  try {
    const paciente = await buscarPorTelefono(req.params.telefono);
    if (!paciente) return res.status(404).json({ error: 'Paciente no encontrado' });

    const conv = await obtenerOCrearConversacion(req.params.telefono, paciente.id);
    const mensajes = await obtenerHistorialReciente(conv.id, 100);

    res.json({ conversacion: conv, mensajes, paciente });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /test/reset
 * Borra los mensajes y conversación de un teléfono para volver a empezar limpio
 * (NO borra el paciente ni los turnos creados)
 */
rutaTest.post('/reset', async (req, res) => {
  const { telefono } = req.body;
  if (!telefono) return res.status(400).json({ error: 'Falta telefono' });

  try {
    const { supabase } = await import('../lib/supabase.js');
    const tel = telefono.replace('whatsapp:', '').trim();

    const { data: convs } = await supabase
      .from('conversaciones_whatsapp')
      .select('id')
      .eq('telefono', tel);

    for (const c of convs || []) {
      await supabase.from('mensajes_whatsapp').delete().eq('conversacion_id', c.id);
    }
    await supabase.from('conversaciones_whatsapp').delete().eq('telefono', tel);

    res.json({ ok: true, conversaciones_borradas: convs?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
