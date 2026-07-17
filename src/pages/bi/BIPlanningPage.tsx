import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { FileText, Send, RotateCcw, CheckCircle2, PenTool, Clock } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIPlanning } from '@/hooks/bi/useBIPlanning';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

const FUNNEL_COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#eab308', '#22c55e', '#10b981'];

export default function BIPlanningPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { metricsQuery, bySchoolQuery } = useBIPlanning(filters);
  const m = metricsQuery.data;
  const schools = bySchoolQuery.data || [];
  const loading = metricsQuery.isLoading;

  const funnelData = m ? [
    { name: 'Total', value: m.total_expected, fill: FUNNEL_COLORS[0] },
    { name: 'Rascunho', value: m.total_draft, fill: FUNNEL_COLORS[1] },
    { name: 'Enviados', value: m.total_submitted, fill: FUNNEL_COLORS[2] },
    { name: 'Devolv.', value: m.total_returned, fill: FUNNEL_COLORS[3] },
    { name: 'Aprov.', value: m.total_approved, fill: FUNNEL_COLORS[4] },
    { name: 'Assin.', value: m.total_signed, fill: FUNNEL_COLORS[5] },
  ] : [];

  // Truncate school names for chart
  const truncSchools = schools.map(s => ({
    ...s,
    school: typeof s.school === 'string' && s.school.length > 16 ? s.school.slice(0, 16) + '…' : s.school,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Entregas e Planejamentos' }]}
        title="Entregas e Planejamentos"
        description="Monitorar disciplina, qualidade e fluidez do fluxo"
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Total Esperados" value={m?.total_expected ?? '—'} icon={FileText} loading={loading} />
        <KpiCard title="Rascunho" value={m?.total_draft ?? '—'} icon={Clock} variant="warning" loading={loading} />
        <KpiCard title="Enviados" value={m?.total_submitted ?? '—'} icon={Send} variant="info" loading={loading} />
        <KpiCard title="Devolvidos" value={m?.total_returned ?? '—'} icon={RotateCcw} variant="danger" loading={loading} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <KpiCard title="Aprovados" value={m?.total_approved ?? '—'} icon={CheckCircle2} variant="success" loading={loading} />
        <KpiCard title="Assinados" value={m?.total_signed ?? '—'} icon={PenTool} variant="success" loading={loading} />
        <KpiCard title="Concluídos" value={m?.total_completed ?? '—'} icon={CheckCircle2} variant="success" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Funil do Fluxo" loading={loading}>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} margin={{ left: 10, right: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>}
        </ChartCard>

        <ChartCard title="Status por Escola" loading={bySchoolQuery.isLoading}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={truncSchools} margin={{ left: 10, right: 20 }}>
              <XAxis dataKey="school" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              <Bar dataKey="DRAFT" name="Rascunho" stackId="a" fill="#eab308" />
              <Bar dataKey="ENVIADO" name="Enviado" stackId="a" fill="#3b82f6" />
              <Bar dataKey="APROVADO" name="Aprovado" stackId="a" fill="#22c55e" />
              <Bar dataKey="DEVOLVIDO" name="Devolvido" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
