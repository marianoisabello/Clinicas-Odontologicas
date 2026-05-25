# Contexto del Proyecto — Consultorio Odontológico

## Qué es esto

Monorepo de una aplicación para un consultorio odontológico en Argentina (Dr. Mariano Isabello). Dos proyectos:

```
Odontologia/
├── consultorio-backend/    # Agente WhatsApp en Node.js
└── src/                    # Frontend redesign (rama frontend-redesign, corre desde la raíz)
```

Ambos comparten la misma base de Supabase.

## Ramas de Git

- `main` — código original con `consultorio-frontend/`
- `frontend-redesign` — rediseño activo, el frontend corre desde la **raíz** del repo (no desde `consultorio-frontend/`)

## Estado actual

✅ Schema de Supabase validado y RLS habilitado
✅ Tablas: pacientes, turnos, historia_clinica, tratamientos, profiles, conversaciones_whatsapp, mensajes_whatsapp, consultas_web, configuracion, user_roles
✅ Backend Node funcionando: `cd consultorio-backend && npm start` (puerto 3000)
✅ Frontend redesign funcionando: `npm run dev` desde la raíz (busca puerto 3000, puede quedar en 3001 si el backend lo ocupa)
✅ Deploy backend en Vercel: `https://consultorio-backend-eight.vercel.app`
✅ Deploy frontend en Vercel: `https://clinicas-odontologicas.vercel.app`
✅ Google Calendar integrado con OAuth por profesional
✅ Rol `admin` habilitado en profiles — Mariano Isabello tiene rol admin
✅ Página `/profesionales` en el panel (solo visible para admin): crear, editar, desactivar usuarios
✅ Columna `email` agregada a `profiles` y trigger `handle_new_user` actualizado para incluirla

## Supabase

- **URL:** `https://dfnlcmuobvphevyshzqm.supabase.co` ← proyecto correcto, único
- **Anon key** en `src/integrations/supabase/client.ts` (hardcodeada en el redesign)
- El `consultorio-frontend/.env` tiene la anon key vacía — ignorar ese archivo, ya no se usa

## Backend — estructura

```
consultorio-backend/
├── api/
│   └── index.js              # Handler para Vercel Serverless Functions
├── src/
│   ├── index.js              # Express app principal
│   ├── agent/
│   │   ├── index.js          # Agente de IA con Claude (claude-opus-4-5)
│   │   ├── executor.js       # Ejecutor de tools del agente
│   │   └── tools.js          # Definición de tools disponibles
│   ├── lib/
│   │   ├── supabase.js       # Cliente Supabase (service_role, bypass RLS)
│   │   └── twilio.js         # Cliente Twilio
│   ├── middleware/
│   │   └── auth.js           # requireAdmin: verifica JWT + rol admin
│   ├── routes/
│   │   ├── test.js           # /test/mensaje, /test/conversacion/:tel, /test/reset
│   │   ├── google.js         # OAuth Google Calendar
│   │   └── admin.js          # CRUD profesionales (requiere rol admin)
│   └── services/
│       ├── pacientes.js
│       ├── turnos.js         # disponibilidad + sync Google Calendar
│       ├── conversaciones.js
│       └── google/
│           ├── oauth.js
│           └── calendar.js
├── db/
│   ├── ajustes.sql
│   └── crear_admin.sql       # SQL para ampliar constraint rol + promover admin
└── .env
```

## Frontend — estructura (rama frontend-redesign)

```
Odontologia/               ← raíz del repo
├── src/
│   ├── components/
│   │   ├── landing/          # PublicHeader, PublicFooter, PublicLayout, WhatsAppFab
│   │   └── ui/               # shadcn/ui
│   ├── routes/               # TanStack Router file-based
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── servicios.tsx
│   │   ├── nosotros.tsx
│   │   ├── contacto.tsx
│   │   ├── login.tsx
│   │   ├── _panel.tsx        # Layout del panel (sidebar con nav por rol)
│   │   ├── _panel.dashboard.tsx
│   │   ├── _panel.calendario.tsx
│   │   ├── _panel.pacientes.tsx
│   │   ├── _panel.pacientes.$id.tsx
│   │   ├── _panel.whatsapp.tsx
│   │   ├── _panel.consultas.tsx
│   │   ├── _panel.tratamientos.tsx
│   │   ├── _panel.configuracion.tsx
│   │   └── _panel.profesionales.tsx  # Solo visible para rol admin
│   ├── integrations/supabase/client.ts  # URL y anon key hardcodeadas
│   ├── hooks/useAuth.tsx
│   └── lib/
├── package.json
└── vite.config.ts
```

