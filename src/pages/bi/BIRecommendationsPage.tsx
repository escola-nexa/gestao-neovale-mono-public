import { useState } from 'react';
import { ClipboardList, AlertCircle, Zap, Target, HelpCircle } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { ChartCard } from '@/components/bi/ChartCard';
import { RecommendationCard } from '@/components/bi/RecommendationCard';
import { AnalyticTable, AnalyticColumn } from '@/components/bi/AnalyticTable';
import { GlobalFilterBar, BIFilters } from '@/components/bi/GlobalFilterBar';
import { useBIRecommendations, BIRecommendation } from '@/hooks/bi/useBIRecommendations';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function RecommendationMethodologyDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="text-muted-foreground hover:text-primary transition-colors"><HelpCircle className="h-5 w-5" /></button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Como as Recomendações são Geradas?</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-5 text-sm text-foreground">
          <section>
            <h3 className="font-semibold mb-1">Fontes de Dados</h3>
            <p className="text-muted-foreground">As recomendações são calculadas <strong>automaticamente</strong> com base nos dados reais do sistema, analisando o desempenho de cada professor e escola através do <strong>Score de Conformidade</strong> (0–100), composto por: Planejamento (30%), Frequência (25%), Notas (20%), Orientações (15%) e Carga Horária (10%).</p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Regras de Geração</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-1.5 pr-2 font-medium text-muted-foreground">Situação</th>
                    <th className="text-left py-1.5 pr-2 font-medium text-muted-foreground">Prior.</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Categoria</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-2">Conformidade &lt; 60%</td><td className="pr-2"><Badge variant="outline" className="bg-red-100 text-red-700 text-[10px]">Alta</Badge></td><td>Intervenção Pedagógica</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-2">Score de notas &lt; 20%</td><td className="pr-2"><Badge variant="outline" className="bg-red-100 text-red-700 text-[10px]">Alta</Badge></td><td>Fechamento de Notas</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-2">Escola com conformidade &lt; 50%</td><td className="pr-2"><Badge variant="outline" className="bg-red-100 text-red-700 text-[10px]">Alta</Badge></td><td>Apoio à Escola</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-2">Planejamento &lt; 40% (conformidade ≥ 60%)</td><td className="pr-2"><Badge variant="outline" className="bg-amber-100 text-amber-700 text-[10px]">Média</Badge></td><td>Reforço de Planejamento</td></tr>
                  <tr className="border-b border-border/50"><td className="py-1.5 pr-2">Frequência &lt; 40%</td><td className="pr-2"><Badge variant="outline" className="bg-amber-100 text-amber-700 text-[10px]">Média</Badge></td><td>Regularização de Frequência</td></tr>
                  <tr><td className="py-1.5 pr-2">Conformidade global &lt; 70%</td><td className="pr-2"><Badge variant="outline" className="bg-amber-100 text-amber-700 text-[10px]">Média</Badge></td><td>Ação Sistêmica</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Prazos Sugeridos</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
              <li><strong>Alta</strong>: 7 dias</li>
              <li><strong>Média</strong>: 15 dias</li>
              <li><strong>Baixa</strong>: 30 dias</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold mb-1">E os professores novos?</h3>
            <p className="text-muted-foreground">Professores recém-cadastrados que <strong>ainda não possuem dados</strong> de planejamento, frequência ou notas <strong>não aparecem nas recomendações</strong>, pois seus scores começam zerados e o sistema precisa de dados mínimos para gerar sugestões relevantes. Conforme o professor inicia suas atividades, o sistema passa a monitorá-lo automaticamente.</p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Score de Impacto</h3>
            <p className="text-muted-foreground">Cada recomendação recebe um score de 0–100 que reflete o quanto a ação pode melhorar os indicadores. Quanto menor o score do professor na dimensão avaliada, maior o impacto potencial da intervenção.</p>
          </section>

          <section>
            <h3 className="font-semibold mb-1">Ordenação</h3>
            <p className="text-muted-foreground">As recomendações são ordenadas por <strong>prioridade</strong> (Alta → Média → Baixa) e, dentro da mesma prioridade, pelo <strong>score de impacto</strong> (maior primeiro).</p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}


