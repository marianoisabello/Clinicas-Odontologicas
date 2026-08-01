-- Leads multi-canal (Instagram, TikTok, Google, ManyChat, web, WhatsApp)
-- Destino unificado para n8n / ManyChat / form de contacto

CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text,
  telefono text,
  email text,
  fuente text NOT NULL DEFAULT 'otro'
    CHECK (fuente IN (
      'instagram', 'facebook', 'tiktok', 'google',
      'manychat', 'web', 'whatsapp', 'otro'
    )),
  canal text,                    -- detalle: ig_dm, lead_ad, comment, gbp, etc.
  campania text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  mensaje text,
  interes text,                  -- blanqueamiento, ortodoncia, etc.
  estado text NOT NULL DEFAULT 'nuevo'
    CHECK (estado IN (
      'nuevo', 'contactado', 'agendado', 'descartado', 'paciente'
    )),
  external_id text,              -- id en Meta / TikTok / ManyChat
  raw jsonb DEFAULT '{}'::jsonb, -- payload original del canal
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_external_fuente_uidx
  ON public.leads (fuente, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS leads_telefono_idx ON public.leads (telefono);
CREATE INDEX IF NOT EXISTS leads_estado_idx ON public.leads (estado);
CREATE INDEX IF NOT EXISTS leads_fuente_idx ON public.leads (fuente);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Staff autenticado: CRUD
DROP POLICY IF EXISTS "auth read leads" ON public.leads;
CREATE POLICY "auth read leads" ON public.leads
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth insert leads" ON public.leads;
CREATE POLICY "auth insert leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth update leads" ON public.leads;
CREATE POLICY "auth update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "auth delete leads" ON public.leads;
CREATE POLICY "auth delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);

-- Inserción pública vía anon (form web / n8n con anon key solo insert)
-- Preferible: n8n con service_role. Anon insert limitado para formularios.
DROP POLICY IF EXISTS "anon insert leads" ON public.leads;
CREATE POLICY "anon insert leads" ON public.leads
  FOR INSERT TO anon WITH CHECK (true);

GRANT ALL ON TABLE public.leads TO anon;
GRANT ALL ON TABLE public.leads TO authenticated;
GRANT ALL ON TABLE public.leads TO service_role;

COMMENT ON TABLE public.leads IS 'Leads de marketing multi-canal (n8n, ManyChat, ads, web)';
