# Contexto del Proyecto — Consultorio Odontológico

## Qué es esto

Monorepo de una aplicación para un consultorio odontológico en Argentina (Dr. Mariano Isabello). Todo corre desde la raíz del repo:

```
Odontologia/
├── consultorio-backend/    # Backend Node.js (Express) — agente WhatsApp + API
├── src/                    # Frontend (React + Vite + TanStack Router)
├── api/                    # Serverless functions de Vercel
│   ├── backend.js          # Entry point del Express app
│   ├── auth-google.js      # Inicia flujo OAuth Google
│   └── auth-google-callback.js  # Callback OAuth Google
├── vercel.json             # Rewrites: backend rutas + SPA catch-all
└── package.json            # Deps frontend + deps backend (fusionados para Vercel)
```

## Deploy — UN SOLO proyecto Vercel

- **URL producción:** `https://clinicas-odontologicas.vercel.app`
- **URL preview (rama main):** `https://clinicas-odontologicas-git-main-pampai.vercel.app`
- Frontend y backend fusionados en el mismo proyecto Vercel
- Backend corre como serverless functions en `/api/`

## Ramas de Git

- `main` — rama activa, contiene todo (frontend + backend fusionados)

## Estado actual

✅ Schema Supabase validado con RLS habilitado
✅ Google Calendar OAuth conectado (escopos: calendar.events, spreadsheets, drive.file, openid, email)
✅ Exportar pacientes a Google Sheets desde menú Pacientes
✅ Menú Profesionales (solo admin): crear, editar, activar/desactivar, invitar por magic link
✅ Invitación por email: abre Gmail con magic link → redirige a `https://clinicas-odontologicas.vercel.app`
✅ Menú Administración: Cuentas a Pagar + Cuentas a Cobrar con ABM completo
✅ Recepción automática de facturas de proveedor vía Google Apps Script (Sheet → Supabase)
✅ Generación de facturas a cliente con combobox de búsqueda de paciente
✅ Envío de facturas por Gmail y WhatsApp con plantillas prellenadas
✅ PDF de factura con impresión desde el navegador
✅ Tratamientos: Catálogo (ABM) + Asignaciones (linkea Paciente + Tratamiento, genera factura automática)
✅ Al crear asignación: genera factura, intenta link MP, abre Gmail automáticamente, toast con WhatsApp
✅ Calendario: campo Tratamiento usa Select del catálogo (auto-completa duración y nombre)
✅ Al crear turno con tratamiento: genera registro automático en `paciente_tratamientos` (estado pendiente, profesional, precio del catálogo)
✅ Asignar/reasignar odontólogo desde el dialog del turno (PUT /admin/turnos/:id/profesional, sync Google Calendar)
✅ Integración Mercado Pago (sandbox): genera link de pago por preferencia, incluido en email y WhatsApp
✅ Webhook MP: marca factura como cobrada al recibir pago aprobado
✅ Dashboard con card de funcionalidades (Google, Apps Script, MP)
✅ Bot de menú WhatsApp: bienvenida → turnos (IA) / horarios
✅ Trigger phrase: bot solo se activa si primer mensaje = `BOT_TRIGGER_PHRASE` (default: `Hola, quiero sacar un turno`)
✅ Provider WhatsApp: **Whapi únicamente** (`lib/whapi.js`, webhook `/webhook/whapi`)
✅ Columnas `bot_estado` y `bot_contexto` agregadas a `conversaciones_whatsapp`
✅ Tabla `leads` + panel `/leads` (listar, estado, convertir a paciente, reenviar WA)
✅ Ingest leads: `POST /leads/ingest` (secret `x-leads-secret`) → guarda lead; WhatsApp catálogo solo si el teléfono normaliza a móvil WA válido
✅ n8n workflow activo: **Sonrisa — Leads ManyChat/Google → App** (`HFGUnR7qfo6mEcfG`)
✅ ManyChat → External Request al webhook n8n (sin Meta Ads por ahora)
⚠️ Supabase Site URL debe estar en `https://clinicas-odontologicas.vercel.app` (no localhost)
⚠️ En Whapi: webhook debe apuntar a `https://clinicas-odontologicas.vercel.app/webhook/whapi`
⚠️ ManyChat: campos CUF `nombre`, `telefono`, `consulta` (opc.); tokens vía `{}` (no literales `{{cuf_…}}`)

## Supabase

