import {
  Calendar,
  FileText,
  MessageSquare,
  School,
  BookOpen,
  GraduationCap,
  ClipboardList,
  BarChart3,
  FileSpreadsheet,
  Settings,
  Home,
  Route,
  Clock,
  Sparkles,
  MapPin,
  User,
  BookOpenCheck,
  CalendarDays,
  UserCog,
  Users,
  BookMarked,
  NotebookPen,
  Share2,
  Shield,
  ListChecks,
  Trophy,
  TicketCheck,
  Image as ImageIcon,
  Webhook,
  ShieldCheck,
  UserPlus,
  Briefcase,
  Library,
  HelpCircle,
  Bell,
  AlertTriangle,
  Wallet,
  Receipt,
  HandCoins,
  Banknote,
  Scale,
  PiggyBank,
  Landmark,
  CreditCard,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { useBranding } from '@/hooks/useBranding';
import { usePwaSettings } from '@/hooks/usePwaSettings';
import { isStandalone } from '@/hooks/useInstallPrompt';
import {
  useFinancialMenuPermissions,
  FINANCEIRO_MENU_PERMISSION_MAP,
} from '@/features/financeiro/hooks/useFinancialMenuPermissions';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'planejamento' | 'orientacoes' | 'frequencia' | 'chat';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// Ordem padrão: Início → Cadastros → Rotina Pedagógica → Recursos & Agenda
// → R.H. → Análise & Acompanhamento → Comunicação → Compartilhamento → Sistema → Conta
const adminGroups: NavGroup[] = [
  {
    label: 'Início',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: Home },
      { title: 'Pendências', url: '/pendencias', icon: ListChecks },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { title: 'Escolas', url: '/escolas', icon: School },
      { title: 'Itinerários Formativos', url: '/itinerarios', icon: Route },
      { title: 'Professores', url: '/professores', icon: GraduationCap },
      { title: 'Inconsistências de Alunos', url: '/alunos/inconsistencias', icon: AlertTriangle },
    ],
  },
  {
    label: 'Rotina Pedagógica',
    items: [
      { title: 'Planejamento', url: '/planejamento', icon: FileText, badgeKey: 'planejamento' },
      { title: 'Orientações', url: '/orientacoes', icon: MessageSquare, badgeKey: 'orientacoes' },
      { title: 'Frequência', url: '/frequencia', icon: ClipboardList },
      { title: 'Notas', url: '/notas', icon: BarChart3 },
      { title: 'Boletins', url: '/boletins', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Recursos & Agenda',
    items: [
      { title: 'Calendário Acadêmico', url: '/calendario', icon: CalendarDays },
      { title: 'Grade Horária', url: '/grade-horaria', icon: Clock },
      { title: 'Biblioteca Virtual', url: '/biblioteca', icon: Library },
    ],
  },
  {
    label: 'R.H.',
    items: [
      { title: 'R.H. - Alocação', url: '/rh', icon: Briefcase },
      { title: 'Banco de Talentos', url: '/banco-talentos', icon: UserPlus },
      { title: 'Presença Professores', url: '/presenca-professores', icon: UserCog },
      { title: 'Aptos para Contratação', url: '/rh/aptos-contratacao', icon: Briefcase },
      { title: 'Auditoria Contratação', url: '/rh/aptos-contratacao/auditoria', icon: ShieldCheck },
    ],
  },
  {
    label: 'Análise & Acompanhamento',
    items: [
      { title: 'B.I.', url: '/bi', icon: BarChart3 },
      { title: 'Acomp. Escolar', url: '/acompanhamento', icon: MapPin },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Visão Geral', url: '/financeiro', icon: Landmark },
      { title: 'Contas a Pagar', url: '/financeiro/contas-a-pagar', icon: Receipt },
      { title: 'Contas a Receber', url: '/financeiro/contas-a-receber', icon: HandCoins },
      { title: 'Pagamentos', url: '/financeiro/pagamentos', icon: CreditCard },
      { title: 'Tesouraria', url: '/financeiro/tesouraria', icon: Banknote },
      { title: 'Conciliação Bancária', url: '/financeiro/conciliacao', icon: Scale },
      { title: 'Orçamentos', url: '/financeiro/orcamentos', icon: PiggyBank },
      { title: 'Relatórios', url: '/financeiro/relatorios', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { title: 'Chat Institucional', url: '/chat', icon: MessageSquare, badgeKey: 'chat' },
      { title: 'Tickets', url: '/tickets', icon: TicketCheck },
    ],
  },
  {
    label: 'Compartilhamento Externo',
    items: [
      { title: 'Compartilhamento', url: '/compartilhamento', icon: Share2 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Administração', url: '/administracao', icon: ShieldCheck },
      { title: 'Auditoria de Acesso', url: '/auditoria', icon: Shield },
      { title: 'Central de Ajuda', url: '/ajuda', icon: HelpCircle },
    ],
  },
  {
    label: 'Conta',
    items: [
      { title: 'Notificações', url: '/configuracoes/notificacoes', icon: Bell },
      { title: 'Meu Perfil', url: '/meu-perfil', icon: UserCog },
    ],
  },
];

const coordenadorGroups: NavGroup[] = [
  {
    label: 'Início',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: Home },
      { title: 'Pendências', url: '/pendencias', icon: ListChecks },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { title: 'Escolas', url: '/escolas', icon: School },
      { title: 'Itinerários Formativos', url: '/itinerarios', icon: Route },
      { title: 'Professores', url: '/professores', icon: GraduationCap },
      { title: 'Inconsistências de Alunos', url: '/alunos/inconsistencias', icon: AlertTriangle },
      { title: 'Status Configuração', url: '/configuracoes/status', icon: Settings },
    ],
  },
  {
    label: 'Rotina Pedagógica',
    items: [
      { title: 'Planejamento', url: '/planejamento', icon: FileText, badgeKey: 'planejamento' },
      { title: 'Orientações', url: '/orientacoes', icon: MessageSquare, badgeKey: 'orientacoes' },
      { title: 'Frequência', url: '/frequencia', icon: ClipboardList },
      { title: 'Notas', url: '/notas', icon: BarChart3 },
      { title: 'Boletins', url: '/boletins', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Recursos & Agenda',
    items: [
      { title: 'Calendário Acadêmico', url: '/calendario', icon: CalendarDays },
      { title: 'Grade Horária', url: '/grade-horaria', icon: Clock },
      { title: 'Biblioteca Virtual', url: '/biblioteca', icon: Library },
    ],
  },
  {
    label: 'R.H.',
    items: [
      { title: 'R.H. - Alocação', url: '/rh', icon: Briefcase },
      { title: 'Banco de Talentos', url: '/banco-talentos', icon: UserPlus },
      { title: 'Presença Professores', url: '/presenca-professores', icon: UserCog },
      { title: 'Aptos para Contratação', url: '/rh/aptos-contratacao', icon: Briefcase },
      { title: 'Auditoria Contratação', url: '/rh/aptos-contratacao/auditoria', icon: ShieldCheck },
    ],
  },
  {
    label: 'Análise & Acompanhamento',
    items: [
      { title: 'B.I.', url: '/bi', icon: BarChart3 },
      { title: 'Acomp. Escolar', url: '/acompanhamento', icon: MapPin },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { title: 'Chat Institucional', url: '/chat', icon: MessageSquare, badgeKey: 'chat' },
      { title: 'Tickets', url: '/tickets', icon: TicketCheck },
    ],
  },
  {
    label: 'Compartilhamento Externo',
    items: [
      { title: 'Compartilhamento', url: '/compartilhamento', icon: Share2 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Central de Ajuda', url: '/ajuda', icon: HelpCircle },
    ],
  },
  {
    label: 'Conta',
    items: [
      { title: 'Notificações', url: '/configuracoes/notificacoes', icon: Bell },
      { title: 'Meu Perfil', url: '/meu-perfil', icon: User },
    ],
  },
];

const professorGroups: NavGroup[] = [
  {
    label: 'Início',
    items: [
      { title: 'Início', url: '/dashboard', icon: Home },
      { title: 'Pendências', url: '/pendencias', icon: ListChecks },
    ],
  },
  {
    label: 'Sala de Aula',
    items: [
      { title: 'Planejamento', url: '/planejamento', icon: NotebookPen, badgeKey: 'planejamento' },
      { title: 'Chamada', url: '/frequencia', icon: ClipboardList },
      { title: 'Notas', url: '/notas', icon: BarChart3 },
      { title: 'Boletins', url: '/boletins', icon: FileSpreadsheet },
      { title: 'Orientações', url: '/orientacoes', icon: MessageSquare, badgeKey: 'orientacoes' },
    ],
  },
  {
    label: 'Agenda & Recursos',
    items: [
      { title: 'Minha Grade', url: '/grade-horaria', icon: Clock },
      { title: 'Calendário', url: '/calendario', icon: CalendarDays },
      { title: 'Biblioteca', url: '/biblioteca', icon: Library },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { title: 'Chat', url: '/chat', icon: MessageSquare, badgeKey: 'chat' },
      { title: 'Tickets', url: '/tickets', icon: TicketCheck },
    ],
  },
  {
    label: 'Meu Espaço',
    items: [
      { title: 'Folha de Ponto', url: '/minha-presenca', icon: UserCog },
      { title: 'Notificações', url: '/configuracoes/notificacoes', icon: Bell },
      { title: 'Meu Perfil', url: '/meu-perfil', icon: User },
    ],
  },
  {
    label: 'Suporte',
    items: [
      { title: 'Ajuda', url: '/ajuda', icon: HelpCircle },
    ],
  },
];

// R.H. — perfil restrito (somente Dashboard, Escolas/Professores, R.H. e Talentos)
const rhGroups: NavGroup[] = [
  {
    label: 'Início',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: Home },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      { title: 'Escolas', url: '/escolas', icon: School },
      { title: 'Professores', url: '/professores', icon: GraduationCap },
    ],
  },
  {
    label: 'R.H.',
    items: [
      { title: 'R.H. - Alocação', url: '/rh', icon: Briefcase },
      { title: 'Banco de Talentos', url: '/banco-talentos', icon: UserPlus },
      { title: 'Presença Professores', url: '/presenca-professores', icon: UserCog },
      { title: 'Aptos para Contratação', url: '/rh/aptos-contratacao', icon: Briefcase },
      { title: 'Auditoria Contratação', url: '/rh/aptos-contratacao/auditoria', icon: ShieldCheck },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Central de Ajuda', url: '/ajuda', icon: HelpCircle },
    ],
  },
  {
    label: 'Conta',
    items: [
      { title: 'Notificações', url: '/configuracoes/notificacoes', icon: Bell },
      { title: 'Meu Perfil', url: '/meu-perfil', icon: UserCog },
    ],
  },
];

// Financeiro — perfil global isolado dos módulos pedagógicos e de R.H.
// Mantém apenas opções OPERACIONAIS. Todas as configurações/cadastros
// vivem em /administracao/financeiro (acessadas pelo Admin).
const financeiroGroups: NavGroup[] = [
  {
    label: 'Financeiro',
    items: [
      { title: 'Visão Geral', url: '/financeiro', icon: Landmark },
      { title: 'Contas a Pagar', url: '/financeiro/contas-a-pagar', icon: Receipt },
      { title: 'Contas a Receber', url: '/financeiro/contas-a-receber', icon: HandCoins },
      { title: 'Pagamentos', url: '/financeiro/pagamentos', icon: CreditCard },
      { title: 'Tesouraria', url: '/financeiro/tesouraria', icon: Banknote },
      { title: 'Conciliação Bancária', url: '/financeiro/conciliacao', icon: Scale },
      { title: 'Orçamentos', url: '/financeiro/orcamentos', icon: PiggyBank },
      { title: 'Relatórios', url: '/financeiro/relatorios', icon: FileSpreadsheet },
    ],
  },
  {
    label: 'Conta',
    items: [
      { title: 'Notificações', url: '/configuracoes/notificacoes', icon: Bell },
      { title: 'Minha Conta', url: '/meu-perfil', icon: UserCog },
    ],
  },
];

function getNavGroups(role: string | undefined): NavGroup[] {
  switch (role) {
    case 'admin':
      return adminGroups;
    case 'coordenador':
      return coordenadorGroups;
    case 'rh':
      return rhGroups;
    case 'financeiro':
      return financeiroGroups;
    case 'professor':
      return professorGroups;
    default:
      return professorGroups;
  }
}

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const collapsed = state === 'collapsed';
  const badges = useSidebarBadges();
  const { branding } = useBranding();

  const { data: pwaSettings } = usePwaSettings();
  const baseGroups = getNavGroups(user?.perfil);
  const role = user?.perfil as 'admin' | 'coordenador' | 'rh' | 'professor' | 'financeiro' | undefined;
  const hiddenByRole = role ? pwaSettings?.hidden_menu_items_by_role?.[role] : undefined;
  const hidden = hiddenByRole ?? pwaSettings?.hidden_menu_items_mobile ?? [];
  const standalone = typeof window !== 'undefined' && isStandalone();

  // Gating granular: para o perfil 'financeiro', filtra itens cuja
  // permissão (has_financial_permission) o backend negaria.
  const { data: finPerms } = useFinancialMenuPermissions();
  const applyFinPermFilter = role === 'financeiro' && !!finPerms;

  let navGroups = standalone && hidden.length
    ? baseGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => !hidden.includes(i.url)) }))
        .filter((g) => g.items.length > 0)
    : baseGroups;

  if (applyFinPermFilter) {
    navGroups = navGroups
      .map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          i.url in (FINANCEIRO_MENU_PERMISSION_MAP as Record<string, string>)
            ? finPerms![i.url] !== false
            : true,
        ),
      }))
      .filter((g) => g.items.length > 0);
  }

  return (
    <Sidebar collapsible="icon">
      {/* Brand Header — editorial Neovale */}
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5 relative">
        {/* Linha amarela editorial */}
        <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          {/* Ícone + texto — espelha a Pré-visualização de /configuracoes/marca */}
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(45_92%_49%)] flex items-center justify-center shadow-[0_8px_20px_-6px_hsl(48_100%_64%/0.5)] flex-shrink-0 overflow-hidden">
            {branding.icon_url ? (
              <img src={branding.icon_url} alt={branding.display_name} className="h-full w-full object-contain" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-extrabold text-sidebar-foreground text-lg tracking-tight leading-none truncate">
                {branding.display_name}
              </h2>
              <p className="text-[10px] text-sidebar-foreground/40 font-medium tracking-widest uppercase mt-0.5 truncate">
                {branding.subtitle}
              </p>
            </div>
          )}



        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin py-3 px-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1.5">
            <SidebarGroupLabel className="text-sidebar-foreground/30 text-[9px] uppercase tracking-[0.15em] font-bold px-3 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-0.5">
                {group.items.map((item) => {
                  // Parent of another sibling item must use exact match to avoid double-active
                  const hasChildItem = group.items.some(
                    (other) => other !== item && other.url.startsWith(item.url + '/')
                  );
                  const exactMatchOnly = item.url === '/dashboard' || item.url === '/rh' || hasChildItem;
                  const isActive = location.pathname === item.url ||
                    (!exactMatchOnly && location.pathname.startsWith(item.url + '/'));
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={cn(
                          "rounded-lg transition-all duration-200 group/item",
                          "hover:bg-sidebar-accent/15 hover:text-sidebar-foreground",
                          isActive && [
                            "!bg-primary text-primary-foreground font-semibold",
                            "hover:!bg-primary/90",
                          ]
                        )}
                      >
                        <NavLink to={item.url} className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <item.icon className={cn(
                              "!w-[18px] !h-[18px] transition-colors duration-200",
                              isActive
                                ? "!text-primary-foreground"
                                : "text-sidebar-foreground/60 group-hover/item:text-sidebar-foreground/90"
                            )} />
                            {collapsed && badgeCount > 0 && (
                              <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-sidebar animate-pulse" />
                            )}
                          </div>
                          <span className={cn(
                            "text-[13px] transition-colors duration-200 flex-1",
                            isActive
                              ? "!text-primary-foreground"
                              : "text-sidebar-foreground/70 group-hover/item:text-sidebar-foreground/90"
                          )}>
                            {item.title}
                          </span>
                          {!collapsed && badgeCount > 0 && (
                            <span className={cn(
                              "ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold",
                              isActive
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-destructive text-destructive-foreground"
                            )}>
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
