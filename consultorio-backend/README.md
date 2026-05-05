# Consultorio Backend — Agente WhatsApp con IA

Back-end en Node.js que recibe mensajes de WhatsApp (vía Twilio), los procesa con un agente Claude que tiene tools para gestionar turnos, y persiste todo en la misma base de Supabase que usa el front (Lovable).

## Arquitectura

```
┌────────────────┐
│   Paciente     │
│   (WhatsApp)   │
└────────┬───────┘
         │
         ▼
┌────────────────┐
│     Twilio     │  webhook
│  WhatsApp API  ├─────────────┐
└────────┬───────┘             │
         ▲                     ▼
         │            ┌─────────────────┐
         │            │  Backend Node   │
         │            │  (este repo)    │
         │            │                 │
         │            │  ┌───────────┐  │
         │            │  │  Agente   │  │
         │            │  │  Claude   │  │
         │            │  │ + Tools   │  │
         │            │  └─────┬─────┘  │
         │            └────────┼────────┘
         │                     │
         └─ respuesta ─┐       ▼
                      │  ┌──────────┐
                      └──┤ Supabase │◄── Front Lovable
                         │ Postgres │    (panel del consultorio)
                         └──────────┘
```

## Setup paso a paso

### 1. Crear proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear un proyecto
2. Anotar `SUPABASE_URL` y la `service_role key` (Settings → API)

### 2. Generar el front en Lovable

1. Ir a [lovable.dev](https://lovable.dev)
2. Pegar el contenido de `prompt-lovable.md` (te lo paso aparte)
3. Conectar el proyecto de Supabase (Lovable lo soporta nativamente)
4. Lovable va a crear las tablas y la UI

### 3. Aplicar ajustes SQL

En el SQL Editor de Supabase, ejecutar `db/ajustes.sql`.

### 4. Configurar Twilio WhatsApp

**Para desarrollo (gratis):**
1. Crear cuenta en [twilio.com](https://twilio.com)
2. Activar el sandbox de WhatsApp (Console → Messaging → Try it out → WhatsApp)
3. Anotar `Account SID`, `Auth Token` y el número del sandbox
4. Configurar el webhook: `https://TU-DOMINIO/webhook/whatsapp` (POST)

**Para producción:**
- Solicitar acceso a WhatsApp Business API a través de Twilio
- Aprobar plantillas de mensajes (HSM) para recordatorios proactivos
- Verificar el negocio con Meta (puede tardar días/semanas)

### 5. Configurar Anthropic

1. Crear cuenta en [console.anthropic.com](https://console.anthropic.com)
2. Generar API key
3. Cargar crédito (mínimo USD 5 para arrancar)

### 6. Levantar el back-end

```bash
cd consultorio-backend
cp .env.example .env
# Editar .env con tus credenciales
npm install
npm start
```

Para desarrollo local exponer con ngrok:
```bash
ngrok http 3000
# Usar la URL pública en el webhook de Twilio
```

### 7. Recordatorios automáticos

Configurar un cron job (Render Cron, Railway, etc.) que ejecute:
```bash
npm run recordatorios
```
una vez por hora.

## Estructura del código

```
src/
├── index.js                 # Servidor Express + webhook
├── lib/
│   ├── supabase.js          # Cliente Supabase (service_role)
│   └── twilio.js            # Wrapper para enviar WhatsApp
├── services/
│   ├── pacientes.js         # ABM de pacientes
│   ├── turnos.js            # Disponibilidad y reserva
│   └── conversaciones.js    # Historial de chats
├── agent/
│   ├── index.js             # Agente Claude con loop de tool use
│   ├── tools.js             # Definición de tools
│   └── executor.js          # Ejecuta cada tool
└── jobs/
    └── recordatorios.js     # Recordatorios 24hs antes
```

## Flujo de un mensaje

1. Paciente manda "Hola, quiero un turno para limpieza el martes" por WhatsApp
2. Twilio recibe y dispara POST al webhook
3. Back-end identifica al paciente por teléfono (o lo crea preliminar)
4. Carga historial de conversación de Supabase
5. Llama a Claude con system prompt + historial + tools disponibles
6. Claude pide tool `listar_tratamientos_disponibles` → ejecuta → devuelve lista
7. Claude pide tool `consultar_disponibilidad(fecha=2026-05-12, tratamiento=limpieza)` → devuelve slots
8. Claude responde al paciente: "Perfecto, para limpieza el martes 12/05 tengo 9:30, 11:00 o 15:30. ¿Cuál te queda mejor?"
9. Paciente: "15:30"
10. Claude pide tool `reservar_turno(...)` → confirma
11. Claude responde: "Listo, te esperamos el martes 12/05 a las 15:30 ✅"
12. Todo el ida y vuelta queda guardado y visible en `/whatsapp` del front

## Cuándo interviene el humano

- El paciente escribe "quiero hablar con alguien" → Claude usa `derivar_a_humano`
- Paciente describe síntoma médico → Claude deriva
- Cualquier persona del consultorio responde manualmente desde el panel → la IA se pausa 30 min

## Costos aproximados (Argentina, mayo 2026)

- Supabase free tier: alcanza para empezar (límite 500MB DB, 1GB storage)
- Twilio sandbox WhatsApp: gratis ilimitado para testing
- Twilio WhatsApp producción: ~USD 0.005 a 0.08 por conversación según país y tipo
- Anthropic Claude: ~USD 0.01 a 0.05 por conversación de paciente (depende del largo)
- Hosting (Render/Railway): plan gratis o ~USD 7/mes para always-on

Estimación realista para 100 turnos/mes vía WhatsApp: **USD 15-30/mes** todo incluido.

## Seguridad y normativa

⚠️ **Datos de salud son sensibles.** En Argentina aplica:
- Ley 25.326 (Protección de Datos Personales)
- Ley 26.529 (Derechos del Paciente, historia clínica)

Recomendaciones mínimas:
- Activar 2FA en Supabase, Twilio y Anthropic
- Nunca commitear `.env` (ya está en `.gitignore`)
- Backups diarios de la base (Supabase los hace automático en plan pago)
- Acuerdo de confidencialidad con cualquier desarrollador externo
- Consentimiento informado del paciente para uso de datos vía WhatsApp
- Si crece: considerar BAA con los proveedores y/o hosting en infraestructura propia

## Roadmap sugerido

- [ ] Integración con Google Calendar del profesional
- [ ] Soporte para audios de WhatsApp (transcripción con Whisper)
- [ ] Subida de radiografías por WhatsApp y guardado en historia clínica
- [ ] Reportes mensuales (turnos atendidos, no_asistio, ingresos)
- [ ] Integración con MercadoPago para señar turnos
