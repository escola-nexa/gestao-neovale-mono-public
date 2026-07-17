INSERT INTO public.financial_approval_policies (organization_id, name, operation_type, min_amount, max_amount, mode, enforce_segregation, require_dual_approver, priority, active, description)
SELECT o.id, 'Aprovação padrão', 'all', 0, NULL, 'sequential', true, false, 1000, true, 'Política default criada automaticamente. Edite conforme as regras de governança da organização.'
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.financial_approval_policies p WHERE p.organization_id = o.id
);