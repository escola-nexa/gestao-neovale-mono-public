import { useState, useEffect, useCallback } from 'react';
import { filtersApi } from '../api';
import { useOrganization } from '@/hooks/useOrganization';
import { useSemester, type SubjectSemester } from '@/hooks/useSemester';
import type { SchoolData, CourseData, ClassGroupData, SubjectData } from '@/services/supabaseApi';
import type { ProfessorData } from '@/features/professores/types';

interface CascadingFiltersState {
  professors: ProfessorData[];
  schools: SchoolData[];
  courses: CourseData[];
  classGroups: ClassGroupData[];
  subjects: SubjectData[];
  isLoading: boolean;
}

interface FilterSelection {
  professorId: string | null;
  schoolId: string | null;
  courseId: string | null;
  classGroupId: string | null;
  subjectId: string | null;
}

export function useCascadingFilters() {
  const { organization } = useOrganization();
  const { currentSemester } = useSemester();
  
  const [state, setState] = useState<CascadingFiltersState>({
    professors: [],
    schools: [],
    courses: [],
    classGroups: [],
    subjects: [],
    isLoading: true,
  });

  const [selection, setSelection] = useState<FilterSelection>({
    professorId: null,
    schoolId: null,
    courseId: null,
    classGroupId: null,
    subjectId: null,
  });

  const [selectedSubjectSemester, setSelectedSubjectSemester] = useState<SubjectSemester | null>(null);

  // Load all professors
  const loadProfessors = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const data = await filtersApi.getProfessors(organization.id);
      if (data) {
        setState(prev => ({ ...prev, professors: data as ProfessorData[] }));
      }
    } catch (error) {
      console.error(error);
    }
  }, [organization?.id]);

  // Load schools based on professor bindings
  const loadSchoolsForProfessor = useCallback(async (professorId: string) => {
    try {
      const schools = await filtersApi.getSchoolsForProfessor(professorId);
      setState(prev => ({ ...prev, schools: schools || [] }));
    } catch (error) {
      setState(prev => ({ ...prev, schools: [] }));
    }
  }, []);

  // Load courses based on professor + school bindings
  const loadCoursesForProfessorSchool = useCallback(async (professorId: string, schoolId: string) => {
    try {
      const courses = await filtersApi.getCoursesForProfessorSchool(professorId, schoolId);
      setState(prev => ({ ...prev, courses: courses || [] }));
    } catch (error) {
      setState(prev => ({ ...prev, courses: [] }));
    }
  }, []);

  // Load class groups for school + course
  const loadClassGroups = useCallback(async (schoolId: string, courseId: string) => {
    try {
      const data = await filtersApi.getClassGroups(schoolId, courseId);
      setState(prev => ({ ...prev, classGroups: data || [] }));
    } catch (error) {
      // Ignore
    }
  }, []);

  // Load subjects for course (active only, with semester)
  const loadSubjects = useCallback(async (courseId: string) => {
    try {
      const data = await filtersApi.getSubjects(courseId);
      if (data) {
        setState(prev => ({ 
          ...prev, 
          subjects: data.map((d: any) => ({
            ...d,
            semester: d.semester as SubjectSemester,
          })) as SubjectData[]
        }));
      }
    } catch (error) {
      // Ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    setState(prev => ({ ...prev, isLoading: true }));
    loadProfessors().finally(() => {
      setState(prev => ({ ...prev, isLoading: false }));
    });
  }, [loadProfessors]);

  // Auto-select single professor
  useEffect(() => {
    if (state.professors.length === 1 && !selection.professorId) {
      selectProfessor(state.professors[0].id);
    }
  }, [state.professors]);

  // Handle professor selection
  const selectProfessor = useCallback(async (professorId: string | null) => {
    setSelection({
      professorId,
      schoolId: null,
      courseId: null,
      classGroupId: null,
      subjectId: null,
    });
    setSelectedSubjectSemester(null);
    setState(prev => ({
      ...prev,
      schools: [],
      courses: [],
      classGroups: [],
      subjects: [],
    }));

    if (professorId) {
      try {
        const schools = await filtersApi.getSchoolsForProfessor(professorId);
        setState(prev => ({ ...prev, schools: schools || [] }));
        
        // Auto-select if only one school
        if (schools && schools.length === 1) {
          // Trigger school selection in next tick to avoid state conflicts
          setTimeout(() => selectSchoolAfterProfessor(professorId, schools[0].id), 0);
        }
      } catch (error) {
        // Ignore
      }
    }
  }, []);

  // Internal helper for auto-cascading after professor auto-selects school
  const selectSchoolAfterProfessor = useCallback(async (professorId: string, schoolId: string) => {
    setSelection(prev => ({ ...prev, schoolId }));
    
    try {
      const courses = await filtersApi.getCoursesForProfessorSchool(professorId, schoolId);
      if (courses && courses.length > 0) {
        setState(prev => ({ ...prev, courses: courses || [] }));

        // Auto-select if only one course
        if (courses.length === 1) {
          setTimeout(() => selectCourseAfterAutoSchool(professorId, schoolId, courses[0].id), 0);
        }
      }
    } catch (error) {
      // Ignore
    }
  }, []);

  // Internal helper for auto-cascading after auto-selecting course
  const selectCourseAfterAutoSchool = useCallback(async (professorId: string, schoolId: string, courseId: string) => {
    setSelection(prev => ({ ...prev, courseId }));

    try {
      // Load class groups
      const classGroupsData = await filtersApi.getClassGroups(schoolId, courseId);
      setState(prev => ({ ...prev, classGroups: classGroupsData || [] }));

      // Load subjects
      const subjectsData = await filtersApi.getSubjects(courseId);
      if (subjectsData) {
        setState(prev => ({
          ...prev,
          subjects: subjectsData.map((d: any) => ({
            ...d,
            semester: d.semester as SubjectSemester,
          })) as SubjectData[]
        }));
      }

      // Auto-select if only one class group
      if (classGroupsData && classGroupsData.length === 1) {
        setSelection(prev => ({ ...prev, classGroupId: classGroupsData[0].id }));
      }

      // Auto-select if only one subject
      if (subjectsData && subjectsData.length === 1) {
        setSelection(prev => ({ ...prev, subjectId: subjectsData[0].id }));
        const subject = subjectsData[0];
        setSelectedSubjectSemester((subject.semester as SubjectSemester) || null);
      }
    } catch (error) {
      // Ignore
    }
  }, []);

  // Handle school selection
  const selectSchool = useCallback(async (schoolId: string | null) => {
    setSelection(prev => ({
      ...prev,
      schoolId,
      courseId: null,
      classGroupId: null,
      subjectId: null,
    }));
    setSelectedSubjectSemester(null);
    setState(prev => ({
      ...prev,
      courses: [],
      classGroups: [],
      subjects: [],
    }));

    if (schoolId && selection.professorId) {
      await loadCoursesForProfessorSchool(selection.professorId, schoolId);
    }
  }, [selection.professorId, loadCoursesForProfessorSchool]);

  // Auto-select single course when courses list changes
  useEffect(() => {
    if (state.courses.length === 1 && !selection.courseId) {
      selectCourseInternal(state.courses[0].id);
    }
  }, [state.courses]);

  // Auto-select single class group / subject when they load
  useEffect(() => {
    if (state.classGroups.length === 1 && !selection.classGroupId) {
      setSelection(prev => ({ ...prev, classGroupId: state.classGroups[0].id }));
    }
  }, [state.classGroups]);

  useEffect(() => {
    if (state.subjects.length === 1 && !selection.subjectId) {
      const subj = state.subjects[0];
      setSelection(prev => ({ ...prev, subjectId: subj.id }));
      setSelectedSubjectSemester(subj.semester || null);
    }
  }, [state.subjects]);

  // Internal course selection (used by auto-select and manual)
  const selectCourseInternal = useCallback(async (courseId: string | null) => {
    setSelection(prev => ({
      ...prev,
      courseId,
      classGroupId: null,
      subjectId: null,
    }));
    setSelectedSubjectSemester(null);
    setState(prev => ({
      ...prev,
      classGroups: [],
      subjects: [],
    }));

    if (courseId && selection.schoolId) {
      await loadClassGroups(selection.schoolId, courseId);
      await loadSubjects(courseId);
    }
  }, [selection.schoolId, loadClassGroups, loadSubjects]);

  // Handle course selection (public API)
  const selectCourse = selectCourseInternal;

  // Handle class group selection
  const selectClassGroup = useCallback((classGroupId: string | null) => {
    setSelection(prev => ({
      ...prev,
      classGroupId,
    }));
  }, []);

  // Handle subject selection
  const selectSubject = useCallback((subjectId: string | null) => {
    setSelection(prev => ({
      ...prev,
      subjectId,
    }));

    // Update selected subject semester
    if (subjectId) {
      const subject = state.subjects.find(s => s.id === subjectId);
      setSelectedSubjectSemester(subject?.semester || null);
    } else {
      setSelectedSubjectSemester(null);
    }
  }, [state.subjects]);

  // Reset all selections
  const resetSelection = useCallback(() => {
    setSelection({
      professorId: null,
      schoolId: null,
      courseId: null,
      classGroupId: null,
      subjectId: null,
    });
    setSelectedSubjectSemester(null);
    setState(prev => ({
      ...prev,
      schools: [],
      courses: [],
      classGroups: [],
      subjects: [],
    }));
  }, []);

  return {
    ...state,
    selection,
    selectedSubjectSemester,
    currentSemester,
    selectProfessor,
    selectSchool,
    selectCourse,
    selectClassGroup,
    selectSubject,
    resetSelection,
    isSelectionComplete: Boolean(
      selection.professorId &&
      selection.schoolId &&
      selection.courseId &&
      selection.classGroupId &&
      selection.subjectId
    ),
  };
}
