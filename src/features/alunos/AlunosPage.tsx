import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2, Download, Upload, GraduationCap } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { studentsApiSupabase, enrollmentsApiSupabase, StudentData, EnrollmentData } from '@/services/supabaseApi';
import { StudentFormDialog } from './components/StudentFormDialog';
import { StudentTable } from './components/StudentTable';
import { EnrollmentDialog } from './components/EnrollmentDialog';
import { EnrollmentsList } from './components/EnrollmentsList';
import { StudentImportDialog } from './components/StudentImportDialog';
import { DuplicatesBanner } from './components/DuplicatesBanner';
import { EnrollmentFormData } from './components/StudentFormStep3';
import { CreateStudentDTO, Student, Enrollment } from '@/types';
import { useOrganization } from '@/hooks/useOrganization';
import { alunosApi } from '@/features/alunos/api';
import { useServerPagination } from '@/hooks/useServerPagination';
import { TablePagination } from '@/components/TablePagination';
import { isValidCPF } from './utils/cpf';
import { ApiAdapter } from '@/lib/api-adapter';

const emptyFormData: CreateStudentDTO = {
  nomeCompleto: '',
  dataNascimento: '',
  codigoMatricula: '',
  cpf: '',
  rg: '',
  orgaoExpedidor: '',
  nacionalidade: 'Brasileira',
  educacaoEspecial: false,
  educacaoEspecialDescricao: '',
  whatsapp: '',
  email: '',
  endereco: { rua: '', numero: '', bairro: '', cep: '', municipio: '', estado: '' },
  responsavel: { nomeMae: '', nomePai: '', contatoResponsavel: '', emailResponsavel: '' },
};

const emptyEnrollmentData: EnrollmentFormData = {
  schoolId: '',
  courseId: '',
  classGroupId: '',
  anoLetivo: '',
};

const mapToStudent = (data: StudentData): Student => ({
  id: data.id,
  nomeCompleto: data.nome_completo,
  dataNascimento: data.data_nascimento,
  codigoMatricula: data.codigo_matricula,
  cpf: data.cpf || '',
  rg: data.rg || '',
  orgaoExpedidor: data.orgao_expedidor || '',
  nacionalidade: data.nacionalidade || 'Brasileira',
  educacaoEspecial: !!data.educacao_especial,
  educacaoEspecialDescricao: data.educacao_especial_descricao || '',
  whatsapp: data.whatsapp || '',
  email: data.email || '',
  endereco: {
    rua: data.endereco_rua || '', numero: data.endereco_numero || '',
    bairro: data.endereco_bairro || '', cep: data.endereco_cep || '',
    municipio: data.endereco_municipio || '', estado: data.endereco_estado || '',
  },
  responsavel: {
    nomeMae: data.nome_mae, nomePai: data.nome_pai || '',
    contatoResponsavel: data.contato_responsavel, emailResponsavel: data.email_responsavel || '',
  },
  status: data.status, createdAt: data.created_at, updatedAt: data.updated_at,
});

const mapToEnrollment = (data: EnrollmentData): Enrollment => ({
  id: data.id, studentId: data.student_id, escolaId: data.school_id,
  cursoId: data.course_id, turmaId: data.class_group_id, anoLetivo: data.ano_letivo,
  dataMatricula: data.data_matricula, dataEncerramento: data.data_encerramento || undefined,
  status: data.status, observacoes: data.observacoes || undefined,
  createdAt: data.created_at, updatedAt: data.updated_at,
  escola: data.school ? {
    id: data.school.id, nome: data.school.nome, codigo: data.school.codigo,
    cidade: data.school.cidade, endereco: data.school.endereco, diretor: data.school.diretor,
    email: data.school.email, telefone: data.school.telefone, status: data.school.status,
    createdAt: data.school.created_at, updatedAt: data.school.updated_at,
  } : undefined,
  curso: data.course ? {
    id: data.course.id, codigo: data.course.codigo, nome: data.course.nome,
    descricao: data.course.descricao || '', nivelEnsino: data.course.nivel_ensino as any,
    status: data.course.status, escolaIds: data.course.school_ids || [],
    createdAt: data.course.created_at, updatedAt: data.course.updated_at,
  } : undefined,
  turma: data.class_group ? {
    id: data.class_group.id, nome: data.class_group.nome,
    anoLetivo: data.class_group.ano_letivo, escolaId: data.class_group.school_id,
    cursoId: data.class_group.course_id, status: data.class_group.status,
    createdAt: data.class_group.created_at, updatedAt: data.class_group.updated_at,
  } : undefined,
});

