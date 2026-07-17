import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Briefcase, School } from 'lucide-react';
import type { ProfessorBindings } from '../hooks/useProfileData';

interface Props {
  role: string;
  bindings: ProfessorBindings[];
  organizationName: string;
}

export function ProfessionalCard({ role, bindings, organizationName }: Props) {
  if (role === 'admin') {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Dados Profissionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-3">
            <School className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Organização</p>
              <p className="text-xs text-muted-foreground">{organizationName || '—'}</p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium">Nível de Acesso</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acesso total ao sistema: gestão de escolas, usuários, calendários, planejamentos, BI e configurações.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bindings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Vínculos Profissionais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum vínculo ativo encontrado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          Vínculos Profissionais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {bindings.map(b => (
          <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 min-w-0">
              <School className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-sm font-medium truncate block">{b.school_name}</span>
                <span className="text-xs text-muted-foreground truncate block">{b.course_name}</span>
              </div>
            </div>
            {b.is_coordinator && (
              <Badge variant="secondary" className="text-xs shrink-0 ml-2">Coordenador</Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
