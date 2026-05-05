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
