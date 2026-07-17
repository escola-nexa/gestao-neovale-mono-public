
CREATE OR REPLACE FUNCTION public.prevent_duplicate_slot_indication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subj  text;
  v_wd    text;
  v_ts    text;
  v_other_name text;
BEGIN
  -- Só nos interessa bloquear novas APROVADAS para o mesmo slot.
  IF NEW.status <> 'APROVADA' THEN
    RETURN NEW;
  END IF;

  IF NEW.external_link_id IS NULL
     OR NEW.indication_class_id IS NULL
     OR NEW.candidato_grade IS NULL THEN
    RETURN NEW;
  END IF;

  v_subj := NEW.candidato_grade->>'subject_id';
  v_wd   := NEW.candidato_grade->>'weekday';
  v_ts   := NEW.candidato_grade->>'time_slot_label';

  -- Sem identificadores suficientes para detectar conflito de slot.
  IF v_subj IS NULL OR v_wd IS NULL OR v_ts IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT candidato_nome
    INTO v_other_name
    FROM public.hr_school_indications
   WHERE id <> NEW.id
     AND status = 'APROVADA'
     AND external_link_id    = NEW.external_link_id
     AND indication_class_id = NEW.indication_class_id
     AND candidato_grade->>'subject_id'      = v_subj
     AND candidato_grade->>'weekday'         = v_wd
     AND candidato_grade->>'time_slot_label' = v_ts
   LIMIT 1;

  IF v_other_name IS NOT NULL THEN
    RAISE EXCEPTION
      'Já existe outra indicação APROVADA para este mesmo horário (professor: %). Recuse uma das duas antes de aprovar.',
      v_other_name
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_slot_indication ON public.hr_school_indications;

CREATE TRIGGER trg_prevent_duplicate_slot_indication
BEFORE INSERT OR UPDATE OF status, candidato_grade, indication_class_id, external_link_id
ON public.hr_school_indications
FOR EACH ROW
EXECUTE FUNCTION public.prevent_duplicate_slot_indication();
