
DELETE FROM public.weekly_teaching_models
 WHERE school_id = 'b7c36f88-5729-4af5-8268-e0683de0fba7'
   AND status = 'INACTIVE'
   AND NOT EXISTS (
     SELECT 1 FROM public.annual_class_occurrences ao
      WHERE ao.weekly_model_id = weekly_teaching_models.id
   );