export default function AlunosPage() {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const turmaFilter = searchParams.get('turma');
  const shouldOpenNew = searchParams.get('novo') === '1';

  const [students, setStudents] = useState<Student[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [turmaName, setTurmaName] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [classGroups, setClassGroups] = useState<{ id: string; nome: string }[]>([]);
  const [selectedTurma, setSelectedTurma] = useState(turmaFilter || 'all');

  const pagination = useServerPagination(25);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [formData, setFormData] = useState<CreateStudentDTO>(emptyFormData);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentFormData>(emptyEnrollmentData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Enrollment state (only for viewing/adding extra enrollments)
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [selectedStudentForEnrollment, setSelectedStudentForEnrollment] = useState<Student | null>(null);
  const [enrollmentsDialogOpen, setEnrollmentsDialogOpen] = useState(false);
  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<Enrollment[]>([]);

  useEffect(() => {
    if (schoolId) { loadSchoolName(); loadClassGroups(); }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) loadStudents();
  }, [selectedTurma, statusFilter, searchTerm, pagination.page, pagination.pageSize]);

  useEffect(() => {
    pagination.resetPage();
  }, [selectedTurma, statusFilter, searchTerm]);

  const loadClassGroups = async () => {
    if (!schoolId) return;
    try {
      const data = await ApiAdapter.turmas.getAll({ schoolId, status: 'ativo' });
      setClassGroups(data || []);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (turmaFilter) {
      ApiAdapter.turmas.getById(turmaFilter)
        .then((data) => { if (data) setTurmaName(data.nome); })
        .catch(() => {});
    } else { setTurmaName(''); }
  }, [turmaFilter]);

  useEffect(() => {
    if (shouldOpenNew && !loading) setIsDialogOpen(true);
  }, [shouldOpenNew, loading]);

  const loadSchoolName = async () => {
    if (!schoolId) return;
    try {
      const data = await ApiAdapter.escolas.getById(schoolId);
      if (data) setSchoolName(data.nome);
    } catch { /* ignore */ }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      if (!schoolId) return;

      const activeTurma = selectedTurma && selectedTurma !== 'all' ? selectedTurma : turmaFilter;

      const { data, count, error } = await ApiAdapter.alunos.getFiltered({
        schoolId,
        classGroupId: activeTurma || undefined,
        statusFilter: statusFilter !== 'all' ? statusFilter : undefined,
        searchTerm: searchTerm || undefined,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });

      if (error) throw error;
      
      pagination.setTotalCount(count || 0);
      setStudents((data || []).map(mapToStudent));
    } catch { toast({ title: 'Erro ao carregar alunos', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleNew = () => {
    setFormData(emptyFormData);
    // Pre-fill classGroupId when entering from a turma context
    const preselectedTurma = turmaFilter || (selectedTurma !== 'all' ? selectedTurma : '');
    setEnrollmentData({ ...emptyEnrollmentData, classGroupId: preselectedTurma });
    setEditingId(null);
    setFormStep(1);
    setIsDialogOpen(true);
  };

  const handleEdit = (student: Student) => {
    setFormData({
      nomeCompleto: student.nomeCompleto, dataNascimento: student.dataNascimento,
      codigoMatricula: student.codigoMatricula,
      cpf: student.cpf || '',
      rg: student.rg || '',
      orgaoExpedidor: student.orgaoExpedidor || '',
      nacionalidade: student.nacionalidade || 'Brasileira',
      educacaoEspecial: !!student.educacaoEspecial,
      educacaoEspecialDescricao: student.educacaoEspecialDescricao || '',
      whatsapp: student.whatsapp, email: student.email,
      endereco: { ...student.endereco }, responsavel: { ...student.responsavel },
    });
    setEditingId(student.id); setFormStep(1); setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => { setDeletingId(id); setDeleteDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await ApiAdapter.alunos.delete(deletingId);
      if (error) throw error;
      toast({ title: 'Aluno excluído com sucesso!' }); loadStudents();
    } catch (error: any) { toast({ title: error.message || 'Erro ao excluir', variant: 'destructive' }); }
    finally { setDeleteDialogOpen(false); setDeletingId(null); }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const studentPayload: Omit<StudentData, 'id' | 'created_at' | 'updated_at'> = {
        nome_completo: formData.nomeCompleto, data_nascimento: formData.dataNascimento || null,
        codigo_matricula: formData.codigoMatricula, whatsapp: formData.whatsapp || null,
        email: formData.email || null, endereco_rua: formData.endereco.rua || null,
        endereco_numero: formData.endereco.numero || null, endereco_bairro: formData.endereco.bairro || null,
        endereco_cep: formData.endereco.cep || null, endereco_municipio: formData.endereco.municipio || null,
        endereco_estado: formData.endereco.estado || null, nome_mae: formData.responsavel.nomeMae || null,
        nome_pai: formData.responsavel.nomePai || null, contato_responsavel: formData.responsavel.contatoResponsavel || null,
        email_responsavel: formData.responsavel.emailResponsavel || null,
        cpf: formData.cpf?.trim() || null,
        rg: formData.rg?.trim() || null,
        orgao_expedidor: formData.orgaoExpedidor?.trim() || null,
        nacionalidade: formData.nacionalidade?.trim() || 'Brasileira',
        educacao_especial: !!formData.educacaoEspecial,
        educacao_especial_descricao: formData.educacaoEspecial ? (formData.educacaoEspecialDescricao?.trim() || null) : null,
        status: 'ativo',
      };

      if (editingId) {
        const { error } = await ApiAdapter.alunos.update(editingId, studentPayload);
        if (error) throw error;
        toast({ title: 'Aluno atualizado com sucesso!' });
        setIsDialogOpen(false);
        loadStudents();
      } else {
        // Create student
        const { data: created, error } = await ApiAdapter.alunos.create(studentPayload);
        if (error) throw error;

        // Create enrollment in the same action (step 3 data)
        if (schoolId && enrollmentData.classGroupId && enrollmentData.courseId) {
          const { error: enrollError } = await ApiAdapter.enrollments.create({
            student_id: created.id,
            school_id: schoolId,
            course_id: enrollmentData.courseId,
            class_group_id: enrollmentData.classGroupId,
            ano_letivo: enrollmentData.anoLetivo,
            data_matricula: new Date().toISOString().split('T')[0],
            data_encerramento: null,
            observacoes: '',
            status: 'ativa',
          });
          if (enrollError) throw enrollError;
          toast({ title: 'Aluno cadastrado e matriculado com sucesso!' });
        } else {
          toast({ title: 'Aluno cadastrado com sucesso!' });
        }

        setIsDialogOpen(false);
        loadStudents();
      }
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('students_org_cpf_unique')) {
        toast({ title: 'CPF já cadastrado', description: 'Já existe um aluno com esse CPF nesta organização.', variant: 'destructive' });
      } else if (msg.includes('students_organization_id_codigo_matricula_key') || msg.includes('duplicate key')) {
        toast({ title: 'Código de matrícula já existe', description: 'Já existe um aluno cadastrado com esse código de matrícula. Use um código diferente.', variant: 'destructive' });
      } else {
        toast({ title: msg || 'Erro ao salvar', variant: 'destructive' });
      }
    }
    finally { setSaving(false); }
  };

  const handleViewEnrollments = async (student: Student) => {
    try {
      const enrollments = await ApiAdapter.enrollments.getByStudent(student.id);
      setSelectedStudentEnrollments(enrollments.map(mapToEnrollment));
      setSelectedStudentForEnrollment(student);
      setEnrollmentsDialogOpen(true);
    } catch { toast({ title: 'Erro ao carregar matrículas', variant: 'destructive' }); }
  };

  const validateStep1 = () => {
    if (!formData.nomeCompleto || !formData.codigoMatricula) return false;
    if (formData.cpf && formData.cpf.replace(/\D/g, '').length > 0 && !isValidCPF(formData.cpf)) return false;
    
    return true;
  };
  const validateStep2 = () => true;
  const validateStep3 = () => !!(enrollmentData.courseId && enrollmentData.classGroupId);

  const downloadTemplate = () => {
    const headers = 'nome_completo;data_nascimento;codigo_matricula;cpf;rg;orgao_expedidor;nacionalidade;educacao_especial;educacao_especial_descricao;whatsapp;email;endereco_rua;endereco_numero;endereco_bairro;endereco_cep;endereco_municipio;endereco_estado;nome_mae;nome_pai;contato_responsavel;email_responsavel;status';
    const example = 'João da Silva;2010-03-15;MAT001;123.456.789-09;MG-12.345.678;SSP/MG;Brasileira;nao;;(11)99999-0000;joao@email.com;Rua das Flores;123;Centro;01001-000;São Paulo;SP;Maria da Silva;José da Silva;(11)98888-0000;maria@email.com;ativo';
    const blob = new Blob(['\uFEFF' + headers + '\n' + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'modelo_importacao_alunos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: schoolName || '...', href: `/escolas/${schoolId}` },
          { label: 'Alunos' },
        ]}
        title="Alunos"
        eyebrow={turmaName || undefined}
        description={schoolName || 'Carregando...'}
        icon={GraduationCap}
        backTo={`/escolas/${schoolId}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" /> Baixar Modelo</Button>
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}><Upload className="mr-2 h-4 w-4" /> Importar</Button>
            <Button onClick={handleNew} size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Aluno</Button>
          </>
        }
      />

      <DuplicatesBanner schoolId={schoolId} />

      <Card>
        <CardHeader>
          <CardTitle className="sr-only">Lista de Alunos</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome, matrícula ou email..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
            <SearchableSelect
              value={selectedTurma}
              onValueChange={setSelectedTurma}
              placeholder="Turma"
              searchPlaceholder="Buscar turma..."
              triggerClassName="w-full sm:w-[200px]"
              options={[
                { value: 'all', label: 'Todas as turmas' },
                ...classGroups.map(cg => ({ value: cg.id, label: cg.nome })),
              ]}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : (
            <>
              <StudentTable
                students={students}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewEnrollments={handleViewEnrollments}
              />
              <TablePagination pagination={pagination} />
            </>
          )}
        </CardContent>
      </Card>

      <StudentFormDialog
        open={isDialogOpen} onOpenChange={setIsDialogOpen}
        formData={formData} setFormData={setFormData}
        formStep={formStep} setFormStep={setFormStep}
        editingId={editingId} saving={saving} onSave={handleSave}
        validateStep1={validateStep1} validateStep2={validateStep2}
        schoolId={schoolId}
        schoolName={schoolName}
        enrollmentData={enrollmentData}
        setEnrollmentData={setEnrollmentData}
        validateStep3={validateStep3}
        preselectedClassGroupId={turmaFilter || (selectedTurma !== 'all' ? selectedTurma : undefined)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este aluno?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="w-full sm:w-auto">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enrollment dialog - only for adding extra enrollments via "Ver Matrículas" */}
      <EnrollmentDialog open={enrollmentDialogOpen}
        onOpenChange={setEnrollmentDialogOpen}
        student={selectedStudentForEnrollment} mode="create"
        defaultSchoolId={schoolId}
        onSuccess={() => { loadStudents(); setEnrollmentDialogOpen(false); }} />

      <EnrollmentsList open={enrollmentsDialogOpen} onOpenChange={setEnrollmentsDialogOpen}
        student={selectedStudentForEnrollment} enrollments={selectedStudentEnrollments}
        onEnroll={() => { setEnrollmentsDialogOpen(false); setEnrollmentDialogOpen(true); }}
        onRefresh={() => { if (selectedStudentForEnrollment) handleViewEnrollments(selectedStudentForEnrollment); }} />

      {organizationId && (
        <StudentImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen}
          organizationId={organizationId} defaultSchoolId={schoolId} onSuccess={loadStudents} />
      )}
    </div>
  );
}
