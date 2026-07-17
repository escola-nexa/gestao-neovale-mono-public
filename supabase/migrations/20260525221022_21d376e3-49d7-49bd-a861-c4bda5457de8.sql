ALTER TABLE public.teacher_substitution_requests
  ADD COLUMN IF NOT EXISTS substitute_talent_pool_candidate_id uuid
    REFERENCES public.talent_pool_candidates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS substitute_email text;

CREATE OR REPLACE FUNCTION public.tsr_rh_return(
  p_id uuid,
  p_substitute_professor_id uuid DEFAULT NULL,
  p_substitute_name text DEFAULT NULL,
  p_substitute_cpf text DEFAULT NULL,
  p_substitute_rg text DEFAULT NULL,
  p_substitute_phone text DEFAULT NULL,
  p_substitute_email text DEFAULT NULL,
  p_substitute_talent_pool_candidate_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_attachment_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_profile uuid; v_role text; v_org uuid; v_status text;
  v_name text := p_substitute_name;
  v_cpf text := p_substitute_cpf;
  v_rg text := p_substitute_rg;
  v_phone text := p_substitute_phone;
  v_email text := p_substitute_email;
BEGIN
  SELECT organization_id, status INTO v_org, v_status
  FROM public.teacher_substitution_requests WHERE id = p_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Substituição não encontrada'; END IF;

  PERFORM public._tsr_assert_manager(v_user, v_org);
  v_profile := public._tsr_profile_id(v_user);
  v_role := public._tsr_user_role(v_user);

  IF v_role NOT IN ('admin','rh') THEN
    RAISE EXCEPTION 'Apenas R.H. ou administrador pode devolver';
  END IF;
  IF v_status NOT IN ('rh_in_progress','request_created') THEN
    RAISE EXCEPTION 'Status inválido para devolução (atual: %)', v_status;
  END IF;

  IF p_substitute_professor_id IS NOT NULL THEN
    SELECT COALESCE(v_name, full_name), COALESCE(v_cpf, cpf)
      INTO v_name, v_cpf
      FROM public.professors WHERE id = p_substitute_professor_id;
  ELSIF p_substitute_talent_pool_candidate_id IS NOT NULL THEN
    SELECT COALESCE(v_name, full_name),
           COALESCE(v_phone, phone),
           COALESCE(v_email, email)
      INTO v_name, v_phone, v_email
      FROM public.talent_pool_candidates
      WHERE id = p_substitute_talent_pool_candidate_id;
  END IF;

  IF v_name IS NULL OR length(btrim(v_name)) = 0 THEN
    RAISE EXCEPTION 'Nome do substituto é obrigatório';
  END IF;

  UPDATE public.teacher_substitution_requests
     SET status = 'returned_to_coordinator',
         substitute_professor_id = p_substitute_professor_id,
         substitute_talent_pool_candidate_id = p_substitute_talent_pool_candidate_id,
         substitute_professor_name = v_name,
         substitute_professor_cpf = v_cpf,
         substitute_professor_rg = v_rg,
         substitute_professor_phone = v_phone,
         substitute_email = v_email,
         return_notes = p_notes,
         returned_at = now(),
         returned_by = v_profile,
         updated_at = now()
   WHERE id = p_id;

  PERFORM public._tsr_log_status(p_id, v_status, 'returned_to_coordinator', v_profile, COALESCE(p_notes, 'R.H. confirmou substituto'));

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, actor_role, action, reason)
  VALUES (v_org, p_id, v_profile, v_role, 'rh_return', p_notes);
END;
$function$;