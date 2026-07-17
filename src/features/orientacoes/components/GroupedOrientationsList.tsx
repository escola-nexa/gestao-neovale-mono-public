import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Users, BookOpen, AlertCircle, Trash2 } from 'lucide-react';
import { ORIENTATION_TYPE_LABELS, ORIENTATION_STATUS_LABELS, type Orientation } from '@/types/academic';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paginator } from '@/components/common/Paginator';

interface GroupedOrientationsListProps {
  orientations: Orientation[];
  getProfessorName: (id: string) => string;
  getSchoolName: (id?: string) => string;
  getOrientationDate: (o: Orientation) => Date;
  getOrientationTime: (o: Orientation) => string;
  getStatusBadgeClasses: (status: string) => string;
  isCoordinator: boolean;
  renderActions: (o: Orientation, compact?: boolean) => React.ReactNode;
  handleViewDetail: (o: Orientation) => void;
  defaultExpanded?: boolean;
  showStatus?: boolean;
  isOverdueTab?: boolean;
  isAdmin?: boolean;
  onDeleteGroup?: (orientations: Orientation[], label: string) => void;
}

export function GroupedOrientationsList({
  orientations, getProfessorName, getSchoolName,
  getOrientationDate, getOrientationTime, getStatusBadgeClasses,
  renderActions, handleViewDetail, defaultExpanded = false, showStatus = true, isOverdueTab = false,
  isAdmin = false, onDeleteGroup,
}: GroupedOrientationsListProps) {
  const deletable = (list: Orientation[]) => list.filter(o => o.status !== 'ASSINADO_PROFESSOR');
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Orientation[]>> = {};
    orientations.forEach(o => {
      const prof = o.professor_id;
      const school = o.school_id || '_none';
      if (!map[prof]) map[prof] = {};
      if (!map[prof][school]) map[prof][school] = [];
      map[prof][school].push(o);
    });
    Object.values(map).forEach(schools =>
      Object.values(schools).forEach(arr =>
        arr.sort((a, b) => getOrientationDate(a).getTime() - getOrientationDate(b).getTime())
      )
    );
    return map;
  }, [orientations]);

  const professorIds = useMemo(() =>
    Object.keys(grouped).sort((a, b) => getProfessorName(a).localeCompare(getProfessorName(b))),
    [grouped]
  );

  const allKeys = useMemo(() => {
    const keys = { profs: new Set<string>(), schools: new Set<string>() };
    professorIds.forEach(profId => {
      keys.profs.add(profId);
      Object.keys(grouped[profId]).forEach(schoolId => {
        keys.schools.add(`${profId}-${schoolId}`);
      });
    });
    return keys;
  }, [grouped, professorIds]);

  const [expandedProfessors, setExpandedProfessors] = useState<Set<string>>(
    defaultExpanded ? new Set(allKeys.profs) : new Set()
  );
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(
    defaultExpanded ? new Set(allKeys.schools) : new Set()
  );
  const [allExpanded, setAllExpanded] = useState(defaultExpanded);

  // Paginação por professor (grupo)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  useEffect(() => { setPage(1); }, [professorIds.length]);
  const totalProfs = professorIds.length;
  const paginatedProfessorIds = useMemo(
    () => professorIds.slice((page - 1) * pageSize, page * pageSize),
    [professorIds, page, pageSize],
  );

  const toggle = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setFn(next);
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedProfessors(new Set());
      setExpandedSchools(new Set());
    } else {
      setExpandedProfessors(allKeys.profs);
      setExpandedSchools(allKeys.schools);
    }
    setAllExpanded(!allExpanded);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{orientations.length} orientação(ões)</span>
        <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs gap-1.5">
          {allExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
        </Button>
      </div>

      {paginatedProfessorIds.map(profId => {
        const profName = getProfessorName(profId);
        const isExpanded = expandedProfessors.has(profId);
        const schoolMap = grouped[profId];
        const totalInProf = Object.values(schoolMap).reduce((sum, arr) => sum + arr.length, 0);

        return (
          <Card key={profId} className={`overflow-hidden shadow-sm ${isOverdueTab ? 'border-orange-200' : ''}`}>
            <div
              role="button"
              tabIndex={0}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-primary/5 hover:bg-primary/10 transition-colors text-left cursor-pointer"
              onClick={() => toggle(expandedProfessors, setExpandedProfessors, profId)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(expandedProfessors, setExpandedProfessors, profId); }}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">{profName}</span>
                <Badge variant="outline" className="text-[10px] px-1.5">{totalInProf}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && onDeleteGroup && deletable(Object.values(schoolMap).flat()).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      const list = deletable(Object.values(schoolMap).flat());
                      onDeleteGroup(list, `professor ${profName}`);
                    }}
                    title="Apagar todas as orientações deste professor (exceto assinadas)"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Apagar todas</span>
                  </Button>
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>

            {isExpanded && (
              <div>
                {Object.keys(schoolMap).sort((a, b) => getSchoolName(a).localeCompare(getSchoolName(b))).map(schoolId => {
                  const schoolKey = `${profId}-${schoolId}`;
                  const schoolExpanded = expandedSchools.has(schoolKey);
                  const schoolOrientations = schoolMap[schoolId];

                  return (
                    <div key={schoolKey} className="border-t">
                      <div
                        role="button"
                        tabIndex={0}
                        className="w-full flex items-center justify-between pl-8 pr-4 py-2 bg-muted/20 hover:bg-muted/40 transition-colors text-left cursor-pointer"
                        onClick={() => toggle(expandedSchools, setExpandedSchools, schoolKey)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggle(expandedSchools, setExpandedSchools, schoolKey); }}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium">{getSchoolName(schoolId)}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5">{schoolOrientations.length}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {isAdmin && onDeleteGroup && deletable(schoolOrientations).length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteGroup(deletable(schoolOrientations), `escola ${getSchoolName(schoolId)} (prof. ${profName})`);
                              }}
                              title="Apagar todas desta escola (exceto assinadas)"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span className="text-[11px]">Apagar</span>
                            </Button>
                          )}
                          {schoolExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                      </div>

                      {schoolExpanded && (
                        <div className="overflow-x-auto border-t">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/10">
                                <TableHead className="text-xs font-semibold pl-10">Tipo</TableHead>
                                <TableHead className="text-xs font-semibold">Data / Hora</TableHead>
                                {showStatus && <TableHead className="text-xs font-semibold">Status</TableHead>}
                                <TableHead className="text-xs font-semibold text-center">Evidências</TableHead>
                                <TableHead className="text-xs font-semibold text-right pr-4">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schoolOrientations.map(orientation => {
                                const isTodayRow = isToday(getOrientationDate(orientation));
                                const isOverdue = isOverdueTab || (orientation.status === 'AGENDADO' && isBefore(getOrientationDate(orientation), startOfDay(new Date())));
                                return (
                                  <TableRow
                                    key={orientation.id}
                                    className={`cursor-pointer ${isOverdue ? 'bg-orange-50 hover:bg-orange-100/70 border-l-4 border-l-orange-500' : isTodayRow ? 'bg-violet-50 hover:bg-violet-100/70 border-l-4 border-l-violet-500' : 'hover:bg-muted/30'}`}
                                    onClick={() => handleViewDetail(orientation)}
                                  >
                                    <TableCell className="pl-10 text-sm">
                                      <div className="flex items-center gap-1.5">
                                        {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
                                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                                          {ORIENTATION_TYPE_LABELS[orientation.orientation_type as keyof typeof ORIENTATION_TYPE_LABELS] || orientation.orientation_type}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${isOverdue ? 'text-orange-700' : isTodayRow ? 'text-violet-700' : ''}`}>
                                          {format(getOrientationDate(orientation), 'dd/MM/yyyy', { locale: ptBR })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">{getOrientationTime(orientation)}</span>
                                      </div>
                                    </TableCell>
                                    {showStatus && (
                                      <TableCell>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusBadgeClasses(orientation.status)}`}>
                                          {ORIENTATION_STATUS_LABELS[orientation.status as keyof typeof ORIENTATION_STATUS_LABELS] || orientation.status}
                                        </span>
                                      </TableCell>
                                    )}
                                    <TableCell className="text-center">
                                      {orientation.evidence_urls && orientation.evidence_urls.length > 0 ? (
                                        <Badge variant="secondary" className="text-xs">{orientation.evidence_urls.length}</Badge>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="pr-4">
                                      {renderActions(orientation, true)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
      {totalProfs > pageSize && (
        <Paginator
          page={page}
          pageSize={pageSize}
          total={totalProfs}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="professores"
        />
      )}
    </div>
  );
}
