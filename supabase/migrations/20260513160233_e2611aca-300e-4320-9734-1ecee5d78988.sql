-- 1) Função canônica: deduz qual status um candidato deveria ter
CREATE OR REPLACE FUNCTION public.compute_hiring_status(_candidate_id uuid)
RETURNS public.hr_hiring_status
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current public.hr_hiring_status;
  v_originals int;
  v_unsigned  int;
BEGIN
  SELECT status INTO v_current FROM public.hr_hiring_candidates WHERE id = _candidate_id;
  IF v_current IS NULL THEN RETURN NULL; END IF;
  -- Estados terminais nunca recalculam
  IF v_current IN ('CANCELADO','CONCLUIDO') THEN RETURN v_current; END IF;

  SELECT COUNT(*) INTO v_originals
    FROM public.hr_hiring_documents d
   WHERE d.candidate_id = _candidate_id
     AND d.kind = 'ORIGINAL'
     AND d.deleted_at IS NULL;

  IF v_originals = 0 THEN
    RETURN 'PENDENTE_DOC'::public.hr_hiring_status;
  END IF;

  SELECT COUNT(*) INTO v_unsigned
    FROM public.hr_hiring_documents o
   WHERE o.candidate_id = _candidate_id
     AND o.kind = 'ORIGINAL'
     AND o.deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.hr_hiring_documents s
        WHERE s.parent_document_id = o.id
          AND s.kind = 'ASSINADO'
          AND s.deleted_at IS NULL
     );

  IF v_unsigned = 0 THEN
    RETURN 'ASSINADO'::public.hr_hiring_status;
  ELSE
    RETURN 'AGUARDANDO_ASSINATURA'::public.hr_hiring_status;
  END IF;
END $$;

-- 2) Aplica recálculo + grava auditoria se mudou
CREATE OR REPLACE FUNCTION public.recompute_hiring_status(_candidate_id uuid)
RETURNS public.hr_hiring_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid; v_prof uuid; v_old public.hr_hiring_status; v_new public.hr_hiring_status;
BEGIN
  SELECT organization_id, professor_id, status
    INTO v_org, v_prof, v_old
    FROM public.hr_hiring_candidates
   WHERE id = _candidate_id;
  IF v_org IS NULL THEN RETURN NULL; END IF;

  v_new := public.compute_hiring_status(_candidate_id);
  IF v_new IS NULL OR v_new = v_old THEN
    RETURN v_old;
  END IF;

  UPDATE public.hr_hiring_candidates
     SET status = v_new
   WHERE id = _candidate_id;

  INSERT INTO public.hr_hiring_audit_logs(
    organization_id, candidate_id, professor_id, actor_user_id, actor_label, event, payload
  ) VALUES (
    v_org, _candidate_id, v_prof, auth.uid(),
    CASE WHEN auth.uid() IS NULL THEN 'Sistema (auto)' ELSE NULL END,
    'STATUS_CHANGED',
    jsonb_build_object(
      'previous_status', v_old::text,
      'new_status',      v_new::text,
      'reason',          'auto-recompute'
    )
  );
  RETURN v_new;
END $$;

-- 3) Trigger wrapper em hr_hiring_documents
CREATE OR REPLACE FUNCTION public.trg_recompute_hiring_status_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cand uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cand := OLD.candidate_id;
  ELSE
    v_cand := NEW.candidate_id;
    -- Se foi UPDATE e candidate_id mudou, recalcula os dois lados
    IF TG_OP = 'UPDATE' AND OLD.candidate_id IS DISTINCT FROM NEW.candidate_id THEN
      PERFORM public.recompute_hiring_status(OLD.candidate_id);
    END IF;
  END IF;
  PERFORM public.recompute_hiring_status(v_cand);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_hr_hiring_docs_recompute ON public.hr_hiring_documents;
CREATE TRIGGER trg_hr_hiring_docs_recompute
AFTER INSERT OR UPDATE OF deleted_at, kind, parent_document_id, candidate_id OR DELETE
ON public.hr_hiring_documents
FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_hiring_status_fn();

GRANT EXECUTE ON FUNCTION public.compute_hiring_status(uuid)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_hiring_status(uuid) TO authenticated;

-- 4) Backfill de todos os candidatos não-terminais
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.hr_hiring_candidates
            WHERE status NOT IN ('CANCELADO','CONCLUIDO')
  LOOP
    PERFORM public.recompute_hiring_status(r.id);
  END LOOP;
END $$;