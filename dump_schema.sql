


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'dentista',
    'recepcion',
    'paciente'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."conversacion_estado" AS ENUM (
    'activa',
    'esperando_humano',
    'cerrada'
);


ALTER TYPE "public"."conversacion_estado" OWNER TO "postgres";


CREATE TYPE "public"."mensaje_direccion" AS ENUM (
    'entrante',
    'saliente'
);


ALTER TYPE "public"."mensaje_direccion" OWNER TO "postgres";


CREATE TYPE "public"."turno_estado" AS ENUM (
    'pendiente',
    'confirmado',
    'cancelado',
    'asistio',
    'no_asistio'
);


ALTER TYPE "public"."turno_estado" OWNER TO "postgres";


CREATE TYPE "public"."turno_origen" AS ENUM (
    'whatsapp',
    'manual',
    'web'
);


ALTER TYPE "public"."turno_origen" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, nombre, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)), 'odontologo')
  on conflict (id) do nothing;
  return new;
end; $$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."configuracion" (
    "id" integer DEFAULT 1 NOT NULL,
    "nombre_consultorio" "text" DEFAULT 'Sonrisa'::"text",
    "telefono" "text" DEFAULT '+5491100000000'::"text",
    "whatsapp" "text" DEFAULT '5491100000000'::"text",
    "email" "text" DEFAULT 'contacto@sonrisa.com.ar'::"text",
    "direccion" "text" DEFAULT 'Av. Corrientes 1234, CABA'::"text",
    "horario" "text" DEFAULT 'Lun a Vie 9 a 20hs · Sáb 9 a 13hs'::"text",
    "instagram" "text" DEFAULT 'https://instagram.com'::"text",
    "facebook" "text" DEFAULT 'https://facebook.com'::"text",
    "about" "text" DEFAULT 'Somos un consultorio odontológico moderno con más de 10 años de experiencia, comprometido con tu salud bucal y tu sonrisa.'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "configuracion_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."configuracion" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultas_web" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "telefono" "text" NOT NULL,
    "mensaje" "text" NOT NULL,
    "leida" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."consultas_web" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversaciones_whatsapp" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paciente_id" "uuid",
    "telefono" "text" NOT NULL,
    "ultimo_mensaje" "text",
    "ultima_actividad" timestamp with time zone DEFAULT "now"(),
    "estado" "public"."conversacion_estado" DEFAULT 'activa'::"public"."conversacion_estado",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversaciones_whatsapp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."historia_clinica" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paciente_id" "uuid" NOT NULL,
    "fecha" "date" DEFAULT CURRENT_DATE,
    "profesional_id" "uuid",
    "pieza_dental" "text",
    "diagnostico" "text",
    "tratamiento_realizado" "text",
    "observaciones" "text",
    "archivos" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."historia_clinica" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mensajes_whatsapp" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversacion_id" "uuid" NOT NULL,
    "direccion" "public"."mensaje_direccion" NOT NULL,
    "contenido" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    "procesado_por_ia" boolean DEFAULT false
);


