import { UserCog, ClipboardList, BarChart3, Replace } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { NeovaleHubCard, NeovaleSectionHeader } from '@/components/NeovaleHubCard';

const cards = [
  {
    title: 'Folhas de\nPresença',
    description:
      'Geração, conferência e fechamento da folha-ponto mensal de cada professor, com KPIs operacionais e exportação em PDF.',
    url: '/presenca-professores/folhas',
    icon: ClipboardList,
    tag: '01 / Operação',
  },
  {
    title: 'Substituição',
    description:
      'Demanda, indicação, execução, relatório, recibo e pagamento de substituições docentes — inclui o painel Financeiro (acesso restrito).',
    url: '/presenca-professores/substituicao',
    icon: Replace,
    tag: '02 / Substituição',
  },
  {
    title: 'Relatórios\nBI',
    description:
      'Indicadores analíticos consolidados: presença docente, CH ausente, divergências, ranking de ausências e desempenho por escola.',
    url: '/presenca-professores/bi',
    icon: BarChart3,
    tag: '03 / Analítico',
  },
];

export default function PresencaHubPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'Rotina Pedagógica' }, { label: 'Presença dos Professores' }]}
        title="Presença dos Professores"
        description="Centralize folhas-ponto mensais e análises de presença docente em um único hub."
        icon={UserCog}
        variant="hero"
      />

      <div>
        <NeovaleSectionHeader
          label="Módulos"
          description="Operação e análise da presença docente."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {cards.map((c) => (
            <NeovaleHubCard key={c.url} {...c} />
          ))}
        </div>
      </div>
    </div>
  );
}
