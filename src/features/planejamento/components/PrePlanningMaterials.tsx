import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { planejamentoApi } from '@/features/planejamento/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Image as ImageIcon, FileVideo, FileAudio, FileType, ExternalLink, Loader2 } from 'lucide-react';

interface PrePlanningMaterialsProps {
  prePlanningId: string;
}

interface MaterialRow {
  id: string;
  display_order: number;
  lesson_material: {
    id: string;
    title: string;
    description: string | null;
    material_type: 'pdf' | 'image' | 'text' | 'audio' | 'video';
    file_url: string | null;
    text_content: string | null;
  } | null;
}

const ICON: Record<string, any> = { pdf: FileText, image: ImageIcon, video: FileVideo, audio: FileAudio, text: FileType };

export function PrePlanningMaterials({ prePlanningId }: PrePlanningMaterialsProps) {
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('pre_planning_materials')
        .select('id, display_order, lesson_material:lesson_materials(id, title, description, material_type, file_url, text_content)')
        .eq('pre_planning_id', prePlanningId)
        .order('display_order');
      if (!cancelled) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [prePlanningId]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Materiais do Calendário Semanal</CardTitle></CardHeader>
        <CardContent><Loader2 className="h-4 w-4 animate-spin" /></CardContent>
      </Card>
    );
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materiais do Calendário Semanal</CardTitle>
        <CardDescription>Vinculados automaticamente da disciplina/semana correspondente</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map(r => {
          const m = r.lesson_material;
          if (!m) return null;
          const Icon = ICON[m.material_type] || FileType;
          return (
            <div key={r.id} className="flex items-start gap-3 rounded-md border border-border p-3">
              <Icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{m.title}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">{m.material_type}</Badge>
                </div>
                {m.description && <div className="text-xs text-muted-foreground mt-1">{m.description}</div>}
                {m.material_type === 'text' && m.text_content && (
                  <div className="text-xs whitespace-pre-wrap mt-2 bg-muted/40 rounded p-2">{m.text_content}</div>
                )}
              </div>
              {m.file_url && (
                <Button size="sm" variant="outline" asChild>
                  <a href={m.file_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Abrir
                  </a>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
