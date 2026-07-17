import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Student, Enrollment, EnrollmentStatus } from '@/types';
import { 
  schoolsApi, coursesApi, classGroupsApi, enrollmentsApiSupabase, academicCalendarsApi,
  SchoolData, CourseData, ClassGroupData, AcademicCalendarData 
} from '@/services/supabaseApi';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  enrollment?: Enrollment | null;
  mode: 'create' | 'edit' | 'transfer';
  onSuccess: () => void;
  defaultSchoolId?: string;
}

export function EnrollmentDialog({ open, onOpenChange, student, enrollment, mode, onSuccess, defaultSchoolId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data for selects
  const [escolas, setEscolas] = useState<SchoolData[]>([]);
  const [cursos, setCursos] = useState<CourseData[]>([]);
  const [turmas, setTurmas] = useState<ClassGroupData[]>([]);
  const [calendarios, setCalendarios] = useState<AcademicCalendarData[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    escolaId: '',
    cursoId: '',
    turmaId: '',
    anoLetivo: '',
    dataMatricula: new Date().toISOString().split('T')[0],
    status: 'ativa' as EnrollmentStatus,
    observacoes: '',
  });

  useEffect(() => {
    if (open) {
      loadInitialData();
    }
  }, [open]);

  useEffect(() => {
    if (enrollment && (mode === 'edit' || mode === 'transfer') && calendarios.length > 0) {
      setFormData({
        escolaId: mode === 'transfer' ? '' : enrollment.escolaId,
        cursoId: mode === 'transfer' ? '' : enrollment.cursoId,
        turmaId: mode === 'transfer' ? '' : enrollment.turmaId,
        anoLetivo: enrollment.anoLetivo,
        dataMatricula: enrollment.dataMatricula,
        status: enrollment.status,
        observacoes: enrollment.observacoes || '',
      });
      if (mode === 'edit') {
        loadCursos(enrollment.escolaId);
        loadTurmas(enrollment.escolaId, enrollment.cursoId, enrollment.anoLetivo);
      }
    }
  }, [enrollment, mode, calendarios]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [escolasData, calendariosData] = await Promise.all([
        schoolsApi.getAll(),
        academicCalendarsApi.getActiveOrClosed()
      ]);
      setEscolas(escolasData.filter(e => e.status === 'ativo'));
      setCalendarios(calendariosData);
      
      // Set default to active calendar if creating new enrollment
      if (mode === 'create') {
        const activeCalendar = calendariosData.find(c => c.status === 'ACTIVE');
        const newFormData = {
          escolaId: defaultSchoolId || '',
          cursoId: '',
          turmaId: '',
          anoLetivo: activeCalendar?.academic_year.toString() || '',
          dataMatricula: new Date().toISOString().split('T')[0],
          status: 'ativa' as EnrollmentStatus,
          observacoes: '',
        };
        setFormData(newFormData);
        setCursos([]);
        setTurmas([]);
        // Pre-load courses for pre-filled school
        if (defaultSchoolId) {
          loadCursos(defaultSchoolId);
        }
      }
    } catch (error) {
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    const activeCalendar = calendarios.find(c => c.status === 'ACTIVE');
    setFormData({
      escolaId: '',
      cursoId: '',
      turmaId: '',
      anoLetivo: activeCalendar?.academic_year.toString() || '',
      dataMatricula: new Date().toISOString().split('T')[0],
      status: 'ativa',
      observacoes: '',
    });
    setCursos([]);
    setTurmas([]);
  };

  const loadCursos = async (escolaId: string) => {
    try {
      const allCursos = await coursesApi.getAll();
      const filtered = allCursos.filter(c => 
        c.school_ids?.includes(escolaId) && c.status === 'ativo'
      );
      setCursos(filtered);
    } catch (error) {
      toast({ title: 'Erro ao carregar cursos', variant: 'destructive' });
    }
  };

  const loadTurmas = async (escolaId: string, cursoId: string, anoLetivo: string) => {
    try {
      const allTurmas = await classGroupsApi.getAll();
      const filtered = allTurmas.filter(
        t => t.school_id === escolaId && 
             t.course_id === cursoId && 
             t.status === 'ativo' &&
             t.ano_letivo === anoLetivo
      );
      setTurmas(filtered);
    } catch (error) {
      toast({ title: 'Erro ao carregar turmas', variant: 'destructive' });
    }
  };

  // When escola changes
  useEffect(() => {
    if (formData.escolaId && mode !== 'edit') {
      loadCursos(formData.escolaId);
      setFormData(prev => ({ ...prev, cursoId: '', turmaId: '' }));
      setTurmas([]);
    }
  }, [formData.escolaId]);

  // When curso or ano letivo changes
  useEffect(() => {
    if (formData.escolaId && formData.cursoId && formData.anoLetivo) {
      loadTurmas(formData.escolaId, formData.cursoId, formData.anoLetivo);
      if (mode !== 'edit') {
        setFormData(prev => ({ ...prev, turmaId: '' }));
      }
    }
  }, [formData.cursoId, formData.anoLetivo]);

  const handleSave = async () => {
    if (!student) return;

    if (!formData.escolaId || !formData.cursoId || !formData.turmaId || !formData.anoLetivo) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      
      if (mode === 'create') {
        await enrollmentsApiSupabase.create({
          student_id: student.id,
          school_id: formData.escolaId,
          course_id: formData.cursoId,
          class_group_id: formData.turmaId,
          ano_letivo: formData.anoLetivo,
          data_matricula: formData.dataMatricula,
          data_encerramento: null,
          observacoes: formData.observacoes || null,
          status: 'ativa',
        });
        toast({ title: 'Matrícula realizada com sucesso!' });
      } else if (mode === 'edit' && enrollment) {
        await enrollmentsApiSupabase.update(enrollment.id, {
          school_id: formData.escolaId,
          course_id: formData.cursoId,
          class_group_id: formData.turmaId,
          ano_letivo: formData.anoLetivo,
          data_matricula: formData.dataMatricula,
          observacoes: formData.observacoes || null,
        });
        toast({ title: 'Matrícula atualizada com sucesso!' });
      } else if (mode === 'transfer' && enrollment) {
        // Close current enrollment
        await enrollmentsApiSupabase.update(enrollment.id, {
          status: 'transferida',
          data_encerramento: new Date().toISOString().split('T')[0],
          observacoes: formData.observacoes || null,
        });
        // Create new enrollment
        await enrollmentsApiSupabase.create({
          student_id: student.id,
          school_id: formData.escolaId,
          course_id: formData.cursoId,
          class_group_id: formData.turmaId,
          ano_letivo: formData.anoLetivo,
          data_matricula: formData.dataMatricula,
          data_encerramento: null,
          observacoes: `Transferência de ${enrollment.escola?.nome || 'escola anterior'}`,
          status: 'ativa',
        });
        toast({ title: 'Transferência realizada com sucesso!' });
      }
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({ title: error.message || 'Erro ao salvar matrícula', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'edit': return 'Editar Matrícula';
      case 'transfer': return 'Transferir Matrícula';
      default: return 'Nova Matrícula';
    }
  };

  const getButtonLabel = () => {
    if (saving) return 'Salvando...';
    switch (mode) {
      case 'edit': return 'Salvar Alterações';
      case 'transfer': return 'Confirmar Transferência';
      default: return 'Matricular';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {student && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium">{student.nomeCompleto}</p>
            <p className="text-xs text-muted-foreground">
              Matrícula: {student.codigoMatricula}
            </p>
          </div>
        )}

        {mode === 'transfer' && enrollment && (
          <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Matrícula Atual (será encerrada)</p>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              {enrollment.escola?.nome} - {enrollment.curso?.nome} - {enrollment.turma?.nome}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="anoLetivo">Ano Letivo *</Label>
              <Select
                value={formData.anoLetivo}
                onValueChange={(value) => setFormData(prev => ({ ...prev, anoLetivo: value }))}
                disabled={mode === 'transfer'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano letivo" />
                </SelectTrigger>
                <SelectContent>
                  {calendarios.map((cal) => (
                    <SelectItem key={cal.id} value={cal.academic_year.toString()}>
                      {cal.academic_year} {cal.status === 'ACTIVE' && '(Ativo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {calendarios.length === 0 && (
                <p className="text-xs text-amber-600">
                  Nenhum calendário acadêmico ativo. Configure um calendário primeiro.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="escolaId">
                {mode === 'transfer' ? 'Nova Escola *' : 'Escola *'}
              </Label>
              <SearchableSelect
                id="escolaId"
                value={formData.escolaId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, escolaId: value }))}
                placeholder="Selecione a escola"
                searchPlaceholder="Buscar escola..."
                options={escolas.map(e => ({ value: e.id, label: e.nome }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cursoId">
                {mode === 'transfer' ? 'Novo Curso *' : 'Curso *'}
              </Label>
              <SearchableSelect
                id="cursoId"
                value={formData.cursoId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cursoId: value }))}
                disabled={!formData.escolaId || cursos.length === 0}
                placeholder={
                  !formData.escolaId
                    ? 'Selecione uma escola primeiro'
                    : cursos.length === 0
                      ? 'Nenhum curso disponível'
                      : 'Selecione o curso'
                }
                searchPlaceholder="Buscar curso..."
                options={cursos.map(c => ({ value: c.id, label: c.nome }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="turmaId">
                {mode === 'transfer' ? 'Nova Turma *' : 'Turma *'}
              </Label>
              <SearchableSelect
                id="turmaId"
                value={formData.turmaId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, turmaId: value }))}
                disabled={!formData.cursoId || turmas.length === 0}
                placeholder={
                  !formData.cursoId
                    ? 'Selecione um curso primeiro'
                    : turmas.length === 0
                      ? 'Nenhuma turma disponível para este ano'
                      : 'Selecione a turma'
                }
                searchPlaceholder="Buscar turma..."
                options={turmas.map(t => ({ value: t.id, label: t.nome }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dataMatricula">
                {mode === 'transfer' ? 'Data da Transferência *' : 'Data da Matrícula *'}
              </Label>
              <Input
                id="dataMatricula"
                type="date"
                value={formData.dataMatricula}
                onChange={(e) => setFormData(prev => ({ ...prev, dataMatricula: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder={mode === 'transfer' 
                  ? 'Motivo da transferência (opcional)' 
                  : 'Observações sobre a matrícula (opcional)'
                }
                rows={3}
              />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading} className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getButtonLabel()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}