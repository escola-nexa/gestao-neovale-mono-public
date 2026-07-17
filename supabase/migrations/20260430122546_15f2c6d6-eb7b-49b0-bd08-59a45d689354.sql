-- 1) Recria has_role (estava ausente no banco)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;

-- 2) Torna a função de delete robusta: checa user_roles diretamente, sem depender só de has_role
CREATE OR REPLACE FUNCTION public.delete_school_indication_link(p_link_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indications int := 0;
  v_classes int := 0;
  v_logs int := 0;
  v_alloc_items int := 0;
  v_authorized boolean := false;
BEGIN
  -- Validação direta (não depende exclusivamente de has_role)
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('admin'::public.app_role, 'coordenador'::public.app_role, 'rh'::public.app_role)
  ) INTO v_authorized;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Permissão negada: apenas Admin, Coordenador ou R.H. podem excluir links externos.';
  END IF;

  -- 1) Desativa o link primeiro (impede novas indicações concorrentes)
  UPDATE public.external_links
     SET is_active = false
   WHERE id = p_link_id;

  -- 2) Conta itens de alocação que serão desvinculados (FK ON DELETE SET NULL)
  SELECT count(*) INTO v_alloc_items
    FROM public.hr_allocation_items
   WHERE indicado_por_external_link_id = p_link_id;

  -- 3) Apaga indicações ligadas ao link
  WITH del AS (
    DELETE FROM public.hr_school_indications
     WHERE external_link_id = p_link_id
     RETURNING 1
  )
  SELECT count(*) INTO v_indications FROM del;

  -- 4) Apaga TODAS as turmas declaradas pelo link (inclusive órfãs)
  WITH del AS (
    DELETE FROM public.hr_indication_classes
     WHERE external_link_id = p_link_id
     RETURNING 1
  )
  SELECT count(*) INTO v_classes FROM del;

  -- 5) Apaga logs de acesso externo
  WITH del AS (
    DELETE FROM public.external_access_logs
     WHERE external_link_id = p_link_id
     RETURNING 1
  )
  SELECT count(*) INTO v_logs FROM del;

  -- 6) Apaga o link em si
  DELETE FROM public.external_links WHERE id = p_link_id;

  RETURN jsonb_build_object(
    'indications', v_indications,
    'classes', v_classes,
    'logs', v_logs,
    'allocation_items_unlinked', v_alloc_items
  );
END;
$$;