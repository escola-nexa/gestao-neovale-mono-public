
-- 1) Desativa duplicidades de CLASS por (escola, dia, horário, turma) — mantém o mais antigo
WITH dups AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY school_id, weekday, start_time, end_time, class_group_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.weekly_teaching_models
  WHERE status = 'ACTIVE'
    AND schedule_type = 'CLASS'
    AND class_group_id IS NOT NULL
)
UPDATE public.weekly_teaching_models w
   SET status = 'INACTIVE', updated_at = now()
  FROM dups
 WHERE w.id = dups.id AND dups.rn > 1;

-- 2) Desativa duplicidades por (escola, dia, horário, professor) presencial — ANP isento
WITH dups AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY school_id, weekday, start_time, end_time, professor_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.weekly_teaching_models
  WHERE status = 'ACTIVE'
    AND professor_id IS NOT NULL
    AND (class_mode IS NULL OR class_mode = 'PRESENCIAL')
)
UPDATE public.weekly_teaching_models w
   SET status = 'INACTIVE', updated_at = now()
  FROM dups
 WHERE w.id = dups.id AND dups.rn > 1;

-- 3) Cancela ocorrências anuais órfãs (de modelos desativados)
UPDATE public.annual_class_occurrences
   SET status = 'CANCELLED', updated_at = now()
 WHERE status <> 'CANCELLED'
   AND weekly_model_id IN (
     SELECT id FROM public.weekly_teaching_models WHERE status = 'INACTIVE'
   );

-- 4) Índices únicos parciais — barreira definitiva contra futuras duplicidades
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wtm_class_slot
  ON public.weekly_teaching_models (school_id, weekday, start_time, end_time, class_group_id)
  WHERE status = 'ACTIVE' AND schedule_type = 'CLASS';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_wtm_teacher_slot
  ON public.weekly_teaching_models (school_id, weekday, start_time, end_time, professor_id)
  WHERE status = 'ACTIVE'
    AND professor_id IS NOT NULL
    AND (class_mode IS NULL OR class_mode = 'PRESENCIAL');

-- 5) RPC de análise — lista grupos de potenciais duplicidades para a UI
CREATE OR REPLACE FUNCTION public.find_schedule_duplicates(_school_id uuid DEFAULT NULL)
RETURNS TABLE (
  kind text,
  school_id uuid,
  weekday text,
  start_time time,
  end_time time,
  class_group_id uuid,
  professor_id uuid,
  ids uuid[],
  total integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'class_slot'::text AS kind,
         school_id, weekday::text, start_time, end_time,
         class_group_id, NULL::uuid AS professor_id,
         array_agg(id ORDER BY created_at) AS ids,
         COUNT(*)::int AS total
    FROM public.weekly_teaching_models
   WHERE status = 'ACTIVE' AND schedule_type = 'CLASS'
     AND class_group_id IS NOT NULL
     AND (_school_id IS NULL OR school_id = _school_id)
   GROUP BY school_id, weekday, start_time, end_time, class_group_id
  HAVING COUNT(*) > 1
  UNION ALL
  SELECT 'teacher_slot'::text,
         school_id, weekday::text, start_time, end_time,
         NULL::uuid, professor_id,
         array_agg(id ORDER BY created_at),
         COUNT(*)::int
    FROM public.weekly_teaching_models
   WHERE status = 'ACTIVE' AND professor_id IS NOT NULL
     AND (class_mode IS NULL OR class_mode = 'PRESENCIAL')
     AND (_school_id IS NULL OR school_id = _school_id)
   GROUP BY school_id, weekday, start_time, end_time, professor_id
  HAVING COUNT(*) > 1;
$$;

REVOKE ALL ON FUNCTION public.find_schedule_duplicates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_schedule_duplicates(uuid) TO authenticated, service_role;
