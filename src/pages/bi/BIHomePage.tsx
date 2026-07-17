import { LayoutDashboard, ClipboardCheck, CalendarCheck2, UserRoundSearch, TriangleAlert, TrendingUp, Users, AlertTriangle, ShieldAlert, GraduationCap, School, MapPinned, Trophy, FileSpreadsheet, Lightbulb, ClipboardList, MonitorCog, BadgeCheck, Crown, FolderCheck, BarChart3 } from 'lucide-react';
import { KpiCard } from '@/components/bi/KpiCard';
import { MethodologyDrawer } from '@/components/bi/MethodologyDrawer';
import { useBIExecutive } from '@/hooks/bi/useBIExecutive';
import { PageHeader } from '@/components/PageHeader';
import { NeovaleHubCard, NeovaleSectionHeader } from '@/components/NeovaleHubCard';

const sectionProfessores = [
  { title: 'Ranking de\nProfessores', description: 'Reconhecimento, análise comparativa e consistência temporal docente.', icon: Crown, url: '/bi/rankings', tag: '01 / Ranking', badge: 'Destaque' },
  { title: 'Visão Executiva', description: 'Acompanhamento estratégico consolidado com KPIs e semáforos.', icon: LayoutDashboard, url: '/bi/visao-executiva', tag: '02 / Executivo' },
  { title: 'Entregas e\nPlanejamentos', description: 'Fluxo de planejamento docente e aderência ao cronograma.', icon: ClipboardCheck, url: '/bi/planejamentos', tag: '03 / Planejamento' },
  { title: 'Frequência e\nExecução', description: 'Disciplina operacional e registro de presença em sala.', icon: CalendarCheck2, url: '/bi/frequencia', tag: '04 / Frequência' },
  { title: 'Análise Individual', description: 'Dossiê completo por docente com histórico e comparativos.', icon: UserRoundSearch, url: '/bi/professores', tag: '05 / Dossiê' },
  { title: 'Riscos e Alertas', description: 'Monitoramento preventivo e ação rápida sobre criticidades.', icon: TriangleAlert, url: '/bi/riscos-alertas', tag: '06 / Riscos' },
  { title: 'Documentos dos\nProfessores', description: 'Conformidade documental: quem entregou e o que ainda falta.', icon: FolderCheck, url: '/bi/documentos-professores', tag: '07 / Documentos' },
];

const sectionConsolidadas = [
  { title: 'Notas e\nAprendizagem', description: 'Resultado acadêmico e correlações pedagógicas.', icon: GraduationCap, url: '/bi/notas-aprendizagem', tag: '08 / Notas' },
  { title: 'Análise por Escola', description: 'Visão consolidada por unidade escolar.', icon: School, url: '/bi/escolas-bi', tag: '09 / Escolas' },
  { title: 'Análise por Cidade', description: 'Visão territorial e comparativa entre cidades.', icon: MapPinned, url: '/bi/cidades', tag: '10 / Cidades' },
  { title: 'Ranking e\nComparativos', description: 'Comparação estratégica por múltiplos recortes.', icon: Trophy, url: '/bi/rankings', tag: '11 / Comparativos' },
  { title: 'Exportações e\nRelatórios', description: 'Relatórios executivos e operacionais para download.', icon: FileSpreadsheet, url: '/bi/relatorios', tag: '12 / Relatórios' },
];

const sectionInteligencia = [
  { title: 'Insights\nInteligentes', description: 'Leituras automáticas do que está acontecendo agora.', icon: Lightbulb, url: '/bi/insights', tag: '13 / Insights' },
  { title: 'Tendências e\nProjeções', description: 'Evolução e direção dos indicadores ao longo do tempo.', icon: TrendingUp, url: '/bi/tendencias', tag: '14 / Tendências' },
  { title: 'Previsão de Risco', description: 'Antecipação de criticidades e riscos futuros.', icon: ShieldAlert, url: '/bi/previsao-risco', tag: '15 / Previsão' },
  { title: 'Recomendações\nde Ação', description: 'Sugestões práticas e priorizadas para gestão.', icon: ClipboardList, url: '/bi/recomendacoes', tag: '16 / Ações' },
  { title: 'Sala de\nMonitoramento', description: 'Painel central de decisão em tempo real.', icon: MonitorCog, url: '/bi/monitoramento', tag: '17 / Monitor' },
  { title: 'Qualidade e\nAuditoria', description: 'Governança, consistência e qualidade analítica.', icon: BadgeCheck, url: '/bi/auditoria', tag: '18 / Auditoria' },
];

export default function BIHomePage() {
  const { kpisQuery } = useBIExecutive({});
  const kpis = kpisQuery.data;
  const loading = kpisQuery.isLoading;

  return (
    <div className="space-y-10">
      <PageHeader
        breadcrumbs={[{ label: 'B.I.' }]}
        title="Central de B.I."
        description="Hub principal das análises estratégicas do sistema."
        icon={BarChart3}
        variant="hero"
        actions={<MethodologyDrawer />}
      />

      {/* Top Summary KPIs (mantidos claros — são dados, não navegação) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard title="Conformidade Geral" value={kpis ? `${kpis.avg_compliance_score?.toFixed(0)}%` : '—'} icon={TrendingUp} variant="info" loading={loading} />
        <KpiCard title="Risco Médio" value={kpis ? `${kpis.avg_risk_score?.toFixed(0)}%` : '—'} icon={ShieldAlert} variant={kpis && kpis.avg_risk_score > 40 ? 'danger' : 'success'} loading={loading} />
        <KpiCard title="Prof. Atenção" value={kpis?.teachers_attention ?? '—'} icon={AlertTriangle} variant="warning" loading={loading} />
        <KpiCard title="Prof. Críticos" value={kpis?.teachers_critical ?? '—'} icon={TriangleAlert} variant="danger" loading={loading} />
        <KpiCard title="Pendências" value={kpis?.total_pending ?? '—'} icon={Users} variant="default" loading={loading} />
      </div>

      <div>
        <NeovaleSectionHeader label="Análises de Professores" description="Acompanhe desempenho, conformidade, riscos e evolução docente" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sectionProfessores.map((c) => <NeovaleHubCard key={c.tag} {...c} />)}
        </div>
      </div>

      <div>
        <NeovaleSectionHeader label="Análises Consolidadas" description="Visão por escola, cidade, ranking e aprendizagem" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sectionConsolidadas.map((c) => <NeovaleHubCard key={c.tag} {...c} />)}
        </div>
      </div>

      <div>
        <NeovaleSectionHeader label="Inteligência Analítica" description="Insights, tendências, previsões e recomendações de ação" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sectionInteligencia.map((c) => <NeovaleHubCard key={c.tag} {...c} />)}
        </div>
      </div>
    </div>
  );
}
