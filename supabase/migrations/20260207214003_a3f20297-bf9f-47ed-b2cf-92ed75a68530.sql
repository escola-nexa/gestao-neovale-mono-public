-- PARTE 1: Adicionar novos valores aos enums
ALTER TYPE pre_planning_status ADD VALUE IF NOT EXISTS 'DISPONIVEL';
ALTER TYPE teacher_planning_status ADD VALUE IF NOT EXISTS 'ENVIADO';
ALTER TYPE teacher_planning_status ADD VALUE IF NOT EXISTS 'DEVOLVIDO';
ALTER TYPE teacher_planning_status ADD VALUE IF NOT EXISTS 'ASSINADO';