Stack: React + TypeScript + Vite + TanStack Router + Tailwind + shadcn/ui + Supabase JS.

## Endpoints del backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/webhook/whatsapp` | Webhook Twilio WhatsApp |
| POST | `/test/mensaje` | Testing sin Twilio |
| GET | `/auth/google/start?profesional_id=xxx` | Inicia OAuth Google Calendar |
| GET | `/auth/google/callback` | Callback OAuth |
| POST | `/auth/google/disconnect` | Desconecta Google Calendar |
| GET | `/admin/profesionales` | Lista profesionales (requiere admin) |
| POST | `/admin/profesionales` | Crea usuario Auth + perfil (requiere admin) |
| PUT | `/admin/profesionales/:id` | Edita perfil (requiere admin) |
| DELETE | `/admin/profesionales/:id` | Desactiva profesional (requiere admin) |

## Schema profiles (tabla real)

```sql
profiles (
  id UUID PK -> auth.users(id),
  nombre TEXT NOT NULL,
  email TEXT,                    -- agregado manualmente, poblado desde auth.users
  rol TEXT CHECK (odontologo|asistente|recepcion|admin),
  color_calendario TEXT DEFAULT '#0F4C5C',
  especialidad TEXT,
  bio TEXT,
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)
```

**Importante:** `profiles` NO tiene `apellido` ni `matricula`. El trigger `handle_new_user` crea el perfil al registrarse con nombre y email.

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| `admin` | Todo el panel + página Profesionales |
| `odontologo` | Todo el panel excepto Profesionales |
| `asistente` | Todo el panel excepto Profesionales |
| `recepcion` | Todo el panel excepto Profesionales |

El sidebar muestra el ítem **Profesionales** solo cuando `profile.rol === 'admin'`.

## Cómo crear un usuario admin

1. Registrarse en el sistema (o buscar el UUID en Authentication → Users)
2. Ejecutar en Supabase SQL Editor:

```sql
ALTER TABLE public.profiles DROP CONSTRAINT profiles_rol_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_rol_check
  CHECK (rol = ANY (ARRAY['odontologo','asistente','recepcion','admin']));

UPDATE public.profiles SET rol = 'admin' WHERE id = 'uuid-del-usuario';
```

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
- Datos mínimos para reservar: nombre, apellido, obra social
- Zona horaria: America/Argentina/Buenos_Aires (offset -03:00)

## Cómo levantar localmente

**Backend:**
```bash
cd consultorio-backend && npm start   # puerto 3000
```

**Frontend (rama frontend-redesign):**
```bash
# desde la raíz del repo
npm run dev   # intenta puerto 3000, si está ocupado usa 3001+
```

**Probar agente sin Twilio:**
```powershell
$body = @{ telefono = "+5491198765432"; mensaje = "Hola" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/test/mensaje" -Method Post -Body $body -ContentType "application/json"
```

## Próximos pasos pendientes

~~1. Resolver bug de registro de datos parciales del agente~~ ✅
~~2. Test end-to-end completo~~ ✅
~~3. Frontend funcionando~~ ✅
~~4. Calendario interactivo~~ ✅
~~7. Deploy backend~~ ✅ (Vercel)
~~10. Rol admin + página Profesionales~~ ✅
5. Suscripción realtime de Supabase en /whatsapp del panel
6. Conectar Twilio sandbox con WhatsApp real (webhook: `https://consultorio-backend-eight.vercel.app/webhook/whatsapp`)
8. Job cron de recordatorios 24hs antes
9. WhatsApp Business API aprobada (requiere Meta)

## Notas importantes

- **Supabase proyecto único:** `dfnlcmuobvphevyshzqm`. Ignorar `nkbuaackfoxttwfywvjk` (proyecto viejo de Vercel, ya no se usa).
- El service_role key solo va en el backend. Nunca en el front.
- Los tokens de Google Calendar se encriptan con `GOOGLE_TOKEN_ENCRYPTION_KEY` (64 chars hex).
- Datos de salud: Ley 26.529 y Ley 25.326. Nunca commitear `.env`.
- `profiles` NO tiene `apellido` ni `matricula` — el CONTEXT.md anterior lo mencionaba por error.
