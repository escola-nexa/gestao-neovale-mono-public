import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { notasApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { School, BookOpen, Users, GraduationCap, User, Calendar, Lock, ArrowRight, ClipboardList } from 'lucide-react';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';

interface FilterOption {
  id: string;
  name: string;
}

interface ClosedGradeEntry {
  configId: string;
  schoolName: string;
  courseName: string;
  classGroupName: string;
  classGroupId: string;
  subjectId: string;
  subjectName: string;
  professorName: string;
  bimesterNumber: number;
  averageType: string;
}

export function ClosedGradesTab() {
  const navigate = useNavigate();
  const { organizationId } = useOrganization();

  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [bimesters, setBimesters] = useState<FilterOption[]>([]);

  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('');

  const [entries, setEntries] = useState<ClosedGradeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { data: anpMap } = useAnpSubjectMap();

  // Load schools
  useEffect(() => {
    if (!organizationId) return;
    const load = async () => {
      const data = await fetchSchoolsWithCourses<{ id: string; nome: string }>({ organizationId });
      setSchools(data.map(s => ({ id: s.id, name: s.nome })));
    };
    load();
  }, [organizationId]);

  // Load courses based on school
  useEffect(() => {
    setCourses([]); setSelectedCourse('');
    setClassGroups([]); setSelectedClassGroup('');
    if (!selectedSchool) return;
    const load = async () => {
      const data = await notasApi.getSchoolCourses(selectedSchool);
      setCourses(data);
    };
    load();
  }, [selectedSchool]);

  // Load class groups
  useEffect(() => {
    setClassGroups([]); setSelectedClassGroup('');
    if (!selectedSchool || !selectedCourse) return;
    const load = async () => {
      const data = await notasApi.getCourseClassGroups(selectedSchool, selectedCourse);
      setClassGroups(data);
    };
    load();
  }, [selectedSchool, selectedCourse]);

  // Load bimesters
  useEffect(() => {
    setBimesters([]); setSelectedBimester('');
    if (!organizationId) return;
    const load = async () => {
      const data = await notasApi.getBimesters(organizationId);
      setBimesters(data.map(b => ({ id: b.id, name: b.name })));
    };
    load();
  }, [organizationId]);

  // Load closed grade configurations
  useEffect(() => {
    if (!organizationId) { setEntries([]); return; }

    const load = async () => {
      setLoading(true);
      
      const data = await notasApi.getClosedGradeConfigs({
        organizationId,
        schoolId: selectedSchool || undefined,
        courseId: selectedCourse || undefined,
        classGroupId: selectedClassGroup || undefined,
        bimesterNumber: selectedBimester ? parseInt(selectedBimester) : undefined
      });

      setEntries(data);
      setLoading(false);
    };
    load();
  }, [organizationId, selectedSchool, selectedCourse, selectedClassGroup, selectedBimester]);

  // Group entries by school
  const groupedBySchool = entries.reduce<Record<string, ClosedGradeEntry[]>>((acc, entry) => {
    const key = entry.schoolName || 'Sem Escola';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <School className="h-3.5 w-3.5" /> Escola
              </Label>
              <SearchableSelect
                value={selectedSchool}
                onValueChange={setSelectedSchool}
                placeholder="Todas..."
                searchPlaceholder="Buscar escola..."
                triggerClassName="h-11"
                options={schools.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <BookOpen className="h-3.5 w-3.5" /> Curso
              </Label>
              <SearchableSelect
                value={selectedCourse}
                onValueChange={setSelectedCourse}
                disabled={!selectedSchool}
                placeholder="Todos..."
                searchPlaceholder="Buscar curso..."
                triggerClassName="h-11"
                options={courses.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" /> Turma
              </Label>
              <SearchableSelect
                value={selectedClassGroup}
                onValueChange={setSelectedClassGroup}
                disabled={!selectedCourse}
                placeholder="Todas..."
                searchPlaceholder="Buscar turma..."
                triggerClassName="h-11"
                options={classGroups.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Calendar className="h-3.5 w-3.5" /> Bimestre
              </Label>
              <Select value={selectedBimester} onValueChange={setSelectedBimester}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Todos..." /></SelectTrigger>
                <SelectContent>
                  {bimesters.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}

      {!loading && entries.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="font-medium">Nenhuma nota fechada encontrada</p>
          <p className="text-sm mt-1">Ajuste os filtros ou aguarde os professores fecharem as notas.</p>
        </div>
      )}

      {!loading && Object.keys(groupedBySchool).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedBySchool).sort(([a], [b]) => a.localeCompare(b)).map(([schoolName, schoolEntries]) => (
            <div key={schoolName} className="space-y-3">
              <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">{schoolName}</h2>
                <Badge variant="secondary" className="text-xs">{schoolEntries.length} registro(s)</Badge>
              </div>
              <div className="space-y-2">
                {schoolEntries.map(entry => (
                  <Card key={entry.configId} className="hover:shadow-md transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(`/notas/lancamento/${entry.classGroupId}/${entry.subjectId}/${entry.bimesterNumber}`)}>
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-4 px-6 gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground">
                          <SubjectNameWithAnp name={entry.subjectName} isAnp={anpMap?.bySubject.has(entry.subjectId)} compact />
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="default" className="text-xs gap-1"><Calendar className="h-3 w-3" />{entry.bimesterNumber}º Bim</Badge>
                          <Badge variant="secondary" className="text-xs gap-1"><User className="h-3 w-3" />{entry.professorName}</Badge>
                          <Badge variant="outline" className="text-xs gap-1"><BookOpen className="h-3 w-3" />{entry.courseName}</Badge>
                          <Badge variant="outline" className="text-xs gap-1"><Users className="h-3 w-3" />{entry.classGroupName}</Badge>
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        Visualizar <ArrowRight className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
