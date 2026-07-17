import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { compartilhamentoApi } from '@/features/compartilhamento/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Link2, Plus, Copy, Power, ExternalLink, Trash2, Filter, HelpCircle, Share2, School, FileCheck, Clock, ShieldOff, AlertTriangle } from 'lucide-react';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { PageHeader } from '@/components/PageHeader';

const PUBLISHED_URL = 'https://nexa-gestao.lovable.app';

export default function ExternalLinksPage() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [killSwitchSchool, setKillSwitchSchool] = useState('');
  const [showKillSwitch, setShowKillSwitch] = useState(false);

  // Form state
  const [schoolId, setSchoolId] = useState('');
  const [contentType, setContentType] = useState('');
  const [bimester, setBimester] = useState('');
  const [courseId, setCourseId] = useState('');
  const [classGroupId, setClassGroupId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('90');

  // Filter state
  const [filterSchool, setFilterSchool] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterClassGroup, setFilterClassGroup] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const isProfessorDocuments = contentType === 'documentos_professor';

  useEffect(() => {
    if (isProfessorDocuments) {
      setExpiresInDays('30');
      setBimester('');
      setCourseId('');
      setClassGroupId('');
      setSubjectId('');
    }
  }, [isProfessorDocuments]);

  // Fetch schools
  const { data: schools = [] } = useQuery({
    queryKey: ['schools-for-links', organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, nome, cidade')
        .eq('organization_id', organizationId!)
        .eq('status', 'ativo')
        .order('nome');
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch courses (for filter, based on filterSchool)
  const { data: allCourses = [] } = useQuery({
    queryKey: ['courses-for-links', organizationId, filterSchool],
    queryFn: async () => {
      if (filterSchool) {
        const { data: courseSchools } = await supabase
          .from('course_schools')
          .select('course_id, courses(id, nome)')
          .eq('school_id', filterSchool);
        return (courseSchools || []).map((cs: any) => cs.courses).filter(Boolean);
      }
      const { data } = await supabase
        .from('courses')
        .select('id, nome')
        .eq('organization_id', organizationId!)
        .eq('status', 'ativo')
        .order('nome');
      return data || [];
    },
    enabled: !!organizationId,
  });

  // Fetch class groups for filter
  const { data: filterClassGroups = [] } = useQuery({
    queryKey: ['classgroups-filter-links', organizationId, filterSchool, filterCourse],
    queryFn: async () => {
      if (!filterSchool) return [];
      let query = supabase
        .from('class_groups')
        .select('id, nome')
        .eq('organization_id', organizationId!)
        .eq('school_id', filterSchool)
        .eq('status', 'ativo')
        .order('nome');
      if (filterCourse) query = query.eq('course_id', filterCourse);
      const { data } = await query;
      return data || [];
    },
    enabled: !!organizationId && !!filterSchool,
  });

  // Fetch subjects for filter
  const { data: filterSubjects = [] } = useQuery({
    queryKey: ['subjects-filter-links', organizationId, filterCourse],
    queryFn: async () => {
      if (!filterCourse) return [];
      const { data } = await supabase
        .from('subjects')
        .select('id, nome')
        .eq('organization_id', organizationId!)
        .eq('course_id', filterCourse)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('nome');
      return data || [];
    },
    enabled: !!organizationId && !!filterCourse,
  });

  // Form cascading data (reuse schools, separate queries for form)
  const { data: formCourses = [] } = useQuery({
    queryKey: ['courses-form-links', organizationId, schoolId],
    queryFn: async () => {
      if (schoolId) {
        const { data: courseSchools } = await supabase
          .from('course_schools')
          .select('course_id, courses(id, nome)')
          .eq('school_id', schoolId);
        return (courseSchools || []).map((cs: any) => cs.courses).filter(Boolean);
      }
      const { data } = await supabase
        .from('courses')
        .select('id, nome')
        .eq('organization_id', organizationId!)
        .eq('status', 'ativo')
        .order('nome');
      return data || [];
    },
    enabled: !!organizationId,
  });

  const { data: formClassGroups = [] } = useQuery({
    queryKey: ['classgroups-form-links', organizationId, schoolId, courseId],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase
        .from('class_groups')
        .select('id, nome')
        .eq('organization_id', organizationId!)
        .eq('school_id', schoolId)
        .eq('status', 'ativo')
        .order('nome');
      if (courseId) query = query.eq('course_id', courseId);
      const { data } = await query;
      return data || [];
    },
    enabled: !!organizationId && !!schoolId,
  });

  const { data: formProfessors = [] } = useQuery({
    queryKey: ['professors-form-links', organizationId, schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data } = await supabase
        .from('professor_school_courses')
        .select('professor_id, professors(id, full_name)')
        .eq('school_id', schoolId)
        .eq('status', 'ACTIVE');
      const unique = new Map();
      (data || []).forEach((d: any) => {
        if (d.professors) unique.set(d.professors.id, d.professors);
      });
      return Array.from(unique.values()).sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
    },
    enabled: !!organizationId && !!schoolId,
  });

  const { data: formSubjects = [] } = useQuery({
    queryKey: ['subjects-form-links', organizationId, courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data } = await supabase
        .from('subjects')
        .select('id, nome')
        .eq('organization_id', organizationId!)
        .eq('course_id', courseId)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('nome');
      return data || [];
    },
    enabled: !!organizationId && !!courseId,
  });

  // Fetch links
  const { data: links = [] } = useQuery({
    queryKey: ['external-links', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_links')
        .select('*, schools(nome, cidade)')
        .eq('organization_id', organizationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Apply filters
  const filteredLinks = useMemo(() => {
    return links.filter((link: any) => {
      if (filterSchool && link.school_id !== filterSchool) return false;
      if (filterCourse && link.scope_json?.course_id !== filterCourse) return false;
      if (filterClassGroup && link.scope_json?.class_group_id !== filterClassGroup) return false;
      if (filterSubject && link.scope_json?.subject_id !== filterSubject) return false;
      if (filterDateStart) {
        const created = new Date(link.created_at);
        if (created < new Date(filterDateStart)) return false;
      }
      if (filterDateEnd) {
        const created = new Date(link.created_at);
        const endDate = new Date(filterDateEnd);
        endDate.setHours(23, 59, 59);
        if (created > endDate) return false;
      }
      return true;
    });
  }, [links, filterSchool, filterCourse, filterClassGroup, filterSubject, filterDateStart, filterDateEnd]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId || !contentType) throw new Error('Escola e tipo de conteúdo são obrigatórios');
      if (contentType === 'documentos_professor' && !professorId) {
        throw new Error('Selecione um professor para gerar o link de Documentos do Professor.');
      }
      const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      const scope: any = {};
      if (professorId) scope.professor_id = professorId;
      if (contentType !== 'documentos_professor') {
        if (bimester) scope.bimester_number = Number(bimester);
        if (courseId) scope.course_id = courseId;
        if (classGroupId) scope.class_group_id = classGroupId;
        if (subjectId) scope.subject_id = subjectId;
      }
      const expiresAt = expiresInDays
        ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;
      const { error } = await compartilhamentoApi.client.from('external_links').insert({
        organization_id: organizationId!,
        school_id: schoolId,
        created_by: user?.id || '',
        content_type: contentType,
        scope_json: scope,
        token,
        is_active: true,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
      if (error) throw error;
      return token;
    },
    onSuccess: (token) => {
      const url = `${PUBLISHED_URL}/acesso-externo/${token}`;
      navigator.clipboard.writeText(url);
      toast.success('Link criado e copiado para a área de transferência!');
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['external-links'] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('external_links')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] });
      toast.success('Status do link atualizado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete related access logs to avoid FK constraint violation
      const { error: logsError } = await supabase
        .from('external_access_logs')
        .delete()
        .eq('external_link_id', id);
      if (logsError) throw logsError;

      const { error } = await supabase
        .from('external_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] });
      toast.success('Link excluído com sucesso');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setSchoolId('');
    setContentType('');
    setBimester('');
    setCourseId('');
    setClassGroupId('');
    setProfessorId('');
    setSubjectId('');
    setExpiresInDays('90');
  };

  // Kill Switch: deactivate all links for a school
  const killSwitchMutation = useMutation({
    mutationFn: async (targetSchoolId: string) => {
      const { error } = await supabase
        .from('external_links')
        .update({ is_active: false })
        .eq('organization_id', organizationId!)
        .eq('school_id', targetSchoolId)
        .eq('is_active', true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['external-links'] });
      setShowKillSwitch(false);
      setKillSwitchSchool('');
      toast.success('Todos os links da escola foram desativados');
    },
    onError: () => toast.error('Erro ao desativar links'),
  });

  const getExpirationBadge = (link: any) => {
    if (!link.expires_at) return null;
    const expiresAt = new Date(link.expires_at);
    const now = new Date();
    if (expiresAt < now) {
      return <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Expirado</Badge>;
    }
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 7) {
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1"><Clock className="h-3 w-3" />{daysLeft}d restante{daysLeft > 1 ? 's' : ''}</Badge>;
    }
    return null;
  };

  const clearFilters = () => {
    setFilterSchool('');
    setFilterCourse('');
    setFilterClassGroup('');
    setFilterSubject('');
    setFilterDateStart('');
    setFilterDateEnd('');
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${PUBLISHED_URL}/acesso-externo/${token}`);
    toast.success('Link copiado!');
  };

  const contentTypeLabels: Record<string, string> = {
    planejamentos: 'Planejamentos',
    notas: 'Notas',
    faltas: 'Faltas',
    documentos_professor: 'Documentos do Professor',
  };

  const getScopeDescription = (scope: any) => {
    const parts: string[] = [];
    if (scope?.bimester_number) parts.push(`${scope.bimester_number}º Bim`);
    if (scope?.course_id) parts.push('Curso filtrado');
    if (scope?.class_group_id) parts.push('Turma filtrada');
    if (scope?.professor_id) parts.push('Professor filtrado');
    if (scope?.subject_id) parts.push('Disciplina filtrada');
    return parts.length > 0 ? parts.join(' • ') : 'Sem filtros';
  };

  const hasActiveFilters = filterSchool || filterCourse || filterClassGroup || filterSubject || filterDateStart || filterDateEnd;

  return (
    <div className="space-y-4">
      <FeatureGuideCard
        title="Como usar os Links Externos"
        icon={HelpCircle}
        steps={[
          { icon: Plus, title: 'Gerar link', description: 'Clique em "Gerar Link", selecione escola e tipo de conteúdo. Filtros opcionais refinam o escopo.', color: 'blue' },
          { icon: Share2, title: 'Compartilhar', description: 'O link é copiado automaticamente. Envie para quem precisa acessar o conteúdo.', color: 'green' },
          { icon: School, title: 'Uma escola por link', description: 'Cada link é vinculado a uma escola específica para garantir segurança.', color: 'purple' },
          { icon: FileCheck, title: 'Escopo controlado', description: 'Defina bimestre, curso, turma, professor e disciplina para limitar o conteúdo visível.', color: 'amber' },
          { icon: Clock, title: 'Validade configurável', description: 'Links expiram após o prazo definido. Desative manualmente se necessário.', color: 'red' },
          { icon: Filter, title: 'Filtrar a listagem', description: 'Use os filtros acima da tabela para localizar links específicos rapidamente.', color: 'cyan' },
        ]}
      />
      <PageHeader
        breadcrumbs={[{ label: 'Compartilhamento' }, { label: 'Links Externos' }]}
        title="Links Externos"
        description="Gerencie links de compartilhamento externo por escola"
        icon={Link2}
      />
      <div className="flex items-center justify-end flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {/* Kill Switch */}
          <AlertDialog open={showKillSwitch} onOpenChange={setShowKillSwitch}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <ShieldOff className="h-4 w-4 mr-2" /> Kill Switch
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revogar todos os links de uma escola</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação desativará imediatamente todos os links ativos da escola selecionada. Os links não poderão mais ser acessados externamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-3">
                <Label>Escola</Label>
                <Select value={killSwitchSchool} onValueChange={setKillSwitchSchool}>
                  <SelectTrigger><SelectValue placeholder="Selecione a escola" /></SelectTrigger>
                  <SelectContent>
                    {schools.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome} ({s.cidade})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => killSwitchSchool && killSwitchMutation.mutate(killSwitchSchool)}
                  disabled={!killSwitchSchool || killSwitchMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Desativar Todos
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Gerar Link</Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Gerar Link Externo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Escola *</Label>
                <Select value={schoolId} onValueChange={(v) => { setSchoolId(v); setClassGroupId(''); setProfessorId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione a escola" /></SelectTrigger>
                  <SelectContent>
                    {schools.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome} ({s.cidade})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Conteúdo *</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planejamentos">Planejamentos</SelectItem>
                    <SelectItem value="notas">Notas</SelectItem>
                    <SelectItem value="faltas">Faltas</SelectItem>
                    <SelectItem value="documentos_professor">Documentos do Professor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!isProfessorDocuments && <div>
                <Label>Bimestre (opcional)</Label>
                <Select value={bimester} onValueChange={setBimester}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1º Bimestre</SelectItem>
                    <SelectItem value="2">2º Bimestre</SelectItem>
                    <SelectItem value="3">3º Bimestre</SelectItem>
                    <SelectItem value="4">4º Bimestre</SelectItem>
                  </SelectContent>
                </Select>
              </div>}
              {!isProfessorDocuments && <div>
                <Label>Curso (opcional)</Label>
                <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSubjectId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    {formCourses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>}
              {schoolId && !isProfessorDocuments && (
                <div>
                  <Label>Turma (opcional)</Label>
                  <Select value={classGroupId} onValueChange={setClassGroupId}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      {formClassGroups.map((cg: any) => (
                        <SelectItem key={cg.id} value={cg.id}>{cg.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {schoolId && (
                <div>
                  <Label>Professor {isProfessorDocuments ? '*' : '(opcional)'}</Label>
                  <Select value={professorId} onValueChange={setProfessorId}>
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      {formProfessors.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {courseId && !isProfessorDocuments && (
                <div>
                  <Label>Disciplina (opcional)</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      {formSubjects.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Validade (dias)</Label>
                <Input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  min={1}
                  max={365}
                />
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="w-full"
              >
                {createMutation.isPending ? 'Gerando...' : 'Gerar e Copiar Link'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtros
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
                Limpar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <Label className="text-xs">Escola</Label>
              <Select value={filterSchool} onValueChange={(v) => { setFilterSchool(v); setFilterCourse(''); setFilterClassGroup(''); setFilterSubject(''); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Curso</Label>
              <Select value={filterCourse} onValueChange={(v) => { setFilterCourse(v); setFilterClassGroup(''); setFilterSubject(''); }} disabled={!filterSchool && allCourses.length === 0}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  {allCourses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Turma</Label>
              <Select value={filterClassGroup} onValueChange={setFilterClassGroup} disabled={!filterSchool}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  {filterClassGroups.map((cg: any) => (
                    <SelectItem key={cg.id} value={cg.id}>{cg.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Disciplina</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject} disabled={!filterCourse}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  {filterSubjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Data início</Label>
              <Input type="date" className="h-9" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Data fim</Label>
              <Input type="date" className="h-9" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Links Gerados
            {hasActiveFilters && <Badge variant="secondary" className="text-xs">{filteredLinks.length} de {links.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escola</TableHead>
                <TableHead>Conteúdo</TableHead>
                <TableHead>Filtros</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLinks.map((link: any) => {
                const isExpired = link.expires_at && new Date(link.expires_at) < new Date();
                const expirationBadge = getExpirationBadge(link);
                return (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">
                      {link.schools?.nome}
                      <span className="text-xs text-muted-foreground block">{link.schools?.cidade}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{contentTypeLabels[link.content_type] || link.content_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{getScopeDescription(link.scope_json)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isExpired ? (
                          <Badge variant="destructive" className="w-fit text-xs gap-1"><AlertTriangle className="h-3 w-3" />Expirado</Badge>
                        ) : link.is_active ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 w-fit">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit">Inativo</Badge>
                        )}
                        {!isExpired && expirationBadge && expirationBadge}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(link.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell>
                      {link.expires_at ? format(new Date(link.expires_at), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyLink(link.token)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => toggleMutation.mutate({ id: link.id, isActive: link.is_active })}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => window.open(`${PUBLISHED_URL}/acesso-externo/${link.token}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir link externo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação é irreversível. O link será removido e não poderá mais ser acessado.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(link.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLinks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {hasActiveFilters ? 'Nenhum link encontrado com os filtros aplicados' : 'Nenhum link externo gerado'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
