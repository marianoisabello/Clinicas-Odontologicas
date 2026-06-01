-- ============================================================
-- Tabla: paciente_tratamientos
-- Vincula Paciente ↔ Tratamiento, genera factura automática
-- Correr en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS paciente_tratamientos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id    UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  tratamiento_id UUID NOT NULL REFERENCES tratamientos(id),
  profesional_id UUID REFERENCES profiles(id),
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  precio_final   NUMERIC(12,2) NOT NULL,
  estado         TEXT DEFAULT 'completado'
                 CHECK (estado IN ('pendiente','en_curso','completado','cancelado')),
  notas          TEXT,
  factura_id     UUID REFERENCES facturas_cliente(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE paciente_tratamientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON paciente_tratamientos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
