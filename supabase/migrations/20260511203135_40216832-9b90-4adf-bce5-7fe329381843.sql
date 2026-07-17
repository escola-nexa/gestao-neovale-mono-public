DROP FUNCTION IF EXISTS public.delete_school_indication_link(uuid);

CREATE OR REPLACE FUNCTION public.delete_school_indication_link(
  p_link_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_indications int := 0;
  v_classes int := 0;
  v_logs int := 0;
  v_alloc_items int := 0;
  v_is_admin boolean := false;
  v_motivo text := COALESCE(btrim(p_motivo), '');
  v_org uuid;
  v_school_id uuid;
  v_school_nome text;
  v_uid uuid := auth.uid();
BEGIN
  -- Apenas ADMIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = v_uid
       AND role = 'admin'::public.app_role
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem excluir links externos por escola.';
  END IF;

  IF length(v_motivo) < 5 THEN
    RAISE EXCEPTION 'Motivo da exclusão é obrigatório (mínimo 5 caracteres).';
  END IF;

  -- Captura contexto antes de apagar
  SELECT el.organization_id, el.school_id, s.nome
    INTO v_org, v_school_id, v_school_nome
    FROM public.external_links el
    JOIN public.schools s ON s.id = el.school_id
   WHERE el.id = p_link_id;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Link não encontrado.';
  END IF;

  -- 1) Desativa o link primeiro
  UPDATE public.external_links SET is_active = false WHERE id = p_link_id;

  -- 2) Conta itens de alocação que serão desvinculados (FK ON DELETE SET NULL)
  SELECT count(*) INTO v_alloc_items
    FROM public.hr_allocation_items
   WHERE indicado_por_external_link_id = p_link_id;

  -- 3) Apaga indicações
  WITH del AS (
    DELETE FROM public.hr_school_indications
     WHERE external_link_id = p_link_id
     RETURNING 1
  ) SELECT count(*) INTO v_indications FROM del;

  -- 4) Apaga turmas declaradas
  WITH del AS (
    DELETE FROM public.hr_indication_classes
     WHERE external_link_id = p_link_id
     RETURNING 1
  ) SELECT count(*) INTO v_classes FROM del;

  -- 5) Apaga logs de acesso externo
  WITH del AS (
    DELETE FROM public.external_access_logs
     WHERE external_link_id = p_link_id
     RETURNING 1
  ) SELECT count(*) INTO v_logs FROM del;

  -- 6) Apaga o link
  DELETE FROM public.external_links WHERE id = p_link_id;

  -- 7) Auditoria
  INSERT INTO public.audit_events (
    organization_id, user_id, school_id, module, action, action_result, details
  ) VALUES (
    v_org, v_uid, v_school_id,
    'rh_links_escolas', 'delete_link', 'success',
    jsonb_build_object(
      'link_id', p_link_id,
      'school_nome', v_school_nome,
      'motivo', v_motivo,
      'indications_removed', v_indications,
      'classes_removed', v_classes,
      'logs_removed', v_logs,
      'allocation_items_unlinked', v_alloc_items
    )
  );

  RETURN jsonb_build_object(
    'indications', v_indications,
    'classes', v_classes,
    'logs', v_logs,
    'allocation_items_unlinked', v_alloc_items
  );
END;
$function$;