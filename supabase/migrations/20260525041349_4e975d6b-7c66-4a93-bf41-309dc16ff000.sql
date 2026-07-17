
-- 1. Expand substitution_status enum with the 20-status official workflow
DO $$
DECLARE v TEXT;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'DRAFT','IDENTIFIED_ABSENCE','REQUEST_CREATED','TICKET_CREATED','ROUTED_TO_CHANNEL',
    'AWAITING_SUBSTITUTE_INDICATION','SUBSTITUTE_SUGGESTED','SUBSTITUTE_CONFIRMED',
    'IN_EXECUTION','EXECUTION_COMPLETED','REPORT_PENDING','REPORT_GENERATED',
    'SIGNED_REPORT_PENDING','SIGNED_REPORT_UPLOADED','PENDING_RH_VALIDATION',
    'APPROVED_FOR_PAYMENT','PAYMENT_PENDING','PAYMENT_COMPLETED','CANCELLED','REOPENED'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER TYPE public.substitution_status ADD VALUE IF NOT EXISTS %L', v);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

-- 2. Payment & Documentation status enums (granular)
DO $$ BEGIN
  CREATE TYPE public.substitution_payment_state AS ENUM (
    'NOT_APPLICABLE','PENDING_CALCULATION','CALCULATED','PENDING_DOCUMENTATION',
    'PENDING_RH_VALIDATION','APPROVED_FOR_PAYMENT','PAYMENT_SCHEDULED','PAID',
    'RETURNED_FOR_CORRECTION','CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.substitution_doc_state AS ENUM (
    'NOT_REQUIRED','PENDING_UPLOAD','UPLOADED','SIGNED','APPROVED','REJECTED','EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. New columns on substitution_requests
ALTER TABLE public.substitution_requests
  ADD COLUMN IF NOT EXISTS phase SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_state public.substitution_payment_state NOT NULL DEFAULT 'PENDING_CALCULATION',
  ADD COLUMN IF NOT EXISTS doc_state public.substitution_doc_state NOT NULL DEFAULT 'PENDING_UPLOAD',
  ADD COLUMN IF NOT EXISTS code TEXT;

-- Unique code per organization
CREATE UNIQUE INDEX IF NOT EXISTS uq_sub_req_code_org
  ON public.substitution_requests(organization_id, code) WHERE code IS NOT NULL;

-- 4. Sequence + function to auto-generate human code SUB-YYYY-000001
CREATE SEQUENCE IF NOT EXISTS public.substitution_code_seq START 1;

CREATE OR REPLACE FUNCTION public.tg_substitution_set_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'SUB-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.substitution_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sub_req_code ON public.substitution_requests;
CREATE TRIGGER trg_sub_req_code BEFORE INSERT ON public.substitution_requests
  FOR EACH ROW EXECUTE FUNCTION public.tg_substitution_set_code();

-- Backfill existing rows
UPDATE public.substitution_requests
SET code = 'SUB-' || to_char(created_at, 'YYYY') || '-' || lpad(nextval('public.substitution_code_seq')::text, 6, '0')
WHERE code IS NULL;

-- 5. Transition validation RPC
CREATE OR REPLACE FUNCTION public.transition_substitution_status(
  _id UUID,
  _to_status TEXT,
  _note TEXT DEFAULT NULL
)
RETURNS public.substitution_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec public.substitution_requests;
  uid UUID := auth.uid();
  cur TEXT;
  is_mgr BOOLEAN;
  allowed BOOLEAN := false;
  new_phase SMALLINT;
BEGIN
  SELECT * INTO rec FROM public.substitution_requests WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Substituição não encontrada'; END IF;

  -- Auth: must be in same org and have a managing role (admin/coord/rh)
  IF rec.organization_id <> public.get_user_organization_id(uid) THEN
    RAISE EXCEPTION 'Acesso negado a outra organização';
  END IF;

  is_mgr := public.has_role(uid,'admin')
         OR public.has_role(uid,'coordenador')
         OR public.has_role(uid,'rh');

  cur := rec.status::text;

  -- Allowed transitions map (per Parte 2 spec)
  IF (cur, _to_status) IN (
    ('DRAFT','REQUEST_CREATED'),
    ('OPEN','REQUEST_CREATED'),
    ('IDENTIFIED_ABSENCE','DRAFT'),
    ('REQUEST_CREATED','TICKET_CREATED'),
    ('TICKET_CREATED','ROUTED_TO_CHANNEL'),
    ('ROUTED_TO_CHANNEL','AWAITING_SUBSTITUTE_INDICATION'),
    ('ROUTED_TO_CHANNEL','SUBSTITUTE_SUGGESTED'),
    ('AWAITING_SUBSTITUTE_INDICATION','SUBSTITUTE_SUGGESTED'),
    ('SUBSTITUTE_SUGGESTED','SUBSTITUTE_CONFIRMED'),
    ('SUBSTITUTE_CONFIRMED','IN_EXECUTION'),
    ('IN_EXECUTION','EXECUTION_COMPLETED'),
    ('EXECUTION_COMPLETED','REPORT_GENERATED'),
    ('EXECUTION_COMPLETED','REPORT_PENDING'),
    ('REPORT_PENDING','REPORT_GENERATED'),
    ('REPORT_GENERATED','SIGNED_REPORT_PENDING'),
    ('REPORT_GENERATED','SIGNED_REPORT_UPLOADED'),
    ('SIGNED_REPORT_PENDING','SIGNED_REPORT_UPLOADED'),
    ('SIGNED_REPORT_UPLOADED','PENDING_RH_VALIDATION'),
    ('SIGNED_REPORT_UPLOADED','APPROVED_FOR_PAYMENT'),
    ('PENDING_RH_VALIDATION','APPROVED_FOR_PAYMENT'),
    ('PENDING_RH_VALIDATION','REPORT_GENERATED'),
    ('APPROVED_FOR_PAYMENT','PAYMENT_PENDING'),
    ('APPROVED_FOR_PAYMENT','PAYMENT_COMPLETED'),
    ('PAYMENT_PENDING','PAYMENT_COMPLETED'),
    ('CANCELLED','REOPENED'),
    ('REOPENED','REQUEST_CREATED')
  ) THEN
    allowed := true;
  END IF;

  -- Cancellation allowed from almost any non-terminal state
  IF _to_status = 'CANCELLED' AND cur NOT IN ('PAYMENT_COMPLETED','PAID','CANCELLED') THEN
    IF _note IS NULL OR length(trim(_note)) = 0 THEN
      RAISE EXCEPTION 'Motivo é obrigatório para cancelamento';
    END IF;
    allowed := true;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Transição não permitida: % → %', cur, _to_status;
  END IF;

  -- Role gate: only managers can change status (regra Parte 2)
  IF NOT is_mgr THEN
    RAISE EXCEPTION 'Apenas Admin, Coordenador ou R.H. podem alterar o status';
  END IF;

  -- BR-003: substituto obrigatório para avançar a pagamento
  IF _to_status IN ('APPROVED_FOR_PAYMENT','PAYMENT_PENDING','PAYMENT_COMPLETED')
     AND rec.substitute_professor_id IS NULL THEN
    RAISE EXCEPTION 'Substituto deve estar confirmado antes do pagamento';
  END IF;

  -- BR-004 guard: valor calculado
  IF _to_status IN ('APPROVED_FOR_PAYMENT','PAYMENT_COMPLETED')
     AND (rec.total_amount IS NULL OR rec.total_amount = 0) THEN
    RAISE EXCEPTION 'Valor total deve estar calculado (horas-aula × valor)';
  END IF;

  -- Phase derivation
  new_phase := CASE
    WHEN _to_status IN (
      'DRAFT','IDENTIFIED_ABSENCE','REQUEST_CREATED','TICKET_CREATED','ROUTED_TO_CHANNEL'
    ) THEN 1
    ELSE 2
  END;

  UPDATE public.substitution_requests
  SET status = _to_status::public.substitution_status,
      phase = new_phase,
      confirmed_at = CASE WHEN _to_status = 'SUBSTITUTE_CONFIRMED' THEN now() ELSE confirmed_at END,
      confirmed_by = CASE WHEN _to_status = 'SUBSTITUTE_CONFIRMED' THEN uid ELSE confirmed_by END,
      approved_at  = CASE WHEN _to_status = 'APPROVED_FOR_PAYMENT' THEN now() ELSE approved_at END,
      approved_by  = CASE WHEN _to_status = 'APPROVED_FOR_PAYMENT' THEN uid ELSE approved_by END,
      canceled_at  = CASE WHEN _to_status = 'CANCELLED' THEN now() ELSE canceled_at END,
      canceled_by  = CASE WHEN _to_status = 'CANCELLED' THEN uid ELSE canceled_by END,
      cancel_reason= CASE WHEN _to_status = 'CANCELLED' THEN _note ELSE cancel_reason END
  WHERE id = _id
  RETURNING * INTO rec;

  -- explicit note in history (the trigger already inserts base entry)
  IF _note IS NOT NULL AND length(trim(_note)) > 0 THEN
    UPDATE public.substitution_status_history
    SET note = _note
    WHERE substitution_id = _id
      AND id = (SELECT id FROM public.substitution_status_history
                WHERE substitution_id = _id ORDER BY created_at DESC LIMIT 1);
  END IF;

  RETURN rec;
END; $$;

GRANT EXECUTE ON FUNCTION public.transition_substitution_status(UUID, TEXT, TEXT) TO authenticated;
