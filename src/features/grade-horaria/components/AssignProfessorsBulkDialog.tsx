import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';
import { gradeHorariaApi } from '@/features/grade-horaria/api';
import { toast } from 'sonner';
import { WEEKDAY_OPTIONS, type Weekday } from '@/types/academic';

interface UnassignedModel {
  id: string;
  school_id: string;
  course_id: string;
  subject_id: string | null;
  subject_name?: string;
  course_name?: string;
  school_name?: string;
  weekday: Weekday;
  start_time: string;
  end_time: string;
}

interface AssignProfessorsBulkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedModels: UnassignedModel[];
  onAssigned: () => void;
}

interface GroupKey {
  schoolId: string;
  courseId: string;
  subjectId: string | null;
  schoolName: string;
  courseName: string;
  subjectName: string;
  modelIds: string[];
}

export function AssignProfessorsBulkDialog({ open, onOpenChange, unassignedModels, onAssigned }: AssignProfessorsBulkDialogProps) {
  const [profOptions, setProfOptions] = useState<Record<string, { id: string; full_name: string }[]>>({});
  const [selectedProfs, setSelectedProfs] = useState<Record<string, string>>({}); // groupKey -> profId
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Agrupar por (school+course+subject)
  const groups = useMemo<GroupKey[]>(() => {
    const map = new Map<string, GroupKey>();
    unassignedModels.forEach(m => {
      const key = `${m.school_id}::${m.course_id}::${m.subject_id || 'none'}`;
      const g = map.get(key);
      if (g) {
        g.modelIds.push(m.id);
      } else {
        map.set(key, {
          schoolId: m.school_id,
          courseId: m.course_id,
          subjectId: m.subject_id,
          schoolName: m.school_name || '—',
          courseName: m.course_name || '—',
          subjectName: m.subject_name || 'Sem disciplina',
          modelIds: [m.id],
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.schoolName.localeCompare(b.schoolName) || a.courseName.localeCompare(b.courseName)
    );
  }, [unassignedModels]);

  // Carregar professores elegíveis por grupo (via professor_school_courses)
  useEffect(() => {
    if (!open || groups.length === 0) return;
    setLoading(true);
    (async () => {
      try {
        const uniquePairs = Array.from(new Set(groups.map(g => `${g.schoolId}::${g.courseId}`)));
        const opts: Record<string, { id: string; full_name: string }[]> = {};

        for (const pair of uniquePairs) {
          const [schoolId, courseId] = pair.split('::');
          const { data: bindings } = await supabase
            .from('professor_school_courses')
            .select('professor_id, professors:professor_id(id, full_name, status, deleted_at)')
            .eq('school_id', schoolId)
            .eq('course_id', courseId)
            .eq('status', 'ACTIVE');

          const profs = ((bindings || []) as any[])
            .map(b => b.professors)
            .filter(p => p && p.status === 'ACTIVE' && !p.deleted_at)
            .map(p => ({ id: p.id, full_name: p.full_name }))
            .sort((a, b) => a.full_name.localeCompare(b.full_name));

          opts[pair] = profs;
        }
        setProfOptions(opts);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, groups]);

  const groupKey = (g: GroupKey) => `${g.schoolId}::${g.courseId}::${g.subjectId || 'none'}`;

  const filledCount = Object.values(selectedProfs).filter(Boolean).length;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Promise<any>[] = [];
      groups.forEach(g => {
        const profId = selectedProfs[groupKey(g)];
        if (!profId) return;
        updates.push(
          (async () => gradeHorariaApi.client.from('weekly_teaching_models').update({ professor_id: profId }).in('id', g.modelIds))()
        );
      });

      if (updates.length === 0) {
        toast.error('Selecione ao menos um professor');
        setSaving(false);
        return;
      }

      const results = await Promise.all(updates);
      const errs = results.filter(r => r.error);
      if (errs.length) {
        console.error(errs);
        toast.error(`${errs.length} grupo(s) com erro`);
      } else {
        toast.success(`Professores atribuídos a ${filledCount} grupo(s)`);
        onAssigned();
        onOpenChange(false);
        setSelectedProfs({});
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atribuir');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-amber-600" /> Atribuir professores aos horários órfãos
          </DialogTitle>
          <DialogDescription>
            Horários sem professor são ignorados na geração de aulas. Atribua um professor por grupo (Escola · Curso · Disciplina).
            A escolha será aplicada a todos os slots correspondentes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto rounded-md border">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : groups.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              Nenhum horário sem professor encontrado.
            </div>
          ) : (
            <div className="divide-y">
              {groups.map(g => {
                const key = groupKey(g);
                const pair = `${g.schoolId}::${g.courseId}`;
                const opts = profOptions[pair] || [];
                const noProfsAvailable = opts.length === 0;
                return (
                  <div key={key} className="p-3 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3 items-center">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{g.subjectName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {g.schoolName} · {g.courseName}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {g.modelIds.length} horário{g.modelIds.length !== 1 ? 's' : ''}
                        </Badge>
                        {noProfsAvailable && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Sem professor vinculado
                          </Badge>
                        )}
                      </div>
                    </div>
                    <SearchableSelect
                      value={selectedProfs[key] || ''}
                      onValueChange={(v) => setSelectedProfs(prev => ({ ...prev, [key]: v }))}
                      placeholder={noProfsAvailable ? 'Vincule professores ao curso' : 'Selecione o professor'}
                      searchPlaceholder="Buscar..."
                      disabled={noProfsAvailable}
                      options={opts.map(p => ({ value: p.id, label: p.full_name }))}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || filledCount === 0}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Atribuir {filledCount > 0 ? `(${filledCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
