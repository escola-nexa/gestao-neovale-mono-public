import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  MessageSquare,
  BookOpen,
  ClipboardCheck,
  ArrowRight,
  Eye,
  BarChart3,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const adminQuickActions: QuickAction[] = [
  {
    title: 'Revisar Planejamentos',
    description: 'Planejamentos aguardando revisão',
    icon: Eye,
    href: '/planejamento',
  },
  {
    title: 'Orientações',
    description: 'Gerenciar orientações pedagógicas',
    icon: MessageSquare,
    href: '/orientacoes',
  },
  {
    title: 'Frequência do Dia',
    description: 'Acompanhar registros de frequência',
    icon: ClipboardCheck,
    href: '/frequencia',
  },
  {
    title: 'Notas e Boletins',
    description: 'Acompanhar lançamento de notas',
    icon: BarChart3,
    href: '/notas',
  },
];

const professorQuickActions: QuickAction[] = [
  {
    title: 'Meus Planejamentos',
    description: 'Ver e editar seus planejamentos',
    icon: FileText,
    href: '/planejamento',
  },
  {
    title: 'Frequência',
    description: 'Registrar chamada das turmas',
    icon: ClipboardCheck,
    href: '/frequencia',
  },
  {
    title: 'Minha Grade',
    description: 'Visualizar sua grade horária',
    icon: BookOpen,
    href: '/grade-horaria',
  },
  {
    title: 'Orientações',
    description: 'Ver orientações da coordenação',
    icon: MessageSquare,
    href: '/orientacoes',
  },
];

interface QuickActionsCardProps {
  isProfessor: boolean;
}

export function QuickActionsCard({ isProfessor }: QuickActionsCardProps) {
  const actions = isProfessor ? professorQuickActions : adminQuickActions;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Ações Rápidas</CardTitle>
        <CardDescription>
          Acesse rapidamente as principais funcionalidades
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2">
          {actions.map((action) => (
            <Link
              key={action.title}
              to={action.href}
              className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-accent transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <action.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{action.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
