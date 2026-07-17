import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, MessageSquare, User, Clock } from 'lucide-react';
import { planejamentoApi } from '@/features/planejamento/api';

interface FeedbackRecord {
  id: string;
  coordinator_name: string;
  feedback: string;
  action: string;
  created_at: string;
}

interface FeedbackHistoryProps {
  teacherPlanningId: string;
}

const ACTION_LABELS: Record<string, string> = {
  DEVOLVIDO: 'Devolvido',
  ENVIADO: 'Enviado',
};

export function FeedbackHistory({ teacherPlanningId }: FeedbackHistoryProps) {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [teacherPlanningId]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('planning_feedback_history')
        .select('*')
        .eq('teacher_planning_id', teacherPlanningId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords((data as FeedbackRecord[]) || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-5 w-5 text-muted-foreground" />
          Histórico de Orientações {records.length > 0 && `(${records.length})`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma orientação registrada até o momento.</p>
        ) : (
          records.map((record, index) => (
            <div key={record.id}>
              {index > 0 && <Separator className="mb-3" />}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{record.coordinator_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {ACTION_LABELS[record.action] || record.action}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(record.created_at).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-muted-foreground whitespace-pre-wrap">{record.feedback}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
