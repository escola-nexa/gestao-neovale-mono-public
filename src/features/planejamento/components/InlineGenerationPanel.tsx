import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, User, Wand2, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useSemester } from '@/hooks/useSemester';
import { planejamentoApi } from '@/features/planejamento/api';
import { schoolsApi, coursesApi, classGroupsApi, SchoolData, CourseData, ClassGroupData } from '@/services/supabaseApi';

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

interface InlineGenerationPanelProps {
  onGenerated: () => void;
}

export function InlineGenerationPanel({ onGenerated }: InlineGenerationPanelProps) {
  const { toast } = useToast();
  const { organization } = useOrganization();
  const { currentSemester } = useSemester();

  const [isOpen, setIsOpen] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [selectedClassGroupIds, setSelectedClassGroupIds] = useState<string[]>([]);
  const [bimester, setBimester] = useState<number | null>(null);

  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroupData[]>([]);
  const [eligibleItems, setEligibleItems] = useState<EligibleItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingClassGroups, setLoadingClassGroups] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && schools.length === 0) loadSchools();
    if (currentSemester === 'SECOND') setBimester(3);
    else setBimester(1);
  }, [currentSemester, isOpen]);

  useEffect(() => { if (schoolId) { loadCourses(schoolId); setCourseId(''); setSelectedClassGroupIds([]); setEligibleItems([]); } }, [schoolId]);
  useEffect(() => { if (courseId && schoolId) { loadClassGroups(schoolId, courseId); setSelectedClassGroupIds([]); setEligibleItems([]); } }, [courseId, schoolId]);
  useEffect(() => {
    if (schoolId && courseId && selectedClassGroupIds.length > 0 && bimester) loadEligibleItems();
    else setEligibleItems([]);
  }, [schoolId, courseId, selectedClassGroupIds, bimester]);

  const loadSchools = async () => { setLoadingSchools(true); try { const d = await schoolsApi.getAll(); setSchools(d.filter(s => s.status === 'ativo')); } finally { setLoadingSchools(false); } };
  const loadCourses = async (sid: string) => { setLoadingCourses(true); try { const d = await coursesApi.getBySchool(sid); setCourses(d.filter(c => c.status === 'ativo')); } finally { setLoadingCourses(false); } };
  const loadClassGroups = async (sid: string, cid: string) => { setLoadingClassGroups(true); try { const d = await classGroupsApi.getBySchool(sid); setClassGroups(d.filter(cg => cg.course_id === cid && cg.status === 'ativo')); } finally { setLoadingClassGroups(false); } };

  const loadEligibleItems = async () => {
    if (!organization?.id || selectedClassGroupIds.length === 0) return;
    setLoadingItems(true);
    try {
      // Load from first class group to show professor/subject combos
      const { data, error } = await supabase.rpc('get_eligible_professors_subjects_for_pre_planning', {
        p_org_id: organization.id, p_school_id: schoolId, p_course_id: courseId,
        p_class_group_id: selectedClassGroupIds[0], p_bimester_number: bimester,
      });
      if (error) throw error;
      const items = (data || []) as EligibleItem[];
      setEligibleItems(items);
      setSelectedKeys(items.filter(i => !i.already_exists).map(i => `${i.professor_id}|${i.subject_id}`));
    } catch { toast({ title: 'Erro ao carregar professores/disciplinas', variant: 'destructive' }); }
    finally { setLoadingItems(false); }
  };

  const makeKey = (item: EligibleItem) => `${item.professor_id}|${item.subject_id}`;
  const toggleItem = (key: string) => setSelectedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const toggleAll = () => {
    const avail = eligibleItems.filter(i => !i.already_exists).map(makeKey);
    setSelectedKeys(selectedKeys.length === avail.length ? [] : avail);
  };

  const toggleClassGroup = (cgId: string) => {
    setSelectedClassGroupIds(prev => prev.includes(cgId) ? prev.filter(id => id !== cgId) : [...prev, cgId]);
  };

  const toggleAllClassGroups = () => {
    setSelectedClassGroupIds(selectedClassGroupIds.length === classGroups.length ? [] : classGroups.map(cg => cg.id));
  };

  const handleGenerate = async () => {
    if (!organization?.id || selectedKeys.length === 0 || selectedClassGroupIds.length === 0) return;
    setGenerating(true);
    try {
      const selected_items = selectedKeys.map(key => { const [professor_id, subject_id] = key.split('|'); return { professor_id, subject_id }; });
      const response = await supabase.functions.invoke('generate-pre-plannings', {
        body: {
          organization_id: organization.id, school_id: schoolId, course_id: courseId,
          class_group_ids: selectedClassGroupIds, bimester_number: bimester,
          reference_year: new Date().getFullYear(), selected_items,
        },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data.success) {
        toast({
          title: 'Semanas geradas!',
          description: `${response.data.created} semana(s) criada(s) para ${response.data.class_groups_processed} turma(s).`,
        });
        setEligibleItems([]);
        setSelectedKeys([]);
        onGenerated();
      } else {
        toast({ title: response.data.error || 'Erro', variant: 'destructive' });
      }
    } catch (error: any) { toast({ title: error.message || 'Erro', variant: 'destructive' }); }
    finally { setGenerating(false); }
  };

  const validBimesters = currentSemester === 'FIRST' ? BIMESTER_OPTIONS.filter(b => b.semester === 'FIRST')
    : currentSemester === 'SECOND' ? BIMESTER_OPTIONS.filter(b => b.semester === 'SECOND') : BIMESTER_OPTIONS;

  const newItemsCount = eligibleItems.filter(i => !i.already_exists).length;

  const groupedByProfessor = eligibleItems.reduce((acc, item) => {
    if (!acc[item.professor_id]) acc[item.professor_id] = { name: item.professor_name, items: [] };
    acc[item.professor_id].items.push(item); return acc;
  }, {} as Record<string, { name: string; items: EligibleItem[] }>);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Gerar Semanas</p>
                <p className="text-xs text-muted-foreground">Selecione o contexto e gere para múltiplas turmas de uma vez</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </CardContent>
        </Card>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <Card className="mt-2 border-primary/20">
          <CardContent className="p-4 space-y-4">
            {/* Context selectors - school, course, bimester */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Escola</Label>
                <SearchableSelect
                  value={schoolId}
                  onValueChange={setSchoolId}
                  disabled={loadingSchools}
                  placeholder="Escola"
                  searchPlaceholder="Buscar escola..."
                  triggerClassName="h-9 text-sm"
                  options={schools.map(s => ({ value: s.id, label: s.nome }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Curso</Label>
                <SearchableSelect
                  value={courseId}
                  onValueChange={setCourseId}
                  disabled={!schoolId || loadingCourses}
                  placeholder="Curso"
                  searchPlaceholder="Buscar curso..."
                  triggerClassName="h-9 text-sm"
                  options={courses.map(c => ({ value: c.id, label: c.nome }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bimestre</Label>
                <Select value={bimester?.toString() || ''} onValueChange={(v) => setBimester(parseInt(v))} disabled={!courseId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Bimestre" /></SelectTrigger>
                  <SelectContent>{validBimesters.map(b => <SelectItem key={b.value} value={b.value.toString()}>{b.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-turma selector */}
            {courseId && classGroups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Turmas</Label>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={toggleAllClassGroups}>
                    {selectedClassGroupIds.length === classGroups.length ? 'Desmarcar' : 'Selecionar todas'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {classGroups.map(cg => (
                    <label key={cg.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-xs ${
                      selectedClassGroupIds.includes(cg.id) ? 'bg-primary/10 border-primary/40 text-primary font-medium' : 'bg-muted/30 hover:bg-muted/50'
                    }`}>
                      <Checkbox
                        checked={selectedClassGroupIds.includes(cg.id)}
                        onCheckedChange={() => toggleClassGroup(cg.id)}
                        className="h-3.5 w-3.5"
                      />
                      {cg.nome}
                    </label>
                  ))}
                </div>
                {selectedClassGroupIds.length > 1 && (
                  <p className="text-[10px] text-muted-foreground">
                    ✨ Os mesmos campos pedagógicos serão gerados para {selectedClassGroupIds.length} turmas. Use templates para pré-preencher automaticamente.
                  </p>
                )}
              </div>
            )}

            {/* Eligible items */}
            {loadingItems ? (
              <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /><span className="ml-2 text-sm text-muted-foreground">Carregando...</span></div>
            ) : eligibleItems.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Professores / Disciplinas</p>
                  <div className="flex items-center gap-2">
                    {newItemsCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll}>
                        {selectedKeys.length === newItemsCount ? 'Desmarcar' : 'Selecionar todos'}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                  {Object.entries(groupedByProfessor).map(([profId, group]) => (
                    <div key={profId}>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-xs">{group.name}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">{group.items.length}</Badge>
                      </div>
                      {group.items.map(item => {
                        const key = makeKey(item);
                        return (
                          <div key={key} className={`flex items-center justify-between px-3 py-1.5 pl-7 text-sm ${item.already_exists ? 'bg-muted/20 opacity-60' : ''}`}>
                            <div className="flex items-center gap-2">
                              {!item.already_exists ? (
                                <Checkbox checked={selectedKeys.includes(key)} onCheckedChange={() => toggleItem(key)} className="h-3.5 w-3.5" />
                              ) : (
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                              <span className="text-xs">{item.subject_name}</span>
                              <span className="text-[10px] text-muted-foreground">{item.weekly_hours}h/sem</span>
                            </div>
                            {item.already_exists && <Badge variant="secondary" className="text-[10px]">Já gerado</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <Button size="sm" onClick={handleGenerate} disabled={generating || selectedKeys.length === 0 || selectedClassGroupIds.length === 0} className="gap-1.5">
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    Gerar para {selectedClassGroupIds.length} turma(s) • {selectedKeys.length} disciplina(s)
                  </Button>
                </div>
              </div>
            ) : schoolId && courseId && selectedClassGroupIds.length > 0 && bimester ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum professor com horário cadastrado para este contexto.</p>
            ) : null}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
