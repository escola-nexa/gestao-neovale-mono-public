
-- =========================================================
-- 1) Corrigir trigger de bloqueio/validação do Parte 10 (colunas inexistentes)
-- =========================================================
DROP TRIGGER IF EXISTS trg_teacher_substitution_payment_lock ON public.teacher_substitution_payments;
DROP TRIGGER IF EXISTS trg_teacher_substitution_payment_amount_check ON public.teacher_substitution_payments;
DROP FUNCTION IF EXISTS public.validate_teacher_substitution_payment_lock();
DROP FUNCTION IF EXISTS public.validate_teacher_substitution_payment_amount();

CREATE OR REPLACE FUNCTION public.validate_teacher_substitution_payment_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.payment_status = 'paid'
     AND (
       NEW.net_amount IS DISTINCT FROM OLD.net_amount
       OR NEW.gross_amount IS DISTINCT FROM OLD.gross_amount
       OR NEW.total_class_hours IS DISTINCT FROM OLD.total_class_hours
       OR NEW.hour_class_value IS DISTINCT FROM OLD.hour_class_value
       OR NEW.substitute_professor_id IS DISTINCT FROM OLD.substitute_professor_id
     )
  THEN
    RAISE EXCEPTION 'Não é permitido alterar valor, horas, taxa ou substituto de um pagamento já marcado como pago.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_teacher_substitution_payment_lock
BEFORE UPDATE ON public.teacher_substitution_payments
FOR EACH ROW
EXECUTE FUNCTION public.validate_teacher_substitution_payment_lock();

CREATE OR REPLACE FUNCTION public.validate_teacher_substitution_payment_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.net_amount IS NOT NULL AND NEW.net_amount < 0 THEN
    RAISE EXCEPTION 'O valor líquido do pagamento não pode ser negativo.' USING ERRCODE = '22023';
  END IF;
  IF NEW.gross_amount IS NOT NULL AND NEW.gross_amount < 0 THEN
    RAISE EXCEPTION 'O valor bruto do pagamento não pode ser negativo.' USING ERRCODE = '22023';
  END IF;
  IF NEW.total_class_hours IS NOT NULL AND NEW.total_class_hours < 0 THEN
    RAISE EXCEPTION 'O total de horas/aulas não pode ser negativo.' USING ERRCODE = '22023';
  END IF;
  IF NEW.hour_class_value IS NOT NULL AND NEW.hour_class_value < 0 THEN
    RAISE EXCEPTION 'O valor da hora-aula não pode ser negativo.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_teacher_substitution_payment_amount_check
BEFORE INSERT OR UPDATE ON public.teacher_substitution_payments
FOR EACH ROW
EXECUTE FUNCTION public.validate_teacher_substitution_payment_amount();

-- =========================================================
-- 2) Tabela de acesso financeiro
-- =========================================================
CREATE TABLE IF NOT EXISTS public.teacher_substitution_financial_access (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL, -- auth.users.id (corresponde a profiles.user_id)
  granted_by      uuid NOT NULL, -- auth.users.id
  granted_at      timestamptz NOT NULL DEFAULT now(),
  revoked_by      uuid,
  revoked_at      timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_substitution_financial_access_org
  ON public.teacher_substitution_financial_access (organization_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_financial_access_user
  ON public.teacher_substitution_financial_access (user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_substitution_financial_access_active
  ON public.teacher_substitution_financial_access (organization_id, is_active);

ALTER TABLE public.teacher_substitution_financial_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tsfa_select ON public.teacher_substitution_financial_access;
DROP POLICY IF EXISTS tsfa_insert ON public.teacher_substitution_financial_access;
DROP POLICY IF EXISTS tsfa_update ON public.teacher_substitution_financial_access;
DROP POLICY IF EXISTS tsfa_no_delete ON public.teacher_substitution_financial_access;

CREATE POLICY tsfa_select ON public.teacher_substitution_financial_access
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_id = auth.uid()
  )
);

CREATE POLICY tsfa_insert ON public.teacher_substitution_financial_access
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY tsfa_update ON public.teacher_substitution_financial_access
FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY tsfa_no_delete ON public.teacher_substitution_financial_access
FOR DELETE USING (false);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_tsfa_updated_at ON public.teacher_substitution_financial_access;
CREATE TRIGGER trg_tsfa_updated_at
BEFORE UPDATE ON public.teacher_substitution_financial_access
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3) Helper: can_access_teacher_substitution_financial
-- =========================================================
CREATE OR REPLACE FUNCTION public.can_access_teacher_substitution_financial(
  p_user_id uuid,
  p_organization_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_user_org uuid;
BEGIN
  IF p_user_id IS NULL OR p_organization_id IS NULL THEN RETURN false; END IF;
  v_user_org := get_user_organization_id(p_user_id);
  IF v_user_org IS NULL OR v_user_org <> p_organization_id THEN RETURN false; END IF;

  IF has_role(p_user_id, 'admin'::app_role) THEN RETURN true; END IF;

  IF has_role(p_user_id, 'rh'::app_role) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.teacher_substitution_financial_access
      WHERE organization_id = p_organization_id
        AND user_id = p_user_id
        AND is_active = true
    );
  END IF;

  RETURN false;