- **URL:** `https://dfnlcmuobvphevyshzqm.supabase.co`
- **Anon key** en `.env` como `VITE_SUPABASE_ANON_KEY`
- Authentication → URL Configuration → Site URL: `https://clinicas-odontologicas.vercel.app`
- Authentication → Redirect URLs: `https://clinicas-odontologicas.vercel.app/**`

## Variables de entorno Vercel

| Variable | Valor / Uso |
|----------|-------------|
| `VITE_SUPABASE_URL` | Frontend — URL Supabase |
| `VITE_SUPABASE_ANON_KEY` | Frontend — anon key |
| `VITE_BACKEND_URL` | Frontend — vacía en prod (mismo dominio) |
| `SUPABASE_URL` | Backend — URL Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend — service_role key (bypass RLS) |
| `ANTHROPIC_API_KEY` | Backend — agente IA WhatsApp |
| `WHAPI_TOKEN` | Backend — envío/recepción WhatsApp |
| `WHAPI_API_URL` | Backend — default `https://gate.whapi.cloud` |
| `WHAPI_CHANNEL_ID` | Backend — id del canal Whapi (`DRSTRG-RTDER`) |
| `WHAPI_WEBHOOK_TOKEN` | Backend — opcional, valida header `x-whapi-token` |
| `WHAPI_TEST_NUMBERS` | Backend — opcional, whitelist CSV de números de prueba |
| `BOT_TRIGGER_PHRASE` | Backend — frase exacta para activar el bot |
| `GOOGLE_CLIENT_ID` | Backend — OAuth Google |
| `GOOGLE_CLIENT_SECRET` | Backend |
| `GOOGLE_REDIRECT_URI` | `https://clinicas-odontologicas.vercel.app/api/auth-google-callback` |
| `GOOGLE_TOKEN_ENCRYPTION_KEY` | Backend — 64 chars hex |
| `FRONTEND_URL` | `https://clinicas-odontologicas.vercel.app` |
| `MP_ACCESS_TOKEN` | Backend — Mercado Pago (sandbox: `TEST-...`) |
| `CONSULTORIO_NOMBRE/DIRECCION/TELEFONO/HORARIO/TZ` | Backend — datos del consultorio |
| `LEADS_WEBHOOK_SECRET` | Backend — header `x-leads-secret` en `POST /leads/ingest` |

## Vercel rewrites (vercel.json) — orden importa

```json
/admin/:path*        → /api/backend
/pagos/:path*        → /api/backend
/leads/:path*        → /api/backend
/webhook/:path*      → /api/backend
/test/:path*         → /api/backend
/auth/google/:path*  → /api/backend
/health              → /api/backend
/((?!api/).*)        → /index.html   ← SPA catch-all (siempre al final)
```

## Backend — estructura

```
consultorio-backend/
├── src/
│   ├── index.js              # Express app (exporta `default app`)
│   ├── agent/                # Agente IA Claude para WhatsApp
│   │   ├── index.js
│   │   ├── executor.js
│   │   └── tools.js
│   ├── lib/
│   │   ├── supabase.js       # Cliente service_role (bypass RLS)
│   │   ├── twilio.js         # (legacy, no usado)
│   │   ├── meta-whatsapp.js  # (legacy, no usado)
│   │   ├── ultramsg.js       # (legacy, no usado)
│   │   └── whapi.js          # Provider WhatsApp activo
│   ├── middleware/
│   │   └── auth.js           # requireAuth (cualquier user) + requireAdmin
│   ├── routes/
│   │   ├── test.js
│   │   ├── google.js         # OAuth Google + status + exportar-pacientes
│   │   ├── admin.js          # CRUD profesionales + invitar magic link
│   │   ├── pagos.js          # Mercado Pago: crear-link + webhook
│   │   └── leads.js          # ingest (webhook) + convert + reenviar WA
│   └── services/
│       ├── pacientes.js
│       ├── turnos.js
│       ├── conversaciones.js
│       └── google/
│           ├── oauth.js      # getAuthUrl, exchangeCode, encryptToken, getValidAccessToken
│           ├── calendar.js
│           └── sheets.js     # exportarPacientesASheet()
└── .env
```

## Frontend — rutas del panel

