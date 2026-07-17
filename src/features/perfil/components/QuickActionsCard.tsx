import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Zap, FileText, ClipboardList, Clock, BarChart3, School,
  GraduationCap, BookOpen, Settings,
} from 'lucide-react';

interface Props {
  role: string;
}

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route: string;
}

export function QuickActionsCard({ role }: Props) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [];

  if (role === 'professor') {
    actions.push(
      { label: 'Frequência', icon: Clock, route: '/frequencia' },
      { label: 'Planejamento', icon: FileText, route: '/planejamento' },
      { label: 'Notas', icon: BarChart3, route: '/notas' },
      { label: 'Orientações', icon: ClipboardList, route: '/orientacoes' },
      { label: 'Grade Horária', icon: BookOpen, route: '/grade-horaria' },
      { label: 'Calendário', icon: Clock, route: '/calendario' },
    );
  }

  if (role === 'coordenador' || role === 'rh') {
    actions.push(
      { label: 'Planejamento', icon: FileText, route: '/planejamento' },
      { label: 'Orientações', icon: ClipboardList, route: '/orientacoes' },
      { label: 'Frequência', icon: Clock, route: '/frequencia' },
      { label: 'Notas', icon: BarChart3, route: '/notas' },
      { label: 'Escolas', icon: School, route: '/escolas' },
      { label: 'B.I.', icon: BarChart3, route: '/bi' },
    );
  }

  if (role === 'admin') {
    actions.push(
      { label: 'Escolas', icon: School, route: '/escolas' },
      { label: 'Usuários', icon: Settings, route: '/usuarios' },
      { label: 'Professores', icon: GraduationCap, route: '/professores' },
      { label: 'Planejamento', icon: FileText, route: '/planejamento' },
      { label: 'B.I.', icon: BarChart3, route: '/bi' },
      { label: 'Calendário', icon: Clock, route: '/calendario' },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Atalhos Rápidos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actions.map(action => (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-1.5 text-xs"
              onClick={() => navigate(action.route)}
            >
              <action.icon className="h-5 w-5 text-primary" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