END;
$$;

-- =========================================================
-- 4) Endurecer RLS de teacher_substitution_payments (gate financeiro)
-- =========================================================
DROP POLICY IF EXISTS tsp_select ON public.teacher_substitution_payments;
DROP POLICY IF EXISTS tsp_insert ON public.teacher_substitution_payments;
DROP POLICY IF EXISTS tsp_update ON public.teacher_substitution_payments;

CREATE POLICY tsp_select ON public.teacher_substitution_payments
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND can_access_teacher_substitution_financial(auth.uid(), organization_id)
);

CREATE POLICY tsp_insert ON public.teacher_substitution_payments
FOR INSERT
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND can_access_teacher_substitution_financial(auth.uid(), organization_id)
);

CREATE POLICY tsp_update ON public.teacher_substitution_payments
FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND can_access_teacher_substitution_financial(auth.uid(), organization_id)
);

-- =========================================================
-- 5) Restringir documentos financeiros (receipt, payment_proof)
-- =========================================================
DROP POLICY IF EXISTS tsd_select ON public.teacher_substitution_documents;
CREATE POLICY tsd_select ON public.teacher_substitution_documents
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND user_can_view_substitution(substitution_request_id)
  AND (
    document_type NOT IN ('receipt', 'payment_proof')
    OR can_access_teacher_substitution_financial(auth.uid(), organization_id)
  )
);

-- =========================================================
-- 6) RPCs de administração de acesso
-- =========================================================

