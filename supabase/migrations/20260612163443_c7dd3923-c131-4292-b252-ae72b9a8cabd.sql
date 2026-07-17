-- Fase 7B: índices de performance para relatórios financeiros
CREATE INDEX IF NOT EXISTS idx_fin_entries_org_kind_comp ON public.financial_entries(organization_id, kind, competence_date);
CREATE INDEX IF NOT EXISTS idx_fin_entries_source ON public.financial_entries(source_kind, source_id);
CREATE INDEX IF NOT EXISTS idx_fin_entries_category ON public.financial_entries(category_id);
CREATE INDEX IF NOT EXISTS idx_fin_entries_party ON public.financial_entries(party_id);
CREATE INDEX IF NOT EXISTS idx_fin_inst_status_due ON public.financial_installments(status, due_date);
CREATE INDEX IF NOT EXISTS idx_fin_inst_org ON public.financial_installments(organization_id);
CREATE INDEX IF NOT EXISTS idx_fin_alloc_cc ON public.financial_entry_allocations(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_fin_alloc_school ON public.financial_entry_allocations(school_id);
CREATE INDEX IF NOT EXISTS idx_fin_alloc_project ON public.financial_entry_allocations(project_id);
CREATE INDEX IF NOT EXISTS idx_fp_kind_date ON public.financial_payments(kind, payment_date);
CREATE INDEX IF NOT EXISTS idx_fbt_org_status_date ON public.financial_bank_transactions(organization_id, status, transaction_date);
CREATE INDEX IF NOT EXISTS idx_fin_budget_lines_cat_month ON public.financial_budget_lines(category_id, month);