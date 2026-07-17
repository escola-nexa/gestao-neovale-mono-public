import { Wallet, Receipt, HandCoins, Banknote, Scale, PiggyBank, FileSpreadsheet, CreditCard } from 'lucide-react';

export interface FinHubItem {
  title: string;
  description: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Quando true, só exibe para admins. */
  adminOnly?: boolean;
}

// Hub operacional do Financeiro. Cadastros/configurações foram movidos
// para /administracao/financeiro (admin).
export const FINANCEIRO_HUB_ITEMS: FinHubItem[] = [
  {
    title: 'Contas a Pagar',
    description: 'Lançamento, aprovação e pagamento de despesas operacionais.',
    url: '/financeiro/contas-a-pagar',
    icon: Receipt,
  },
  {
    title: 'Contas a Receber',
    description: 'Faturamento, cobrança e baixa de recebíveis.',
    url: '/financeiro/contas-a-receber',
    icon: HandCoins,
  },
  {
    title: 'Pagamentos',
    description: 'Execução e baixa de pagamentos aprovados.',
    url: '/financeiro/pagamentos',
    icon: CreditCard,
  },
  {
    title: 'Tesouraria',
    description: 'Saldos de contas, transferências e fluxo de caixa diário.',
    url: '/financeiro/tesouraria',
    icon: Banknote,
  },
  {
    title: 'Conciliação Bancária',
    description: 'Conferência de extratos bancários e operadoras.',
    url: '/financeiro/conciliacao',
    icon: Scale,
  },
  {
    title: 'Orçamentos',
    description: 'Planejamento orçamentário por categoria, centro de custo e projeto.',
    url: '/financeiro/orcamentos',
    icon: PiggyBank,
  },
  {
    title: 'Relatórios',
    description: 'DRE, fluxo de caixa e relatórios analíticos.',
    url: '/financeiro/relatorios',
    icon: FileSpreadsheet,
  },
];

export const FIN_HUB_ICON = Wallet;
