import { supabase } from '@/integrations/supabase/client';
import { API_PROVIDER, nestApi } from '@/lib/api-adapter';

// Helper to get user's organization
const getOrganizationId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');
  
  const { data: userRole, error } = await supabase
    .from('user_roles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();
    
  if (error || !userRole) throw new Error('Organização não encontrada');
  return userRole.organization_id;
};

// ============== FORMATIVE TRACKS API ==============
export interface FormativeTrackData {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const formativeTracksApi = {
  getAll: async (): Promise<FormativeTrackData[]> => {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/formative-tracks');
      return data;
    }
    const { data, error } = await supabase
      .from('formative_tracks')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    
    if (error) throw error;
    return (data || []) as FormativeTrackData[];
  },

  getActive: async (): Promise<FormativeTrackData[]> => {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/formative-tracks');
      return data.filter((t: any) => t.status === 'ACTIVE');
    }
    const { data, error } = await supabase
      .from('formative_tracks')
      .select('*')
      .is('deleted_at', null)
      .eq('status', 'ACTIVE')
      .order('name');
    
    if (error) throw error;
    return (data || []) as FormativeTrackData[];
  },

  getById: async (id: string): Promise<FormativeTrackData | null> => {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/formative-tracks/${id}`);
      return data;
    }
    const { data, error } = await supabase
      .from('formative_tracks')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data as FormativeTrackData | null;
  },

  create: async (data: Omit<FormativeTrackData, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<FormativeTrackData> => {
    if (API_PROVIDER === 'nestjs') {
      const res = await nestApi.post('/formative-tracks', data);
      return res.data;
    }
    const organizationId = await getOrganizationId();
    
    const { data: track, error } = await supabase
      .from('formative_tracks')
      .insert({ ...data, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return track as FormativeTrackData;
  },

  update: async (id: string, data: Partial<FormativeTrackData>): Promise<FormativeTrackData> => {
    if (API_PROVIDER === 'nestjs') {
      const res = await nestApi.put(`/formative-tracks/${id}`, data);
      return res.data;
    }
    const { data: track, error } = await supabase
      .from('formative_tracks')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return track as FormativeTrackData;
  },

  delete: async (id: string): Promise<void> => {
    if (API_PROVIDER === 'nestjs') {
      await nestApi.delete(`/formative-tracks/${id}`);
      return;
    }
    // Soft delete
    const { error } = await supabase
      .from('formative_tracks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== SCHOOLS API ==============
export interface SchoolData {
  id: string;
  nome: string;
  codigo: string;
  cidade: string;
  endereco: string;
  endereco_cep: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_bairro: string;
  diretor: string;
  diretor_telefone: string;
  diretor_email: string;
  diretor_adjunto: string;
  diretor_adjunto_telefone: string;
  diretor_adjunto_email: string;
  supervisor_tecnico_1: string;
  supervisor_tecnico_1_telefone: string;
  supervisor_tecnico_1_email: string;
  supervisor_tecnico_1_turno: string;
  supervisor_tecnico_2: string;
  supervisor_tecnico_2_telefone: string;
  supervisor_tecnico_2_email: string;
  supervisor_tecnico_2_turno: string;
  supervisor_tecnico_3: string;
  supervisor_tecnico_3_telefone: string;
  supervisor_tecnico_3_email: string;
  supervisor_tecnico_3_turno: string;
  coordenador_pedagogico: string;
  coordenador_pedagogico_telefone: string;
  coordenador_pedagogico_email: string;
  coordenador_pedagogico_turno: string;
  email: string;
  telefone: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

export const schoolsApi = {
  getAll: async (): Promise<SchoolData[]> => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<SchoolData | null> => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  create: async (data: Omit<SchoolData, 'id' | 'created_at' | 'updated_at'>): Promise<SchoolData> => {
    const organizationId = await getOrganizationId();
    
    const { data: school, error } = await supabase
      .from('schools')
      .insert({ ...data, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return school;
  },

  update: async (id: string, data: Partial<SchoolData>): Promise<SchoolData> => {
    const { data: school, error } = await supabase
      .from('schools')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return school;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== COURSES API ==============
export interface CourseData {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  nivel_ensino: string;
  status: 'ativo' | 'inativo';
  formative_track_id: string | null;
  formative_track?: FormativeTrackData;
  created_at: string;
  updated_at: string;
  school_ids?: string[];
}

export interface CourseSchoolData {
  id: string;
  course_id: string;
  school_id: string;
}

export const coursesApi = {
  getAll: async (): Promise<CourseData[]> => {
    if (API_PROVIDER === 'nestjs') {
      const { data: courses } = await nestApi.get('/courses');
      // For now, course_schools is still loaded from supabase since it might not be in NestJS yet
      const { data: courseSchools } = await supabase
        .from('course_schools')
        .select('course_id, school_id');
        
      return (courses || []).map((course: any) => ({
        id: course.id,
        codigo: course.codigo,
        nome: course.nome,
        descricao: course.descricao,
        nivel_ensino: course.nivelEnsino || course.nivel_ensino,
        status: course.status,
        formative_track_id: course.formativeTrackId || course.formative_track_id,
        created_at: course.createdAt || course.created_at,
        updated_at: course.updatedAt || course.updated_at,
        school_ids: (courseSchools || [])
          .filter(cs => cs.course_id === course.id)
          .map(cs => cs.school_id),
      }));
    }

    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    
    // Get school associations
    const { data: courseSchools } = await supabase
      .from('course_schools')
      .select('course_id, school_id');
    
    return (courses || []).map(course => ({
      ...course,
      formative_track: (course as any).formative_tracks as FormativeTrackData | undefined,
      school_ids: (courseSchools || [])
        .filter(cs => cs.course_id === course.id)
        .map(cs => cs.school_id),
    }));
  },

  getBySchool: async (schoolId: string): Promise<CourseData[]> => {
    const { data: courseSchools, error: csError } = await supabase
      .from('course_schools')
      .select('course_id')
      .eq('school_id', schoolId);
    
    if (csError) throw csError;
    
    const courseIds = (courseSchools || []).map(cs => cs.course_id);
    if (courseIds.length === 0) return [];
    
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .in('id', courseIds);
    
    if (error) throw error;
    return (courses || []).map(course => ({
      ...course,
      formative_track: (course as any).formative_tracks as FormativeTrackData | undefined,
    }));
  },

  getByFormativeTrack: async (formativeTrackId: string): Promise<CourseData[]> => {
    if (API_PROVIDER === 'nestjs') {
      const { data: courses } = await nestApi.get(`/courses/by-formative-track/${formativeTrackId}`);
      const { data: courseSchools } = await supabase
        .from('course_schools')
        .select('course_id, school_id');
        
      return (courses || []).map((course: any) => ({
        id: course.id,
        codigo: course.codigo,
        nome: course.nome,
        descricao: course.descricao,
        nivel_ensino: course.nivelEnsino || course.nivel_ensino,
        status: course.status,
        formative_track_id: course.formativeTrackId || course.formative_track_id,
        created_at: course.createdAt || course.created_at,
        updated_at: course.updatedAt || course.updated_at,
        school_ids: (courseSchools || [])
          .filter(cs => cs.course_id === course.id)
          .map(cs => cs.school_id),
      }));
    }
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('formative_track_id', formativeTrackId)
      .order('nome');
    
    if (error) throw error;
    
    // Get school associations
    const { data: courseSchools } = await supabase
      .from('course_schools')
      .select('course_id, school_id');
    
    return (courses || []).map(course => ({
      ...course,
      formative_track: (course as any).formative_tracks as FormativeTrackData | undefined,
      school_ids: (courseSchools || [])
        .filter(cs => cs.course_id === course.id)
        .map(cs => cs.school_id),
    }));
  },

  create: async (data: Omit<CourseData, 'id' | 'created_at' | 'updated_at' | 'formative_track'>): Promise<CourseData> => {
    const organizationId = await getOrganizationId();
    const { school_ids, ...courseData } = data;
    
    const { data: course, error } = await supabase
      .from('courses')
      .insert({ ...courseData, organization_id: organizationId } as any)
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Add school associations
    if (school_ids && school_ids.length > 0) {
      const { error: csError } = await supabase
        .from('course_schools')
        .insert(school_ids.map(schoolId => ({
          course_id: course.id,
          school_id: schoolId,
        })));
      
      if (csError) throw csError;
    }
    
    return { 
      ...course, 
      formative_track: (course as any).formative_tracks as FormativeTrackData | undefined,
      school_ids 
    };
  },

  update: async (id: string, data: Partial<CourseData>): Promise<CourseData> => {
    const { school_ids, formative_track, ...courseData } = data;
    
    const { data: course, error } = await supabase
      .from('courses')
      .update(courseData as any)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Update school associations if provided
    if (school_ids !== undefined) {
      // Remove old associations
      await supabase
        .from('course_schools')
        .delete()
        .eq('course_id', id);
      
      // Add new associations
      if (school_ids.length > 0) {
        await supabase
          .from('course_schools')
          .insert(school_ids.map(schoolId => ({
            course_id: id,
            school_id: schoolId,
          })));
      }
    }
    
    return { 
      ...course, 
      formative_track: (course as any).formative_tracks as FormativeTrackData | undefined,
      school_ids 
    };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== SUBJECTS API ==============
export type SubjectSemester = 'FIRST' | 'SECOND' | 'ANNUAL';

export interface SubjectData {
  id: string;
  codigo: string;
  nome: string;
  nome_boletim: string | null;
  descricao: string | null;
  carga_horaria_semanal: number;
  course_id: string;
  semester: SubjectSemester;
  total_classes: number;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  course?: CourseData;
}

export const subjectsApi = {
  getAll: async (): Promise<SubjectData[]> => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, courses(*)')
      .is('deleted_at', null)
      .order('nome');
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      semester: d.semester as SubjectSemester,
      course: d.courses as CourseData | undefined,
    }));
  },

  getByCourse: async (courseId: string): Promise<SubjectData[]> => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, courses(*)')
      .eq('course_id', courseId)
      .is('deleted_at', null)
      .order('nome');
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      semester: d.semester as SubjectSemester,
      course: d.courses as CourseData | undefined,
    }));
  },

  getBySemester: async (semester: SubjectSemester): Promise<SubjectData[]> => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, courses(*)')
      .eq('semester', semester as any)
      .eq('status', 'ativo')
      .is('deleted_at', null)
      .order('nome');
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      semester: d.semester as SubjectSemester,
      course: d.courses as CourseData | undefined,
    }));
  },

  getByCourseSemester: async (courseId: string, semester: SubjectSemester): Promise<SubjectData[]> => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, courses(*)')
      .eq('course_id', courseId)
      .eq('semester', semester as any)
      .eq('status', 'ativo')
      .is('deleted_at', null)
      .order('nome');
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      semester: d.semester as SubjectSemester,
      course: d.courses as CourseData | undefined,
    }));
  },

  create: async (data: Omit<SubjectData, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'course' | 'total_classes'>): Promise<SubjectData> => {
    const organizationId = await getOrganizationId();
    
    // Cast semester to any because generated types might not have ANNUAL yet
    const insertData: any = {
      codigo: data.codigo,
      nome: data.nome,
      descricao: data.descricao || null,
      nome_boletim: data.nome_boletim || null,
      carga_horaria_semanal: data.carga_horaria_semanal,
      course_id: data.course_id,
      semester: data.semester as any,
      status: data.status,
      organization_id: organizationId,
    };

    const { data: subject, error } = await supabase
      .from('subjects')
      .insert(insertData)
      .select('*, courses(*)')
      .single();
    
    if (error) throw error;
    return { 
      ...subject, 
      semester: subject.semester as SubjectSemester,
      course: subject.courses as CourseData | undefined 
    };
  },

  update: async (id: string, data: Partial<Omit<SubjectData, 'total_classes'>>): Promise<SubjectData> => {
    const { course, ...subjectData } = data;
    
    // Clean up fields to avoid sending empty strings where null is expected
    const cleanData: any = { ...subjectData };
    if (cleanData.semester) cleanData.semester = cleanData.semester as any;
    if ('nome_boletim' in cleanData) cleanData.nome_boletim = cleanData.nome_boletim || null;
    if ('descricao' in cleanData) cleanData.descricao = cleanData.descricao || null;
    
    const { data: subject, error } = await supabase
      .from('subjects')
      .update(cleanData)
      .eq('id', id)
      .select('*, courses(*)')
      .single();
    
    if (error) throw error;
    return { 
      ...subject, 
      semester: subject.semester as SubjectSemester,
      course: subject.courses as CourseData | undefined 
    };
  },

  delete: async (id: string): Promise<void> => {
    // Soft delete
    const { error } = await supabase
      .from('subjects')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== CLASS GROUPS API ==============
export interface ClassGroupData {
  id: string;
  nome: string;
  ano_letivo: string;
  school_id: string;
  course_id: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
  school?: SchoolData;
  course?: CourseData;
}

export const classGroupsApi = {
  getAll: async (): Promise<ClassGroupData[]> => {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/class-groups', { params: { status: 'ativo' } });
      return data;
    }
    const { data, error } = await supabase
      .from('class_groups')
      .select('*')
      .eq('status', 'ativo')
      .order('nome');
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      school: (d as any).schools as SchoolData | undefined,
      course: (d as any).courses as CourseData | undefined,
    }));
  },

  getBySchool: async (schoolId: string): Promise<ClassGroupData[]> => {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get('/class-groups', { params: { schoolId, status: 'ativo' } });
      return data;
    }
    const { data, error } = await supabase
      .from('class_groups')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'ativo')
      .order('nome');
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      school: (d as any).schools as SchoolData | undefined,
      course: (d as any).courses as CourseData | undefined,
    }));
  },

  getById: async (id: string): Promise<ClassGroupData> => {
    if (API_PROVIDER === 'nestjs') {
      const { data } = await nestApi.get(`/class-groups/${id}`);
      return data;
    }
    const { data, error } = await supabase
      .from('class_groups')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return {
      ...data,
      school: (data as any).schools as SchoolData | undefined,
      course: (data as any).courses as CourseData | undefined,
    } as ClassGroupData;
  },

  create: async (data: Omit<ClassGroupData, 'id' | 'created_at' | 'updated_at' | 'school' | 'course'>): Promise<ClassGroupData> => {
    if (API_PROVIDER === 'nestjs') {
      const { data: classGroup } = await nestApi.post('/class-groups', data);
      return classGroup;
    }
    const organizationId = await getOrganizationId();
    
    const { data: classGroup, error } = await supabase
      .from('class_groups')
      .insert({ ...data, organization_id: organizationId })
      .select('*, schools(*), courses(*)')
      .single();
    
    if (error) throw error;
    return {
      ...classGroup,
      school: classGroup.schools as SchoolData | undefined,
      course: classGroup.courses as CourseData | undefined,
    };
  },

  update: async (id: string, data: Partial<ClassGroupData>): Promise<ClassGroupData> => {
    const { school, course, ...classGroupData } = data;
    
    const { data: classGroup, error } = await supabase
      .from('class_groups')
      .update(classGroupData)
      .eq('id', id)
      .select('*, schools(*), courses(*)')
      .single();
    
    if (error) throw error;
    return {
      ...classGroup,
      school: classGroup.schools as SchoolData | undefined,
      course: classGroup.courses as CourseData | undefined,
    };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('class_groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== STUDENTS API ==============
export interface StudentData {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  codigo_matricula: string;
  cpf: string | null;
  rg: string | null;
  orgao_expedidor: string | null;
  nacionalidade: string | null;
  educacao_especial: boolean;
  educacao_especial_descricao: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_bairro: string | null;
  endereco_cep: string | null;
  endereco_municipio: string | null;
  endereco_estado: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  contato_responsavel: string | null;
  email_responsavel: string | null;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

export const studentsApiSupabase = {
  getAll: async (): Promise<StudentData[]> => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('nome_completo');
    
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string): Promise<StudentData | null> => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  create: async (data: Omit<StudentData, 'id' | 'created_at' | 'updated_at'>): Promise<StudentData> => {
    const organizationId = await getOrganizationId();
    
    const { data: student, error } = await supabase
      .from('students')
      .insert({ ...data, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return student;
  },

  update: async (id: string, data: Partial<StudentData>): Promise<StudentData> => {
    const { data: student, error } = await supabase
      .from('students')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return student;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== ENROLLMENTS API ==============
export interface EnrollmentData {
  id: string;
  student_id: string;
  school_id: string;
  course_id: string;
  class_group_id: string;
  ano_letivo: string;
  data_matricula: string;
  data_encerramento: string | null;
  status: 'ativa' | 'transferida' | 'cancelada';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  student?: StudentData;
  school?: SchoolData;
  course?: CourseData;
  class_group?: ClassGroupData;
}

export const enrollmentsApiSupabase = {
  getAll: async (): Promise<EnrollmentData[]> => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, students(*), schools(*), courses(*), class_groups(*)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      student: d.students as StudentData | undefined,
      school: d.schools as SchoolData | undefined,
      course: d.courses as CourseData | undefined,
      class_group: d.class_groups as ClassGroupData | undefined,
    }));
  },

  getByStudent: async (studentId: string): Promise<EnrollmentData[]> => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, students(*), schools(*), courses(*), class_groups(*)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(d => ({
      ...d,
      student: d.students as StudentData | undefined,
      school: d.schools as SchoolData | undefined,
      course: d.courses as CourseData | undefined,
      class_group: d.class_groups as ClassGroupData | undefined,
    }));
  },

  create: async (data: Omit<EnrollmentData, 'id' | 'created_at' | 'updated_at' | 'student' | 'school' | 'course' | 'class_group'>): Promise<EnrollmentData> => {
    const organizationId = await getOrganizationId();
    
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({ ...data, organization_id: organizationId })
      .select('*, students(*), schools(*), courses(*), class_groups(*)')
      .single();
    
    if (error) throw error;
    return {
      ...enrollment,
      student: enrollment.students as StudentData | undefined,
      school: enrollment.schools as SchoolData | undefined,
      course: enrollment.courses as CourseData | undefined,
      class_group: enrollment.class_groups as ClassGroupData | undefined,
    };
  },

  update: async (id: string, data: Partial<EnrollmentData>): Promise<EnrollmentData> => {
    const { student, school, course, class_group, ...enrollmentData } = data;
    
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .update(enrollmentData)
      .eq('id', id)
      .select('*, students(*), schools(*), courses(*), class_groups(*)')
      .single();
    
    if (error) throw error;
    return {
      ...enrollment,
      student: enrollment.students as StudentData | undefined,
      school: enrollment.schools as SchoolData | undefined,
      course: enrollment.courses as CourseData | undefined,
      class_group: enrollment.class_groups as ClassGroupData | undefined,
    };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== WEEKLY TEACHING MODELS API ==============
export type WeekdayType = 'SEGUNDA' | 'TERCA' | 'QUARTA' | 'QUINTA' | 'SEXTA';

export interface WeeklyTeachingModelData {
  id: string;
  professor_id: string;
  school_id: string;
  course_id: string;
  subject_id: string;
  class_group_id: string;
  weekday: WeekdayType;
  start_time: string;
  end_time: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export const weeklyTeachingModelsApi = {
  getAll: async (): Promise<WeeklyTeachingModelData[]> => {
    const { data, error } = await supabase
      .from('weekly_teaching_models')
      .select('*')
      .order('weekday')
      .order('start_time');
    
    if (error) throw error;
    return data || [];
  },

  getByProfessor: async (professorId: string): Promise<WeeklyTeachingModelData[]> => {
    const { data, error } = await supabase
      .from('weekly_teaching_models')
      .select('*')
      .eq('professor_id', professorId)
      .order('weekday')
      .order('start_time');
    
    if (error) throw error;
    return data || [];
  },

  create: async (data: Omit<WeeklyTeachingModelData, 'id' | 'created_at' | 'updated_at'>): Promise<WeeklyTeachingModelData> => {
    const organizationId = await getOrganizationId();
    
    const { data: model, error } = await supabase
      .from('weekly_teaching_models')
      .insert({ ...data, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return model;
  },

  update: async (id: string, data: Partial<WeeklyTeachingModelData>): Promise<WeeklyTeachingModelData> => {
    const { data: model, error } = await supabase
      .from('weekly_teaching_models')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return model;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('weekly_teaching_models')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== PRE-PLANNINGS API ==============
export type PlanningType = 'MENSAL' | 'BIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
export type PrePlanningStatus = 'GERADO' | 'DISPONIVEL' | 'EM_EDICAO' | 'ENVIADO' | 'DEVOLVIDO' | 'ASSINADO';

export interface ClassDayDetail {
  date: string;
  start_time: string;
  end_time: string;
  weekday: string;
  weekday_label: string;
}

export interface PrePlanningData {
  id: string;
  organization_id: string;
  professor_id: string | null;
  course_id: string;
  subject_id: string;
  school_id: string | null;
  class_group_id: string | null;
  occurrence_id: string | null;
  class_date: string | null;
  planning_type: PlanningType;
  bimester_number: number | null;
  reference_month: number | null;
  reference_year: number;
  status: PrePlanningStatus;
  calculated_total_classes: number | null;
  calculated_total_hours: number | null;
  week_number: number | null;
  week_start_date: string | null;
  week_end_date: string | null;
  class_days_count: number;
  class_days_detail: ClassDayDetail[];
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PlanningFilterParams {
  schoolId?: string;
  courseId?: string;
  classGroupId?: string;
  professorId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const prePlanningsApi = {
  getAll: async (): Promise<PrePlanningData[]> => {
    const { data, error } = await supabase
      .from('pre_plannings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(d => ({
      ...d,
      status: d.status as PrePlanningStatus,
      class_days_detail: (d.class_days_detail || []) as unknown as ClassDayDetail[],
    }));
  },

  getFiltered: async (filters: PlanningFilterParams): Promise<{ data: PrePlanningData[]; count: number }> => {
    const { page = 1, pageSize = 100 } = filters;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('pre_plannings')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.schoolId) query = query.eq('school_id', filters.schoolId);
    if (filters.courseId) query = query.eq('course_id', filters.courseId);
    if (filters.classGroupId) query = query.eq('class_group_id', filters.classGroupId);
    if (filters.professorId) query = query.eq('professor_id', filters.professorId);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.startDate) query = query.gte('class_date', filters.startDate);
    if (filters.endDate) query = query.lte('class_date', filters.endDate);

    const { data, error, count } = await query;
    if (error) throw error;
    return {
      data: (data || []).map(d => ({
        ...d,
        status: d.status as PrePlanningStatus,
        class_days_detail: (d.class_days_detail || []) as unknown as ClassDayDetail[],
      })),
      count: count || 0,
    };
  },

  create: async (data: {
    course_id: string;
    subject_id: string;
    planning_type: PlanningType;
    bimester_number?: number | null;
    reference_month?: number | null;
    reference_year: number;
    objective: string;
    competencies: string;
    contents: string;
    methodology: string;
    resources: string;
    evaluation: string;
    product: string;
    next_steps: string;
    created_by: string;
    school_id?: string | null;
    class_group_id?: string | null;
    occurrence_id?: string | null;
    class_date?: string | null;
    status?: PrePlanningStatus;
    calculated_total_classes?: number | null;
    calculated_total_hours?: number | null;
  }): Promise<PrePlanningData> => {
    const organizationId = await getOrganizationId();
    
    const { data: planning, error } = await supabase
      .from('pre_plannings')
      .insert({ 
        ...data, 
        organization_id: organizationId,
        status: data.status || 'GERADO',
      })
      .select()
      .single();
    
    if (error) throw error;
    return {
      ...planning,
      status: planning.status as PrePlanningStatus,
      class_days_detail: (planning.class_days_detail || []) as unknown as ClassDayDetail[],
    };
  },

  update: async (id: string, data: Partial<PrePlanningData>): Promise<PrePlanningData> => {
    const { class_days_detail, ...updateData } = data;
    const payload: any = { ...updateData };
    if (class_days_detail !== undefined) payload.class_days_detail = class_days_detail as any;

    const { data: planning, error } = await supabase
      .from('pre_plannings')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return {
      ...planning,
      status: planning.status as PrePlanningStatus,
      class_days_detail: (planning.class_days_detail || []) as unknown as ClassDayDetail[],
    };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('pre_plannings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== TEACHER PLANNINGS API ==============
// Novo fluxo: DRAFT → ENVIADO → DEVOLVIDO/AGUARDANDO_ASSINATURA/ASSINADO
// Legacy (mantido para compatibilidade): PENDING, APPROVED, REJECTED
export type TeacherPlanningStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ENVIADO' | 'DEVOLVIDO' | 'ASSINADO' | 'AGUARDANDO_ASSINATURA' | 'AGUARDANDO_ASSINATURA_COORDENADOR' | 'CONCLUIDO';

export interface TeacherPlanningData {
  id: string;
  organization_id: string;
  professor_id: string;
  pre_planning_id: string | null;
  occurrence_id: string | null;
  school_id: string | null;
  course_id: string | null;
  class_group_id: string | null;
  subject_id: string | null;
  bimester_number: number | null;
  week_number: number | null;
  week_start_date: string | null;
  week_end_date: string | null;
  class_date: string | null;
  start_time: string | null;
  end_time: string | null;
  objective: string;
  competencies: string;
  contents: string;
  methodology: string;
  resources: string;
  evaluation: string;
  product: string;
  next_steps: string;
  status: TeacherPlanningStatus;
  coordinator_feedback: string | null;
  rejection_reason: string | null;
  professor_signed: boolean;
  coordinator_signed: boolean;
  finalized_at: string | null;
  finalization_justification: string | null;
  created_at: string;
  updated_at: string;
}

export const teacherPlanningsApi = {
  getAll: async (): Promise<TeacherPlanningData[]> => {
    const { data, error } = await supabase
      .from('teacher_plannings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getFiltered: async (filters: PlanningFilterParams): Promise<{ data: TeacherPlanningData[]; count: number }> => {
    const { page = 1, pageSize = 100 } = filters;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('teacher_plannings')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.schoolId) query = query.eq('school_id', filters.schoolId);
    if (filters.courseId) query = query.eq('course_id', filters.courseId);
    if (filters.classGroupId) query = query.eq('class_group_id', filters.classGroupId);
    if (filters.professorId) query = query.eq('professor_id', filters.professorId);
    if (filters.status) {
      const statusAliases: Record<string, string[]> = {
        ENVIADO: ['ENVIADO', 'PENDING'],
        DEVOLVIDO: ['DEVOLVIDO', 'REJECTED'],
        ASSINADO: ['ASSINADO', 'APPROVED'],
      };
      const matchStatuses = statusAliases[filters.status] || [filters.status];
      query = query.in('status', matchStatuses as any);
    }
    if (filters.startDate) query = query.gte('class_date', filters.startDate);
    if (filters.endDate) query = query.lte('class_date', filters.endDate);

    const { data, error, count } = await query;
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  },

  getByProfessor: async (professorId: string): Promise<TeacherPlanningData[]> => {
    const { data, error } = await supabase
      .from('teacher_plannings')
      .select('*')
      .eq('professor_id', professorId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  create: async (data: Omit<TeacherPlanningData, 'id' | 'created_at' | 'updated_at' | 'organization_id'>): Promise<TeacherPlanningData> => {
    const organizationId = await getOrganizationId();
    
    const { data: planning, error } = await supabase
      .from('teacher_plannings')
      .insert({ ...data, organization_id: organizationId })
      .select()
      .single();
    
    if (error) throw error;
    return planning;
  },

  update: async (id: string, data: Partial<TeacherPlanningData>): Promise<TeacherPlanningData> => {
    const { data: planning, error } = await supabase
      .from('teacher_plannings')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return planning;
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('teacher_plannings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============== ACADEMIC CALENDARS API ==============
export interface AcademicCalendarData {
  id: string;
  academic_year: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export const academicCalendarsApi = {
  getAll: async (): Promise<AcademicCalendarData[]> => {
    const { data, error } = await supabase
      .from('academic_calendars')
      .select('*')
      .order('academic_year', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getActive: async (): Promise<AcademicCalendarData[]> => {
    const { data, error } = await supabase
      .from('academic_calendars')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('academic_year', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  getActiveOrClosed: async (): Promise<AcademicCalendarData[]> => {
    const { data, error } = await supabase
      .from('academic_calendars')
      .select('*')
      .in('status', ['ACTIVE', 'CLOSED'])
      .order('academic_year', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },
};

// ============== PROFILES API (for professor list) ==============
export interface ProfileData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export const profilesApi = {
  getAll: async (): Promise<ProfileData[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    if (error) throw error;
    return data || [];
  },

  getProfessors: async (): Promise<ProfileData[]> => {
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'professor');
    
    if (rolesError) throw rolesError;
    
    const professorIds = (userRoles || []).map(ur => ur.user_id);
    if (professorIds.length === 0) return [];
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', professorIds)
      .order('full_name');
    
    if (error) throw error;
    return profiles || [];
  },
};
