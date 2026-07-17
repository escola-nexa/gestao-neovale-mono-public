import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, Pencil, Trash2, Lock, User, School, BookOpen, GraduationCap, ChevronDown, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { PrePlanningData, CourseData, SubjectData, SchoolData, ClassGroupData } from '@/services/supabaseApi';
import { useAuth } from '@/contexts/AuthContext';
import { Paginator } from '@/components/common/Paginator';

interface PrePlanningListProps {
  items: PrePlanningData[];
  courses: CourseData[];
  subjects: SubjectData[];
  schools: SchoolData[];
  classGroups: ClassGroupData[];
  professors: Record<string, string>;
  onView: (pp: PrePlanningData) => void;
  onEdit: (pp: PrePlanningData) => void;
  onDelete: (pp: PrePlanningData) => void;
  onBulkDelete?: (ids: string[]) => void;
  emptyMessage: string;
  isProfessor?: boolean;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  GERADO: { label: 'Gerado', variant: 'outline', className: 'border-blue-300 text-blue-700 bg-blue-50' },
  DISPONIVEL: { label: 'Disponível', variant: 'outline', className: 'border-emerald-300 text-emerald-700 bg-emerald-50' },
  EM_EDICAO: { label: 'Em Edição', variant: 'secondary', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  ENVIADO: { label: 'Enviado', variant: 'default', className: 'bg-primary text-primary-foreground' },
  DEVOLVIDO: { label: 'Devolvido', variant: 'destructive' },
  ASSINADO: { label: 'Assinado', variant: 'default', className: 'bg-emerald-600 text-white' },
};

interface GroupItem {
  groupKey: string;
  groupLabel: string;
  subLabel?: string;
  items: PrePlanningData[];
  statusSummary: Record<string, number>;
}

export function PrePlanningList({
  items, courses, subjects, schools, classGroups, professors,
  onView, onEdit, onDelete, onBulkDelete, emptyMessage, isProfessor = false,
}: PrePlanningListProps) {
  const { user } = useAuth();
  const isAdmin = user?.perfil === 'admin';
  const getCourseName = (id: string | null) => id ? courses.find(c => c.id === id)?.nome || '-' : '-';
  const getSubjectName = (id: string | null) => {
    if (!id) return '-';
    const s = subjects.find(s => s.id === id);
    if (!s) return '-';
    return s.nome_boletim ? `${s.nome} (${s.nome_boletim})` : s.nome;
  };
  const getSchoolName = (id: string | null) => schools.find(s => s.id === id)?.nome || '-';
  const getClassGroupName = (id: string | null) => classGroups.find(cg => cg.id === id)?.nome || '-';
  const canEdit = (pp: PrePlanningData) => pp.status === 'GERADO';
  const canDelete = (pp: PrePlanningData) => pp.status === 'GERADO' || isAdmin;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, variant: 'outline' as const };
    return (
      <Badge variant={config.variant} className={`text-xs font-medium ${config.className || ''}`}>
        {config.label}
      </Badge>
    );
  };

  // Group items: by professor for coordinator, by subject for professor
  const groups = useMemo((): GroupItem[] => {
    const map = new Map<string, GroupItem>();

    const sortedItems = [...items].sort((a, b) =>
      (a.class_date || a.week_start_date || '').localeCompare(b.class_date || b.week_start_date || '')
    );

    sortedItems.forEach((pp) => {
      let groupKey: string;
      let groupLabel: string;
      let subLabel: string | undefined;

      if (isProfessor) {
        // Group by subject for professor view
        groupKey = `${pp.subject_id}_${pp.school_id}_${pp.class_group_id}`;
        groupLabel = getSubjectName(pp.subject_id);
        subLabel = `${getSchoolName(pp.school_id)} • ${getClassGroupName(pp.class_group_id)}`;
      } else {
        // Group by professor for coordinator view
        groupKey = pp.professor_id || '_unlinked';
        groupLabel = pp.professor_id ? (professors[pp.professor_id] || 'Professor') : 'Não vinculado';
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, { groupKey, groupLabel, subLabel, items: [], statusSummary: {} });
      }

      const group = map.get(groupKey)!;
      group.items.push(pp);
      group.statusSummary[pp.status] = (group.statusSummary[pp.status] || 0) + 1;
    });

    return Array.from(map.values()).sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
  }, [items, professors, isProfessor]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    groups.forEach(g => { initial[g.groupKey] = false; });
    return initial;
  });

  // Paginação ao nível de grupo (20/página padrão)
  const [groupPage, setGroupPage] = useState(1);
  const [groupPageSize, setGroupPageSize] = useState(20);
  useEffect(() => { setGroupPage(1); }, [items.length]);
  const totalGroups = groups.length;
  const paginatedGroups = useMemo(
    () => groups.slice((groupPage - 1) * groupPageSize, groupPage * groupPageSize),
    [groups, groupPage, groupPageSize],
  );

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleAll = () => {
    const allOpen = groups.every(g => openGroups[g.groupKey] !== false);
    const newState: Record<string, boolean> = {};
    groups.forEach(g => { newState[g.groupKey] = !allOpen; });
    setOpenGroups(newState);
  };

  // Bulk selection helpers
  const deletableIds = useMemo(() => items.filter(canDelete).map(pp => pp.id), [items]);

  const toggleSelectItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === deletableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deletableIds));
    }
  };

  const toggleSelectGroup = (group: GroupItem) => {
    const groupDeletable = group.items.filter(canDelete).map(pp => pp.id);
    const allSelected = groupDeletable.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      groupDeletable.forEach(id => { allSelected ? next.delete(id) : next.add(id); });
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const showBulkActions = !isProfessor && onBulkDelete && selectedIds.size > 0;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Top bar: toggle all + bulk actions */}
        <div className="flex items-center justify-between bg-card rounded-lg border px-3 py-2">
          <div className="flex items-center gap-2">
            {groups.length > 1 && (
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs text-primary font-medium h-7 px-2 hover:bg-primary/5">
                {groups.every(g => openGroups[g.groupKey] !== false) ? 'Recolher todos' : 'Expandir todos'}
              </Button>
            )}
            <span className="text-xs text-muted-foreground">{groups.length} grupo{groups.length !== 1 ? 's' : ''} • {items.length} item{items.length !== 1 ? 'ns' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            {!isProfessor && onBulkDelete && deletableIds.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleSelectAll} className="text-xs h-7 px-2.5">
                {selectedIds.size === deletableIds.length ? 'Desmarcar todos' : `Selecionar todos (${deletableIds.length})`}
              </Button>
            )}
            {showBulkActions && (
              <Button
                variant="destructive"
                size="sm"
                className="h-7 gap-1.5 shadow-sm"
                onClick={() => onBulkDelete(Array.from(selectedIds))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>

        {paginatedGroups.map((group) => {
          const isOpen = openGroups[group.groupKey] ?? false;
          const groupDeletable = group.items.filter(canDelete);
          const groupAllSelected = groupDeletable.length > 0 && groupDeletable.every(pp => selectedIds.has(pp.id));

          return (
            <Collapsible key={group.groupKey} open={isOpen} onOpenChange={() => toggleGroup(group.groupKey)}>
              {/* Group Header */}
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-4 py-3.5 rounded-t-lg border bg-gradient-to-r from-muted/40 to-muted/70 hover:from-muted/60 hover:to-muted/90 cursor-pointer transition-all duration-200">
                  <div className="flex items-center gap-3">
                    {!isProfessor && onBulkDelete && groupDeletable.length > 0 && (
                      <Checkbox
                        checked={groupAllSelected}
                        onCheckedChange={(e) => { e && e; toggleSelectGroup(group); }}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-1"
                      />
                    )}
                    <div className={`flex items-center justify-center h-5 w-5 rounded transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className={`flex items-center justify-center h-10 w-10 rounded-xl shrink-0 shadow-sm ${isProfessor ? 'bg-blue-100 text-blue-700' : 'bg-primary/10 text-primary'}`}>
                      {isProfessor ? <BookOpen className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{group.groupLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.subLabel || `${group.items.length} pré-planejamento${group.items.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {isProfessor && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-medium">{group.items.length} aula{group.items.length !== 1 ? 's' : ''}</Badge>
                    )}
                    {Object.entries(group.statusSummary).map(([status, count]) => {
                      const config = statusConfig[status] || { label: status, variant: 'outline' as const };
                      return (
                        <Badge key={status} variant={config.variant} className={`text-[10px] px-2 py-0.5 font-medium ${config.className || ''}`}>
                          {count} {config.label}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="rounded-b-lg border border-t-0 bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        {!isProfessor && onBulkDelete && <TableHead className="w-10"></TableHead>}
                        {isProfessor ? (
                          <>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Data da Aula</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                          </>
                        ) : (
                          <>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Disciplina</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider hidden md:table-cell">Escola / Turma</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">Data da Aula</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                            <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Ações</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((pp) => {
                        const editable = canEdit(pp);
                        const deletable = canDelete(pp);
                        const isSelected = selectedIds.has(pp.id);

                        if (isProfessor) {
                          // Professor view: simplified, focused on date + actions
                          return (
                            <TableRow key={pp.id} className={isSelected ? 'bg-destructive/5' : ''}>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  {pp.class_date ? (
                                    <>
                                      <p className="font-medium text-sm flex items-center gap-1.5">
                                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                        {new Date(pp.class_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                      </p>
                                       <p className="text-xs text-muted-foreground ml-5 flex items-center gap-1">
                                         {(pp as any).start_time && (pp as any).end_time ? (
                                           <><Clock className="h-3 w-3" />{(pp as any).start_time?.slice(0, 5)} - {(pp as any).end_time?.slice(0, 5)} • </>
                                         ) : null}
                                         Semana {pp.week_number || '-'} • {pp.bimester_number}º Bimestre
                                       </p>
                                    </>
                                  ) : (
                                    <p className="text-sm">Semana {pp.week_number || '-'} • {pp.bimester_number}º Bim.</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(pp.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(pp)}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Visualizar</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-8" onClick={() => onEdit(pp)}>
                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                        Usar
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Usar como base para meu planejamento</TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        }

                        // Coordinator view
                        return (
                          <TableRow key={pp.id} className={isSelected ? 'bg-destructive/5' : ''}>
                            {onBulkDelete && (
                              <TableCell className="w-10 pr-0">
                                {deletable && (
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelectItem(pp.id)}
                                  />
                                )}
                              </TableCell>
                            )}
                            <TableCell>
                              <div>
                                <p className="text-sm font-medium truncate max-w-[220px]">{getSubjectName(pp.subject_id)}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[220px]">{getCourseName(pp.course_id)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm flex items-center gap-1.5">
                                  <School className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate max-w-[150px]">{getSchoolName(pp.school_id)}</span>
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <GraduationCap className="h-3 w-3" />
                                  <span className="truncate max-w-[150px]">{getClassGroupName(pp.class_group_id)}</span>
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="text-sm">
                                {pp.class_date ? (
                                  <div className="flex flex-col gap-0.5">
                                    <p className="font-medium flex items-center gap-1.5">
                                      <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                      {new Date(pp.class_date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                                    </p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                      {(pp as any).start_time && (pp as any).end_time ? (
                                        <><Clock className="h-3 w-3" />{(pp as any).start_time?.slice(0, 5)} - {(pp as any).end_time?.slice(0, 5)} • </>
                                      ) : null}
                                      Sem. {pp.week_number || '-'} • {pp.bimester_number}º Bim.
                                    </p>
                                  </div>
                                ) : pp.week_number ? (
                                  <div>
                                    <p className="font-medium">Semana {pp.week_number}</p>
                                    <p className="text-xs text-muted-foreground">{pp.bimester_number}º Bim.</p>
                                  </div>
                                ) : (
                                  <span>{pp.bimester_number ? `${pp.bimester_number}º Bimestre` : pp.reference_year}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(pp.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(pp)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Visualizar</TooltipContent>
                                </Tooltip>
                                {editable ? (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(pp)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Editar</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(pp)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Excluir</TooltipContent>
                                    </Tooltip>
                                  </>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                        <Lock className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Em edição pelo professor</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        {totalGroups > groupPageSize && (
          <Paginator
            page={groupPage}
            pageSize={groupPageSize}
            total={totalGroups}
            onPageChange={setGroupPage}
            onPageSizeChange={setGroupPageSize}
            itemLabel="grupos"
          />
        )}
      </div>
    </TooltipProvider>
  );
}
