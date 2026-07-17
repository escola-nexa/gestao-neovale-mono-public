import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Wallet,
  Users,
  Network,
  Building2,
  Settings,
  CreditCard,
} from 'lucide-react';

const items = [
  {
    title: 'Contas',
    description: 'Contas bancárias, caixas e carteiras.',
    url: '/financeiro/cadastros/contas',
    icon: Wallet,
  },
  {
    title: 'Beneficiários',
    description: 'Fornecedores, clientes e beneficiários (vincula professor existente).',
    url: '/financeiro/cadastros/beneficiarios',
    icon: Users,
  },
  {
    title: 'Plano de Contas',
    description: 'Plano de contas hierárquico de receitas e despesas.',
    url: '/financeiro/cadastros/plano-contas',
    icon: Network,
  },
  {
    title: 'Centros de Custo',
    description: 'Centros de custo hierárquicos, com vínculo a escola, cidade ou projeto.',
    url: '/financeiro/cadastros/centros-custo',
    icon: Building2,
  },
  {
    title: 'Métodos de Pagamento',
    description: 'Pix, TED, boleto, cartão e demais formas de pagamento.',
    url: '/financeiro/cadastros/metodos-pagamento',
    icon: CreditCard,
  },
  {
    title: 'Configurações Financeiras',
    description: 'Moeda padrão, exercício fiscal e regras de aprovação.',
    url: '/financeiro/configuracoes',
    icon: Settings,
  },
];

export default function CadastrosFinanceirosHubPage() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageBreadcrumb
        items={[
          { label: 'Financeiro', href: '/financeiro' },
          { label: 'Cadastros' },
        ]}
      />
      <PageHeader
        icon={Wallet}
        title="Cadastros Financeiros"
        description="Fundação cadastral do módulo Financeiro — contas, beneficiários, plano de contas, centros de custo e configurações."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.url}
              role="button"
              tabIndex={0}
              onClick={() => navigate(item.url)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(item.url);
                }
              }}
              className="cursor-pointer transition hover:border-primary/60 hover:shadow-md"
            >
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
