import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileSpreadsheet, FileText, Loader2, AlertCircle, Inbox } from 'lucide-react';
import { useFinancialReport, type ReportFilters } from './useFinancialReport';
import { exportReportPDF, exportReportXLSX, formatCell } from './exportReport';

interface ReportDef {
  key: string;
  title: string;
  description: string;
}

const REPORTS: ReportDef[] = [
  { key: 'fluxo_caixa', title: 'Fluxo de Caixa', description: 'Realizado e projetado por período' },
  { key: 'contas_pagar', title: 'Contas a Pagar', description: 'Por vencimento e status' },
  { key: 'contas_receber', title: 'Contas a Receber', description: 'Recebíveis e inadimplência' },
  { key: 'despesas_por_categoria', title: 'Despesas por Categoria', description: 'Total agrupado por categoria' },
  { key: 'despesas_por_escola', title: 'Despesas por Escola', description: 'Rateios por escola/cidade' },
  { key: 'despesas_por_cost_center', title: 'Despesas por Centro de Custo', description: 'Rateios por CC/projeto' },
  { key: 'pagamentos_substituicoes', title: 'Pagamentos de Substituições', description: 'Lançamentos vinculados a substituições' },
  { key: 'orcado_vs_realizado', title: 'Orçado x Realizado', description: 'Comparação orçamentária por categoria' },
  { key: 'dre', title: 'DRE Gerencial', description: 'Demonstração simplificada do resultado' },
  { key: 'conciliacoes_pendentes', title: 'Conciliações Pendentes', description: 'Transações bancárias não conciliadas' },
];

export default function FinanceiroRelatoriosPage() {
  const [active, setActive] = useState<string>(REPORTS[0].key);
  const [filters, setFilters] = useState<ReportFilters>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const def = useMemo(() => REPORTS.find((r) => r.key === active)!, [active]);
  const { data, isLoading, error, refetch, isFetching } = useFinancialReport(active, filters, page, pageSize);

  const updateFilter = (k: keyof ReportFilters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v || null }));
    setPage(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios Financeiros</h1>
          <p className="text-sm text-muted-foreground">Exporte e analise dados financeiros consolidados.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            {REPORTS.map((r) => (
              <button
                key={r.key}
                onClick={() => { setActive(r.key); setPage(1); }}
                className={`w-full text-left p-3 rounded-md transition-colors text-sm ${
                  active === r.key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <div className="font-medium">{r.title}</div>
                <div className={`text-xs ${active === r.key ? 'opacity-90' : 'text-muted-foreground'}`}>{r.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{def.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input type="date" value={filters.start ?? ''} onChange={(e) => updateFilter('start', e.target.value)} />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input type="date" value={filters.end ?? ''} onChange={(e) => updateFilter('end', e.target.value)} />
                </div>
                <div className="flex items-end gap-2 col-span-2 md:col-span-2 justify-end">
                  <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                    {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => data && exportReportXLSX(data, def.title)}
                    disabled={!data || !data.rows.length}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> XLSX
                  </Button>
                  <Button
                    onClick={() => data && exportReportPDF(data, def.title)}
                    disabled={!data || !data.rows.length}
                  >
                    <FileText className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 text-destructive p-4 border border-destructive/30 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span>Erro ao carregar relatório: {(error as Error).message}</span>
                </div>
              ) : !data || data.rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
                  <Inbox className="h-10 w-10 mb-2" />
                  <p>Nenhum dado encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {data.columns.map((c) => (
                            <th key={c.key} className="text-left p-2 font-medium whitespace-nowrap">{c.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((row, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/30">
                            {data.columns.map((c) => (
                              <td key={c.key} className="p-2 align-top whitespace-nowrap">
                                {formatCell(row[c.key], c)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {data.totals && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(data.totals).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-sm">
                          {k}: {typeof v === 'number' ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(v)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      {data.rows.length} de {data.total_count} registros (página {data.page})
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.rows.length < pageSize}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
