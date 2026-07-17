// Enums
export type UserRole = 'admin' | 'coordenador' | 'professor' | 'rh' | 'financeiro';
export type EntityStatus = 'ativo' | 'inativo';
export type NivelEnsino = 'educacao_infantil' | 'fundamental_1' | 'fundamental_2' | 'ensino_medio' | 'eja' | 'profissional';

export const NIVEIS_ENSINO: { value: NivelEnsino; label: string }[] = [
  { value: 'educacao_infantil', label: 'Educação Infantil' },
  { value: 'fundamental_1', label: 'Ensino Fundamental I' },
  { value: 'fundamental_2', label: 'Ensino Fundamental II' },
  { value: 'ensino_medio', label: 'Ensino Médio' },
  { value: 'eja', label: 'EJA' },
  { value: 'profissional', label: 'Itinerário Formativo Profissional' },
];

// User
export interface User {
  id: string;
  nomeCompleto: string;
  email: string;
  perfil: UserRole;
  status: EntityStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDTO {
  nomeCompleto: string;
  email: string;
  perfil: UserRole;
  senhaInicial: string;
}

export interface UpdateUserDTO extends Partial<CreateUserDTO> {
  id: string;
  novaSenha?: string;
}

// Escola
export interface Escola {
  id: string;
  nome: string;
  codigo: string;
  cidade: string;
  endereco: string;
  diretor: string;
  email: string;
  telefone: string;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEscolaDTO {
  nome: string;
  codigo: string;
  cidade: string;
  endereco: string;
  diretor: string;
  email: string;
  telefone: string;
  status: EntityStatus;
}

export interface UpdateEscolaDTO extends Partial<CreateEscolaDTO> {
  id: string;
}

// Curso (um curso pode ser ofertado em várias escolas)
export interface Curso {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  nivelEnsino: NivelEnsino;
  status: EntityStatus;
  escolaIds: string[]; // IDs das escolas onde o curso é ofertado
  escolas?: Escola[]; // Escolas populadas
  createdAt: string;
  updatedAt: string;
}

export interface CreateCursoDTO {
  codigo: string;
  nome: string;
  descricao: string;
  nivelEnsino: NivelEnsino;
  status: EntityStatus;
  escolaIds: string[];
}

export interface UpdateCursoDTO extends Partial<CreateCursoDTO> {
  id: string;
}

// Disciplina (vinculada EXCLUSIVAMENTE a um curso, sem relação direta com escola)
export type DisciplinaStatus = 'active' | 'inactive';

export interface Disciplina {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  cargaHorariaSemanal: number; // weekly_workload_hours
  cursoId: string;
  curso?: Curso;
  status: DisciplinaStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null; // soft delete
}

export interface CreateDisciplinaDTO {
  codigo: string;
  nome: string;
  descricao?: string;
  cargaHorariaSemanal: number;
  cursoId: string;
  status: DisciplinaStatus;
}

export interface UpdateDisciplinaDTO extends Partial<CreateDisciplinaDTO> {
  id: string;
}

// Turma (pertence à escola E ao curso - ambos obrigatórios)
export interface Turma {
  id: string;
  nome: string;
  anoLetivo: string;
  escolaId: string;
  cursoId: string; // Obrigatório
  escola?: Escola;
  curso?: Curso;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTurmaDTO {
  nome: string;
  anoLetivo: string;
  escolaId: string;
  cursoId: string; // Obrigatório
  status: EntityStatus;
}

export interface UpdateTurmaDTO extends Partial<CreateTurmaDTO> {
  id: string;
}

// Student (Aluno)
export type EnrollmentStatus = 'ativa' | 'transferida' | 'cancelada';

export interface StudentAddress {
  rua: string;
  numero: string;
  bairro: string;
  cep: string;
  municipio: string;
  estado: string;
}

export interface StudentGuardian {
  nomeMae: string;
  nomePai?: string;
  contatoResponsavel: string;
  emailResponsavel: string;
}

export interface Student {
  id: string;
  nomeCompleto: string;
  dataNascimento: string;
  codigoMatricula: string;
  cpf?: string;
  rg?: string;
  orgaoExpedidor?: string;
  nacionalidade?: string;
  educacaoEspecial?: boolean;
  educacaoEspecialDescricao?: string;
  whatsapp: string;
  email: string;
  endereco: StudentAddress;
  responsavel: StudentGuardian;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentDTO {
  nomeCompleto: string;
  dataNascimento: string;
  codigoMatricula: string;
  cpf?: string;
  rg?: string;
  orgaoExpedidor?: string;
  nacionalidade?: string;
  educacaoEspecial?: boolean;
  educacaoEspecialDescricao?: string;
  whatsapp: string;
  email: string;
  endereco: StudentAddress;
  responsavel: StudentGuardian;
}

export interface UpdateStudentDTO extends Partial<CreateStudentDTO> {
  id: string;
}

// Enrollment (Matrícula) - Vínculo Acadêmico
// Regra: Aluno só existe academicamente se tiver Matrícula Ativa: Escola + Curso + Turma + Ano Letivo
export interface Enrollment {
  id: string;
  studentId: string;
  student?: Student;
  escolaId: string;
  escola?: Escola;
  cursoId: string;
  curso?: Curso;
  turmaId: string;
  turma?: Turma;
  anoLetivo: string;
  dataMatricula: string;
  dataEncerramento?: string;
  status: EnrollmentStatus;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnrollmentDTO {
  studentId: string;
  escolaId: string;
  cursoId: string;
  turmaId: string;
  anoLetivo: string;
  dataMatricula: string;
  observacoes?: string;
}

export interface UpdateEnrollmentDTO extends Partial<CreateEnrollmentDTO> {
  id: string;
}

export interface TransferEnrollmentDTO {
  enrollmentId: string;
  novaEscolaId: string;
  novoCursoId: string;
  novaTurmaId: string;
  dataTransferencia: string;
  observacoes?: string;
}

// Auth
export interface AuthUser {
  id: string;
  email: string;
  nomeCompleto: string;
  perfil: UserRole;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalEscolas: number;
  totalProfessores: number;
  totalAlunos: number;
  totalTurmas: number;
}
