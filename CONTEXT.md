# Contexto del Proyecto — Consultorio Odontológico

## Qué es esto

Monorepo de una aplicación para un consultorio odontológico en Argentina (Dr. Mariano Isabello). Todo corre desde la raíz del repo:

```
Odontologia/
├── consultorio-backend/    # Agente WhatsApp en Node.js (Express)
├── src/                    # Frontend (React + Vite + TanStack Router)
├── api/                    # Serverless functions de Vercel
│   ├── backend.js          # Entry point del Express app (todas las rutas excepto OAuth Google)
│   ├── auth-google.js      # Inicia flujo OAuth Google Calendar
│   └── auth-google-callback.js  # Callback OAuth Google Calendar
├── vercel.json             # Config Vercel: build + rewrite SPA catch-all
└── package.json            # Deps del frontend + deps del backend (fusionados)
```

## Deploy — UN SOLO proyecto Vercel

- **URL:** `https://clinicas-odontologicas.vercel.app`
- Frontend y backend fusionados en el mismo proyecto Vercel "Clinicas Odontologicas"
- El proyecto `consultorio-backend` en Vercel ya no se usa (pendiente de borrar)
- Backend corre como serverless functions en `/api/`

## Ramas de Git

- `main` — rama activa, contiene todo (frontend + backend fusionados)

## Estado actual

✅ Schema de Supabase validado y RLS habilitado
✅ Tablas: pacientes, turnos, historia_clinica, tratamientos, profiles, conversaciones_whatsapp, mensajes_whatsapp, consultas_web, configuracion, user_roles
✅ Backend Node funcionando localmente: `cd consultorio-backend && npm start` (puerto 3000)
✅ Frontend funcionando localmente: `npm run dev` desde la raíz (puerto 3001 si 3000 está ocupado)
✅ Deploy unificado en Vercel: `https://clinicas-odontologicas.vercel.app`
✅ Rol `admin` habilitado en profiles — Mariano Isabello tiene rol admin
✅ Página `/profesionales` en el panel (solo visible para admin): crear, editar, desactivar usuarios
✅ Crear profesional funciona (upsert en lugar de update para evitar race con trigger)
⚠️  Google Calendar OAuth: flujo inicia y llega al callback pero falla con error desconocido
     — El toast ahora muestra el detalle del error para diagnosticar

## Supabase

- **URL:** `https://dfnlcmuobvphevyshzqm.supabase.co` ← proyecto correcto, único
- **Anon key** en `.env` como `VITE_SUPABASE_ANON_KEY` (ya NO hardcodeada)
- `src/integrations/supabase/client.ts` lee de `import.meta.env.VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`

## Variables de entorno Vercel (proyecto "Clinicas Odontologicas")

| Variable | Uso |
|----------|-----|
| `VITE_SUPABASE_URL` | Frontend — URL Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend — anon key |
| `VITE_BACKEND_URL` | Frontend — vacía en prod (mismo dominio), `http://localhost:3000` en local |
| `SUPABASE_URL` | Backend — URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend — service_role key |
| `ANTHROPIC_API_KEY` | Backend — agente IA |
| `TWILIO_ACCOUNT_SID` | Backend — WhatsApp |
| `TWILIO_AUTH_TOKEN` | Backend |
| `TWILIO_WHATSAPP_FROM` | Backend |
| `GOOGLE_CLIENT_ID` | Backend — OAuth Calendar |
| `GOOGLE_CLIENT_SECRET` | Backend |
| `GOOGLE_REDIRECT_URI` | `https://clinicas-odontologicas.vercel.app/api/auth-google-callback` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Backend — 64 chars hex |
| `FRONTEND_URL` | `https://clinicas-odontologicas.vercel.app` |
| `CONSULTORIO_NOMBRE/DIRECCION/TELEFONO/HORARIO/TZ` | Backend — datos del consultorio |

## Backend — estructura

```
consultorio-backend/
├── src/
│   ├── index.js              # Express app principal (exporta `default app`)
│   ├── agent/
│   │   ├── index.js          # Agente de IA con Claude
│   │   ├── executor.js
│   │   └── tools.js
│   ├── lib/
│   │   ├── supabase.js       # Cliente Supabase (service_role, bypass RLS)
│   │   ├── twilio.js
│   │   └── meta-whatsapp.js
│   ├── middleware/
│   │   └── auth.js           # requireAdmin: verifica JWT + rol admin
│   ├── routes/
│   │   ├── test.js
│   │   ├── google.js         # OAuth Google Calendar (rutas legacy, redirect URL corregido a /configuracion)
│   │   └── admin.js          # CRUD profesionales (upsert al crear)
│   └── services/
│       ├── pacientes.js
│       ├── turnos.js
│       ├── conversaciones.js
│       └── google/
│           ├── oauth.js      # getAuthUrl, exchangeCode, encryptToken, getValidAccessToken
│           └── calendar.js
└── .env
```

## Frontend — estructura

