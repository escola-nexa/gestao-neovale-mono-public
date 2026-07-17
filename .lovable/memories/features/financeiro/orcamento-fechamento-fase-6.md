---
name: Financeiro orçamento e fechamento fase 6
description: Tabelas financial_budgets/lines + financial_period_closures com trigger de bloqueio em entries, RPCs close/reopen e get_budget_consumption; rotas /financeiro/orcamentos e /financeiro/fechamento
type: feature
---
- Tabelas: financial_budgets, financial_budget_lines (categoria+CC obrigatórios; escola/projeto opcionais), financial_period_closures (escopo ORG/SCHOOL/COST_CENTER), financial_closure_audit.
- Enums: financial_budget_status (DRAFT/ACTIVE/CLOSED), financial_budget_overrun_mode (ALERT/REQUIRE_APPROVAL/BLOCK), financial_closure_scope, financial_closure_status.
- Permissões usadas (já existentes): financeiro.orcamento.visualizar/editar/aprovar e financeiro.fechamento.executar.
- Trigger trg_block_closed_entries em financial_entries impede INSERT/UPDATE/DELETE quando competence_date cai em período fechado; admin ou quem tem financeiro.fechamento.executar passa.
- RPCs: close_financial_period, reopen_financial_period (justificativa ≥5 chars), get_budget_consumption (previsto/comprometido/realizado/disponível/percentual), check_budget_overrun (retorna jsonb com requires_extra_approval/blocked/alert), is_financial_period_closed.
- Frontend: src/features/financeiro/orcamento/{useOrcamento.ts, OrcamentosPage.tsx, OrcamentoDetailPage.tsx, FechamentoPage.tsx}; rotas em App.tsx; hub item "Fechamento Mensal" adicionado em hubItems.ts.
