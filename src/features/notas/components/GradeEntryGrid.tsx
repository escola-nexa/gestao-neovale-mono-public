import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Save, Lock, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Activity {
  id: string;
  name: string;
  display_order: number;
  max_score: number;
}

interface StudentRow {
  student_id: string;
  student_name: string;
  grades: Record<string, number | null>;
}

interface GradeEntryGridProps {
  activities: Activity[];
  students: StudentRow[];
  averageType: string;
  isClosed: boolean;
  isSaving: boolean;
  onSaveDraft: (rows: StudentRow[]) => void;
  onClose: (rows: StudentRow[]) => void;
}

export function GradeEntryGrid({
  activities, students: initialStudents, averageType, isClosed, isSaving,
  onSaveDraft, onClose,
}: GradeEntryGridProps) {
  const [rows, setRows] = useState<StudentRow[]>(initialStudents);
  // Track which cells are marked as N/A (no grade): Record<studentId, Set<activityId>>
  const [naFlags, setNaFlags] = useState<Record<string, Set<string>>>({});
  const { toast } = useToast();

  useEffect(() => {
    setRows(initialStudents);
    // Initialize N/A flags from null grades that were explicitly saved
    const flags: Record<string, Set<string>> = {};
    initialStudents.forEach(r => {
      const set = new Set<string>();
      activities.forEach(a => {
        // If grade is explicitly null and config exists, mark as N/A
        if (r.grades[a.id] === null && r.grades.hasOwnProperty(a.id)) {
          // We can't distinguish "not yet graded" from "N/A" without extra DB field,
          // so we only auto-flag if score was saved as null explicitly
        }
      });
      if (set.size > 0) flags[r.student_id] = set;
    });
    setNaFlags(flags);
  }, [initialStudents, activities]);

  const toggleNa = (studentId: string, activityId: string) => {
    if (isClosed) return;
    setNaFlags(prev => {
      const next = { ...prev };
      const set = new Set(next[studentId] || []);
      if (set.has(activityId)) {
        set.delete(activityId);
      } else {
        set.add(activityId);
        // Clear the grade when marking as N/A
        setRows(r => r.map(row =>
          row.student_id === studentId
            ? { ...row, grades: { ...row.grades, [activityId]: null } }
            : row
        ));
      }
      next[studentId] = set;
      return next;
    });
  };

  const isNa = (studentId: string, activityId: string) => {
    return naFlags[studentId]?.has(activityId) || false;
  };

  const updateGrade = (studentId: string, activityId: string, value: string) => {
    if (isClosed) return;
    const numVal = value === '' ? null : Math.min(Math.max(parseFloat(value) || 0, 0), 10);
    setRows(prev => prev.map(r =>
      r.student_id === studentId
        ? { ...r, grades: { ...r.grades, [activityId]: numVal } }
        : r
    ));
  };

  const calcAverage = (grades: Record<string, number | null>, studentId: string) => {
    const validActivities = activities.filter(a => !isNa(studentId, a.id));
    const scores = validActivities
      .map(a => grades[a.id])
      .filter((s): s is number => s !== null && s !== undefined);
    if (scores.length === 0) return null;
    const sum = scores.reduce((a, b) => a + b, 0);
    if (averageType === 'SOMATORIA') return Math.min(sum, 10);
    return Math.min(sum / scores.length, 10);
  };

  const sortedActivities = useMemo(() =>
    [...activities].sort((a, b) => a.display_order - b.display_order),
    [activities]
  );

  const handleSaveDraft = () => {
    // Validate: no average exceeds 10
    for (const row of rows) {
      const avg = calcAverage(row.grades, row.student_id);
      if (avg !== null && avg > 10) {
        toast({
          title: 'Nota inválida',
          description: `A média final de ${row.student_name} excede 10. Ajuste as notas.`,
          variant: 'destructive',
        });
        return;
      }
    }
    onSaveDraft(rows);
  };

  const handleClose = () => {
    for (const row of rows) {
      const avg = calcAverage(row.grades, row.student_id);
      if (avg !== null && avg > 10) {
        toast({
          title: 'Nota inválida',
          description: `A média final de ${row.student_name} excede 10. Ajuste as notas.`,
          variant: 'destructive',
        });
        return;
      }
    }
    onClose(rows);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Lançamento de Notas
            <Badge variant={averageType === 'SOMATORIA' ? 'default' : 'secondary'} className="ml-2">
              {averageType === 'SOMATORIA' ? 'Somatória' : 'Média Aritmética'}
            </Badge>
          </CardTitle>
          {isClosed && (
            <Badge variant="outline" className="text-destructive border-destructive gap-1">
              <Lock className="h-3 w-3" /> Notas Fechadas
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px] text-center font-bold">#</TableHead>
                <TableHead className="min-w-[220px] font-bold">Aluno</TableHead>
                {sortedActivities.map(act => (
                  <TableHead key={act.id} className="text-center min-w-[140px] font-bold">
                    {act.name}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[110px] font-bold bg-muted">
                  Média Final
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const avg = calcAverage(row.grades, row.student_id);
                const isBelowMin = avg !== null && avg < 6;
                return (
                  <TableRow
                    key={row.student_id}
                    className={isBelowMin ? 'bg-destructive/10 hover:bg-destructive/15' : ''}
                  >
                    <TableCell className="text-center text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-medium text-sm flex items-center gap-2">
                      {isBelowMin && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
                      {row.student_name}
                    </TableCell>
                    {sortedActivities.map(act => {
                      const na = isNa(row.student_id, act.id);
                      return (
                        <TableCell key={act.id} className="text-center p-1">
                          <div className="flex items-center justify-center gap-1.5">
                            <Checkbox
                              checked={na}
                              onCheckedChange={() => toggleNa(row.student_id, act.id)}
                              disabled={isClosed}
                              title="Sem nota (N/A)"
                              className="border-destructive data-[state=checked]:bg-destructive data-[state=checked]:border-destructive h-4 w-4 flex-shrink-0"
                            />
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              step={0.1}
                              value={na ? '' : (row.grades[act.id] ?? '')}
                              onChange={e => updateGrade(row.student_id, act.id, e.target.value)}
                              disabled={isClosed || na}
                              className={`w-[70px] mx-auto text-center h-8 text-sm ${na ? 'opacity-40 bg-muted' : ''}`}
                            />
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className={`text-center font-bold bg-muted/50 ${isBelowMin ? 'text-destructive' : 'text-foreground'}`}>
                      {avg !== null ? avg.toFixed(1) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={sortedActivities.length + 3} className="text-center py-8 text-muted-foreground">
                    Nenhum aluno matriculado nesta turma.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {!isClosed && rows.length > 0 && (
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Rascunho'}
            </Button>
            <Button variant="destructive" onClick={handleClose} disabled={isSaving}>
              <Lock className="h-4 w-4 mr-2" />
              Fechar Notas
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
