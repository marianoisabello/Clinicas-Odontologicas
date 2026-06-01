-- ============================================================
-- Tablas de Administración / Contabilidad
-- Correr en Supabase SQL Editor
-- ============================================================

-- Cuentas a Pagar: facturas recibidas de proveedores
CREATE TABLE IF NOT EXISTS facturas_proveedor (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proveedor           TEXT NOT NULL,
  concepto            TEXT,
  numero_comprobante  TEXT,
  tipo_factura        TEXT DEFAULT 'B',          -- A, B, C, X, etc.
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE,
  monto               NUMERIC(12,2) NOT NULL,
  moneda              TEXT DEFAULT 'ARS',
  estado              TEXT DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'pagada', 'vencida')),
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Cuentas a Cobrar: facturas emitidas a clientes/pacientes
CREATE TABLE IF NOT EXISTS facturas_cliente (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id         UUID REFERENCES pacientes(id) ON DELETE SET NULL,
  paciente_nombre     TEXT NOT NULL,
  concepto            TEXT,
  numero_comprobante  TEXT,
  tipo_factura        TEXT DEFAULT 'B',
  fecha               DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento   DATE,
  monto               NUMERIC(12,2) NOT NULL,
  moneda              TEXT DEFAULT 'ARS',
  estado              TEXT DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'cobrada', 'vencida')),
  notas               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: habilitar y permitir acceso a usuarios autenticados
ALTER TABLE facturas_proveedor ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_cliente   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON facturas_proveedor
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all" ON facturas_cliente
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
