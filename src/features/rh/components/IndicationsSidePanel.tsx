import { useQuery } from '@tanstack/react-query';
import { Inbox, Phone, Mail, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { hrApi } from '../api';

interface Props {
  schoolId: string;
  courseId: string;
  onPickIndication?: (indicationId: string) => void;
}

export function IndicationsSidePanel({ schoolId, courseId, onPickIndication }: Props) {
  const q = useQuery({
    queryKey: ['rh-aloc', 'sidepanel-indications', schoolId, courseId],
    enabled: !!schoolId,
    queryFn: () =>
      hrApi.listIndicationsByContext({
        school_id: schoolId,
        course_id: courseId || undefined,
        status: ['APROVADA', 'PENDENTE', 'EM_ANALISE'],
      }),
  });

  const items = q.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4" /> Indicações disponíveis
          <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          {items.length === 0 ? (
            <p className="p-6 text-xs text-center text-muted-foreground">Sem indicações para esta escola/curso.</p>
          ) : (
            <ul className="divide-y">
              {items.map((i: any) => (
                <li
                  key={i.id}
                  className="p-3 hover:bg-muted cursor-pointer text-sm"
                  onClick={() => onPickIndication?.(i.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium whitespace-normal break-words">{i.candidato_nome}</div>
                      <div className="text-xs text-muted-foreground">
                        Indicado por {i.indicado_por_nome}
                      </div>
                      {i.candidato_disciplinas && (
                        <div className="text-xs mt-1">{i.candidato_disciplinas}</div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-muted-foreground">
                        {i.candidato_telefone && (
                          <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{i.candidato_telefone}</span>
                        )}
                        {i.candidato_email && (
                          <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{i.candidato_email}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">{i.status}</Badge>
                  </div>
                  {onPickIndication && (
                    <div className="text-[11px] text-primary mt-2 flex items-center gap-1">
                      Clique para atribuir a uma vaga <ChevronRight className="h-3 w-3" />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
