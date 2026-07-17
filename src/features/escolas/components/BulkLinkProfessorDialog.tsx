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
import { Loader2, Search, UsersRound, Users, BookOpen, Sparkles, Star } from 'lucide-react';

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

interface BulkLinkProfessorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolName: string;
  schoolCourses: SchoolCourseOption[];
  /** Para cada professor já vinculado, quais cursos já estão ativos */
  existingLinks: Record<string, Set<string>>; // profId -> set(courseIds)
  onLinked: () => void;
}

export function BulkLinkProfessorDialog({
  open,
  onOpenChange,
  schoolId,
  schoolName,
  schoolCourses,
  existingLinks,
  onLinked,
}: BulkLinkProfessorDialogProps) {
  const { toast } = useToast();
  const [professors, setProfessors] = useState<AvailableProfessor[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [orgId, setOrgId] = useState<string | null>(null);

  const [selectedProfIds, setSelectedProfIds] = useState<Set<string>>(new Set());
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [coordinatorCourseIds, setCoordinatorCourseIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedProfIds(new Set());
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
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar professores', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredProfessors = useMemo(
    () => professors.filter(p => {
      const q = search.toLowerCase();
      return p.full_name.toLowerCase().includes(q) || (p.registration_code || '').toLowerCase().includes(q);
    }),
    [professors, search]
  );

  const toggleProf = (id: string) => {
    setSelectedProfIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleCourse = (id: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setCoordinatorCourseIds(c => { const cn = new Set(c); cn.delete(id); return cn; });
      } else next.add(id);
      return next;
    });
  };
  const toggleCoord = (id: string) => {
    setCoordinatorCourseIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAllVisibleProfs = () => {
    setSelectedProfIds(prev => {
      const next = new Set(prev);
      filteredProfessors.forEach(p => next.add(p.id));
      return next;
    });
  };
  const clearProfs = () => setSelectedProfIds(new Set());
  const selectAllCourses = () => setSelectedCourseIds(new Set(schoolCourses.map(c => c.id)));
  const clearCourses = () => { setSelectedCourseIds(new Set()); setCoordinatorCourseIds(new Set()); };

  // Calcular vínculos novos a criar (excluindo duplicados)
  const newLinksCount = useMemo(() => {
    let total = 0;
    selectedProfIds.forEach(pid => {
      const existing = existingLinks[pid] || new Set<string>();
      selectedCourseIds.forEach(cid => {
        if (!existing.has(cid)) total++;
      });
    });
    return total;
  }, [selectedProfIds, selectedCourseIds, existingLinks]);

  const skippedCount = (selectedProfIds.size * selectedCourseIds.size) - newLinksCount;

  const handleSubmit = async () => {
    if (selectedProfIds.size === 0 || selectedCourseIds.size === 0 || !orgId) return;
    setSaving(true);
    try {
      const rows: any[] = [];
      selectedProfIds.forEach(pid => {
        const existing = existingLinks[pid] || new Set<string>();
        selectedCourseIds.forEach(cid => {
          if (existing.has(cid)) return;
          rows.push({
            organization_id: orgId,
            professor_id: pid,
            school_id: schoolId,
            course_id: cid,
            is_coordinator: coordinatorCourseIds.has(cid),
            status: 'ACTIVE' as const,
          });
        });
      });

      if (rows.length === 0) {
        toast({ title: 'Nada a fazer', description: 'Todos os vínculos já existem' });
        onOpenChange(false);
        return;
      }

      const { error } = await escolasApi.client.from('professor_school_courses').insert(rows);
      if (error && error.code !== '23505') throw error;

      toast({
        title: 'Vínculos criados',
        description: `${rows.length} vínculo${rows.length !== 1 ? 's' : ''} adicionado${rows.length !== 1 ? 's' : ''}`,
      });
      onLinked();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao vincular', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = selectedProfIds.size > 0 && selectedCourseIds.size > 0 && newLinksCount > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" /> Vincular professores em massa
          </DialogTitle>
          <DialogDescription>
            Selecione vários professores e vários cursos de <strong>{schoolName}</strong> de uma só vez.
            Um vínculo será criado para cada combinação.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 flex-1 min-h-0 overflow-hidden">
          {/* Professores */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                1. Professores {selectedProfIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1">{selectedProfIds.size}</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={selectAllVisibleProfs}>
                  Todos
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={clearProfs}>
                  Limpar
                </Button>
              </div>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar professor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <div className="flex-1 overflow-y-auto rounded-md border divide-y">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filteredProfessors.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum professor encontrado
                </div>
              ) : (
                filteredProfessors.map(p => {
                  const sel = selectedProfIds.has(p.id);
                  const existing = existingLinks[p.id]?.size || 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProf(p.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-start gap-2 ${sel ? 'bg-primary/5' : ''}`}
                    >
                      <Checkbox checked={sel} className="mt-0.5 pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{p.full_name}</span>
                          {existing > 0 && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{existing} já vinc.</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.registration_code && (
                            <span className="text-[11px] font-mono text-muted-foreground">{p.registration_code}</span>
                          )}
                          {p.specialization && (
                            <span className="text-[11px] text-muted-foreground truncate">{p.specialization}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Cursos */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                2. Cursos {selectedCourseIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1">{selectedCourseIds.size}</Badge>
                )}
              </div>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={selectAllCourses}>
                  Todos
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs" onClick={clearCourses}>
                  Limpar
                </Button>
              </div>
            </div>
            {schoolCourses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground rounded-md border border-dashed p-6 text-center gap-2">
                <BookOpen className="h-8 w-8 opacity-40" />
                Esta escola ainda não tem cursos vinculados.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto rounded-md border divide-y">
                {schoolCourses.map(course => {
                  const sel = selectedCourseIds.has(course.id);
                  const isCoord = coordinatorCourseIds.has(course.id);
                  return (
                    <div key={course.id} className={`px-3 py-2 ${sel ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id={`bulk-crs-${course.id}`}
                          checked={sel}
                          onCheckedChange={() => toggleCourse(course.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <Label htmlFor={`bulk-crs-${course.id}`} className="cursor-pointer block">
                            <div className="font-medium text-sm">{course.nome}</div>
                            <div className="text-[11px] font-mono text-muted-foreground">{course.codigo}</div>
                          </Label>
                          {sel && (
                            <button
                              type="button"
                              onClick={() => toggleCoord(course.id)}
                              className={`mt-1.5 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                                isCoord ? 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/25' : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              <Star className="h-3 w-3" fill={isCoord ? 'currentColor' : 'none'} />
                              {isCoord ? 'Coordenador' : 'Marcar como coordenador'}
                            </button>
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

        {/* Preview */}
        {(selectedProfIds.size > 0 || selectedCourseIds.size > 0) && (
          <div className="rounded-md bg-muted/40 border p-3 text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1">
              <span className="font-medium">{selectedProfIds.size}</span> professor{selectedProfIds.size !== 1 ? 'es' : ''} ×{' '}
              <span className="font-medium">{selectedCourseIds.size}</span> curso{selectedCourseIds.size !== 1 ? 's' : ''} ={' '}
              <span className="font-semibold text-primary">{newLinksCount}</span> novo{newLinksCount !== 1 ? 's' : ''} vínculo{newLinksCount !== 1 ? 's' : ''}
              {skippedCount > 0 && (
                <span className="text-muted-foreground text-xs ml-2">({skippedCount} já existem, serão ignorados)</span>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UsersRound className="mr-2 h-4 w-4" />}
            Criar {newLinksCount > 0 ? `${newLinksCount} vínculo${newLinksCount !== 1 ? 's' : ''}` : 'vínculos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
