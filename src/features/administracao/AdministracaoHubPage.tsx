import {
  Settings, Image as ImageIcon, Share2, Webhook, Users, MapPin,
  ShieldCheck, Smartphone, Bell, BellRing, KeyRound, Landmark,
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

type Section = {
  id: string;
  title: string;
  subtitle: string;
  cards: Card[];
};

const sections: Section[] = [
  {
    id: 'setup',
    title: 'Setup & Identidade',
    subtitle: 'Configuração inicial e identidade visual da organização.',
    cards: [
      {
        title: 'Status\nConfiguração',
        description: 'Verifique o progresso da configuração inicial do sistema e pendências de setup.',
        url: '/configuracoes/status',
        icon: Settings,
        tag: '01 / Setup',
      },
      {
        title: 'Marca\ne Identidade',
        description: 'Personalize o logo, ícone e nome exibidos no sistema para sua organização.',
        url: '/configuracoes/marca',
        icon: ImageIcon,
        tag: '02 / Branding',
      },
    ],
  },
  {
    id: 'pessoas',
    title: 'Pessoas & Acesso',
    subtitle: 'Gestão de usuários internos e compartilhamentos externos.',
    cards: [
      {
        title: 'Usuários',
        description: 'Cadastre, edite e gerencie permissões dos usuários (Admin, Coordenador, Professor).',
        url: '/usuarios',
        icon: Users,
        tag: '03 / Pessoas',
      },
      {
        title: 'Compartilhamento\nExterno',
        description: 'Gerencie links públicos, palavras-chave e auditoria de acessos externos.',
        url: '/compartilhamento',
        icon: Share2,
        tag: '04 / Acesso',
      },
      {
        title: 'Permissões\nFinanceiras',
        description: 'Conceda, revogue e audite permissões, escopos e limites do módulo financeiro.',
        url: '/administracao/permissoes-financeiras',
        icon: KeyRound,
        tag: '05 / Financeiro',
      },
    ],
  },
  {
    id: 'financeiro',
    title: 'Configurações Financeiras',
    subtitle: 'Cadastros, parâmetros, alçadas e fechamentos do módulo financeiro.',
    cards: [
      {
        title: 'Configurações\nFinanceiras',
        description: 'Contas, beneficiários, plano de contas, centros de custo, projetos, métodos, alçadas, parâmetros e fechamentos.',
        url: '/administracao/financeiro',
        icon: Landmark,
        tag: '06 / Financeiro',
      },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile & Notificações',
    subtitle: 'Aplicativo instalável e canais de notificação.',
    cards: [
      {
        title: 'App Mobile\n(PWA)',
        description: 'Configure ícone, nome, atalhos e quais menus aparecem quando instalado no celular.',
        url: '/configuracoes/pwa',
        icon: Smartphone,
        tag: '05 / Mobile',
      },
      {
        title: 'OneSignal\n(Envio Push)',
        description: 'Conecte o OneSignal para envio ilimitado de push para web, PWA e dispositivos móveis.',
        url: '/configuracoes/onesignal',
        icon: Bell,
        tag: '06 / Push',
      },
      {
        title: 'Minhas\nPreferências',
        description: 'Ative ou desative notificações push no seu dispositivo atual.',
        url: '/configuracoes/notificacoes',
        icon: BellRing,
        tag: '07 / Preferências',
      },
    ],
  },
  {
    id: 'integracoes',
    title: 'Integrações',
    subtitle: 'Conecte o Neovale a sistemas externos.',
    cards: [
      {
        title: 'Webhooks',
        description: 'Envie notificações automáticas para sistemas externos a cada evento do Neovale.',
        url: '/webhooks',
        icon: Webhook,
        tag: '08 / Integrações',
      },
    ],
  },
  {
    id: 'dados',
    title: 'Dados Base',
    subtitle: 'Bases territoriais e cadastros de apoio.',
    cards: [
      {
        title: 'Estados\ne Cidades',
        description: 'Gerencie a base territorial usada nas escolas e nos cadastros do sistema.',
        url: '/configuracoes/estados-cidades',
        icon: MapPin,
        tag: '09 / Território',
      },
    ],
  },
];

export default function AdministracaoHubPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        breadcrumbs={[{ label: 'Administração' }]}
        title="Administração"
        description="Central de configurações administrativas, integrações e gestão de usuários do sistema."
        icon={ShieldCheck}
        variant="hero"
      />

      {sections.map((section) => (
        <section key={section.id} className="space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-border pb-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {section.title}
              </h2>
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
