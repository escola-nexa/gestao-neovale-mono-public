---
name: Financeiro Relatórios Fase 7A
description: Central de relatórios financeiros com 10 relatórios via edge function única e exports PDF/XLSX no cliente
type: feature
---
Rota `/financeiro/relatorios` (`FinanceiroRelatoriosPage.tsx`) consome edge function única `financial-reports` que retorna `{columns, rows, totals, page, total_count}`.

Relatórios suportados: fluxo_caixa, contas_pagar, contas_receber, despesas_por_categoria, despesas_por_escola, despesas_por_cost_center, pagamentos_substituicoes, orcado_vs_realizado, dre, conciliacoes_pendentes.

Edge function usa JWT do usuário (RLS multi-tenant enforce isolation por organização). Filtros server-side (start/end/school/cost_center/project/category/account/status) e paginação `page_size` (10-500, default 100).

Exports PDF (jspdf + autotable, landscape) e XLSX (sheetjs) renderizados no cliente a partir do mesmo payload via `exportReport.ts`.

Hub `hubItems.ts` já tinha o card "Relatórios" apontando para `/financeiro/relatorios`.

Fase 7B (índices + security definer hardening) e 7C (testes + polish) ficam para entregas seguintes.
