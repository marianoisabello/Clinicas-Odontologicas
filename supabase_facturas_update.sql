-- ============================================================
-- Ampliar facturas_proveedor para datos del lector de mails
-- Correr en Supabase SQL Editor
-- ============================================================

ALTER TABLE facturas_proveedor
  ADD COLUMN IF NOT EXISTS id_externo       TEXT UNIQUE,   -- ID del mail/factura, para deduplicar
  ADD COLUMN IF NOT EXISTS fecha_recepcion  DATE,          -- Fecha Recepcion del mail
  ADD COLUMN IF NOT EXISTS mail_de          TEXT,          -- De (mail del proveedor)
  ADD COLUMN IF NOT EXISTS mail_para        TEXT,          -- Para (mail receptor)
  ADD COLUMN IF NOT EXISTS importe_neto     NUMERIC(12,2), -- Importe Neto
  ADD COLUMN IF NOT EXISTS impuesto         NUMERIC(12,2), -- Impuesto (IVA, etc.)
  ADD COLUMN IF NOT EXISTS archivo_url      TEXT;          -- Enlace al Archivo

-- Índice para búsquedas por id_externo (ya tiene UNIQUE, esto acelera lookups)
CREATE INDEX IF NOT EXISTS idx_facturas_proveedor_id_externo
  ON facturas_proveedor (id_externo);
