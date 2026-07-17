import { Link } from 'react-router-dom';
import { Users, History, Link2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { NeovaleHubCard, NeovaleSectionHeader } from '@/components/NeovaleHubCard';

const operationCards = [
  {
    title: 'Indicações\ndas Escolas',
    description: 'Gere links públicos com palavra-chave para que cada diretor indique professores conforme o curso vinculado à sua escola.',
    url: '/rh/links-escolas',
    icon: Link2,
    tag: '01 / Captação',
  },
];

export default function RhHubPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: 'R.H.' }]}
        title="Recursos Humanos"
        description="Alocação de professores por escola, curso e turma — integrada à grade horária oficial."
        icon={Users}
        variant="hero"
      />

      <div>
        <NeovaleSectionHeader label="Operação" description="Fluxo principal: alocar, indicações e talentos." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {operationCards.map((c) => (
            <NeovaleHubCard key={c.url} {...c} />
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-4">
        <Link to="/rh/planos" className="inline-flex items-center gap-1 underline hover:text-foreground">
          <History className="h-3 w-3" /> Histórico de planos antigos
        </Link>
      </div>
    </div>
  );
}