export default function BIRecommendationsPage() {
  const [filters, setFilters] = useState<BIFilters>({});
  const { recommendationsQuery } = useBIRecommendations(filters);
  const recs = recommendationsQuery.data || [];
  const loading = recommendationsQuery.isLoading;

  const alta = recs.filter(r => r.priority === 'alta');
  const media = recs.filter(r => r.priority === 'media');
  const baixa = recs.filter(r => r.priority === 'baixa');

  const categories = [...new Set(recs.map(r => r.category))];
  const truncCat = (c: string, max = 14) => c.length > max ? c.slice(0, max) + '…' : c;
  const chartData = categories.map(c => ({ name: truncCat(c), value: recs.filter(r => r.category === c).length }));

  const columns: AnalyticColumn<BIRecommendation>[] = [
    { key: 'priority', header: 'Prior.', render: (r) => (
      <Badge variant="outline" className={`text-[10px] font-bold ${r.priority === 'alta' ? 'bg-red-100 text-red-700' : r.priority === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
        {r.priority.charAt(0).toUpperCase() + r.priority.slice(1)}
      </Badge>
    ), className: 'w-20' },
    { key: 'category', header: 'Categ.', render: (r) => <span className="text-xs truncate block max-w-[100px]">{r.category}</span> },
    { key: 'target', header: 'Alvo', render: (r) => <span className="text-sm font-medium truncate block max-w-[120px]">{r.target_name}</span> },
    { key: 'action', header: 'Ação', render: (r) => <span className="text-xs line-clamp-2">{r.action}</span> },
    { key: 'impact', header: 'Impacto', render: (r) => <span className="text-xs font-medium">{r.impact} ({r.impact_score})</span> },
    { key: 'deadline', header: 'Prazo', render: (r) => <span className="text-xs text-muted-foreground whitespace-nowrap">{r.recommended_deadline}</span> },
    { key: 'owner', header: 'Resp.', render: (r) => <span className="text-xs truncate block max-w-[100px]">{r.recommended_owner}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.', href: '/bi' }, { label: 'Recomendações de Ação' }]}
        title="Recomendações de Ação"
        description="Sugestões práticas e priorizadas para gestão pedagógica"
        icon={ClipboardList}
        actions={<RecommendationMethodologyDrawer />}
      />

      <GlobalFilterBar filters={filters} onChange={setFilters} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Total Recomend." value={recs.length} icon={ClipboardList} loading={loading} />
        <KpiCard title="Prior. Alta" value={alta.length} icon={AlertCircle} variant="danger" loading={loading} />
        <KpiCard title="Prior. Média" value={media.length} icon={Zap} variant="warning" loading={loading} />
        <KpiCard title="Prior. Baixa" value={baixa.length} icon={Target} variant="info" loading={loading} />
      </div>

      {/* Priority Cards */}
      {alta.length > 0 && (
        <ChartCard title="Recomendações Prioritárias" subtitle="Ações de maior urgência e impacto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alta.slice(0, 6).map(rec => (
              <RecommendationCard
                key={rec.id}
                priority={rec.priority}
                category={rec.category}
                targetName={rec.target_name}
                targetId={rec.target_id}
                targetType={rec.target_type}
                action={rec.action}
                reason={rec.reason}
                impact={rec.impact}
              />
            ))}
          </div>
        </ChartCard>
      )}

      <ChartCard title="Ações por Categoria" loading={loading}>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Plano de Ação Detalhado</h2>
        <AnalyticTable columns={columns} data={recs} loading={loading} emptyMessage="Nenhuma recomendação gerada para os filtros aplicados" />
      </div>
    </div>
  );
}