CREATE OR REPLACE FUNCTION public.grant_teacher_substitution_financial_access(
  p_user_id uuid,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_org uuid;
  v_target_org uuid;
  v_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Admin pode conceder acesso financeiro.' USING ERRCODE='42501';
  END IF;
  v_admin_org := get_user_organization_id(auth.uid());
  v_target_org := get_user_organization_id(p_user_id);
  IF v_admin_org IS NULL OR v_target_org IS NULL OR v_admin_org <> v_target_org THEN
    RAISE EXCEPTION 'Usuário não pertence à mesma organização.' USING ERRCODE='42501';
  END IF;
  IF NOT has_role(p_user_id, 'rh'::app_role) THEN
    RAISE EXCEPTION 'Acesso financeiro só pode ser concedido a usuários com papel R.H.' USING ERRCODE='42501';
  END IF;

  INSERT INTO public.teacher_substitution_financial_access
    (organization_id, user_id, granted_by, granted_at, is_active, notes, revoked_by, revoked_at)
  VALUES (v_admin_org, p_user_id, auth.uid(), now(), true, p_notes, NULL, NULL)
  ON CONFLICT (organization_id, user_id)
  DO UPDATE SET
    is_active = true,
    granted_by = auth.uid(),
    granted_at = now(),
    revoked_by = NULL,
    revoked_at = NULL,
    notes = COALESCE(EXCLUDED.notes, public.teacher_substitution_financial_access.notes),
    updated_at = now()
  RETURNING id INTO v_id;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, actor_user_id, action, new_values)
  VALUES (v_admin_org, auth.uid(), 'financial_access_granted',
          jsonb_build_object('user_id', p_user_id, 'notes', p_notes));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_teacher_substitution_financial_access(
  p_user_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Admin pode revogar acesso financeiro.' USING ERRCODE='42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Justificativa obrigatória para revogação.' USING ERRCODE='22023';
  END IF;
  v_org := get_user_organization_id(auth.uid());

  UPDATE public.teacher_substitution_financial_access
     SET is_active = false,
         revoked_by = auth.uid(),
         revoked_at = now(),
         notes = COALESCE(notes || E'\n', '') || '[REVOGADO ' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' || p_reason,
         updated_at = now()
   WHERE organization_id = v_org AND user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acesso ativo não encontrado para este usuário.' USING ERRCODE='42704';
  END IF;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, actor_user_id, action, new_values)
  VALUES (v_org, auth.uid(), 'financial_access_revoked',
          jsonb_build_object('user_id', p_user_id, 'reason', p_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.list_teacher_substitution_financial_access_users()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean,
  granted_by uuid,
  granted_by_name text,
  granted_at timestamptz,
  revoked_by uuid,
  revoked_at timestamptz,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas Admin.' USING ERRCODE='42501';
  END IF;
  v_org := get_user_organization_id(auth.uid());

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    p.email,
    'rh'::text,
    COALESCE(fa.is_active, false),
    fa.granted_by,
    gb.full_name,
    fa.granted_at,
    fa.revoked_by,
    fa.revoked_at,
    fa.notes
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = 'rh'::app_role
  LEFT JOIN public.teacher_substitution_financial_access fa
    ON fa.user_id = p.user_id AND fa.organization_id = v_org
  LEFT JOIN public.profiles gb ON gb.user_id = fa.granted_by
  WHERE p.organization_id = v_org AND p.is_active = true
  ORDER BY p.full_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_teacher_substitution_financial_access()
RETURNS TABLE (can_access boolean, reason text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid; v_can boolean; v_reason text;
BEGIN
  v_org := get_user_organization_id(auth.uid());
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'unauthenticated'::text; RETURN;
  END IF;
  IF has_role(auth.uid(),'admin'::app_role) THEN
    RETURN QUERY SELECT true, 'admin'::text; RETURN;
  END IF;
  IF has_role(auth.uid(),'rh'::app_role) THEN
    v_can := can_access_teacher_substitution_financial(auth.uid(), v_org);
    v_reason := CASE WHEN v_can THEN 'rh_granted' ELSE 'rh_not_granted' END;
    RETURN QUERY SELECT v_can, v_reason; RETURN;
  END IF;
  RETURN QUERY SELECT false, 'role_not_allowed'::text;
END;
$$;

-- =========================================================
-- 7) RPCs de dados financeiros
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_teacher_substitution_financial_details(
  p_substitution_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid; v_result jsonb;
BEGIN
  SELECT organization_id INTO v_org FROM public.teacher_substitution_requests WHERE id = p_substitution_request_id;
  IF v_org IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada.' USING ERRCODE='42704'; END IF;
  IF NOT can_access_teacher_substitution_financial(auth.uid(), v_org) THEN
    RAISE EXCEPTION 'Sem permissão para visualizar dados financeiros.' USING ERRCODE='42501';
  END IF;

  SELECT jsonb_build_object(
    'request', to_jsonb(r.*),
    'payment', to_jsonb(p.*),
    'receipt_documents', COALESCE((
      SELECT jsonb_agg(to_jsonb(d.*))
      FROM public.teacher_substitution_documents d
      WHERE d.substitution_request_id = r.id
        AND d.document_type IN ('receipt','payment_proof')
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.teacher_substitution_requests r
  LEFT JOIN public.teacher_substitution_payments p ON p.substitution_request_id = r.id
  WHERE r.id = p_substitution_request_id;

  INSERT INTO public.teacher_substitution_audit_logs
    (organization_id, substitution_request_id, actor_user_id, action, new_values)
  VALUES (v_org, p_substitution_request_id, auth.uid(), 'financial_details_viewed', '{}'::jsonb);

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_teacher_substitution_financial_dashboard_kpis(
  p_year int DEFAULT NULL,
  p_month int DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid; v_result jsonb;
BEGIN
  v_org := get_user_organization_id(auth.uid());
  IF NOT can_access_teacher_substitution_financial(auth.uid(), v_org) THEN
    RAISE EXCEPTION 'Sem permissão.' USING ERRCODE='42501';
  END IF;

  WITH base AS (
    SELECT p.*
    FROM public.teacher_substitution_payments p
    WHERE p.organization_id = v_org
      AND (p_year  IS NULL OR EXTRACT(YEAR  FROM COALESCE(p.paid_at, p.approved_at, p.created_at))::int = p_year)
      AND (p_month IS NULL OR EXTRACT(MONTH FROM COALESCE(p.paid_at, p.approved_at, p.created_at))::int = p_month)
  )
  SELECT jsonb_build_object(
    'count_approved', (SELECT count(*) FROM base WHERE payment_status='approved'),
    'count_pending',  (SELECT count(*) FROM base WHERE payment_status IN ('draft','pending','scheduled')),
    'count_paid',     (SELECT count(*) FROM base WHERE payment_status='paid'),
    'count_returned', (SELECT count(*) FROM base WHERE payment_status='returned'),
    'total_calculated', COALESCE((SELECT sum(net_amount) FROM base), 0),
    'total_pending',    COALESCE((SELECT sum(net_amount) FROM base WHERE payment_status IN ('draft','pending','scheduled','approved')), 0),
    'total_paid',       COALESCE((SELECT sum(net_amount) FROM base WHERE payment_status='paid'), 0),
    'by_status', (
      SELECT COALESCE(jsonb_object_agg(payment_status, c), '{}'::jsonb)
      FROM (SELECT payment_status, count(*) c FROM base GROUP BY payment_status) s
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION
  public.can_access_teacher_substitution_financial(uuid, uuid),
  public.grant_teacher_substitution_financial_access(uuid, text),
  public.revoke_teacher_substitution_financial_access(uuid, text),
  public.list_teacher_substitution_financial_access_users(),
  public.get_my_teacher_substitution_financial_access(),
  public.get_teacher_substitution_financial_details(uuid),
  public.get_teacher_substitution_financial_dashboard_kpis(int, int)
TO authenticated;
