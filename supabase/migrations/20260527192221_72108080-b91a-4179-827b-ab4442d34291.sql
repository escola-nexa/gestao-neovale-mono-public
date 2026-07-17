
WITH inativos AS (
  SELECT id FROM public.weekly_teaching_models
   WHERE school_id = 'b7c36f88-5729-4af5-8268-e0683de0fba7'
     AND status = 'INACTIVE'
),
del_occ AS (
  DELETE FROM public.annual_class_occurrences
   WHERE weekly_model_id IN (SELECT id FROM inativos)
     AND status <> 'COMPLETED'
  RETURNING 1
),
del_models AS (
  DELETE FROM public.weekly_teaching_models
   WHERE id IN (SELECT id FROM inativos)
     AND NOT EXISTS (
       SELECT 1 FROM public.annual_class_occurrences ao
        WHERE ao.weekly_model_id = weekly_teaching_models.id
     )
  RETURNING 1
)
SELECT
  (SELECT count(*) FROM del_occ)    AS occurrences_deleted,
  (SELECT count(*) FROM del_models) AS models_deleted;
