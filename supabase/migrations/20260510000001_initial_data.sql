SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict DP8713KwaTPx8JQeNelNjwO7Z1AoEU8J3KX6kR5srOJ8kTcwZ0kCLUZdtLiQyuM

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', 'authenticated', 'authenticated', 'marianoisabello@gmail.com', '$2a$10$GmXkrne2dpc///EQXIUYGeczRdb4kHqjaX3eYkJdZtx27FVHYVy5a', '2026-05-05 20:43:28.961353+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-06 21:35:42.07914+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2026-05-05 20:43:28.940353+00', '2026-05-07 14:39:12.023043+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('c0394cb8-33a1-4d17-8a13-a447a7dad0d2', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '{"sub": "c0394cb8-33a1-4d17-8a13-a447a7dad0d2", "email": "marianoisabello@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-05 20:43:28.9559+00', '2026-05-05 20:43:28.955962+00', '2026-05-05 20:43:28.955962+00', 'c1d00711-f06b-4090-ac95-f0aef0349b9c');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('7772a9ef-0016-464f-bedb-33eab3e9a6ca', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-06 21:35:42.080257+00', '2026-05-07 14:39:12.033094+00', NULL, 'aal1', NULL, '2026-05-07 14:39:12.032987', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '181.44.118.4', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('7772a9ef-0016-464f-bedb-33eab3e9a6ca', '2026-05-06 21:35:42.104038+00', '2026-05-06 21:35:42.104038+00', 'password', '2780a00a-7e23-498e-ad0e-5741e8cac255');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 3, 'rns2ghxajwp6', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', true, '2026-05-06 21:35:42.097802+00', '2026-05-06 23:06:16.798429+00', NULL, '7772a9ef-0016-464f-bedb-33eab3e9a6ca'),
	('00000000-0000-0000-0000-000000000000', 4, 'la7xijmfe3np', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', true, '2026-05-06 23:06:16.809684+00', '2026-05-07 00:33:50.39784+00', 'rns2ghxajwp6', '7772a9ef-0016-464f-bedb-33eab3e9a6ca'),
	('00000000-0000-0000-0000-000000000000', 5, 'vexfmyfbxl4n', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', true, '2026-05-07 00:33:50.403593+00', '2026-05-07 14:39:12.0034+00', 'la7xijmfe3np', '7772a9ef-0016-464f-bedb-33eab3e9a6ca'),
	('00000000-0000-0000-0000-000000000000', 6, 'ot7p745swprf', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', false, '2026-05-07 14:39:12.020155+00', '2026-05-07 14:39:12.020155+00', 'vexfmyfbxl4n', '7772a9ef-0016-464f-bedb-33eab3e9a6ca');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: configuracion; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."configuracion" ("id", "nombre_consultorio", "telefono", "whatsapp", "email", "direccion", "horario", "instagram", "facebook", "about", "updated_at") VALUES
	(1, 'Sonrisa', '+5491100000000', '5491100000000', 'contacto@sonrisa.com.ar', 'Av. Corrientes 1234, CABA', 'Lun a Vie 9 a 20hs · Sáb 9 a 13hs', 'https://instagram.com', 'https://facebook.com', 'Somos un consultorio odontológico moderno con más de 10 años de experiencia, comprometido con tu salud bucal y tu sonrisa.', '2026-05-05 20:53:38.467669+00');


--
-- Data for Name: consultas_web; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."consultas_web" ("id", "nombre", "telefono", "mensaje", "leida", "created_at") VALUES
	('88d7e37a-c25f-42ac-be20-fd8c60e4d9f4', 'Ana Pereyra', '+5491145678920', 'Hola, quería consultar por blanqueamiento', false, '2026-05-05 20:53:38.467669+00'),
	('da4e8525-89df-4550-b605-6b5b68f1fe26', 'Roberto Silva', '+5491145678921', 'Necesito un turno urgente, me duele una muela', false, '2026-05-05 20:53:38.467669+00');


--
-- Data for Name: pacientes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."pacientes" ("id", "nombre", "apellido", "dni", "fecha_nacimiento", "telefono", "email", "obra_social", "numero_afiliado", "alergias", "medicacion_actual", "observaciones", "created_at", "updated_at") VALUES
	('5763feee-8f6a-4e35-aa7e-8d2a1e3c8d0e', 'María', 'González', '32145678', '1985-03-15', '+5491145678901', 'maria.gonzalez@gmail.com', 'OSDE', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('fbf4a584-4c3e-40b3-b79a-21c3d38f6831', 'Juan', 'Pérez', '28456789', '1980-07-22', '+5491145678902', 'juan.perez@gmail.com', 'Swiss Medical', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('43483148-b28b-4e77-abf4-8c9c552e9a8a', 'Sofía', 'Martínez', '38765432', '1995-11-10', '+5491145678903', 'sofia.m@gmail.com', 'Galeno', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('01dff60c-005d-4090-848e-1ac1fcbb69f1', 'Carlos', 'Rodríguez', '25678901', '1975-01-30', '+5491145678904', 'crodriguez@gmail.com', 'IOMA', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('307ce16d-36cc-4c94-9ffe-a62935c539bc', 'Lucía', 'Fernández', '40123456', '2000-05-18', '+5491145678905', 'lucia.f@gmail.com', 'PAMI', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('8c517636-d49d-415b-b43c-a6479bcfe3b8', 'Diego', 'López', '30987654', '1983-09-25', '+5491145678906', 'diego.lopez@gmail.com', 'OSDEPYM', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('3c8f96fe-1708-4cb0-ac48-448c6d6d05bf', 'Camila', 'Sánchez', '37456123', '1992-12-03', '+5491145678907', 'camila.s@gmail.com', 'Medicus', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('8edd2bfb-d26a-424c-be2c-9b1f69858f5e', 'Martín', 'Romero', '29876543', '1978-04-14', '+5491145678908', 'mromero@gmail.com', 'Sancor Salud', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('1753cec4-8553-4ea4-8ee8-7db655472348', 'Valentina', 'Díaz', '41234567', '2001-08-07', '+5491145678909', 'valentina.d@gmail.com', 'OSDE', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('08935c8d-bead-4348-bd6b-30f4897dc181', 'Federico', 'Torres', '27345678', '1976-02-19', '+5491145678910', 'fede.torres@gmail.com', 'Swiss Medical', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('28453eca-af74-478f-acba-6d8435878e80', 'Florencia', 'Ruiz', '36789012', '1991-06-28', '+5491145678911', 'flor.ruiz@gmail.com', 'Galeno', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('a67fbc04-2e63-4831-a92c-f80c86e8e9bc', 'Nicolás', 'Álvarez', '31234567', '1986-10-12', '+5491145678912', 'nico.alvarez@gmail.com', 'IOMA', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('301645d4-2e0c-4090-84f6-f4ba7119c17f', 'Agustina', 'Castro', '39456789', '1996-03-21', '+5491145678913', 'agustina.c@gmail.com', 'PAMI', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('7962cbae-1cfd-4223-be08-29c429a471fd', 'Tomás', 'Méndez', '26789012', '1974-12-05', '+5491145678914', 'tmendez@gmail.com', 'Medicus', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('2b3e44d9-ecf3-42d8-aa07-89a0a6ffc86b', 'Julieta', 'Herrera', '40567890', '1999-09-09', '+5491145678915', 'julieta.h@gmail.com', 'OSDE', NULL, NULL, NULL, NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00'),
	('899a0231-1ef8-4efb-8a8c-5ee68c6a4439', 'Carlos', 'Méndez', NULL, NULL, '+5491198765432', NULL, 'OSDE', NULL, NULL, NULL, NULL, '2026-05-05 21:42:33.52187+00', '2026-05-05 21:42:33.52187+00'),
	('91fea7c6-3843-4590-a335-be18ccb84917', 'Juan', 'García', NULL, NULL, '+5491144390930', NULL, 'particular', NULL, NULL, NULL, NULL, '2026-05-05 21:56:35.714697+00', '2026-05-05 21:56:35.714697+00'),
	('09e4c7ff-3193-4599-952e-640054534e66', 'María', 'López', NULL, NULL, '+5491199999001', NULL, 'particular', NULL, NULL, NULL, NULL, '2026-05-05 22:03:04.598967+00', '2026-05-05 22:03:04.598967+00'),
	('9fcd24b5-8dfe-4948-92a2-d70adaf80a49', 'Carlos', 'Rodríguez', NULL, NULL, '+5491199999002', NULL, 'OSDE', NULL, NULL, NULL, NULL, '2026-05-05 22:07:07.291277+00', '2026-05-05 22:07:07.291277+00'),
	('fbf98694-03ca-4df1-8b2d-afa799bd7259', 'Pedro', 'Sánchez', NULL, NULL, '+5491199999003', NULL, 'OSDE', NULL, NULL, NULL, NULL, '2026-05-05 22:08:48.264709+00', '2026-05-05 22:08:48.264709+00'),
	('a4e4b626-2b84-4b28-af4a-9b24c509a96e', 'Juan', 'Perez', NULL, NULL, '+5491100000001', NULL, 'OSDE', NULL, NULL, NULL, NULL, '2026-05-05 22:42:40.681693+00', '2026-05-05 22:42:40.681693+00');


--
-- Data for Name: conversaciones_whatsapp; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."conversaciones_whatsapp" ("id", "paciente_id", "telefono", "ultimo_mensaje", "ultima_actividad", "estado", "created_at") VALUES
	('9add7f6b-1660-480c-bd9c-4fa9f41904d6', '5763feee-8f6a-4e35-aa7e-8d2a1e3c8d0e', '+5491145678901', 'Perfecto, te espero el martes', '2026-05-05 20:53:38.467669+00', 'activa', '2026-05-05 20:53:38.467669+00'),
	('991f6d60-329a-4c5e-a549-05240f2e5af7', NULL, '+5491199999991', 'Necesito hablar con una persona, por favor', '2026-05-05 20:53:38.467669+00', 'esperando_humano', '2026-05-05 20:53:38.467669+00'),
	('9313207d-547c-4b4b-99ea-e8f886cd95c5', NULL, '+5491199999992', 'Gracias!', '2026-05-05 20:53:38.467669+00', 'cerrada', '2026-05-05 20:53:38.467669+00'),
	('356d84a6-6287-498f-8efb-9ec1072d5719', 'a4e4b626-2b84-4b28-af4a-9b24c509a96e', '+5491100000001', 'Listo, tu turno quedó reservado ✅

**Limpieza dental** el **jueves 7 de mayo a las 10:00hs** en Av. Corrientes 1234, CABA.

¡Te esperamos, Juan! 🦷', '2026-05-05 22:45:16.046+00', 'activa', '2026-05-05 22:42:41.285666+00'),
	('9b6e01bc-328c-4ce8-a741-f40c2d3583bd', '09e4c7ff-3193-4599-952e-640054534e66', '+5491199999001', '¡Listo, María! ✅ Tu turno quedó reservado:

📅 **Miércoles 6 de mayo a las 11:00hs**
🦷 Limpieza dental - $25.000

Te esperamos en Av. Corrientes 1234. ¡Nos vemos mañana!', '2026-05-05 22:06:37.77+00', 'activa', '2026-05-05 22:04:46.654928+00'),
	('fcae5c6b-c2a6-4095-ad05-94c68acfded8', '91fea7c6-3843-4590-a335-be18ccb84917', '+5491144390930', 'Hola', '2026-05-06 21:27:19.957+00', 'activa', '2026-05-05 22:02:20.184217+00'),
	('d6468920-4b2a-4bfe-a50d-2d6708572fbb', '899a0231-1ef8-4efb-8a8c-5ee68c6a4439', '+5491198765432', '¡Genial Carlos, ya quedaste registrado con OSDE! ✅

Ahora sí, ¿qué día te gustaría venir para la limpieza dental?', '2026-05-05 21:45:08.111+00', 'activa', '2026-05-05 21:42:34.270258+00'),
	('646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', '9fcd24b5-8dfe-4948-92a2-d70adaf80a49', '+5491199999002', '¡Hay turno disponible mañana a las 9hs! 🦷

Confirmame: ¿te reservo **limpieza dental para mañana miércoles 6 de mayo a las 9:00hs**?', '2026-05-05 22:07:55.893+00', 'activa', '2026-05-05 22:07:07.906575+00'),
	('95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'fbf98694-03ca-4df1-8b2d-afa799bd7259', '+5491199999003', '¡Listo, Pedro! Tu turno quedó reservado ✅

📅 **Limpieza dental**
📍 Miércoles 06/05 a las 9:00hs
📍 Av. Corrientes 1234, CABA

¡Te esperamos!', '2026-05-05 22:12:15.901+00', 'activa', '2026-05-05 22:08:48.830571+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "nombre", "rol", "color_calendario", "especialidad", "bio", "foto_url", "activo", "created_at") VALUES
	('c0394cb8-33a1-4d17-8a13-a447a7dad0d2', 'Dr. Mariano Isabello', 'odontologo', '#0F4C5C', NULL, NULL, NULL, true, '2026-05-05 20:53:38.467669+00');


--
-- Data for Name: historia_clinica; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: mensajes_whatsapp; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."mensajes_whatsapp" ("id", "conversacion_id", "direccion", "contenido", "timestamp", "procesado_por_ia") VALUES
	('62ad3b06-fae3-47c7-a31c-735f8d584bc4', '9add7f6b-1660-480c-bd9c-4fa9f41904d6', 'entrante', 'Hola, quiero un turno', '2026-05-05 20:53:38.467669+00', false),
	('2cc608f1-af36-4506-ad7d-86c55438156b', '9add7f6b-1660-480c-bd9c-4fa9f41904d6', 'saliente', '¡Hola! Claro, ¿qué tipo de tratamiento necesitás?', '2026-05-05 20:53:38.467669+00', true),
	('c1eb006e-6432-4303-b2d4-5315d5263509', '9add7f6b-1660-480c-bd9c-4fa9f41904d6', 'entrante', 'Una limpieza', '2026-05-05 20:53:38.467669+00', false),
	('f10c5f19-2f65-4728-80c1-b559413c56df', '9add7f6b-1660-480c-bd9c-4fa9f41904d6', 'saliente', 'Tenemos disponible el martes a las 15hs. ¿Te sirve?', '2026-05-05 20:53:38.467669+00', true),
	('04fc4db4-3b9b-4c93-a3a9-8720f375df4a', '9add7f6b-1660-480c-bd9c-4fa9f41904d6', 'entrante', 'Sí perfecto', '2026-05-05 20:53:38.467669+00', false),
	('c198f7ec-b9c4-44f6-9c7c-ed88f2c6062a', '9add7f6b-1660-480c-bd9c-4fa9f41904d6', 'saliente', 'Perfecto, te espero el martes', '2026-05-05 20:53:38.467669+00', true),
	('ef1b543e-433e-458a-88d6-dd29766b331f', '991f6d60-329a-4c5e-a549-05240f2e5af7', 'entrante', 'Hola', '2026-05-05 20:53:38.467669+00', false),
	('472174d9-0b31-4114-8b6e-bdbb3fa5de5e', '991f6d60-329a-4c5e-a549-05240f2e5af7', 'saliente', '¡Hola! Soy el asistente virtual', '2026-05-05 20:53:38.467669+00', true),
	('97ab8354-20bb-448e-b764-02842c2f385a', '991f6d60-329a-4c5e-a549-05240f2e5af7', 'entrante', 'Necesito hablar con una persona, por favor', '2026-05-05 20:53:38.467669+00', false),
	('cc65cd4b-3b79-4951-924a-53420d65a612', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'entrante', 'Hola, quiero sacar un turno para limpieza', '2026-05-05 21:42:34.504+00', false),
	('4db27fa7-8e18-473e-95f0-af173a4a4aba', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'saliente', '¡Hola! 👋 Qué bueno que te comuniques con Consultorio Sonrisa.

Para sacarte un turno de limpieza, primero dejame ver qué días tenemos disponibles. ¿Qué fecha te vendría bien?

Mientras tanto, como es tu primera vez con nosotros, necesito algunos datos. Empecemos: ¿cuál es tu nombre?', '2026-05-05 21:42:40.651+00', true),
	('e4a133eb-538e-4b39-b526-5a5ec58c924e', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'entrante', 'Soy Carlos M�ndez', '2026-05-05 21:43:47.32+00', false),
	('b771743f-48eb-4c94-896b-9d10293ca8e6', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'saliente', '¡Hola Carlos! 🦷

¿Tenés obra social o serías particular?', '2026-05-05 21:43:52.343+00', true),
	('0c24d5e8-dd99-4439-820e-da6181168f7a', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'entrante', 'Soy Carlos M�ndez', '2026-05-05 21:44:41.386+00', false),
	('9e2ad0d7-e937-4ef5-aaac-27e5a795321a', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'saliente', '¡Perfecto, Carlos Méndez! Ya te anoté.

¿Tenés obra social o sos particular?', '2026-05-05 21:44:45.28+00', true),
	('066e8ea5-3d8e-4fce-bec8-a95cf3d87779', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'entrante', 'Tengo OSDE', '2026-05-05 21:45:02.167+00', false),
	('d571e33b-f62e-44b5-8467-feccec5daf23', 'd6468920-4b2a-4bfe-a50d-2d6708572fbb', 'saliente', '¡Genial Carlos, ya quedaste registrado con OSDE! ✅

Ahora sí, ¿qué día te gustaría venir para la limpieza dental?', '2026-05-05 21:45:07.804+00', true),
	('452c6b11-b8ea-45d7-8cbc-fbc2134bbdaf', 'fcae5c6b-c2a6-4095-ad05-94c68acfded8', 'entrante', 'Hola, quiero limpieza dental ma�ana a las 10', '2026-05-05 22:02:20.504+00', false),
	('c8233556-2d0a-41a5-98c9-fe9e13becb50', 'fcae5c6b-c2a6-4095-ad05-94c68acfded8', 'saliente', 'Uy, mañana a las 10 no hay turno disponible 😕

El horario más cercano es a las **11hs**. ¿Te sirve? También tengo a las 9hs si preferís más temprano.', '2026-05-05 22:02:31.761+00', true),
	('2f32d87c-a23e-4a11-be30-3dd7b00fe728', '9b6e01bc-328c-4ce8-a741-f40c2d3583bd', 'entrante', 'Hola quiero limpieza dental ma�ana a las 11', '2026-05-05 22:04:46.768+00', false),
	('efaeca4a-b2ea-47cc-a8cb-908eb4c88ce0', '9b6e01bc-328c-4ce8-a741-f40c2d3583bd', 'saliente', '¡Hay turno disponible a las 11hs! 🦷

Te confirmo: **Limpieza dental** mañana miércoles 6 de mayo a las **11:00hs**. El costo es $25.000.

¿Te lo reservo?', '2026-05-05 22:04:57.337+00', true),
	('08656983-8409-4abf-a542-2d32947e4fe3', '9b6e01bc-328c-4ce8-a741-f40c2d3583bd', 'entrante', 'Si', '2026-05-05 22:06:19.93+00', false),
	('fcb5bba3-9f9d-4868-bb07-014b8f38d8a4', '9b6e01bc-328c-4ce8-a741-f40c2d3583bd', 'saliente', '¡Listo, María! ✅ Tu turno quedó reservado:

📅 **Miércoles 6 de mayo a las 11:00hs**
🦷 Limpieza dental - $25.000

Te esperamos en Av. Corrientes 1234. ¡Nos vemos mañana!', '2026-05-05 22:06:37.461+00', true),
	('ddacf6c8-a660-4fa9-acb0-57169d9f367f', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'entrante', 'Hola quiero limpieza dental ma�ana a las 9', '2026-05-05 22:07:08.077+00', false),
	('fe174a93-a080-44f0-b941-9e9f1af14c7f', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'saliente', '¡Buena noticia! Hay turno disponible mañana miércoles 6 de mayo a las 9hs para limpieza dental 🦷

La limpieza tiene un valor de $25.000 y dura 45 minutos.

Para reservarte, necesito algunos datos. ¿Me decís tu nombre?', '2026-05-05 22:07:18.745+00', true),
	('a7726a7b-8c9e-44aa-9684-55eecb16e80b', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'entrante', 'Carlos', '2026-05-05 22:07:27.734+00', false),
	('80becc78-3c0a-4487-8978-969dde46ad85', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'saliente', 'Gracias Carlos. ¿Y tu apellido?', '2026-05-05 22:07:30.614+00', true),
	('39894b24-7bd8-4aec-baf8-18664b573c13', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'entrante', 'Rodr�guez', '2026-05-05 22:07:31.829+00', false),
	('3f71730d-7074-44c3-8571-e8d8fa287dc9', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'saliente', 'Perfecto Carlos Rodríguez. ¿Tenés obra social o sos particular?', '2026-05-05 22:07:34.698+00', true),
	('c8fb8bd7-02f3-4e44-aed7-283c591409db', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'entrante', 'OSDE', '2026-05-05 22:07:44.221+00', false),
	('09a1a996-63d1-4094-aaa2-79bb0d34cadf', '646ebc4b-fa5c-474e-b7e2-310dc6f2bfa8', 'saliente', '¡Hay turno disponible mañana a las 9hs! 🦷

Confirmame: ¿te reservo **limpieza dental para mañana miércoles 6 de mayo a las 9:00hs**?', '2026-05-05 22:07:55.59+00', true),
	('c5038b7e-1ba4-4aaa-a700-73a1fb9d1b2b', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'entrante', 'Hola quiero limpieza dental ma�ana a las 9', '2026-05-05 22:08:48.957+00', false),
	('1d21edaa-3923-4fcc-99df-845f70755578', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'saliente', '¡Buena noticia! Mañana a las 9hs está disponible para limpieza dental 🦷

El turno tiene un valor de $25.000 y dura 45 minutos.

Para reservártelo necesito algunos datos. ¿Me decís tu nombre?', '2026-05-05 22:09:04.315+00', true),
	('5b66db52-65c0-4446-be21-eebed005e202', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'entrante', 'Pedro', '2026-05-05 22:09:05.638+00', false),
	('e251b740-8b72-4619-a919-9e3155193098', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'saliente', '¡Gracias, Pedro! ¿Y tu apellido?', '2026-05-05 22:09:08.196+00', true),
	('8c7bd716-be56-4590-b3cb-cb3932f63dc5', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'entrante', 'S�nchez', '2026-05-05 22:09:09.627+00', false),
	('fb9ce405-4444-4a61-b689-7e6d7433bf6c', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'saliente', 'Perfecto, Pedro Sánchez. ¿Tenés obra social o sos particular?', '2026-05-05 22:09:12.224+00', true),
	('9ab8424a-da7c-4102-9b50-e7767c663653', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'entrante', 'OSDE', '2026-05-05 22:09:13.536+00', false),
	('c21f6201-567b-4f9c-904d-c76521ee9942', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'saliente', '¡Genial, hay lugar mañana miércoles 6 de mayo a las 9hs! 🦷

Te confirmo: **Limpieza dental** el **miércoles 06/05 a las 9:00hs**.

¿Te lo reservo?', '2026-05-05 22:09:24.144+00', true),
	('f5af68ce-11cf-4996-8daa-188f1b536161', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'entrante', 'S�, reservalo', '2026-05-05 22:12:03.208+00', false),
	('a95631be-3bf7-4dce-a6b0-d6a82349915d', '95fa10bc-cd3d-4b0a-abf1-4f490635d52e', 'saliente', '¡Listo, Pedro! Tu turno quedó reservado ✅

📅 **Limpieza dental**
📍 Miércoles 06/05 a las 9:00hs
📍 Av. Corrientes 1234, CABA

¡Te esperamos!', '2026-05-05 22:12:15.593+00', true),
	('edd51f2b-5c6f-4c09-9937-fcf17ac73ad3', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'Hola, quiero sacar un turno', '2026-05-05 22:42:41.431+00', false),
	('d4b254ce-3776-43c2-befa-a16ae26e80d0', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'Estas son algunas opciones:

- **Consulta inicial** (30 min) - $15.000
- **Limpieza dental** (45 min) - $25.000
- **Blanqueamiento** (60 min) - $80.000
- **Extracción simple** (30 min) - $30.000

¿Cuál te interesa? También tenemos ortodoncia, implantes y conducto si necesitás algo más específico.', '2026-05-05 22:42:48.595+00', true),
	('a4a7329a-fa40-459c-866f-77e0ba386d4a', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'Limpieza dental', '2026-05-05 22:42:52.625+00', false),
	('22e27979-5a37-4564-8016-49f9e65a6304', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'Perfecto, limpieza dental 🦷

¿Qué día te queda cómodo? Atendemos de lunes a viernes de 9 a 20hs y sábados de 9 a 13hs.', '2026-05-05 22:42:58.737+00', true),
	('0a222daa-a568-4511-831f-42688ba07303', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'El jueves que viene', '2026-05-05 22:43:02.384+00', false),
	('b2b1dd79-01ae-4746-9a0d-cb1e887d2ccd', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'El jueves 7 de mayo hay mucha disponibilidad 📅

Tenemos turnos desde las 9:00 hasta las 19:00. ¿Qué horario te viene mejor, mañana o tarde?', '2026-05-05 22:43:10.833+00', true),
	('14b50efb-3aa6-4182-81a5-853468638ccd', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'A las 10', '2026-05-05 22:43:14.166+00', false),
	('167f2230-f5fe-4fd9-9f76-ae65c7f7ebc2', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'Tenemos disponible a las 10:00 ✅

Antes de confirmar el turno, necesito algunos datos. ¿Cómo es tu nombre?', '2026-05-05 22:43:22.324+00', true),
	('99d0b6fa-825b-42f8-9909-fff995542fb6', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'Juan', '2026-05-05 22:43:26.699+00', false),
	('2382467e-9d18-4f3b-a3c0-50e75d8a6af1', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'Gracias Juan, ¿tu apellido?', '2026-05-05 22:43:32.015+00', true),
	('fc256df2-d2ce-4ef5-a462-7c526841f689', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'Perez', '2026-05-05 22:43:51.869+00', false),
	('b7e0baba-cca4-431c-a308-45da3fa9d9ac', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'Perfecto Juan Perez 👍

¿Tenés obra social o sos particular?', '2026-05-05 22:43:57.581+00', true),
	('4cb3333e-9015-403e-974e-b5140b97b491', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'OSDE', '2026-05-05 22:44:52.478+00', false),
	('8f87c000-ff3c-4144-a09a-1ce205490bfb', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'Listo, quedó registrado OSDE ✅

Te confirmo: **Limpieza dental** el **jueves 7 de mayo a las 10:00hs**. ¿Lo reservo?', '2026-05-05 22:44:58.808+00', true),
	('2d4be3e6-a7a3-415e-8325-ba3909e37f4e', '356d84a6-6287-498f-8efb-9ec1072d5719', 'entrante', 'S�, reservalo', '2026-05-05 22:45:03.725+00', false),
	('37fb2255-0fe2-4c14-bee3-09b7ee257287', '356d84a6-6287-498f-8efb-9ec1072d5719', 'saliente', 'Listo, tu turno quedó reservado ✅

**Limpieza dental** el **jueves 7 de mayo a las 10:00hs** en Av. Corrientes 1234, CABA.

¡Te esperamos, Juan! 🦷', '2026-05-05 22:45:15.79+00', true),
	('f1ede1a9-3093-4424-bde1-9ee9bfad89e0', 'fcae5c6b-c2a6-4095-ad05-94c68acfded8', 'entrante', 'Hola', '2026-05-06 21:02:53.229+00', false),
	('4e67adfd-3fc4-4b24-8f36-ab043f15a22d', 'fcae5c6b-c2a6-4095-ad05-94c68acfded8', 'saliente', '¡Hola Juan! 👋 ¿En qué te puedo ayudar hoy?', '2026-05-06 21:02:55.142+00', true),
	('a4932442-c3e5-491f-9cce-1da4cda56934', 'fcae5c6b-c2a6-4095-ad05-94c68acfded8', 'entrante', 'Hola', '2026-05-06 21:27:19.665+00', false);


--
-- Data for Name: tratamientos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tratamientos" ("id", "nombre", "duracion_minutos", "precio", "descripcion", "icono", "activo", "created_at") VALUES
	('8cde4cff-be44-4a01-928e-77ce4febf154', 'Consulta inicial', 30, 15000.00, 'Evaluación general y plan de tratamiento personalizado', 'Stethoscope', true, '2026-05-05 20:53:38.467669+00'),
	('e84bfcff-1bbc-4d80-8922-ed3596d18d35', 'Limpieza dental', 45, 25000.00, 'Profilaxis profesional para una sonrisa más sana', 'Sparkles', true, '2026-05-05 20:53:38.467669+00'),
	('db9fc5d5-327c-4d6f-928e-8fe1b940fa79', 'Blanqueamiento', 60, 80000.00, 'Blanqueamiento dental profesional con resultados visibles', 'Sun', true, '2026-05-05 20:53:38.467669+00'),
	('982923b4-b216-4091-bb7c-7b3e2fc7adba', 'Tratamiento de conducto', 90, 150000.00, 'Endodoncia con tecnología de última generación', 'Syringe', true, '2026-05-05 20:53:38.467669+00'),
	('df58f4a4-3aec-46bb-a105-df2b4e386b57', 'Extracción simple', 30, 30000.00, 'Extracción dental con anestesia local', 'Scissors', true, '2026-05-05 20:53:38.467669+00'),
	('498c4948-beb7-4fe2-92d6-208656961258', 'Consulta de ortodoncia', 45, 20000.00, 'Evaluación para alineación dental con brackets o invisibles', 'Smile', true, '2026-05-05 20:53:38.467669+00'),
	('3dbdb337-9e08-4f89-8b31-483178c4a178', 'Implante', 120, 400000.00, 'Implante dental con materiales biocompatibles', 'Anchor', true, '2026-05-05 20:53:38.467669+00'),
	('230409f7-a9d5-44d5-89b8-7c94d302c9a2', 'Urgencia', 30, 25000.00, 'Atención inmediata para dolor o emergencia dental', 'AlertCircle', true, '2026-05-05 20:53:38.467669+00');


--
-- Data for Name: turnos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."turnos" ("id", "paciente_id", "profesional_id", "fecha_hora_inicio", "fecha_hora_fin", "tratamiento", "estado", "origen", "notas", "recordatorio_enviado", "created_at") VALUES
	('b2451ecc-c3a3-4d61-85c7-265946d30d41', '5763feee-8f6a-4e35-aa7e-8d2a1e3c8d0e', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-05 09:00:00+00', '2026-05-05 09:45:00+00', 'Limpieza dental', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('aef82178-640a-438d-86ba-f3a68e5e4ecd', 'fbf4a584-4c3e-40b3-b79a-21c3d38f6831', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-06 10:00:00+00', '2026-05-06 10:45:00+00', 'Consulta inicial', 'confirmado', 'manual', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('a835adda-e6ee-45c4-bc45-bd10dc05ef72', '43483148-b28b-4e77-abf4-8c9c552e9a8a', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-07 11:00:00+00', '2026-05-07 11:45:00+00', 'Blanqueamiento', 'confirmado', 'web', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('23ceb894-9276-4026-b95e-5ef85303d09c', '01dff60c-005d-4090-848e-1ac1fcbb69f1', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-08 12:00:00+00', '2026-05-08 12:45:00+00', 'Urgencia', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('938d1770-eac1-4405-a115-8842c083f0fe', '307ce16d-36cc-4c94-9ffe-a62935c539bc', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-09 13:00:00+00', '2026-05-09 13:45:00+00', 'Limpieza dental', 'confirmado', 'manual', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('8ee952c6-b458-46dd-96c0-6cc92e45747f', '8c517636-d49d-415b-b43c-a6479bcfe3b8', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-10 14:00:00+00', '2026-05-10 14:45:00+00', 'Consulta inicial', 'confirmado', 'web', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('a61171e9-1451-4dd0-a5d1-31b7836a3147', '3c8f96fe-1708-4cb0-ac48-448c6d6d05bf', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-11 15:00:00+00', '2026-05-11 15:45:00+00', 'Blanqueamiento', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('94af94ff-d976-47d8-93bc-9a19e14ebe8b', '8edd2bfb-d26a-424c-be2c-9b1f69858f5e', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-12 16:00:00+00', '2026-05-12 16:45:00+00', 'Urgencia', 'confirmado', 'manual', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('4ba5660c-829d-4061-9bc1-7ce697edf246', '1753cec4-8553-4ea4-8ee8-7db655472348', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-13 09:00:00+00', '2026-05-13 09:45:00+00', 'Limpieza dental', 'confirmado', 'web', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('38cfe774-7ee6-4101-9bdd-e75ee13b2444', '08935c8d-bead-4348-bd6b-30f4897dc181', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-14 10:00:00+00', '2026-05-14 10:45:00+00', 'Consulta inicial', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('720970cd-25b5-4ced-b124-1ae183d72812', '28453eca-af74-478f-acba-6d8435878e80', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-15 11:00:00+00', '2026-05-15 11:45:00+00', 'Blanqueamiento', 'confirmado', 'manual', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('95881eb8-f82f-4e77-9e7f-5a210d00fcd8', 'a67fbc04-2e63-4831-a92c-f80c86e8e9bc', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-16 12:00:00+00', '2026-05-16 12:45:00+00', 'Urgencia', 'confirmado', 'web', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('6b687097-1e34-4fb1-a8b3-160c51c070e0', '301645d4-2e0c-4090-84f6-f4ba7119c17f', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-17 13:00:00+00', '2026-05-17 13:45:00+00', 'Limpieza dental', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('59922451-634c-44bd-a22c-d36ed3d67c07', '7962cbae-1cfd-4223-be08-29c429a471fd', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-18 14:00:00+00', '2026-05-18 14:45:00+00', 'Consulta inicial', 'confirmado', 'manual', NULL, false, '2026-05-05 20:53:38.467669+00'),
	('8bc57b26-7d74-4883-b56f-a5c15c098dec', '91fea7c6-3843-4590-a335-be18ccb84917', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-06 13:00:00+00', '2026-05-06 13:45:00+00', 'Limpieza dental', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 21:59:33.532884+00'),
	('154d55af-5029-40bb-b742-fd244680d6a8', '09e4c7ff-3193-4599-952e-640054534e66', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-06 14:00:00+00', '2026-05-06 14:45:00+00', 'Limpieza dental', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 22:06:34.311612+00'),
	('c5c54792-e025-4ef7-a023-117cd2d0a340', 'fbf98694-03ca-4df1-8b2d-afa799bd7259', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-06 12:00:00+00', '2026-05-06 12:45:00+00', 'Limpieza dental', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 22:12:12.851119+00'),
	('9b065277-96a1-46b4-9e35-11daae33db30', 'a4e4b626-2b84-4b28-af4a-9b24c509a96e', 'c0394cb8-33a1-4d17-8a13-a447a7dad0d2', '2026-05-07 13:00:00+00', '2026-05-07 13:45:00+00', 'Limpieza dental', 'pendiente', 'whatsapp', NULL, false, '2026-05-05 22:45:13.243525+00');


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('pacientes-archivos', 'pacientes-archivos', NULL, '2026-05-05 20:53:38.467669+00', '2026-05-05 20:53:38.467669+00', false, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 6, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict DP8713KwaTPx8JQeNelNjwO7Z1AoEU8J3KX6kR5srOJ8kTcwZ0kCLUZdtLiQyuM

RESET ALL;
