-- Fase 1A: adicionar perfil global "financeiro" ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financeiro';