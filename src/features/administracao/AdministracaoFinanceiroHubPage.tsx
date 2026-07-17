import {
  Landmark, Wallet, Users, BookOpen, Building2, FolderKanban,
  CreditCard, ShieldCheck, Settings, Lock, KeyRound,
  CalendarClock, UserSquare2, FileBadge, Gavel, Wand2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { NeovaleHubCard } from '@/components/NeovaleHubCard';

type Card = {
  title: string;
  description: string;
  url: string;
  icon: typeof Settings;
  tag: string;
};

type Section = { id: string; title: string; subtitle: string; cards: Card[] };

const sections: Section[] = [
  {
    id: 'acesso',
    title: 'Acessos & Permissões',
    subtitle: 'Quem usa o financeiro e com quais limites.',
    cards: [
      {
        title: 'Usuários e\nPermissões',
        description: 'Adicione e remova usuários da função Financeiro, modelos, escopos, limites e auditoria.',
        url: '/administracao/permissoes-financeiras',
        icon: KeyRound,
        tag: '01 / Acesso',
      },
    ],
  },
  {
    id: 'cadastros',
    title: 'Cadastros',
    subtitle: 'Base estrutural para lançamentos e relatórios.',
    cards: [
      {
        title: 'Contas Bancárias\ne Caixas',
        description: 'Contas correntes, poupanças, caixas e cartões para movimentação financeira.',
        url: '/administracao/financeiro/contas',
        icon: Wallet,
        tag: '02 / Cadastros',
      },
      {
        title: 'Beneficiários\ne Fornecedores',
        description: 'Pessoas físicas e jurídicas que recebem pagamentos ou pagam à organização.',
        url: '/administracao/financeiro/beneficiarios',
        icon: Users,
        tag: '03 / Cadastros',
      },
      {
        title: 'Plano\nde Contas',
        description: 'Categorias hierárquicas de receita e despesa.',
        url: '/administracao/financeiro/plano-contas',
        icon: BookOpen,
        tag: '04 / Cadastros',
      },
      {
        title: 'Centros\nde Custo',
        description: 'Unidades, departamentos, escolas e cidades para rateio de custos.',
        url: '/administracao/financeiro/centros-custo',
        icon: Building2,
        tag: '05 / Cadastros',
      },
      {
        title: 'Projetos',
        description: 'Iniciativas e projetos rastreados separadamente no orçamento e nos relatórios.',
        url: '/administracao/financeiro/projetos',
        icon: FolderKanban,
        tag: '06 / Cadastros',
      },
      {
        title: 'Métodos\nde Pagamento',
        description: 'Formas de pagamento aceitas: PIX, boleto, transferência, cartão.',
        url: '/administracao/financeiro/metodos-pagamento',
        icon: CreditCard,
        tag: '07 / Cadastros',
      },
      {
        title: 'Condições\nde Pagamento',
        description: 'Prazos, parcelamentos e regras de vencimento aplicáveis a lançamentos.',
        url: '/administracao/financeiro/condicoes-pagamento',
        icon: CalendarClock,
        tag: '08 / Cadastros',
      },
      {
        title: 'Clientes\ne Pagadores',
        description: 'Pessoas que efetuam pagamentos à organização, com dados fiscais e de cobrança.',
        url: '/administracao/financeiro/clientes-pagadores',
        icon: UserSquare2,
        tag: '09 / Cadastros',
      },
      {
        title: 'Tipos\nde Documento',
        description: 'Categorias de documentos fiscais e contratuais usados em lançamentos.',
        url: '/administracao/financeiro/tipos-documento',
        icon: FileBadge,
        tag: '10 / Cadastros',
      },
    ],
  },
  {
    id: 'regras',
    title: 'Regras & Governança',
    subtitle: 'Parâmetros operacionais e controles de fechamento.',
    cards: [
      {
        title: 'Alçadas\nde Aprovação',
        description: 'Limites por usuário e categoria para aprovação de lançamentos.',
        url: '/administracao/financeiro/alcadas',
        icon: ShieldCheck,
        tag: '11 / Governança',
      },
      {
        title: 'Políticas\nde Aprovação',
        description: 'Fluxos com etapas, segregação e duplo aprovador por operação.',
        url: '/administracao/financeiro/politicas-aprovacao',
        icon: ShieldCheck,
        tag: '11b / Governança',
      },
      {
        title: 'Regras\nde Cobrança',
        description: 'Juros, multas, descontos e políticas de inadimplência.',
        url: '/administracao/financeiro/regras-cobranca',
        icon: Gavel,
        tag: '12 / Governança',
      },
      {
        title: 'Parâmetros\nGerais',
        description: 'Moeda, exercício fiscal, juros, multas e regras padrão.',
        url: '/administracao/financeiro/configuracoes',
        icon: Settings,
        tag: '13 / Governança',
      },
      {
        title: 'Assistente\nde Configuração',
        description: 'Checklist guiado dos requisitos mínimos antes de liberar operações.',
        url: '/administracao/financeiro/assistente',
        icon: Wand2,
        tag: '13b / Governança',
      },
      {
        title: 'Fechamentos\nMensais',
        description: 'Bloquear e reabrir períodos financeiros consolidados.',
        url: '/administracao/financeiro/fechamentos',
        icon: Lock,
        tag: '14 / Governança',
      },
    ],
  },
];

export default function AdministracaoFinanceiroHubPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        breadcrumbs={[
          { label: 'Administração', href: '/administracao' },
          { label: 'Configurações Financeiras' },
        ]}
        title="Configurações Financeiras"
        description="Central de cadastros, parâmetros, acessos e regras do módulo financeiro."
        icon={Landmark}
        variant="hero"
      />

      {sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.subtitle}</p>
            </div>
            <span className="hidden sm:inline-flex items-center rounded-full border border-border bg-muted/40 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              {section.cards.length} {section.cards.length === 1 ? 'opção' : 'opções'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {section.cards.map((card) => (
              <NeovaleHubCard key={card.url} {...card} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
