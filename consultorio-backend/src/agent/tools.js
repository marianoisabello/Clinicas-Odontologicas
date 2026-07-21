/**
 * Definiciones de tools que el agente Claude usa para interactuar con la base.
 * Siguen el formato de tool use de la API de Anthropic.
 */

export const tools = [
  {
    name: 'listar_tratamientos_disponibles',
    description:
      'Devuelve la lista de tratamientos que ofrece el consultorio, con su duración y precio. Usar cuando el paciente pregunta qué servicios hay o cuando hay que elegir un tratamiento para sacar turno.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'listar_profesionales',
    description:
      'Lista los profesionales del consultorio disponibles para atender. Usar cuando el paciente quiere elegir con quién atenderse.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'consultar_disponibilidad',
    description:
      'Consulta los horarios disponibles para un tratamiento en una fecha específica. Si el paciente eligió un profesional, pasá profesional_id para ver solo la agenda de ese profesional. La respuesta incluye texto_horarios listo para mostrar en WhatsApp (columnas); usalo tal cual, sin renumerar.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: {
          type: 'string',
          description: 'Fecha en formato YYYY-MM-DD (zona horaria Buenos Aires)',
        },
        tratamiento_id: {
          type: 'string',
          description: 'UUID del tratamiento (obtenido de listar_tratamientos_disponibles)',
        },
        profesional_id: {
          type: 'string',
          description: 'UUID del profesional (opcional). Solo pasarlo si el paciente eligió un profesional específico.',
        },
      },
      required: ['fecha', 'tratamiento_id'],
    },
  },
  {
    name: 'reservar_turno',
    description:
      'Reserva un turno en el horario y tratamiento elegidos. SOLO usar después de que el paciente confirmó el horario explícitamente.',
    input_schema: {
      type: 'object',
      properties: {
        fecha_hora_iso: {
          type: 'string',
          description: 'Fecha y hora del turno en formato ISO 8601 con offset (ej: 2026-05-15T14:30:00-03:00)',
        },
        tratamiento_id: {
          type: 'string',
          description: 'UUID del tratamiento',
        },
        profesional_id: {
          type: 'string',
          description: 'UUID del profesional asignado (si no se especifica, se asigna automáticamente)',
        },
      },
      required: ['fecha_hora_iso', 'tratamiento_id'],
    },
  },
  {
    name: 'listar_mis_turnos',
    description:
      'Lista los próximos turnos del paciente actual. Usar cuando pregunta "cuándo es mi turno" o "qué turnos tengo".',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'cancelar_turno',
    description: 'Cancela un turno específico. Pedir confirmación al paciente antes de usar esta tool.',
    input_schema: {
      type: 'object',
      properties: {
        turno_id: {
          type: 'string',
          description: 'UUID del turno a cancelar',
        },
      },
      required: ['turno_id'],
    },
  },
  {
    name: 'registrar_datos_paciente',
    description:
      'Guarda o actualiza datos del paciente. Llamar INMEDIATAMENTE cada vez que el paciente proporcione cualquier dato (nombre, apellido, obra social, DNI, email), sin esperar a tener todos juntos. Cada llamada puede ser parcial — solo incluir los campos recibidos en ese mensaje.',
    input_schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        apellido: { type: 'string' },
        dni: { type: 'string' },
        obra_social: { type: 'string' },
        numero_afiliado: { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'derivar_a_humano',
    description:
      'Marca la conversación para que la atienda una persona del consultorio. Usar cuando el paciente lo pide explícitamente, cuando hay una urgencia médica, una queja seria, o algo fuera del alcance del agente.',
    input_schema: {
      type: 'object',
      properties: {
        motivo: {
          type: 'string',
          description: 'Razón de la derivación (urgencia, queja, consulta médica específica, etc.)',
        },
      },
      required: ['motivo'],
    },
  },
];
