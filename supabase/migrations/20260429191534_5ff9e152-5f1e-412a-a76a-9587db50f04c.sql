
CREATE TABLE public.class_subject_modality (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  class_group_id UUID NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  semester subject_semester NOT NULL,
  ch_presencial INTEGER NOT NULL DEFAULT 0 CHECK (ch_presencial >= 0),
  ch_anp INTEGER NOT NULL DEFAULT 0 CHECK (ch_anp >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (class_group_id, subject_id, semester)
);

CREATE INDEX idx_csm_org ON public.class_subject_modality(organization_id);
CREATE INDEX idx_csm_class ON public.class_subject_modality(class_group_id);
CREATE INDEX idx_csm_subject ON public.class_subject_modality(subject_id);

ALTER TABLE public.class_subject_modality ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csm_select_org" ON public.class_subject_modality
  FOR SELECT TO authenticated
  USING (public.has_organization_access(auth.uid(), organization_id));

CREATE POLICY "csm_write_managers" ON public.class_subject_modality
  FOR ALL TO authenticated
  USING (
    public.has_organization_access(auth.uid(), organization_id)
    AND (
      public.is_admin(auth.uid())
      OR public.is_coordinator(auth.uid(), organization_id)
      OR public.is_rh(auth.uid(), organization_id)
    )
  )
  WITH CHECK (
    public.has_organization_access(auth.uid(), organization_id)
    AND (
      public.is_admin(auth.uid())
      OR public.is_coordinator(auth.uid(), organization_id)
      OR public.is_rh(auth.uid(), organization_id)
    )
  );

CREATE TRIGGER trg_csm_updated_at
  BEFORE UPDATE ON public.class_subject_modality
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_class_subject_modality()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch_total INTEGER;
BEGIN
  SELECT carga_horaria_semanal INTO v_ch_total
  FROM public.subjects WHERE id = NEW.subject_id;

  IF v_ch_total IS NULL THEN
    RAISE EXCEPTION 'Disciplina não encontrada';
  END IF;

  IF (NEW.ch_presencial + NEW.ch_anp) > v_ch_total THEN
    RAISE EXCEPTION 'Soma das CH (presencial % + ANP %) excede CH semanal da disciplina (%)',
      NEW.ch_presencial, NEW.ch_anp, v_ch_total;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_csm_validate
  BEFORE INSERT OR UPDATE ON public.class_subject_modality
  FOR EACH ROW EXECUTE FUNCTION public.validate_class_subject_modality();

ALTER TABLE public.weekly_teaching_models
  ADD COLUMN class_mode TEXT NOT NULL DEFAULT 'PRESENCIAL'
    CHECK (class_mode IN ('PRESENCIAL', 'ANP'));

CREATE INDEX idx_wtm_class_mode ON public.weekly_teaching_models(class_mode);

CREATE OR REPLACE FUNCTION public.get_class_modality_config(p_class_group_id UUID)
RETURNS TABLE (
  subject_id UUID,
  subject_nome TEXT,
  subject_codigo TEXT,
  subject_semester subject_semester,
  carga_horaria_semanal INTEGER,
  modality_id UUID,
  semester subject_semester,
  ch_presencial INTEGER,
  ch_anp INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH cg AS (
    SELECT course_id, organization_id FROM public.class_groups WHERE id = p_class_group_id
  ),
  subj AS (
    SELECT s.id, s.nome, s.codigo, s.semester, s.carga_horaria_semanal
    FROM public.subjects s, cg
    WHERE s.course_id = cg.course_id
      AND s.status = 'ativo'::entity_status
      AND s.deleted_at IS NULL
  )
  SELECT
    subj.id, subj.nome, subj.codigo, subj.semester, subj.carga_horaria_semanal,
    m.id, m.semester, COALESCE(m.ch_presencial, subj.carga_horaria_semanal),
    COALESCE(m.ch_anp, 0)
  FROM subj
  LEFT JOIN public.class_subject_modality m
    ON m.class_group_id = p_class_group_id
   AND m.subject_id = subj.id
   AND (
     (subj.semester = 'ANNUAL'::subject_semester AND m.semester = 'ANNUAL'::subject_semester)
     OR (subj.semester <> 'ANNUAL'::subject_semester AND m.semester = subj.semester)
   )
  ORDER BY subj.nome;
$$;
