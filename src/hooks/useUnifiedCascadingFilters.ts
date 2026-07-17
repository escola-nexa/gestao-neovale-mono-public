import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';

export interface FilterOption {
  id: string;
  name: string;
}

export interface UnifiedCascadingFiltersConfig {
  /** Which filter levels to include */
  levels: ('school' | 'course' | 'classGroup' | 'subject' | 'professor' | 'bimester')[];
  /** If true, only show current bimester for professors */
  restrictProfessorBimester?: boolean;
}

const DEFAULT_CONFIG: UnifiedCascadingFiltersConfig = {
  levels: ['school', 'course', 'classGroup', 'subject'],
};

export function useUnifiedCascadingFilters(config: UnifiedCascadingFiltersConfig = DEFAULT_CONFIG) {
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const { organizationId } = useOrganization();

  const hasLevel = (level: string) => config.levels.includes(level as any);

  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [subjects, setSubjects] = useState<FilterOption[]>([]);
  const [professors, setProfessors] = useState<FilterOption[]>([]);
  const [bimesters, setBimesters] = useState<FilterOption[]>([]);

  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Helper: auto-select if single result
  const autoSelect = (result: FilterOption[], setter: (v: string) => void, current: string) => {
    if (result.length === 1 && !current) setter(result[0].id);
  };

  // ─── LEVEL 1: Schools ───
  useEffect(() => {
    if (!organizationId || !hasLevel('school')) return;
    const load = async () => {
      setIsLoading(true);
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        const { data } = await supabase
          .from('professor_school_courses')
          .select('school_id, schools:school_id(id, nome)')
          .eq('professor_id', professorId)
          .eq('status', 'ACTIVE');
        const unique = new Map<string, FilterOption>();
        data?.forEach((d: any) => {
          if (d.schools) unique.set(d.schools.id, { id: d.schools.id, name: d.schools.nome });
        });
        result = Array.from(unique.values());
      } else {
        const { data } = await supabase
          .from('schools').select('id, nome')
          .eq('organization_id', organizationId).eq('status', 'ativo');
        result = data?.map(s => ({ id: s.id, name: s.nome })) || [];
      }
      setSchools(result);
      autoSelect(result, setSelectedSchool, selectedSchool);
      setIsLoading(false);
    };
    load();
  }, [organizationId, professorId, isProfessor]);

  // ─── LEVEL 2: Courses ───
  useEffect(() => {
    if (!hasLevel('course')) return;
    setCourses([]); setSelectedCourse('');
    resetDownstream('course');
    if (!selectedSchool || !organizationId) return;
    const load = async () => {
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        const { data } = await supabase
          .from('professor_school_courses')
          .select('course_id, courses:course_id(id, nome)')
          .eq('professor_id', professorId)
          .eq('school_id', selectedSchool)
          .eq('status', 'ACTIVE');
        const unique = new Map<string, FilterOption>();
        data?.forEach((d: any) => {
          if (d.courses) unique.set(d.courses.id, { id: d.courses.id, name: d.courses.nome });
        });
        result = Array.from(unique.values());
      } else {
        const { data } = await supabase
          .from('course_schools')
          .select('course_id, courses:course_id(id, nome)')
          .eq('school_id', selectedSchool);
        result = data?.map((d: any) => ({ id: d.courses.id, name: d.courses.nome })).filter(Boolean) || [];
      }
      setCourses(result);
      autoSelect(result, setSelectedCourse, '');
    };
    load();
  }, [selectedSchool, organizationId, professorId, isProfessor]);

  // ─── LEVEL 3: Class Groups ───
  useEffect(() => {
    if (!hasLevel('classGroup')) return;
    setClassGroups([]); setSelectedClassGroup('');
    resetDownstream('classGroup');
    if (!selectedSchool || !selectedCourse) return;
    const load = async () => {
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        const { data } = await supabase
          .from('weekly_teaching_models')
          .select('class_group_id, class_groups:class_group_id(id, nome)')
          .eq('professor_id', professorId)
          .eq('school_id', selectedSchool)
          .eq('course_id', selectedCourse)
          .eq('status', 'ACTIVE')
          .eq('schedule_type', 'CLASS')
          .not('class_group_id', 'is', null);
        const unique = new Map<string, FilterOption>();
        data?.forEach((d: any) => {
          if (d.class_groups) unique.set(d.class_groups.id, { id: d.class_groups.id, name: d.class_groups.nome });
        });
        result = Array.from(unique.values());
      } else {
        const { data } = await supabase
          .from('class_groups').select('id, nome')
          .eq('school_id', selectedSchool).eq('course_id', selectedCourse).eq('status', 'ativo');
        result = data?.map(c => ({ id: c.id, name: c.nome })) || [];
      }
      setClassGroups(result);
      autoSelect(result, setSelectedClassGroup, '');
    };
    load();
  }, [selectedSchool, selectedCourse, professorId, isProfessor]);

  // ─── LEVEL 3b: Subjects ───
  useEffect(() => {
    if (!hasLevel('subject')) return;
    setSubjects([]); setSelectedSubject('');
    if (!selectedClassGroup || !selectedCourse) return;
    const load = async () => {
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        const { data } = await supabase
          .from('weekly_teaching_models')
          .select('subject_id, subjects:subject_id(id, nome)')
          .eq('professor_id', professorId)
          .eq('school_id', selectedSchool)
          .eq('course_id', selectedCourse)
          .eq('class_group_id', selectedClassGroup)
          .eq('status', 'ACTIVE')
          .eq('schedule_type', 'CLASS')
          .not('subject_id', 'is', null);
        const unique = new Map<string, FilterOption>();
        data?.forEach((d: any) => {
          if (d.subjects) unique.set(d.subjects.id, { id: d.subjects.id, name: d.subjects.nome });
        });
        result = Array.from(unique.values());
      } else {
        const { data } = await supabase
          .from('subjects').select('id, nome')
          .eq('course_id', selectedCourse).eq('status', 'ativo').is('deleted_at', null);
        result = data?.map(s => ({ id: s.id, name: s.nome })) || [];
      }
      setSubjects(result);
      autoSelect(result, setSelectedSubject, '');
    };
    load();
  }, [selectedClassGroup, selectedSchool, selectedCourse, professorId, isProfessor]);

  // ─── LEVEL 3c: Professors (admin/coordinator only) ───
  useEffect(() => {
    if (!hasLevel('professor')) return;
    setProfessors([]); setSelectedProfessor('');
    if (!selectedClassGroup || !selectedSchool || !selectedCourse) return;
    if (isProfessor) return; // professor is auto-inferred
    const load = async () => {
      const { data } = await supabase
        .from('weekly_teaching_models')
        .select('professor_id, professors:professor_id(id, full_name)')
        .eq('school_id', selectedSchool)
        .eq('course_id', selectedCourse)
        .eq('class_group_id', selectedClassGroup)
        .eq('status', 'ACTIVE')
        .eq('schedule_type', 'CLASS')
        .not('professor_id', 'is', null);
      const unique = new Map<string, FilterOption>();
      data?.forEach((d: any) => {
        if (d.professors) unique.set(d.professors.id, { id: d.professors.id, name: d.professors.full_name });
      });
      const result = Array.from(unique.values());
      setProfessors(result);
      autoSelect(result, setSelectedProfessor, '');
    };
    load();
  }, [selectedClassGroup, selectedSchool, selectedCourse, isProfessor]);

  // ─── LEVEL 4: Bimesters ───
  useEffect(() => {
    if (!hasLevel('bimester')) return;
    setBimesters([]); setSelectedBimester('');
    const ready = isProfessor ? !!selectedClassGroup : !!selectedProfessor;
    if (!ready || !organizationId) return;
    const load = async () => {
      const { data: cal } = await supabase
        .from('academic_calendars').select('id')
        .eq('organization_id', organizationId).eq('status', 'ACTIVE').limit(1).maybeSingle();
      if (!cal) return;
      const { data } = await supabase
        .from('academic_bimesters').select('id, number, start_date, end_date')
        .eq('calendar_id', cal.id).order('number');
      if (!data) return;

      if (isProfessor && config.restrictProfessorBimester) {
        const today = new Date().toISOString().split('T')[0];
        const current = data.find(b => today >= b.start_date && today <= b.end_date);
        if (current) {
          setBimesters([{ id: String(current.number), name: `${current.number}º Bimestre` }]);
          setSelectedBimester(String(current.number));
        }
      } else {
        setBimesters(data.map(b => ({ id: String(b.number), name: `${b.number}º Bimestre` })));
      }
    };
    load();
  }, [selectedProfessor, selectedClassGroup, organizationId, isProfessor]);

  // Reset downstream values
  function resetDownstream(from: string) {
    const order = ['school', 'course', 'classGroup', 'subject', 'professor', 'bimester'];
    const idx = order.indexOf(from);
    if (idx < 0) return;
    const resetters: Record<string, () => void> = {
      classGroup: () => { setClassGroups([]); setSelectedClassGroup(''); },
      subject: () => { setSubjects([]); setSelectedSubject(''); },
      professor: () => { setProfessors([]); setSelectedProfessor(''); },
      bimester: () => { setBimesters([]); setSelectedBimester(''); },
    };
    for (let i = idx + 1; i < order.length; i++) {
      const level = order[i];
      if (hasLevel(level) && resetters[level]) resetters[level]();
    }
  }

  const effectiveProfessorId = isProfessor ? professorId : selectedProfessor;

  return {
    schools, courses, classGroups, subjects, professors, bimesters,
    selectedSchool, selectedCourse, selectedClassGroup, selectedSubject, selectedProfessor, selectedBimester,
    setSelectedSchool, setSelectedCourse, setSelectedClassGroup, setSelectedSubject, setSelectedProfessor, setSelectedBimester,
    isLoading, isProfessor, professorId: effectiveProfessorId,
    organizationId,
  };
}
