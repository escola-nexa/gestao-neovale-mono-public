import { useState, useEffect } from 'react';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { notasApi } from '../api';

interface FilterOption {
  id: string;
  name: string;
}

export function useGradesCascadingFilters() {
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const { organizationId } = useOrganization();

  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [professors, setProfessors] = useState<FilterOption[]>([]);
  const [bimesters, setBimesters] = useState<FilterOption[]>([]);

  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Load schools
  useEffect(() => {
    if (!organizationId) return;
    const load = async () => {
      setIsLoading(true);
      if (isProfessor && professorId) {
        const result = await notasApi.getProfessorSchools(professorId);
        setSchools(result);
        if (result.length === 1 && !selectedSchool) setSelectedSchool(result[0].id);
      } else {
        const data = await fetchSchoolsWithCourses<{ id: string; nome: string }>({ organizationId });
        const result = data.map(s => ({ id: s.id, name: s.nome }));
        setSchools(result);
        if (result.length === 1 && !selectedSchool) setSelectedSchool(result[0].id);
      }
      setIsLoading(false);
    };
    load();
  }, [organizationId, professorId, isProfessor]);

  // Load courses
  useEffect(() => {
    setCourses([]); setSelectedCourse('');
    setClassGroups([]); setSelectedClassGroup('');
    setProfessors([]); setSelectedProfessor('');
    setBimesters([]); setSelectedBimester('');
    if (!selectedSchool || !organizationId) return;
    const load = async () => {
      if (isProfessor && professorId) {
        const result = await notasApi.getProfessorCourses(professorId, selectedSchool);
        setCourses(result);
        if (result.length === 1) setSelectedCourse(result[0].id);
      } else {
        const result = await notasApi.getSchoolCourses(selectedSchool);
        setCourses(result);
        if (result.length === 1) setSelectedCourse(result[0].id);
      }
    };
    load();
  }, [selectedSchool, organizationId, professorId, isProfessor]);

  // Load class groups
  useEffect(() => {
    setClassGroups([]); setSelectedClassGroup('');
    setProfessors([]); setSelectedProfessor('');
    setBimesters([]); setSelectedBimester('');
    if (!selectedSchool || !selectedCourse) return;
    const load = async () => {
      if (isProfessor && professorId) {
        const result = await notasApi.getProfessorClassGroups(professorId, selectedSchool, selectedCourse);
        setClassGroups(result);
        if (result.length === 1) setSelectedClassGroup(result[0].id);
      } else {
        const result = await notasApi.getCourseClassGroups(selectedSchool, selectedCourse);
        setClassGroups(result);
        if (result.length === 1) setSelectedClassGroup(result[0].id);
      }
    };
    load();
  }, [selectedSchool, selectedCourse, professorId, isProfessor]);

  // Load professors (admin/coordenador only)
  useEffect(() => {
    setProfessors([]); setSelectedProfessor('');
    setBimesters([]); setSelectedBimester('');
    if (!selectedClassGroup || !selectedSchool || !selectedCourse) return;
    if (isProfessor) {
      // professor is auto-inferred, skip to bimesters
      return;
    }
    const load = async () => {
      const result = await notasApi.getClassGroupProfessors(selectedSchool, selectedCourse, selectedClassGroup);
      setProfessors(result);
      if (result.length === 1) setSelectedProfessor(result[0].id);
    };
    load();
  }, [selectedClassGroup, selectedSchool, selectedCourse, isProfessor]);

  // Load bimesters
  useEffect(() => {
    setBimesters([]); setSelectedBimester('');
    const readyForBimesters = isProfessor
      ? !!selectedClassGroup
      : !!selectedProfessor;
    if (!readyForBimesters || !organizationId) return;
    const load = async () => {
      const bims = await notasApi.getBimesters(organizationId);
      if (bims.length === 0) return;

      if (isProfessor) {
        // Professor: only show the current bimester (based on today's date)
        const today = new Date().toISOString().split('T')[0];
        const currentBimester = bims.find(b => today >= b.start_date && today <= b.end_date);
        if (currentBimester) {
          setBimesters([{ id: String(currentBimester.number), name: `${currentBimester.number}º Bimestre` }]);
          setSelectedBimester(String(currentBimester.number));
        } else {
          // If no bimester matches today, show none
          setBimesters([]);
        }
      } else {
        // Admin/Coordinator: show all bimesters
        setBimesters(bims.map(b => ({ id: String(b.number), name: `${b.number}º Bimestre` })));
      }
    };
    load();
  }, [selectedProfessor, selectedClassGroup, organizationId, isProfessor]);

  const effectiveProfessorId = isProfessor ? professorId : selectedProfessor;

  return {
    schools, courses, classGroups, professors, bimesters,
    selectedSchool, selectedCourse, selectedClassGroup, selectedProfessor, selectedBimester,
    setSelectedSchool, setSelectedCourse, setSelectedClassGroup, setSelectedProfessor, setSelectedBimester,
    isLoading, isProfessor, professorId: effectiveProfessorId,
    organizationId,
  };
}
