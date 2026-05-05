# Contexto del Proyecto — Consultorio Odontológico

## Qué es esto

Monorepo de una aplicación para un consultorio odontológico en Argentina (Dr. Mariano Isabello). Dos proyectos:

```
Odontologia/
├── consultorio-backend/    # Agente WhatsApp en Node.js
└── consultorio-frontend/   # Panel + landing en React (exportado de Lovable)
```

Ambos comparten la misma base de Supabase.

## Estado actual

✅ Schema de Supabase creado por Lovable, validado y RLS habilitado
✅ 9 tablas: pacientes, turnos, historia_clinica, tratamientos, profiles, conversaciones_whatsapp, mensajes_whatsapp, consultas_web, configuracion + user_roles auxiliar
✅ 8 tratamientos cargados, 1 profesional (Mariano Isabello, rol odontologo)
✅ Front en Lovable: landing pública con header + 4 páginas (/, /servicios, /nosotros, /contacto) y panel interno con login, dashboard, calendario, pacientes, whatsapp, consultas, tratamientos, configuración
✅ Back-end Node funcionando: `npm start` levanta servidor en puerto 3000
✅ Endpoint de testing `/test/mensaje` probado: el agente responde, identifica al paciente, guarda mensajes
✅ Variables de entorno configuradas en `consultorio-backend/.env`

## Backend — estructura

```
consultorio-backend/
├── src/
│   ├── index.js              # Express + webhook Twilio + ruta /test
│   ├── lib/
│   │   ├── supabase.js       # cliente con service_role (bypass RLS)
│   │   └── twilio.js         # wrapper para enviar WhatsApp
│   ├── services/
│   │   ├── pacientes.js      # buscar por teléfono, crear preliminar
│   │   ├── turnos.js         # disponibilidad, crear, cancelar, listar
│   │   └── conversaciones.js # historial WhatsApp + pausa de IA
│   ├── agent/
│   │   ├── index.js          # system prompt + loop de tool use con Claude
│   │   ├── tools.js          # 7 tools del agente
│   │   └── executor.js       # router que ejecuta cada tool
│   ├── routes/
│   │   └── test.js           # /test/mensaje, /test/conversacion/:tel, /test/reset
│   └── jobs/
│       └── recordatorios.js  # cron para recordar turnos 24hs antes
├── db/
│   └── ajustes.sql
└── .env                      # secrets (no committear)
```

## Frontend — estructura

```
consultorio-frontend/
├── src/
│   ├── components/
│   │   ├── landing/          # PublicHeader, PublicFooter, PublicLayout, WhatsAppFab
│   │   └── ui/               # shadcn/ui
│   ├── routes/               # TanStack Router file-based
│   │   ├── __root.tsx
│   │   ├── index.tsx         # /
│   │   ├── servicios.tsx
│   │   ├── nosotros.tsx
│   │   ├── contacto.tsx
│   │   ├── login.tsx
│   │   └── _panel.*.tsx      # rutas privadas
│   ├── integrations/supabase/client.ts
│   ├── hooks/useAuth.tsx
│   └── lib/                  # config, format, utils
└── package.json
```

Stack: React + TypeScript + Vite + TanStack Router + Tailwind + shadcn/ui + Supabase JS.

## Modelo de datos clave

### pacientes
Cuando llega un mensaje de un teléfono desconocido, el back crea un paciente "preliminar" con `nombre='Paciente'` y `apellido='Sin registrar'`. El agente debe completar los datos durante la conversación.

### turnos
Estados: pendiente, confirmado, cancelado, asistio, no_asistio.
Orígenes: whatsapp, manual, web.

### conversaciones_whatsapp + mensajes_whatsapp
Una conversación por teléfono. Estado 'esperando_humano' pausa la IA por 30 minutos para que la atienda una persona del consultorio desde el panel.

## Tools del agente

1. `listar_tratamientos_disponibles`
2. `consultar_disponibilidad(fecha, tratamiento_id)`
3. `reservar_turno(fecha_hora_iso, tratamiento_id, profesional_id?)`
4. `listar_mis_turnos`
5. `cancelar_turno(turno_id)`
6. `registrar_datos_paciente(nombre, apellido, dni?, obra_social?, ...)`
7. `derivar_a_humano(motivo)`

## Reglas del agente

- Español rioplatense, tutea con "vos"
- Respuestas cortas (1-3 líneas), una pregunta por vez
- NO da diagnósticos médicos, deriva urgencias a humano
- Datos mínimos para reservar: nombre, apellido, obra social (DNI/email opcionales)
- Pide datos uno por uno
- Zona horaria: America/Argentina/Buenos_Aires (offset -03:00)

## Bug conocido sin resolver

El agente a veces dice "ya te anoté" pero NO llama a `registrar_datos_paciente`. El prompt dice que use la tool "cuando tenga los tres datos", pero responde antes y los datos parciales se pierden. **Fix propuesto**: cambiar el prompt para que registre datos a medida que los recibe (parcialmente).

## Cómo levantar localmente

**Backend:**
```powershell
cd consultorio-backend
npm install
npm start     # puerto 3000
```

**Frontend:**
```powershell
cd consultorio-frontend
npm install
npm run dev   # puerto 5173
```

## Cómo probar el agente sin Twilio

```powershell
$body = @{ telefono = "+5491198765432"; mensaje = "Hola" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/test/mensaje" -Method Post -Body $body -ContentType "application/json"
```

POST `/test/reset` con `{telefono}` para borrar conversación y empezar de cero.

## Próximos pasos pendientes

1. Resolver bug de registro de datos parciales del agente
2. Test end-to-end completo (paciente nuevo saca turno real)
3. Verificar frontend funcionando: `npm install` y `npm run dev`
4. Calendario interactivo en el panel (react-big-calendar o @fullcalendar/react)
5. Suscripción realtime de Supabase en /whatsapp del panel
6. Conectar Twilio sandbox y probar con WhatsApp real
7. Deploy del back-end a Render o Railway
8. Job cron de recordatorios 24hs antes
9. WhatsApp Business API aprobada (requiere aprobación de Meta)

## Notas importantes

- El front tiene tabla `user_roles` con enum `app_role` (admin, dentista, recepcion, paciente). El back NO usa esa tabla, usa `profiles.rol` directamente.
- Tabla `configuracion` está disponible para datos del consultorio editables desde el panel.
- Datos de salud son sensibles. Aplica Ley 26.529 (Derechos del Paciente) y Ley 25.326 (Protección de Datos). 2FA en Supabase, Twilio y Anthropic. Nunca commitear `.env`.
- El service_role key da acceso total a la base. Solo va en el back-end, nunca en el front.
