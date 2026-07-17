import { useState, useEffect } from 'react';
import { fetchSchoolsWithCourses } from '@/lib/schoolsWithCourses';
import { useProfessorId } from '@/hooks/useProfessorId';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { frequenciaApi } from '../api';

interface FilterOption {
  id: string;
  name: string;
}

export function useProfessorCascadingFilters() {
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const { organizationId } = useOrganization();

  const [schools, setSchools] = useState<FilterOption[]>([]);
  const [courses, setCourses] = useState<FilterOption[]>([]);
  const [classGroups, setClassGroups] = useState<FilterOption[]>([]);
  const [subjects, setSubjects] = useState<FilterOption[]>([]);

  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedClassGroup, setSelectedClassGroup] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Load schools
  useEffect(() => {
    if (!organizationId) return;

    const load = async () => {
      setIsLoading(true);
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        result = await frequenciaApi.getProfessorSchools(professorId);
      } else {
        const data = await fetchSchoolsWithCourses<{ id: string; nome: string }>({ organizationId });
        result = data.map(s => ({ id: s.id, name: s.nome }));
      }
      setSchools(result);
      if (result.length === 1 && !selectedSchool) {
        setSelectedSchool(result[0].id);
      }
      setIsLoading(false);
    };
    load();
  }, [organizationId, professorId, isProfessor]);

  // Load courses when school changes
  useEffect(() => {
    setCourses([]);
    setSelectedCourse('');
    setClassGroups([]);
    setSelectedClassGroup('');
    setSubjects([]);
    setSelectedSubject('');

    if (!selectedSchool || !organizationId) return;

    const load = async () => {
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        result = await frequenciaApi.getProfessorCourses(professorId, selectedSchool);
      } else {
        result = await frequenciaApi.getSchoolCourses(selectedSchool);
      }
      setCourses(result);
      if (result.length === 1) setSelectedCourse(result[0].id);
    };
    load();
  }, [selectedSchool, organizationId, professorId, isProfessor]);

  // Load class groups when course changes
  useEffect(() => {
    setClassGroups([]);
    setSelectedClassGroup('');
    setSubjects([]);
    setSelectedSubject('');

    if (!selectedSchool || !selectedCourse) return;

    const load = async () => {
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        result = await frequenciaApi.getProfessorClassGroups(professorId, selectedSchool, selectedCourse);
      } else {
        result = await frequenciaApi.getCourseClassGroups(selectedSchool, selectedCourse);
      }
      setClassGroups(result);
      if (result.length === 1) setSelectedClassGroup(result[0].id);
    };
    load();
  }, [selectedSchool, selectedCourse, professorId, isProfessor]);

  // Load subjects when class group changes
  useEffect(() => {
    setSubjects([]);
    setSelectedSubject('');

    if (!selectedClassGroup || !selectedCourse) return;

    const load = async () => {
      let result: FilterOption[] = [];
      if (isProfessor && professorId) {
        result = await frequenciaApi.getProfessorSubjects(professorId, selectedSchool, selectedCourse, selectedClassGroup);
      } else {
        result = await frequenciaApi.getCourseSubjects(selectedCourse);
      }
      setSubjects(result);
      if (result.length === 1) setSelectedSubject(result[0].id);
    };
    load();
  }, [selectedClassGroup, selectedSchool, selectedCourse, professorId, isProfessor]);

  return {
    schools, courses, classGroups, subjects,
    selectedSchool, selectedCourse, selectedClassGroup, selectedSubject,
    setSelectedSchool, setSelectedCourse, setSelectedClassGroup, setSelectedSubject,
    isLoading, professorId, isProfessor,
  };
}
