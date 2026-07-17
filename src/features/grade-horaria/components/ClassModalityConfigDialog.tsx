import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useOrganization } from '@/hooks/useOrganization';
import { gradeHorariaApi } from '../api';
import { SEMESTER_LABELS, type SubjectSemester } from '@/hooks/useSemester';
import {
  useClassModalityConfig,
  type ModalityRow,
} from '../hooks/useClassModalityConfig';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classGroupId: string | null;
  classGroupName?: string;
  onSaved?: () => void;
}

interface DraftRow extends ModalityRow {
  isDirty?: boolean;
}

export function ClassModalityConfigDialog({
  open,
  onOpenChange,
  classGroupId,
  classGroupName,
  onSaved,
}: Props) {
  const { organization } = useOrganization();
  const { rows, isLoading, refetch } = useClassModalityConfig(
    open ? classGroupId : null,
  );
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDrafts(rows.map((r) => ({ ...r })));
  }, [rows]);

  const updateDraft = (
    subjectId: string,
    semester: SubjectSemester,
    field: 'ch_presencial' | 'ch_anp',
    value: number,
  ) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.subject_id === subjectId && d.semester === semester
          ? { ...d, [field]: Math.max(0, value || 0), isDirty: true }
          : d,
      ),
    );
  };

  const errors = useMemo(() => {
    return drafts
      .filter((d) => d.ch_presencial + d.ch_anp > d.carga_horaria_semanal)
      .map((d) => `${d.subject_nome} (${SEMESTER_LABELS[d.semester]}): soma ${d.ch_presencial + d.ch_anp}h excede ${d.carga_horaria_semanal}h`);
  }, [drafts]);

  const dirtyCount = drafts.filter((d) => d.isDirty).length;

  const handleSave = async () => {
    if (!organization?.id || !classGroupId) return;
    if (errors.length > 0) {
      toast.error('Corrija os totais antes de salvar');
      return;
    }

    setSaving(true);
    try {
      const toUpsert = drafts
        .filter((d) => d.isDirty)
        .map((d) => ({
          organization_id: organization.id,
          class_group_id: classGroupId,
          subject_id: d.subject_id,
          semester: d.semester,
          ch_presencial: d.ch_presencial,
          ch_anp: d.ch_anp,
        }));

      if (toUpsert.length === 0) {
        toast.info('Nenhuma alteração para salvar');
        setSaving(false);
        return;
      }

      await gradeHorariaApi.saveClassModalityConfig(toUpsert);

      toast.success(`${toUpsert.length} configuração(ões) salva(s)`);
      await refetch();
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // Group by subject (rows already come per semester)
  const groups = useMemo(() => {
    const map = new Map<string, DraftRow[]>();
    drafts.forEach((d) => {
      const arr = map.get(d.subject_id) || [];
      arr.push(d);
      map.set(d.subject_id, arr);
    });
    return Array.from(map.entries());
  }, [drafts]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-primary" />
            Carga Horária Presencial / ANP
          </DialogTitle>
          <DialogDescription>
            Defina, por disciplina e semestre, quantas horas semanais são
            <strong className="text-foreground"> presenciais </strong>e quantas são
            <strong className="text-foreground"> ANP </strong>(Atividade Não Presencial).
            {classGroupName && (
              <span className="block mt-1 text-xs">
                Turma: <strong>{classGroupName}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : groups.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            Nenhuma disciplina ativa encontrada para esta turma.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 pb-1 text-[11px] font-medium text-muted-foreground uppercase">
              <div className="col-span-5">Disciplina</div>
              <div className="col-span-1 text-center">CH Total</div>
              <div className="col-span-3 text-center flex items-center justify-center gap-1">
                <MapPin className="h-3 w-3" />
                Presencial
              </div>
              <div className="col-span-3 text-center flex items-center justify-center gap-1">
                <Wifi className="h-3 w-3" />
                ANP
              </div>
            </div>

            {groups.map(([subjectId, subjectRows]) => (
              <Card key={subjectId} className="bg-muted/20">
                <CardContent className="p-3 space-y-2">
                  {subjectRows.map((row) => {
                    const sum = row.ch_presencial + row.ch_anp;
                    const overflow = sum > row.carga_horaria_semanal;
                    const incomplete = sum < row.carga_horaria_semanal;
                    return (
                      <div
                        key={`${row.subject_id}-${row.semester}`}
                        className="grid grid-cols-12 gap-2 items-center"
                      >
                        <div className="col-span-5 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {row.subject_nome}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {SEMESTER_LABELS[row.semester]}
                            </Badge>
                            {row.subject_codigo && (
                              <span className="text-[10px] text-muted-foreground">
                                {row.subject_codigo}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1 text-center font-mono text-sm">
                          {row.carga_horaria_semanal}h
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min={0}
                            max={row.carga_horaria_semanal}
                            value={row.ch_presencial}
                            onChange={(e) =>
                              updateDraft(
                                row.subject_id,
                                row.semester,
                                'ch_presencial',
                                parseInt(e.target.value, 10),
                              )
                            }
                            className="h-8 text-center"
                          />
                        </div>
                        <div className="col-span-3 space-y-1">
                          <Input
                            type="number"
                            min={0}
                            max={row.carga_horaria_semanal}
                            value={row.ch_anp}
                            onChange={(e) =>
                              updateDraft(
                                row.subject_id,
                                row.semester,
                                'ch_anp',
                                parseInt(e.target.value, 10),
                              )
                            }
                            className={`h-8 text-center ${
                              overflow ? 'border-destructive' : ''
                            }`}
                          />
                          {(overflow || incomplete) && (
                            <div
                              className={`text-[10px] flex items-center gap-1 justify-center ${
                                overflow
                                  ? 'text-destructive'
                                  : 'text-amber-600'
                              }`}
                            >
                              <AlertCircle className="h-3 w-3" />
                              {sum}/{row.carga_horaria_semanal}h
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}

            {errors.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive space-y-1">
                {errors.slice(0, 3).map((e, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {e}
                  </div>
                ))}
                {errors.length > 3 && (
                  <div className="opacity-70">
                    +{errors.length - 3} outro(s) erro(s)
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Fechar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || errors.length > 0 || dirtyCount === 0}
          >
            {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Salvar {dirtyCount > 0 && `(${dirtyCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
