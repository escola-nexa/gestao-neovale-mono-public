-- CFG-08: financial_document_types
CREATE TABLE IF NOT EXISTS public.financial_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  direction text NOT NULL DEFAULT 'BOTH' CHECK (direction IN ('IN','OUT','BOTH')),
  requires_number boolean NOT NULL DEFAULT false,
  requires_issue_date boolean NOT NULL DEFAULT false,
  requires_attachment boolean NOT NULL DEFAULT false,
  allows_duplicate_number boolean NOT NULL DEFAULT false,
  retention_days integer NOT NULL DEFAULT 1825,
  is_system boolean NOT NULL DEFAULT false,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name),
  UNIQUE (organization_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_document_types TO authenticated;
GRANT ALL ON public.financial_document_types TO service_role;

ALTER TABLE public.financial_document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read financial document types"
  ON public.financial_document_types FOR SELECT TO authenticated
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Financial admins can manage financial document types"
  ON public.financial_document_types FOR ALL TO authenticated
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financial_settings_manage'))
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_financial_permission(auth.uid(),'financial_settings_manage'))
  );

CREATE TRIGGER trg_fin_doc_types_updated_at
  BEFORE UPDATE ON public.financial_document_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default types per organization
INSERT INTO public.financial_document_types
  (organization_id, name, code, direction, requires_number, requires_issue_date, requires_attachment, allows_duplicate_number, retention_days, is_system)
SELECT o.id, t.name, t.code, t.direction, t.req_num, t.req_date, t.req_att, t.dup, t.ret, true
FROM public.organizations o
CROSS JOIN (VALUES
  ('Nota fiscal','NF','BOTH',true,true,true,false,1825),
  ('Recibo','RECIBO','BOTH',false,true,true,true,1825),
  ('Fatura','FATURA','BOTH',true,true,false,false,1825),
  ('Boleto','BOLETO','BOTH',true,true,false,false,1825),
  ('Contrato','CONTRATO','BOTH',true,true,true,false,3650),
  ('Comprovante de pagamento','COMP_PAG','OUT',false,true,true,true,1825),
  ('Comprovante de recebimento','COMP_REC','IN',false,true,true,true,1825),
  ('Ordem de pagamento','OP','OUT',true,true,false,false,1825),
  ('Folha de pagamento','FOLHA','OUT',true,true,true,false,3650),
  ('Relatório de substituição','SUBST','OUT',false,true,true,true,1825),
  ('Documento de reembolso','REEMB','OUT',false,true,true,true,1825),
  ('Outro','OUTRO','BOTH',false,false,false,true,365)
) AS t(name,code,direction,req_num,req_date,req_att,dup,ret)
ON CONFLICT (organization_id, name) DO NOTHING;