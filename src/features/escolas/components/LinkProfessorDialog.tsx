import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { escolasApi } from '@/features/escolas/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, UserPlus, Users, BookOpen } from 'lucide-react';

interface AvailableProfessor {
  id: string;
  full_name: string;
  registration_code: string | null;
  specialization: string | null;
}

interface SchoolCourseOption {
  id: string;
  nome: string;
  codigo: string;
}

interface LinkProfessorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolName: string;
  /** Cursos vinculados à escola (para escolha em massa) */
  schoolCourses: SchoolCourseOption[];
  /** IDs de professores já vinculados — serão filtrados da lista */
  alreadyLinkedProfessorIds: string[];
  onLinked: () => void;
}

export function LinkProfessorDialog({
  open,
  onOpenChange,
  schoolId,
  schoolName,
  schoolCourses,
  alreadyLinkedProfessorIds,
  onLinked,
}: LinkProfessorDialogProps) {
  const { toast } = useToast();
  const [professors, setProfessors] = useState<AvailableProfessor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [coordinatorCourseIds, setCoordinatorCourseIds] = useState<Set<string>>(new Set());
  const [orgId, setOrgId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedProfId(null);
    setSelectedCourseIds(new Set());
    setCoordinatorCourseIds(new Set());
    loadData();
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await escolasApi.client.auth.getUser();
      if (!user) throw new Error('Sem sessão');
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (roleRow?.organization_id) setOrgId(roleRow.organization_id);

      const { data, error } = await supabase
        .from('professors')
        .select('id, full_name, registration_code, specialization, status')
        .is('deleted_at', null)
        .eq('status', 'ACTIVE')
        .order('full_name');
      if (error) throw error;
      setProfessors((data || []) as AvailableProfessor[]);
    } catch (e) {
      toast({ title: 'Erro', description: 'Falha ao carregar professores', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const linkedSet = useMemo(() => new Set(alreadyLinkedProfessorIds), [alreadyLinkedProfessorIds]);
  const filteredProfessors = useMemo(
    () => professors
      .filter(p => !linkedSet.has(p.id))
      .filter(p => {
        const q = search.toLowerCase();
        return p.full_name.toLowerCase().includes(q) || (p.registration_code || '').toLowerCase().includes(q);
      }),
    [professors, linkedSet, search]
  );

  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setCoordinatorCourseIds(c => {
          const cn = new Set(c); cn.delete(id); return cn;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCoordinator = (id: string) => {
    setCoordinatorCourseIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedProfId || selectedCourseIds.size === 0 || !orgId) return;
    setSaving(true);
    try {
      const rows = Array.from(selectedCourseIds).map(courseId => ({
        organization_id: orgId,
        professor_id: selectedProfId,
        school_id: schoolId,
        course_id: courseId,
        is_coordinator: coordinatorCourseIds.has(courseId),
        status: 'ACTIVE' as const,
      }));
      const { error } = await escolasApi.client.from('professor_school_courses').insert(rows);
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Vínculo duplicado', description: 'Um ou mais cursos já estavam vinculados a este professor', variant: 'destructive' });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'Sucesso',
          description: `Professor vinculado a ${rows.length} curso${rows.length !== 1 ? 's' : ''}`,
        });
        onLinked();
        onOpenChange(false);
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao vincular', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedProfessor = professors.find(p => p.id === selectedProfId);
  const canSubmit = !!selectedProfId && selectedCourseIds.size > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Vincular professor
          </DialogTitle>
          <DialogDescription>
            Selecione um professor e os cursos que ele leciona em <strong>{schoolName}</strong>.
            {' '}Você pode marcar vários cursos de uma só vez.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
          {/* Professores */}
          <div className="flex flex-col min-h-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              1. Professor
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou matrícula..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex-1 overflow-y-auto rounded-md border divide-y">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredProfessors.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {professors.length - linkedSet.size === 0
                    ? 'Todos os professores ativos já estão vinculados'
                    : 'Nenhum professor encontrado'}
                </div>
              ) : (
                filteredProfessors.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProfId(p.id)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-muted/60 transition-colors ${selectedProfId === p.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                  >
                    <div className="font-medium text-sm">{p.full_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.registration_code && (
                        <span className="text-[11px] font-mono text-muted-foreground">{p.registration_code}</span>
                      )}
                      {p.specialization && (
                        <span className="text-[11px] text-muted-foreground truncate">{p.specialization}</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Cursos */}
          <div className="flex flex-col min-h-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              2. Cursos {selectedCourseIds.size > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedCourseIds.size} selecionado{selectedCourseIds.size !== 1 ? 's' : ''}</Badge>
              )}
            </div>
            {!selectedProfessor ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground rounded-md border border-dashed p-6 text-center">
                Selecione um professor para escolher os cursos
              </div>
            ) : schoolCourses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground rounded-md border border-dashed p-6 text-center gap-2">
                <BookOpen className="h-8 w-8 opacity-40" />
                Esta escola ainda não tem cursos vinculados.
                <span className="text-xs">Vincule cursos primeiro para poder atribuir professores.</span>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto rounded-md border divide-y">
                {schoolCourses.map(course => {
                  const isSel = selectedCourseIds.has(course.id);
                  return (
                    <div key={course.id} className={`px-3 py-2.5 ${isSel ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id={`crs-${course.id}`}
                          checked={isSel}
                          onCheckedChange={() => toggleCourse(course.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`crs-${course.id}`} className="cursor-pointer block">
                            <div className="font-medium text-sm">{course.nome}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{course.codigo}</div>
                          </Label>
                          {isSel && (
                            <div className="flex items-center gap-2 mt-1.5 ml-0">
                              <Checkbox
                                id={`coord-${course.id}`}
                                checked={coordinatorCourseIds.has(course.id)}
                                onCheckedChange={() => toggleCoordinator(course.id)}
                              />
                              <Label htmlFor={`coord-${course.id}`} className="text-xs cursor-pointer text-muted-foreground">
                                Coordenador deste curso
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Vincular {selectedCourseIds.size > 0 ? `(${selectedCourseIds.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
