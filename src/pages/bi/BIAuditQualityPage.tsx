import { BadgeCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { useBIAuditQuality, AuditItem } from '@/hooks/bi/useBIAuditQuality';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function BIAuditQualityPage() {
  const { auditQuery } = useBIAuditQuality();
  const items = auditQuery.data || [];
  const loading = auditQuery.isLoading;

  const okCount = items.filter(i => i.status === 'ok').length;
  const warningCount = items.filter(i => i.status === 'warning').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  const auditTypes = [...new Set(items.map(i => i.audit_type))];
  const chartData = auditTypes.map(t => ({
    name: t,
    ok: items.filter(i => i.audit_type === t && i.status === 'ok').length,
    warning: items.filter(i => i.audit_type === t && i.status === 'warning').length,
    error: items.filter(i => i.audit_type === t && i.status === 'error').length,
  }));

  const columns: AnalyticColumn<AuditItem>[] = [
    { key: 'screen', header: 'Tela', render: (r) => <span className="font-medium text-sm">{r.screen}</span> },
    { key: 'route', header: 'Rota', render: (r) => <span className="text-xs text-muted-foreground font-mono">{r.route}</span> },
    { key: 'audit_type', header: 'Tipo de Auditoria', render: (r) => <span className="text-xs">{r.audit_type}</span> },
    { key: 'status', header: 'Status', render: (r) => (
      <Badge variant="outline" className={`text-[10px] font-bold ${r.status === 'ok' ? 'bg-emerald-100 text-emerald-700' : r.status === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
        {r.status === 'ok' ? '✓ OK' : r.status === 'warning' ? '⚠ Atenção' : '✗ Erro'}
      </Badge>
    ), className: 'text-center' },
    { key: 'desc', header: 'Descrição', render: (r) => <span className="text-xs text-muted-foreground">{r.description}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Qualidade e Auditoria' }]}
        title="Qualidade do BI e Auditoria Analítica"
        description="Governança, consistência e qualidade visual do módulo BI"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Verificações" value={items.length} icon={BadgeCheck} loading={loading} />
        <KpiCard title="Aprovados" value={okCount} icon={CheckCircle2} variant="success" loading={loading} />
        <KpiCard title="Atenção" value={warningCount} icon={AlertTriangle} variant="warning" loading={loading} />
        <KpiCard title="Erros" value={errorCount} icon={XCircle} variant="danger" loading={loading} />
      </div>

      <ChartCard title="Verificações por Tipo de Auditoria" loading={loading}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="ok" name="OK" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="warning" name="Atenção" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="error" name="Erro" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Checklist de Auditoria por Tela</h2>
        <AnalyticTable columns={columns} data={items} loading={loading} />
      </div>
    </div>
  );
}
