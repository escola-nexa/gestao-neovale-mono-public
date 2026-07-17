import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { boletimApi } from '../api';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useOrganization } from '@/hooks/useOrganization';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface FilterOption {
  id: string;
  name: string;
}

interface BoletimFiltersProps {
  onSearch: (params: {
    organizationId: string;
    schoolId: string;
    courseId: string;
    classGroupId: string;
    bimesters: number[];
  }) => void;
  isLoading: boolean;
}

export function BoletimFilters({ onSearch, isLoading }: BoletimFiltersProps) {
  const { organizationId } = useOrganization();
  const { professorId, isProfessor } = useProfessorId();
  const [searchParams] = useSearchParams();
  const prefilledRef = useRef(false);

  // Read URL query params for pre-filling
  const urlTurma = searchParams.get('turma') || '';
  const urlBimestre = searchParams.get('bimestre') || '';

  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);

  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [selectedBimesters, setSelectedBimesters] = useState<number[]>(
    urlBimestre ? [Number(urlBimestre)] : [1, 2, 3, 4]
  );

  // Pre-resolved school/course from URL turma param
  const [preResolvedSchool, setPreResolvedSchool] = useState('');
  const [preResolvedCourse, setPreResolvedCourse] = useState('');

  // Resolve class_group → school + course when urlTurma is present
  useEffect(() => {
    if (!urlTurma) return;
    const resolve = async () => {
      const data = await boletimApi.getClassGroupBaseInfo(urlTurma);
      if (data) {
        setPreResolvedSchool(data.school_id);
        setPreResolvedCourse(data.course_id);
      }
    };
    resolve();
  }, [urlTurma]);

  // Load schools
  useEffect(() => {
    if (!organizationId) return;
    const load = async () => {
      if (isProfessor && professorId) {
        const result = await boletimApi.getProfessorSchools(professorId);
        setSchools(result);
        if (preResolvedSchool && result.find(r => r.id === preResolvedSchool)) {
          setSelectedSchool(preResolvedSchool);
        } else if (result.length === 1 && !selectedSchool) {
          setSelectedSchool(result[0].id);
        }
      } else {
        const data = await fetchSchoolsWithCourses<{ id: string; nome: string }>({ organizationId });
        const result = data.map(s => ({ id: s.id, name: s.nome }));
        setSchools(result);
        if (preResolvedSchool && result.find(r => r.id === preResolvedSchool)) {
          setSelectedSchool(preResolvedSchool);
        } else if (result.length === 1 && !selectedSchool) {
          setSelectedSchool(result[0].id);
        }
      }
    };
    load();
  }, [organizationId, professorId, isProfessor, preResolvedSchool]);

  // Load courses
  useEffect(() => {
    setCourses([]); setSelectedCourse('');
    setClassGroups([]); setSelectedClassGroup('');
    if (!selectedSchool || !organizationId) return;
    const load = async () => {
      if (isProfessor && professorId) {
        const result = await boletimApi.getProfessorCourses(professorId, selectedSchool);
        setCourses(result);
        if (preResolvedCourse && result.find(r => r.id === preResolvedCourse)) {
          setSelectedCourse(preResolvedCourse);
        } else if (result.length === 1) {
          setSelectedCourse(result[0].id);
        }
      } else {
        const result = await boletimApi.getSchoolCourses(selectedSchool);
        setCourses(result);
        if (preResolvedCourse && result.find(r => r.id === preResolvedCourse)) {
          setSelectedCourse(preResolvedCourse);
        } else if (result.length === 1) {
          setSelectedCourse(result[0].id);
        }
      }
    };
    load();
  }, [selectedSchool, organizationId, professorId, isProfessor, preResolvedCourse]);

  // Load class groups
  useEffect(() => {
    setClassGroups([]); setSelectedClassGroup('');
    if (!selectedSchool || !selectedCourse) return;
    const load = async () => {
      if (isProfessor && professorId) {
        const result = await boletimApi.getProfessorClassGroups(professorId, selectedSchool, selectedCourse);
        setClassGroups(result);
        if (urlTurma && result.find(r => r.id === urlTurma)) {
          setSelectedClassGroup(urlTurma);
        } else if (result.length === 1) {
          setSelectedClassGroup(result[0].id);
        }
      } else {
        const result = await boletimApi.getCourseClassGroups(selectedSchool, selectedCourse);
        setClassGroups(result);
        if (urlTurma && result.find(r => r.id === urlTurma)) {
          setSelectedClassGroup(urlTurma);
        } else if (result.length === 1) {
          setSelectedClassGroup(result[0].id);
        }
      }
    };
    load();
  }, [selectedSchool, selectedCourse, professorId, isProfessor]);

  // Auto-search when pre-filled from URL
  useEffect(() => {
    if (prefilledRef.current) return;
    if (urlTurma && selectedClassGroup === urlTurma && organizationId && selectedSchool && selectedCourse) {
      prefilledRef.current = true;
      onSearch({
        organizationId,
        schoolId: selectedSchool,
        courseId: selectedCourse,
        classGroupId: selectedClassGroup,
        bimesters: selectedBimesters,
      });
    }
  }, [selectedClassGroup, selectedSchool, selectedCourse, organizationId]);

  const toggleBimester = (bim: number) => {
    setSelectedBimesters(prev =>
      prev.includes(bim) ? prev.filter(b => b !== bim) : [...prev, bim].sort()
    );
  };

  const canSearch = !!selectedSchool && !!selectedCourse && !!selectedClassGroup && selectedBimesters.length > 0 && !!organizationId;

  const handleSearch = () => {
    if (!canSearch) return;
    onSearch({
      organizationId: organizationId!,
      schoolId: selectedSchool,
      courseId: selectedCourse,
      classGroupId: selectedClassGroup,
      bimesters: selectedBimesters,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Escola</Label>
          <SearchableSelect
            value={selectedSchool}
            onValueChange={setSelectedSchool}
            placeholder="Selecione a escola"
            searchPlaceholder="Buscar escola..."
            options={schools.map(s => ({ value: s.id, label: s.name }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Curso</Label>
          <SearchableSelect
            value={selectedCourse}
            onValueChange={setSelectedCourse}
            disabled={!selectedSchool}
            placeholder="Selecione o curso"
            searchPlaceholder="Buscar curso..."
            options={courses.map(c => ({ value: c.id, label: c.name }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Turma</Label>
          <SearchableSelect
            value={selectedClassGroup}
            onValueChange={setSelectedClassGroup}
            disabled={!selectedCourse}
            placeholder="Selecione a turma"
            searchPlaceholder="Buscar turma..."
            options={classGroups.map(c => ({ value: c.id, label: c.name }))}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Bimestres</Label>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(bim => (
              <div key={bim} className="flex items-center gap-1.5">
                <Checkbox
                  id={`bim-${bim}`}
                  checked={selectedBimesters.includes(bim)}
                  onCheckedChange={() => toggleBimester(bim)}
                />
                <Label htmlFor={`bim-${bim}`} className="text-sm cursor-pointer">{bim}º</Label>
              </div>
            ))}
          </div>
        </div>
        <Button onClick={handleSearch} disabled={!canSearch || isLoading} className="sm:ml-auto">
          <Search className="h-4 w-4 mr-2" />
          Buscar
        </Button>
      </div>
    </div>
  );
}
