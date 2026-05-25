-- ============================================================
-- PASO 1: Ampliar el CHECK constraint de profiles para incluir 'admin'
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT profiles_rol_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_rol_check
  CHECK (rol = ANY (ARRAY['odontologo'::text, 'asistente'::text, 'recepcion'::text, 'admin'::text]));

-- ============================================================
-- PASO 2: Promover un usuario existente a admin
-- Reemplazá el UUID con el id real del usuario
-- (lo encontrás en Supabase > Authentication > Users)
-- ============================================================

UPDATE public.profiles
SET rol = 'admin'
WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- Verificar
SELECT id, nombre, rol FROM public.profiles WHERE rol = 'admin';
