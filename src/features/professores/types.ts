// Professor status enum
export type ProfessorStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

// Binding status enum
export type BindingStatus = 'ACTIVE' | 'INACTIVE';

// Professor data interface
export interface ProfessorData {
  id: string;
  organization_id: string;
  user_id: string;
  full_name: string;
  cpf: string | null;
  registration_code: string | null;
  phone: string | null;
  specialization: string | null;
  status: ProfessorStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Joined data
  email?: string;
}

// Professor school course binding interface
export interface ProfessorSchoolCourse {
  id: string;
  organization_id: string;
  professor_id: string;
  school_id: string;
  course_id: string | null;
  status: BindingStatus;
  is_coordinator: boolean;
  workload_morning_hours: number;
  workload_afternoon_hours: number;
  workload_night_hours: number;
  created_at: string;
  unbound_at?: string | null;
  unbound_by?: string | null;
  unbind_reason?: string | null;
  // Joined data
  school_name?: string;
  course_name?: string;
  unbound_by_name?: string | null;
}

// Form data for creating/editing professor
export interface ProfessorFormData {
  full_name: string;
  cpf: string;
  registration_code: string;
  phone: string;
  specialization: string;
  status: ProfessorStatus;
  email: string;
  password?: string;
}

// Form data for binding
export interface BindingFormData {
  school_id: string;
  course_id: string;
  is_coordinator: boolean;
}
