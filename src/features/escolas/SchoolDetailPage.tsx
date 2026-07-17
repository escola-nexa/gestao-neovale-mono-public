import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { escolasApi } from '@/features/escolas/api';
import { ArrowLeft, Users, Clock, FileUp, GraduationCap, School, MapPin, Phone, Mail, BookOpen, Loader2, UserCheck, LibraryBig, BookOpenCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { useSchoolHub } from '@/contexts/SchoolHubContext';

interface SchoolInfo {
  id: string;
  nome: string;
  codigo: string;
  cidade: string;
  diretor: string;
  email: string;
  telefone: string;
  status: string;
}

export default function SchoolDetailPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const { setSchoolHub } = useSchoolHub();
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentCount, setStudentCount] = useState(0);
  const [slotCount, setSlotCount] = useState(0);
  const [classGroupCount, setClassGroupCount] = useState(0);
  const [professorCount, setProfessorCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [subjectCount, setSubjectCount] = useState(0);

  useEffect(() => {
    if (schoolId) loadSchool();
  }, [schoolId]);

  const loadSchool = async () => {
    try {
      setLoading(true);
      const [schoolRes, enrollRes, slotsRes, classGroupsRes, profRes, courseRes] = await Promise.all([
        escolasApi.client.from('schools').select('id, nome, codigo, cidade, diretor, email, telefone, status').eq('id', schoolId!).maybeSingle(),
        escolasApi.client.from('enrollments').select('student_id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('status', 'ativa'),
        escolasApi.client.from('school_time_slots').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('status', 'ACTIVE'),
        escolasApi.client.from('class_groups').select('id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('status', 'ativo'),
        escolasApi.client.from('professor_school_courses').select('professor_id', { count: 'exact', head: true }).eq('school_id', schoolId!).eq('status', 'ACTIVE'),
        escolasApi.client.from('course_schools').select('course_id').eq('school_id', schoolId!),
      ]);
      if (schoolRes.data) {
        setSchool(schoolRes.data as SchoolInfo);
        setSchoolHub(schoolRes.data.id, schoolRes.data.nome);
      }
      setStudentCount(enrollRes.count || 0);
      setSlotCount(slotsRes.count || 0);
      setClassGroupCount(classGroupsRes.count || 0);
      setProfessorCount(profRes.count || 0);

      const courseIds = (courseRes.data || []).map((c: any) => c.course_id);
      setCourseCount(courseIds.length);

      if (courseIds.length > 0) {
        const { count: subjCount } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .in('course_id', courseIds)
          .is('deleted_at', null);
        setSubjectCount(subjCount || 0);
      } else {
        setSubjectCount(0);
      }
    } catch {
      console.error('Error loading school');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Escola não encontrada
      </div>
    );
  }

  const modules = [
    {
      title: 'Alunos',
      description: 'Gerencie os alunos matriculados nesta escola',
      icon: Users,
      count: studentCount,
      countLabel: 'alunos matriculados',
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500/10',
      iconColor: 'text-blue-600 dark:text-blue-400',
      path: `/escolas/${schoolId}/alunos`,
      secondaryAction: {
        label: 'Importações',
        icon: FileUp,
        path: `/escolas/${schoolId}/importacoes`,
      },
    },
    {
      title: 'Turmas',
      description: 'Visualize as turmas cadastradas nesta escola',
      icon: BookOpen,
      count: classGroupCount,
      countLabel: 'turmas ativas',
      borderColor: 'border-l-purple-500',
      bgColor: 'bg-purple-500/10',
      iconColor: 'text-purple-600 dark:text-purple-400',
      path: `/escolas/${schoolId}/turmas`,
    },
    {
      title: 'Cursos',
      description: 'Cursos oferecidos nesta unidade escolar',
      icon: LibraryBig,
      count: courseCount,
      countLabel: 'cursos vinculados',
      borderColor: 'border-l-amber-500',
      bgColor: 'bg-amber-500/10',
      iconColor: 'text-amber-600 dark:text-amber-400',
      path: `/escolas/${schoolId}/cursos`,
    },
    {
      title: 'Disciplinas',
      description: 'Disciplinas dos cursos ofertados nesta escola',
      icon: BookOpenCheck,
      count: subjectCount,
      countLabel: 'disciplinas no total',
      borderColor: 'border-l-cyan-500',
      bgColor: 'bg-cyan-500/10',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      path: `/escolas/${schoolId}/disciplinas`,
    },
    {
      title: 'Professores',
      description: 'Professores que atuam nesta escola',
      icon: UserCheck,
      count: professorCount,
      countLabel: 'vínculos ativos',
      borderColor: 'border-l-rose-500',
      bgColor: 'bg-rose-500/10',
      iconColor: 'text-rose-600 dark:text-rose-400',
      path: `/escolas/${schoolId}/professores`,
    },
    {
      title: 'Horários Padrão',
      description: 'Configure os horários das aulas por turno e dia da semana',
      icon: Clock,
      count: slotCount,
      countLabel: 'slots configurados',
      borderColor: 'border-l-emerald-500',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      path: `/escolas/${schoolId}/horarios`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Escolas', href: '/escolas' },
          { label: school.nome },
        ]}
        title={school.nome}
        description={`Código: ${school.codigo} • ${school.cidade} • Diretor: ${school.diretor}`}
        icon={School}
        backTo="/escolas"
        badge={{
          label: school.status === 'ativo' ? 'Ativo' : 'Inativo',
          tone: school.status === 'ativo' ? 'success' : 'default',
        }}
      />

      {/* Contato */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground -mt-2">
        <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {school.telefone}</span>
        <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {school.email}</span>
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Card
              key={mod.title}
              className={`border-l-4 ${mod.borderColor} cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5`}
              onClick={() => navigate(mod.path)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${mod.bgColor}`}>
                    <Icon className={`h-6 w-6 ${mod.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base">{mod.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>
                    {mod.count !== null && (
                      <p className="text-sm font-medium mt-2">
                        <span className="text-lg font-bold text-foreground">{mod.count}</span>{' '}
                        <span className="text-muted-foreground">{mod.countLabel}</span>
                      </p>
                    )}
                    {'secondaryAction' in mod && mod.secondaryAction && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(mod.secondaryAction!.path);
                        }}
                      >
                        <mod.secondaryAction.icon className="mr-1.5 h-3.5 w-3.5" />
                        {mod.secondaryAction.label}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