```
src/routes/
├── __root.tsx
├── index.tsx                        # Landing
├── login.tsx
├── _panel.tsx                       # Layout panel (nav lateral)
├── _panel.dashboard.tsx             # Stats + funcionalidades destacadas
├── _panel.calendario.tsx            # Calendario de turnos
├── _panel.pacientes.tsx             # ABM pacientes + exportar Sheet
├── _panel.pacientes.$id.tsx         # Ficha detalle paciente
├── _panel.tratamientos.tsx          # Catálogo + Asignaciones (genera factura + link MP)
├── _panel.administracion.tsx        # Cuentas a Pagar + Cuentas a Cobrar + envío Gmail/WA/MP
├── _panel.whatsapp.tsx              # Conversaciones WhatsApp
├── _panel.leads.tsx                 # Leads ManyChat/Google/web → convertir a paciente
├── _panel.consultas.tsx             # Consultas web
├── _panel.configuracion.tsx         # Config consultorio + Google Calendar
└── _panel.profesionales.tsx         # Solo admin: CRUD usuarios + invitar
```

## Endpoints del backend

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| GET | `/auth/google/connect` | requireAuth | Inicia OAuth Google |
| GET | `/auth/google/status` | requireAuth | Estado conexión Google |
| POST | `/auth/google/disconnect` | requireAuth | Desconecta Google |
| POST | `/auth/google/exportar-pacientes` | requireAuth | Exporta pacientes a Sheet |
| GET | `/admin/profesionales` | requireAdmin | Lista profesionales |
| POST | `/admin/profesionales` | requireAdmin | Crea usuario Auth + perfil |
| PUT | `/admin/profesionales/:id` | requireAdmin | Edita perfil |
| DELETE | `/admin/profesionales/:id` | requireAdmin | Desactiva profesional |
| POST | `/admin/profesionales/:id/invitar` | requireAdmin | Genera magic link |
| PUT | `/admin/turnos/:id/profesional` | requireAuth | Asigna/reasigna profesional a turno + sync Google Calendar |
| POST | `/pagos/crear-link` | requireAuth | Crea preferencia Mercado Pago |
| POST | `/webhook/mp` | — | Webhook MP (marca cobrada) |
| POST | `/webhook/whapi` | — | Webhook Whapi (único) |
| POST | `/leads/ingest` | `x-leads-secret` | Crea/actualiza lead; WA catálogo solo si teléfono WA válido |
| POST | `/leads/:id/convert` | requireAuth | Convierte lead → paciente |
| POST | `/leads/:id/reenviar-whatsapp` | requireAuth | Reenvía catálogo de servicios por Whapi |

## Leads multi-canal (ManyChat / Google / n8n)

**Flujo:** ManyChat (o Google Form) → n8n webhook → `POST /leads/ingest` → Supabase `leads` + mail a `marianoisabello@pampai.com` → (opcional) WhatsApp catálogo vía Whapi.

| Pieza | Detalle |
|-------|---------|
| n8n instance | `https://pampaiargentina.app.n8n.cloud` |
| Workflow | `Sonrisa — Leads ManyChat/Google → App` · id `HFGUnR7qfo6mEcfG` · **activo** |
| Webhook prod | `POST https://pampaiargentina.app.n8n.cloud/webhook/sonrisa-leads` |
| Credencial header | `Sonrisa Leads Webhook Secret` (`httpHeaderAuth`, header `x-leads-secret`) |
| Body mínimo ManyChat | `{ "nombre", "telefono", "consulta?", "fuente":"manychat", "external_id" }` |
| Canal | Fijo `manychat` cuando `fuente=manychat`; `email`/`campania` opcionales |
| Teléfono | Se **guarda siempre**; WhatsApp/chatbox solo si normaliza a móvil usable (≥10 dígitos AR). Si no → lead sin WA (`whatsapp.skipped`) |
| Migración | `supabase/migrations/20260721000000_leads.sql` |
| Panel | `/leads` — estados: `nuevo`, `contactado`, `agendado`, `descartado`, `paciente` |

**ManyChat CUF sugeridos:** `nombre`, `telefono`, `consulta` (opcional). Insertar variables con `{}` (no tipeados a mano). External Request **después** de guardar respuestas.

**Google (pendiente de cablear):** Form → Apps Script `onFormSubmit` al mismo webhook, o Sheet + trigger n8n; `fuente: "google"`.

**No usar Meta Ads** hasta autorización del negocio.

