import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Send, Building2 } from 'lucide-react';
import { useMemo } from 'react';
import { KanbanCard } from '../../hooks/useProfessorsKanban';

interface Props {
  cards: KanbanCard[];
  docValue: string;
  docLabel: string;
  onClose: () => void;
  onGenerateLink?: (card: KanbanCard) => void;
}

export function MissingDocDrilldown({ cards, docValue, docLabel, onClose, onGenerateLink }: Props) {
  const filtered = useMemo(
    () => cards.filter(c => (c.missing || []).some(m => m.value === docValue)),
    [cards, docValue]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, KanbanCard[]>();
    filtered.forEach(c => {
      const schools = c.school_names && c.school_names.length > 0 ? c.school_names : ['(Sem escola vinculada)'];
      schools.forEach(s => {
        const arr = map.get(s) ?? [];
        arr.push(c);
        map.set(s, arr);
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2 flex-row items-start justify-between space-y-0 gap-2">
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 flex-wrap">
            Drill-down: <span className="text-primary">{docLabel}</span>
            <Badge variant="secondary">{filtered.length} professor(es)</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Professores que ainda não enviaram este documento, agrupados por escola.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {grouped.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">Nenhum professor pendente.</div>
        ) : grouped.map(([school, profs]) => (
          <div key={school} className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{school}</span>
              <span className="text-muted-foreground font-normal">· {profs.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {profs.map(c => {
                const showAction = onGenerateLink && (c.link_status === 'none' || c.link_status === 'expired');
                return (
                  <div key={`${school}-${c.professor_id}`} className="flex items-center gap-2 px-2 py-1.5 rounded border bg-background text-xs">
                    <span className="flex-1 truncate" title={c.full_name}>{c.full_name}</span>
                    <span className="text-muted-foreground tabular-nums">{c.completion_pct}%</span>
                    {showAction && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0"
                        title={c.link_status === 'expired' ? 'Renovar link' : 'Gerar link'}
                        onClick={() => onGenerateLink!(c)}>
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
