-- auth.users não é exportável de produção: o dump-supabase.mjs lê via
-- PostgREST (só schema public) e hashes de senha nunca saem pela API.
-- Reconstrói o espelho a partir de public.profiles (user_id/email/full_name).
-- Senha local padrão para TODOS os usuários: 'senha123' (bcrypt via pgcrypto).
-- Rodar DEPOIS do import do data_dump.sql:
--   docker exec -i postgres psql -U postgres -d sigeo_navigator < scripts/local-db/020_populate_auth_users.sql

INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
SELECT
  p.user_id,
  p.email,
  extensions.crypt('senha123', extensions.gen_salt('bf')),
  jsonb_build_object('full_name', p.full_name),
  '{"provider":"email","providers":["email"]}'::jsonb,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE p.user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;