```
Odontologia/               ← raíz del repo
├── src/
│   ├── components/
│   │   ├── landing/
│   │   └── ui/               # shadcn/ui
│   ├── routes/               # TanStack Router file-based
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── servicios.tsx
│   │   ├── nosotros.tsx
│   │   ├── contacto.tsx
│   │   ├── login.tsx
│   │   ├── _panel.tsx        # Layout del panel
│   │   ├── _panel.dashboard.tsx
│   │   ├── _panel.calendario.tsx
│   │   ├── _panel.pacientes.tsx
│   │   ├── _panel.pacientes.$id.tsx
│   │   ├── _panel.whatsapp.tsx
│   │   ├── _panel.consultas.tsx
│   │   ├── _panel.tratamientos.tsx
│   │   ├── _panel.configuracion.tsx  # Muestra detalle del error OAuth en el toast
│   │   └── _panel.profesionales.tsx  # Solo visible para rol admin
│   ├── integrations/supabase/client.ts  # Lee VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
│   ├── hooks/useAuth.tsx
│   └── lib/
├── api/                      # Serverless functions Vercel
│   ├── backend.js            # Exporta Express app
│   ├── auth-google.js        # GET /api/auth-google?profesional_id= → redirige a Google
│   └── auth-google-callback.js  # GET /api/auth-google-callback → procesa tokens y redirige a /configuracion
├── vercel.json               # SPA catch-all: /((?!api/}.*) → /index.html
├── package.json              # Deps frontend + @anthropic-ai/sdk + twilio (para serverless)
└── vite.config.ts
```

Stack: React + TypeScript + Vite + TanStack Router + Tailwind + shadcn/ui + Supabase JS.

## Endpoints del backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/backend` (vía Vercel) | Health y rutas Express |
| GET | `/api/auth-google?profesional_id=xxx` | Inicia OAuth Google Calendar |
| GET | `/api/auth-google-callback` | Callback OAuth (registrado en Google Cloud Console) |
| POST | `/webhook/whatsapp` | Webhook Twilio/Meta WhatsApp |
| POST | `/test/mensaje` | Testing sin Twilio |
| POST | `/auth/google/disconnect` | Desconecta Google Calendar |
| GET | `/admin/profesionales` | Lista profesionales (requiere admin) |
| POST | `/admin/profesionales` | Crea usuario Auth + perfil (requiere admin) |
| PUT | `/admin/profesionales/:id` | Edita perfil (requiere admin) |
| DELETE | `/admin/profesionales/:id` | Desactiva profesional (requiere admin) |

**Nota:** `/webhook`, `/admin`, `/test`, `/auth/google/disconnect` se enrutan via `/api/backend` en Vercel.
El OAuth de Google Calendar usa funciones dedicadas `/api/auth-google` y `/api/auth-google-callback`.

## Schema profiles (tabla real)

```sql
profiles (
  id UUID PK -> auth.users(id),
  nombre TEXT NOT NULL,
  email TEXT,
  rol TEXT CHECK (odontologo|asistente|recepcion|admin),
  color_calendario TEXT DEFAULT '#0F4C5C',
  especialidad TEXT,
  bio TEXT,
  foto_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
)
```

**Importante:** `profiles` NO tiene `apellido` ni `matricula`.

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| `admin` | Todo el panel + página Profesionales |
| `odontologo` | Todo el panel excepto Profesionales |
| `asistente` | Todo el panel excepto Profesionales |
| `recepcion` | Todo el panel excepto Profesionales |

## Cómo crear un usuario admin

1. Registrarse o buscar UUID en Supabase → Authentication → Users
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

**Frontend:**
```bash
# desde la raíz del repo
npm run dev   # intenta 3000, si está ocupado usa 3001+
```

**.env raíz (frontend):**
```
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=https://dfnlcmuobvphevyshzqm.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## Próximos pasos pendientes

~~1. Resolver bug de registro de datos parciales del agente~~ ✅
~~2. Test end-to-end completo~~ ✅
~~3. Frontend funcionando~~ ✅
~~4. Calendario interactivo~~ ✅
~~7. Deploy backend~~ ✅ (fusionado con frontend en Vercel)
~~10. Rol admin + página Profesionales~~ ✅
~~11. Crear profesional~~ ✅
1. **Google Calendar OAuth** — flujo llega al callback pero falla (error desconocido, ver toast con detalle)
2. Suscripción realtime de Supabase en /whatsapp del panel
3. Conectar Twilio/Meta con WhatsApp real (webhook: `https://clinicas-odontologicas.vercel.app/webhook/whatsapp`)
4. Job cron de recordatorios 24hs antes
5. WhatsApp Business API aprobada (requiere Meta)

## Notas importantes

- **Supabase proyecto único:** `dfnlcmuobvphevyshzqm`. Ignorar `nkbuaackfoxttwfywvjk` (proyecto viejo).
- El service_role key solo va en el backend. Nunca en el front.
- Los tokens de Google Calendar se encriptan con `GOOGLE_TOKEN_ENCRYPTION_KEY` (64 chars hex).
- `node-cron` (recordatorios) no funciona en Vercel serverless — pendiente implementar con cron externo.
- Datos de salud: Ley 26.529 y Ley 25.326. Nunca commitear `.env`.
- `profiles` NO tiene `apellido` ni `matricula`.
- El redirect post-OAuth va a `/configuracion` (sin `/panel/` — TanStack Router, `_panel` es layout sin prefijo URL).
