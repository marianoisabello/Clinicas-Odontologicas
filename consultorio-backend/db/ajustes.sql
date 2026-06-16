-- =====================================================
-- AJUSTES SQL POST-LOVABLE
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- DESPUÉS de que Lovable haya generado las tablas base.
-- Agrega columnas, índices y políticas que el back-end necesita.
-- =====================================================

-- 1. Columna para evitar enviar recordatorios duplicados
ALTER TABLE turnos
  ADD COLUMN IF NOT EXISTS recordatorio_enviado boolean DEFAULT false;

-- 2. Índices para queries frecuentes del agente
CREATE INDEX IF NOT EXISTS idx_turnos_fecha_estado
  ON turnos (fecha_hora_inicio, estado);

CREATE INDEX IF NOT EXISTS idx_turnos_paciente_fecha
  ON turnos (paciente_id, fecha_hora_inicio DESC);

CREATE INDEX IF NOT EXISTS idx_pacientes_telefono
  ON pacientes (telefono);

CREATE INDEX IF NOT EXISTS idx_conversaciones_telefono
  ON conversaciones_whatsapp (telefono);

CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion_ts
  ON mensajes_whatsapp (conversacion_id, timestamp DESC);

-- 3. Constraint de unicidad para teléfono (evitar duplicados de pacientes)
-- Si Lovable no lo creó:
ALTER TABLE pacientes
  ADD CONSTRAINT pacientes_telefono_unico UNIQUE (telefono);

-- 4. RLS: el back-end usa service_role (bypass RLS).
-- Para el front (Lovable + auth de Supabase) las políticas deben permitir
-- que cualquier usuario autenticado del consultorio lea/escriba.
-- Esto asume que SOLO el equipo del consultorio se autentica.

ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historia_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversaciones_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE tratamientos ENABLE ROW LEVEL SECURITY;

-- Política genérica: usuarios autenticados pueden todo
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'pacientes', 'turnos', 'historia_clinica',
    'conversaciones_whatsapp', 'mensajes_whatsapp', 'tratamientos'
  ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "consultorio_full_access" ON %I', t
    );
    EXECUTE format(
      'CREATE POLICY "consultorio_full_access" ON %I
       FOR ALL TO authenticated
       USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- 5. Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pacientes_updated_at ON pacientes;
CREATE TRIGGER pacientes_updated_at
  BEFORE UPDATE ON pacientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Tabla de credenciales de Google Calendar por profesional
CREATE TABLE IF NOT EXISTS google_calendar_credentials (
  profesional_id  uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  google_email    text,
  access_token    text NOT NULL,
  refresh_token   text NOT NULL,
  expires_at      timestamp with time zone NOT NULL,
  calendar_id     text NOT NULL DEFAULT 'primary',
  connected_at    timestamp with time zone DEFAULT now(),
  last_sync_at    timestamp with time zone DEFAULT now()
);

-- Solo los usuarios autenticados (staff del consultorio) pueden ver/modificar sus propias credenciales
ALTER TABLE google_calendar_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profesional manage own credentials"
  ON google_calendar_credentials
  FOR ALL TO authenticated
  USING (profesional_id = auth.uid())
  WITH CHECK (profesional_id = auth.uid());

-- El service_role del backend necesita acceso total
GRANT ALL ON TABLE google_calendar_credentials TO service_role;

-- 7. Columna bot_estado y bot_contexto en conversaciones_whatsapp (si no existen)
ALTER TABLE conversaciones_whatsapp
  ADD COLUMN IF NOT EXISTS bot_estado text DEFAULT 'inicio',
  ADD COLUMN IF NOT EXISTS bot_contexto jsonb DEFAULT '{}';
