-- Add new status AGUARDANDO_ASSINATURA to teacher_planning_status enum
ALTER TYPE public.teacher_planning_status ADD VALUE IF NOT EXISTS 'AGUARDANDO_ASSINATURA';