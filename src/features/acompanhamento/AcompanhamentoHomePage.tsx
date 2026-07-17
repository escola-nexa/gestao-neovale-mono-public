import { useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { NeovaleHubCard, NeovaleSectionHeader } from '@/components/NeovaleHubCard';
import { MapPin, Truck, FileText, Route, LayoutDashboard, BarChart3 } from 'lucide-react';

const categories = [
  {
    label: 'Ações em Campo',
    description: 'Planeje e execute rotas e entregas nas escolas',
    items: [
      { title: 'Rotas Educacionais', description: 'Planeje rotas inteligentes com otimização de deslocamento, custos e agenda de visitas.', icon: Route, path: '/acompanhamento/rotas', tag: '01 / Rotas' },
      { title: 'Visitas (legado)', description: 'Acesse o histórico de visitas individuais migradas.', icon: MapPin, path: '/acompanhamento/visitas', tag: '01b / Visitas' },
      { title: 'Entrega de Apostilas', description: 'Organize e rastreie entregas de material didático por escola.', icon: Truck, path: '/acompanhamento/entregas', tag: '02 / Entregas' },
    ],
  },
  {
    label: 'Controle e Evidências',
    description: 'Consulte registros e documentação das ações realizadas',
    items: [
      { title: 'Relatórios e Registros', description: 'Consulte registros, relatórios e evidências das ações realizadas.', icon: FileText, path: '/acompanhamento/relatorios', tag: '03 / Relatórios' },
    ],
  },
  {
    label: 'Gestão e Monitoramento',
    description: 'Acompanhe indicadores e métricas das ações externas',
    items: [
      { title: 'Painel Geral', description: 'Indicadores consolidados de todas as ações externas.', icon: LayoutDashboard, path: '/acompanhamento/painel', tag: '04 / Painel' },
      { title: 'Indicadores por Cidade e Escola', description: 'Acompanhe métricas detalhadas por território.', icon: BarChart3, path: '/acompanhamento/painel', tag: '05 / Indicadores' },
    ],
  },
];

const guideSteps = [
  { icon: MapPin, title: 'Crie uma Visita', description: 'Agende visitas e selecione escolas por cidade' },
  { icon: Route, title: 'Monte a Rota', description: 'Use a rota inteligente dentro da visita' },
  { icon: FileText, title: 'Registre a Visita', description: 'Documente encontros e evidências' },
  { icon: Truck, title: 'Entregas', description: 'Controle entregas com confirmação' },
];

export default function AcompanhamentoHomePage() {
  const { schoolId } = useParams<{ schoolId?: string }>();

  const breadcrumbs = schoolId
    ? [{ label: 'Escolas', href: '/escolas' }, { label: 'Escola', href: `/escolas/${schoolId}` }, { label: 'Acompanhamento Escolar' }]
    : [{ label: 'Acompanhamento Escolar' }];

  const buildPath = (path: string) => schoolId ? `/escolas/${schoolId}${path}` : path;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title="Acompanhamento Escolar"
        description={schoolId ? 'Ações e registros desta escola' : 'Central de ações externas, visitas, entregas e acompanhamento.'}
        icon={MapPin}
        variant="hero"
      />

      <FeatureGuideCard title="Como usar o Acompanhamento Escolar" steps={guideSteps} />

      {categories.map((cat) => (
        <div key={cat.label}>
          <NeovaleSectionHeader label={cat.label} description={cat.description} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {cat.items.map((item) => (
              <NeovaleHubCard
                key={item.title + item.tag}
                title={item.title}
                description={item.description}
                url={buildPath(item.path)}
                icon={item.icon}
                tag={item.tag}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
