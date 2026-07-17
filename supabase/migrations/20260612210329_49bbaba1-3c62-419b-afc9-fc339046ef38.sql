
-- annual_class_occurrences: queries combinam organization_id + (weekly_model_id|occurrence_date)
CREATE INDEX IF NOT EXISTS idx_occurrences_org_model_date
  ON public.annual_class_occurrences (organization_id, weekly_model_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_occurrences_org_date
  ON public.annual_class_occurrences (organization_id, occurrence_date);

-- pre_plannings: filtro frequente professor + escola + bimestre (somente vivos)
CREATE INDEX IF NOT EXISTS idx_pre_plannings_prof_school_bim
  ON public.pre_plannings (professor_id, school_id, bimester_number)
  WHERE deleted_at IS NULL;