ALTER TABLE "public"."mensajes_whatsapp" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pacientes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "apellido" "text" NOT NULL,
    "dni" "text",
    "fecha_nacimiento" "date",
    "telefono" "text",
    "email" "text",
    "obra_social" "text",
    "numero_afiliado" "text",
    "alergias" "text",
    "medicacion_actual" "text",
    "observaciones" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pacientes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "rol" "text" DEFAULT 'odontologo'::"text" NOT NULL,
    "color_calendario" "text" DEFAULT '#0F4C5C'::"text",
    "especialidad" "text",
    "bio" "text",
    "foto_url" "text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_rol_check" CHECK (("rol" = ANY (ARRAY['odontologo'::"text", 'asistente'::"text", 'recepcion'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."profesionales_publicos" WITH ("security_invoker"='on') AS
 SELECT "id",
    "nombre",
    "especialidad",
    "bio",
    "foto_url"
   FROM "public"."profiles"
  WHERE (("rol" = 'odontologo'::"text") AND ("activo" = true));


ALTER VIEW "public"."profesionales_publicos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tratamientos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "duracion_minutos" integer DEFAULT 30 NOT NULL,
    "precio" numeric(10,2),
    "descripcion" "text",
    "icono" "text" DEFAULT 'sparkles'::"text",
    "activo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tratamientos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."turnos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "paciente_id" "uuid" NOT NULL,
    "profesional_id" "uuid",
    "fecha_hora_inicio" timestamp with time zone NOT NULL,
    "fecha_hora_fin" timestamp with time zone NOT NULL,
    "tratamiento" "text",
    "estado" "public"."turno_estado" DEFAULT 'pendiente'::"public"."turno_estado",
    "origen" "public"."turno_origen" DEFAULT 'manual'::"public"."turno_origen",
    "notas" "text",
    "recordatorio_enviado" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."turnos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."configuracion"
    ADD CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultas_web"
    ADD CONSTRAINT "consultas_web_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversaciones_whatsapp"
    ADD CONSTRAINT "conversaciones_whatsapp_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."historia_clinica"
    ADD CONSTRAINT "historia_clinica_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mensajes_whatsapp"
    ADD CONSTRAINT "mensajes_whatsapp_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_telefono_key" UNIQUE ("telefono");



ALTER TABLE ONLY "public"."pacientes"
    ADD CONSTRAINT "pacientes_telefono_unico" UNIQUE ("telefono");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tratamientos"
    ADD CONSTRAINT "tratamientos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."turnos"
    ADD CONSTRAINT "turnos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_conv_telefono" ON "public"."conversaciones_whatsapp" USING "btree" ("telefono");



CREATE INDEX "idx_msg_conv" ON "public"."mensajes_whatsapp" USING "btree" ("conversacion_id", "timestamp" DESC);



CREATE INDEX "idx_msg_conv_ts" ON "public"."mensajes_whatsapp" USING "btree" ("conversacion_id", "timestamp" DESC);



CREATE INDEX "idx_pacientes_telefono" ON "public"."pacientes" USING "btree" ("telefono");



CREATE INDEX "idx_turnos_fecha_estado" ON "public"."turnos" USING "btree" ("fecha_hora_inicio", "estado");



CREATE INDEX "idx_turnos_inicio" ON "public"."turnos" USING "btree" ("fecha_hora_inicio", "estado");



CREATE INDEX "idx_turnos_paciente" ON "public"."turnos" USING "btree" ("paciente_id", "fecha_hora_inicio" DESC);



ALTER TABLE ONLY "public"."conversaciones_whatsapp"
    ADD CONSTRAINT "conversaciones_whatsapp_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."historia_clinica"
    ADD CONSTRAINT "historia_clinica_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."historia_clinica"
    ADD CONSTRAINT "historia_clinica_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mensajes_whatsapp"
    ADD CONSTRAINT "mensajes_whatsapp_conversacion_id_fkey" FOREIGN KEY ("conversacion_id") REFERENCES "public"."conversaciones_whatsapp"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."turnos"
    ADD CONSTRAINT "turnos_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "public"."pacientes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."turnos"
    ADD CONSTRAINT "turnos_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "admins manage roles" ON "public"."user_roles" USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "anon insert consultas" ON "public"."consultas_web" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "anon read configuracion" ON "public"."configuracion" FOR SELECT TO "anon" USING (true);



CREATE POLICY "anon read tratamientos activos" ON "public"."tratamientos" FOR SELECT TO "anon" USING (("activo" = true));



CREATE POLICY "auth all conv" ON "public"."conversaciones_whatsapp" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth all historia" ON "public"."historia_clinica" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth all msg" ON "public"."mensajes_whatsapp" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth all pacientes" ON "public"."pacientes" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth all turnos" ON "public"."turnos" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "auth delete consultas" ON "public"."consultas_web" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth delete profiles" ON "public"."profiles" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth delete tratamientos" ON "public"."tratamientos" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "auth insert profiles" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth insert tratamientos" ON "public"."tratamientos" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "auth read configuracion" ON "public"."configuracion" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth read consultas" ON "public"."consultas_web" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth read profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth read tratamientos" ON "public"."tratamientos" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "auth update configuracion" ON "public"."configuracion" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "auth update consultas" ON "public"."consultas_web" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "auth update tratamientos" ON "public"."tratamientos" FOR UPDATE TO "authenticated" USING (true);



ALTER TABLE "public"."configuracion" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultas_web" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversaciones_whatsapp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."historia_clinica" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mensajes_whatsapp" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pacientes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tratamientos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."turnos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users read own roles" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";


















GRANT ALL ON TABLE "public"."configuracion" TO "anon";
GRANT ALL ON TABLE "public"."configuracion" TO "authenticated";
GRANT ALL ON TABLE "public"."configuracion" TO "service_role";



GRANT ALL ON TABLE "public"."consultas_web" TO "anon";
GRANT ALL ON TABLE "public"."consultas_web" TO "authenticated";
GRANT ALL ON TABLE "public"."consultas_web" TO "service_role";



GRANT ALL ON TABLE "public"."conversaciones_whatsapp" TO "anon";
GRANT ALL ON TABLE "public"."conversaciones_whatsapp" TO "authenticated";
GRANT ALL ON TABLE "public"."conversaciones_whatsapp" TO "service_role";



GRANT ALL ON TABLE "public"."historia_clinica" TO "anon";
GRANT ALL ON TABLE "public"."historia_clinica" TO "authenticated";
GRANT ALL ON TABLE "public"."historia_clinica" TO "service_role";



GRANT ALL ON TABLE "public"."mensajes_whatsapp" TO "anon";
GRANT ALL ON TABLE "public"."mensajes_whatsapp" TO "authenticated";
GRANT ALL ON TABLE "public"."mensajes_whatsapp" TO "service_role";



GRANT ALL ON TABLE "public"."pacientes" TO "anon";
GRANT ALL ON TABLE "public"."pacientes" TO "authenticated";
GRANT ALL ON TABLE "public"."pacientes" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."profesionales_publicos" TO "anon";
GRANT ALL ON TABLE "public"."profesionales_publicos" TO "authenticated";
GRANT ALL ON TABLE "public"."profesionales_publicos" TO "service_role";



GRANT ALL ON TABLE "public"."tratamientos" TO "anon";
GRANT ALL ON TABLE "public"."tratamientos" TO "authenticated";
GRANT ALL ON TABLE "public"."tratamientos" TO "service_role";



GRANT ALL ON TABLE "public"."turnos" TO "anon";
GRANT ALL ON TABLE "public"."turnos" TO "authenticated";
GRANT ALL ON TABLE "public"."turnos" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































