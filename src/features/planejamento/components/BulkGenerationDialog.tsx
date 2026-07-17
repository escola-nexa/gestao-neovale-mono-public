import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertTriangle, Info, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useSemester } from '@/hooks/useSemester';
import { planejamentoApi } from '@/features/planejamento/api';
import { schoolsApi, coursesApi, classGroupsApi, SchoolData, CourseData, ClassGroupData } from '@/services/supabaseApi';

interface BulkGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface EligibleItem {
  professor_id: string;
  professor_name: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  semester: string;
  weekly_hours: number;
  already_exists: boolean;
}

const BIMESTER_OPTIONS = [
  { value: 1, label: '1º Bimestre', semester: 'FIRST' },
  { value: 2, label: '2º Bimestre', semester: 'FIRST' },
  { value: 3, label: '3º Bimestre', semester: 'SECOND' },
  { value: 4, label: '4º Bimestre', semester: 'SECOND' },
];

export function BulkGenerationDialog({ open, onOpenChange, onSuccess }: BulkGenerationDialogProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { currentSemester } = useSemester();

  const [schoolId, setSchoolId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [bimester, setBimester] = useState<number | null>(null);

  const [objective, setObjective] = useState('');
  const [competencies, setCompetencies] = useState('');
  const [contents, setContents] = useState('');
  const [methodology, setMethodology] = useState('');
  const [resources, setResources] = useState('');
  const [evaluation, setEvaluation] = useState('');
  const [product, setProduct] = useState('');
  const [nextSteps, setNextSteps] = useState('');

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupData[]>([]);
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  // Selected items as "professorId|subjectId" keys
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingClassGroups, setLoadingClassGroups] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (open) {
      loadSchools();
      if (currentSemester === 'SECOND') {
        setBimester(3);
      } else {
        setBimester(1);
      }
    }
  }, [open, currentSemester]);

  useEffect(() => {
    if (schoolId) {
      loadCourses(schoolId);
      setCourseId('');
      setClassGroupId('');
      setEligibleItems([]);
    }
  }, [schoolId]);

  useEffect(() => {
    if (courseId && schoolId) {
      loadClassGroups(schoolId, courseId);
      setClassGroupId('');
      setEligibleItems([]);
    }
  }, [courseId, schoolId]);

  useEffect(() => {
    if (schoolId && courseId && classGroupId && bimester) {
      loadEligibleItems();
    } else {
      setEligibleItems([]);
    }
  }, [schoolId, courseId, classGroupId, bimester]);

  const loadSchools = async () => {
    setLoadingSchools(true);
    try {
      const data = await schoolsApi.getAll();
      setSchools(data.filter(s => s.status === 'ativo'));
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoadingSchools(false);
    }
  };

  const loadCourses = async (selectedSchoolId: string) => {
    setLoadingCourses(true);
    try {
      const data = await coursesApi.getBySchool(selectedSchoolId);
      setCourses(data.filter(c => c.status === 'ativo'));
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadClassGroups = async (selectedSchoolId: string, selectedCourseId: string) => {
    setLoadingClassGroups(true);
    try {
      const data = await classGroupsApi.getBySchool(selectedSchoolId);
      setClassGroups(data.filter(cg => cg.course_id === selectedCourseId && cg.status === 'ativo'));
    } catch (error) {
      console.error('Error loading class groups:', error);
    } finally {
      setLoadingClassGroups(false);
    }
  };

  const loadEligibleItems = async () => {
    if (!organization?.id) return;

    setLoadingItems(true);
    try {
      const { data, error } = await supabase.rpc('get_eligible_professors_subjects_for_pre_planning', {
        p_org_id: organization.id,
        p_school_id: schoolId,
        p_course_id: courseId,
        p_class_group_id: classGroupId,
        p_bimester_number: bimester,
      });

      if (error) throw error;

      const items = (data || []) as EligibleItem[];
      setEligibleItems(items);
      // Auto-select all new items
      const newKeys = items
        .filter(i => !i.already_exists)
        .map(i => `${i.professor_id}|${i.subject_id}`);
      setSelectedKeys(newKeys);
    } catch (error) {
      console.error('Error loading eligible items:', error);
      toast({ title: 'Erro ao carregar professores/disciplinas', variant: 'destructive' });
    } finally {
      setLoadingItems(false);
    }
  };

  const makeKey = (item: EligibleItem) => `${item.professor_id}|${item.subject_id}`;

  const toggleItem = (key: string) => {
    setSelectedKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    const availableKeys = eligibleItems.filter(i => !i.already_exists).map(makeKey);
    if (selectedKeys.length === availableKeys.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(availableKeys);
    }
  };

  const isFormValid = () => {
    return objective.trim() && competencies.trim() && contents.trim() &&
      methodology.trim() && resources.trim() && evaluation.trim() &&
      product.trim() && nextSteps.trim();
  };

  const handleGenerate = async () => {
    if (!organization?.id || selectedKeys.length === 0) return;

    if (!isFormValid()) {
      toast({
        title: 'Preencha todos os campos obrigatórios',
        description: 'Todos os campos da Orientação Pedagógica Base são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: 'Sessão expirada', variant: 'destructive' });
        return;
      }

      const selected_items = selectedKeys.map(key => {
        const [professor_id, subject_id] = key.split('|');
        return { professor_id, subject_id };
      });

      const response = await supabase.functions.invoke('generate-pre-plannings', {
        body: {
          organization_id: organization.id,
          school_id: schoolId,
          course_id: courseId,
          class_group_id: classGroupId,
          bimester_number: bimester,
          reference_year: new Date().getFullYear(),
          selected_items,
          objective, competencies, contents, methodology,
          resources, evaluation, product, next_steps: nextSteps,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar pré-planejamentos');
      }

      const result = response.data;

      if (result.success) {
        toast({
          title: 'Pré-planejamentos gerados',
          description: `${result.created} pré-planejamento(s) criado(s) com sucesso`,
        });
        onSuccess();
        handleClose();
      } else {
        toast({
          title: 'Erro na geração',
          description: result.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error generating pre-plannings:', error);
      toast({
        title: 'Erro ao gerar pré-planejamentos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setSchoolId('');
    setCourseId('');
    setClassGroupId('');
    setBimester(null);
    setEligibleItems([]);
    setSelectedKeys([]);
    setObjective('');
    setCompetencies('');
    setContents('');
    setMethodology('');
    setResources('');
    setEvaluation('');
    setProduct('');
    setNextSteps('');
    onOpenChange(false);
  };

  const newItemsCount = eligibleItems.filter(i => !i.already_exists).length;
  const existingItemsCount = eligibleItems.filter(i => i.already_exists).length;

  // Group items by professor for display
  const groupedByProfessor = eligibleItems.reduce((acc, item) => {
    if (!acc[item.professor_id]) {
      acc[item.professor_id] = { name: item.professor_name, items: [] };
    }
    acc[item.professor_id].items.push(item);
    return acc;
  }, {} as Record<string, { name: string; items: EligibleItem[] }>);

  const validBimesters = currentSemester === 'FIRST'
    ? BIMESTER_OPTIONS.filter(b => b.semester === 'FIRST')
    : currentSemester === 'SECOND'
      ? BIMESTER_OPTIONS.filter(b => b.semester === 'SECOND')
      : BIMESTER_OPTIONS;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Geração em Massa de Pré-Planejamentos</DialogTitle>
          <DialogDescription>
            Gera pré-planejamentos para cada professor com horário de aula cadastrado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Context Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola</label>
              <SearchableSelect
                value={schoolId}
                onValueChange={setSchoolId}
                disabled={loadingSchools}
                placeholder="Selecione a escola"
                searchPlaceholder="Buscar escola..."
                options={schools.map(school => ({ value: school.id, label: school.nome }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Curso</label>
              <SearchableSelect
                value={courseId}
                onValueChange={setCourseId}
                disabled={!schoolId || loadingCourses}
                placeholder="Selecione o curso"
                searchPlaceholder="Buscar curso..."
                options={courses.map(course => ({ value: course.id, label: course.nome }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Turma</label>
              <SearchableSelect
                value={classGroupId}
                onValueChange={setClassGroupId}
                disabled={!courseId || loadingClassGroups}
                placeholder="Selecione a turma"
                searchPlaceholder="Buscar turma..."
                options={classGroups.map(cg => ({ value: cg.id, label: `${cg.nome} (${cg.ano_letivo})` }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bimestre</label>
              <Select
                value={bimester?.toString() || ''}
                onValueChange={(v) => setBimester(parseInt(v))}
                disabled={!classGroupId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bimestre" />
                </SelectTrigger>
                <SelectContent>
                  {validBimesters.map(b => (
                    <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Será gerado um pré-planejamento individual para cada professor que possui horário de aula cadastrado na Grade Horária para a turma/disciplina selecionada.
            </AlertDescription>
          </Alert>

          {/* Items List grouped by professor */}
          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando professores e disciplinas...</span>
            </div>
          ) : eligibleItems.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Professores e Disciplinas</h3>
                <div className="flex items-center gap-4">
                  {newItemsCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={toggleAll}>
                      {selectedKeys.length === newItemsCount ? 'Desmarcar todos' : 'Selecionar todos'}
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Badge variant="outline">{newItemsCount} novos</Badge>
                    {existingItemsCount > 0 && (
                      <Badge variant="secondary">{existingItemsCount} já existentes</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg max-h-64 overflow-y-auto">
                {Object.entries(groupedByProfessor).map(([profId, group]) => (
                  <div key={profId}>
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{group.name}</span>
                      <Badge variant="outline" className="text-xs ml-auto">
                        {group.items.length} disciplina(s)
                      </Badge>
                    </div>
                    <div className="divide-y">
                      {group.items.map(item => {
                        const key = makeKey(item);
                        return (
                          <div
                            key={key}
                            className={`flex items-center justify-between px-3 py-2 pl-8 ${item.already_exists ? 'bg-muted/30' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {!item.already_exists ? (
                                <Checkbox
                                  checked={selectedKeys.includes(key)}
                                  onCheckedChange={() => toggleItem(key)}
                                />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{item.subject_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.subject_code} • {item.weekly_hours}h/semana •
                                  {item.semester === 'FIRST' ? ' 1º Sem' : item.semester === 'SECOND' ? ' 2º Sem' : ' Anual'}
                                </p>
                              </div>
                            </div>
                            {item.already_exists && (
                              <Badge variant="secondary" className="text-xs">Já existe</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : schoolId && courseId && classGroupId && bimester ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum professor com horário de aula cadastrado na Grade Horária para este contexto.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Base Pedagogical Orientation Form */}
          {eligibleItems.length > 0 && selectedKeys.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-medium">Orientação Pedagógica Base</h3>
                <p className="text-sm text-muted-foreground">
                  Estes campos serão preenchidos em todos os pré-planejamentos gerados. Os professores poderão editar posteriormente.
                </p>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="objective">Objetivo *</Label>
                    <Textarea id="objective" placeholder="Descreva o objetivo pedagógico..." value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="competencies">Competências *</Label>
                    <Textarea id="competencies" placeholder="Liste as competências a serem desenvolvidas..." value={competencies} onChange={(e) => setCompetencies(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contents">Conteúdos *</Label>
                    <Textarea id="contents" placeholder="Descreva os conteúdos a serem trabalhados..." value={contents} onChange={(e) => setContents(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="methodology">Metodologia *</Label>
                    <Textarea id="methodology" placeholder="Descreva a metodologia a ser utilizada..." value={methodology} onChange={(e) => setMethodology(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resources">Recursos Didáticos *</Label>
                    <Textarea id="resources" placeholder="Liste os recursos didáticos necessários..." value={resources} onChange={(e) => setResources(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="evaluation">Avaliação *</Label>
                    <Textarea id="evaluation" placeholder="Descreva os critérios e formas de avaliação..." value={evaluation} onChange={(e) => setEvaluation(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="product">Produto ou Registro *</Label>
                    <Textarea id="product" placeholder="Descreva o produto ou registro esperado..." value={product} onChange={(e) => setProduct(e.target.value)} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextSteps">Ações para Próxima Aula *</Label>
                    <Textarea id="nextSteps" placeholder="Descreva as ações previstas para a próxima aula..." value={nextSteps} onChange={(e) => setNextSteps(e.target.value)} rows={2} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={generating}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedKeys.length === 0 || !isFormValid()}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                `Gerar ${selectedKeys.length} Pré-Planejamento(s)`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
