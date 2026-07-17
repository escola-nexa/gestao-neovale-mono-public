import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Construction, type LucideIcon } from 'lucide-react';

interface PlaceholderFinanceiroPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  bullets?: string[];
}

export default function PlaceholderFinanceiroPage({
  title,
  description,
  icon,
  bullets = [],
}: PlaceholderFinanceiroPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Configurações Financeiras', href: '/administracao/financeiro' },
          { label: title },
        ]}
        title={title}
        description={description}
        icon={icon}
        variant="hero"
      />

      <Card>
        <CardContent className="flex flex-col items-start gap-4 py-10">
          <Badge variant="secondary" className="gap-1">
            <Construction className="h-3.5 w-3.5" />
            Em construção
          </Badge>
          <h2 className="text-lg font-semibold">Cadastro disponível em breve</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Este cadastro faz parte da central de Configurações Financeiras. A interface está sendo
            implementada e respeitará:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            <li>Permissões <code>financeiro.configuracoes.visualizar</code> e <code>.editar</code>.</li>
            <li>Isolamento por <code>organization_id</code>.</li>
            <li>Auditoria de alterações e ativação/inativação (sem exclusão física quando em uso).</li>
            <li>Busca, filtros e paginação server-side.</li>
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