## Tablas Supabase relevantes

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Usuarios del sistema (id, nombre, email, rol, especialidad, color_calendario, activo) |
| `pacientes` | Pacientes del consultorio |
| `turnos` | Citas agendadas |
| `tratamientos` | Catálogo de tratamientos |
| `paciente_tratamientos` | Asignación paciente ↔ tratamiento (genera factura automática) |
| `facturas_cliente` | Facturas emitidas a pacientes |
| `facturas_proveedor` | Facturas recibidas de proveedores |
| `configuracion` | Datos del consultorio (nombre, dirección, teléfono, email) |
| `conversaciones_whatsapp` | Conversaciones WhatsApp |
| `google_calendar_credentials` | Tokens OAuth Google (encriptados) |
| `leads` | Capturas marketing (ManyChat, Google, web, etc.) → convertir a paciente |

**SQL pendientes de correr (si no se hicieron):**
- `supabase_paciente_tratamientos.sql` — tabla `paciente_tratamientos` con RLS
- `supabase/migrations/20260721000000_leads.sql` — si la tabla `leads` aún no existe en el proyecto

## Roles del sistema

| Rol | Acceso |
|-----|--------|
| `admin` | Todo el panel + Profesionales |
| `odontologo` | Todo excepto Profesionales |
| `asistente` | Todo excepto Profesionales |
| `recepcion` | Todo excepto Profesionales |

## Mercado Pago

- SDK: `mercadopago` v3 (instalado en root `package.json` Y en `consultorio-backend/package.json`)
- Sandbox: usar `MP_ACCESS_TOKEN` que empiece con `TEST-`
- El backend detecta sandbox automáticamente y devuelve `sandbox_init_point`
- Webhook MP en `/webhook/mp` marca la `facturas_cliente` como `cobrada` al recibir pago aprobado

## Google Apps Script — sincronización facturas

Script en Google Sheets que lee filas y hace upsert en `facturas_proveedor` vía Supabase REST API.
Campos sincronizados: `id_externo` (UNIQUE), `fecha_recepcion`, `mail_de`, `mail_para`, `fecha`, `fecha_vencimiento`, `proveedor`, `monto`, `importe_neto`, `impuesto`, `moneda`, `archivo_url`.
Columna O del sheet se marca con "✓ Sincronizado" al procesar.
Requiere Script Properties: `SUPABASE_URL` y `SUPABASE_KEY` (service_role).

## Invitación de profesionales

- Admin genera magic link vía `POST /admin/profesionales/:id/invitar`
- Supabase genera link con `redirectTo: https://clinicas-odontologicas.vercel.app`
- Frontend abre Gmail con plantilla que incluye el link y descripción de 3 funciones del sistema
- **Requisito Supabase:** Site URL y Redirect URLs deben apuntar a la URL de producción (no localhost)

## Cómo levantar localmente

```bash
# Backend
cd consultorio-backend && npm start   # puerto 3000

# Frontend (desde la raíz)
npm run dev   # puerto 5173
```

**.env raíz:**
```
VITE_BACKEND_URL=http://localhost:3000
VITE_SUPABASE_URL=https://dfnlcmuobvphevyshzqm.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

**.env consultorio-backend:**
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
FRONTEND_URL=http://localhost:5173
MP_ACCESS_TOKEN=TEST-...
# + otras vars de Google, Whapi, Anthropic
```

## Próximos pasos

1. Terminar External Request ManyChat en flujo live (no solo Test Request) con teléfono real → WA catálogo
2. Cablear Google Form / Sheet al webhook n8n (`fuente: google`)
3. MP producción: cambiar `MP_ACCESS_TOKEN` por token real cuando esté listo
4. Job cron de recordatorios de turnos (`node-cron` no funciona en Vercel serverless — usar cron externo)
5. Meta Ads: recién cuando el negocio autorice (hoy todo vía ManyChat)

## Notas importantes

- El service_role key solo va en el backend. **Nunca en el front.**
- Los tokens de Google se encriptan con `GOOGLE_TOKEN_ENCRYPTION_KEY` (64 chars hex).
- `profiles` NO tiene `apellido` ni `matricula`.
- TanStack Router: `_panel` es layout, sin prefijo en la URL (la ruta es `/dashboard` no `/panel/dashboard`).
- Supabase proyecto único: `dfnlcmuobvphevyshzqm`. Ignorar proyectos viejos.
- Datos de salud: Ley 26.529 y Ley 25.326. Nunca commitear `.env`.
- No commitear `consultorio-backend/.leads_secret.tmp` (está en `.gitignore`).
- WhatsApp activo: solo Whapi. Legacy Twilio/Meta/UltraMsg en `lib/` no se usan.
