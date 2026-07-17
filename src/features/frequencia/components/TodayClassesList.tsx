import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ClipboardList, BookOpen, ArrowRight, CheckCircle2, Clock,
  CalendarOff, UserX, Layers, AlertCircle, School as SchoolIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { TodayClassEntry } from '../hooks/useTodayClasses';
import { SubjectNameWithAnp } from '@/components/SubjectNameWithAnp';
import { useAnpSubjectMap } from '@/hooks/useAnpSubjectMap';

interface TodayClassesListProps {
  classes: TodayClassEntry[];
  isLoading: boolean;
}

function formatTime(t: string) {
  return t?.slice(0, 5) || '';
}

export function TodayClassesList({ classes, isLoading }: TodayClassesListProps) {
  const navigate = useNavigate();
  const { data: anpMap } = useAnpSubjectMap();
  const [openSlot, setOpenSlot] = useState<TodayClassEntry | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/20">
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
            <CalendarOff className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Sem aulas hoje</p>
          <p className="text-sm text-muted-foreground">Você não possui aulas agendadas para hoje.</p>
        </CardContent>
      </Card>
    );
  }

  const totalDisciplines = classes.reduce((acc, c) => acc + c.totalCount, 0);
  const totalDone = classes.reduce((acc, c) => acc + c.doneCount, 0);

  const handleOpenSlot = (c: TodayClassEntry) => {
    // Atalho UX: se tiver apenas 1 disciplina, vai direto pra chamada.
    if (c.subjects.length === 1) {
      navigate(`/frequencia/registro/${c.classGroupId}/${c.subjects[0].subjectId}`);
      return;
    }
    setOpenSlot(c);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalDone} de {totalDisciplines} chamada{totalDisciplines !== 1 ? 's' : ''} realizada{totalDone !== 1 ? 's' : ''}
        </p>
        {totalDone === totalDisciplines && totalDisciplines > 0 && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Todas feitas!
          </Badge>
        )}
      </div>
      {(() => {
        // Agrupa por escola preservando a ordem de chegada
        const groups = new Map<string, TodayClassEntry[]>();
        for (const c of classes) {
          const key = c.schoolName || 'Sem escola';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(c);
        }
        return (
          <div className="space-y-5">
            {Array.from(groups.entries()).map(([schoolName, items]) => {
              const total = items.reduce((a, c) => a + c.totalCount, 0);
              const done = items.reduce((a, c) => a + c.doneCount, 0);
              const pending = total - done;
              const allDone = pending === 0 && total > 0;

              return (
                <section
                  key={schoolName}
                  className="rounded-xl border border-[#1B1E2C]/10 overflow-hidden bg-card shadow-sm"
                >
                  {/* Header Neovale: dark blue + yellow accent */}
                  <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#1B1E2C] text-white">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-[#FFDA45] flex items-center justify-center">
                        <SchoolIcon className="h-5 w-5 text-[#1B1E2C]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight break-words">
                          {schoolName}
                        </p>
                        <p className="text-[11px] text-white/70 leading-tight">
                          {items.length} aula{items.length !== 1 ? 's' : ''} • {total} disciplina{total !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={`shrink-0 border-0 font-semibold ${
                        allDone
                          ? 'bg-emerald-500 text-white hover:bg-emerald-500'
                          : 'bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]'
                      }`}
                    >
                      {allDone ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Completa</>
                      ) : (
                        `${done}/${total}`
                      )}
                    </Badge>
                  </header>

                  <div className="grid gap-2 p-3 bg-muted/30">
                    {items.map((c) => {
                      const isShared = c.subjects.length > 1;
                      const cAllDone = c.doneCount === c.totalCount;
                      const pendingCount = c.totalCount - c.doneCount;

                      return (
                        <Card
                          key={c.slotKey}
                          className={`group transition-all duration-200 ${
                            cAllDone
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : 'hover:shadow-md hover:border-primary/40'
                          }`}
                        >
                          <CardContent className="py-3.5 px-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                  cAllDone ? 'bg-emerald-100' : 'bg-primary/10'
                                }`}>
                                  {cAllDone
                                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                    : <BookOpen className="h-5 w-5 text-primary" />
                                  }
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-semibold text-foreground break-words">{c.classGroupName}</p>
                                    {isShared && (
                                      <Badge
                                        variant="outline"
                                        className="h-5 gap-1 border-sky-300 bg-sky-50 px-1.5 text-[10px] font-semibold text-sky-700"
                                      >
                                        <Layers className="h-3 w-3" />
                                        UC · {c.subjects.length} disciplinas
                                      </Badge>
                                    )}
                                    <Badge
                                      variant={cAllDone ? 'default' : 'outline'}
                                      className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${
                                        cAllDone
                                          ? 'bg-emerald-600 hover:bg-emerald-600 text-white border-0'
                                          : 'text-amber-600 border-amber-300 bg-amber-50'
                                      }`}
                                    >
                                      {cAllDone ? 'Feita' : `${c.doneCount}/${c.totalCount}`}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    <Clock className="h-3 w-3 inline mr-1" />
                                    {formatTime(c.startTime)}–{formatTime(c.endTime)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant={cAllDone ? 'outline' : 'default'}
                                className="shrink-0 gap-1.5 relative"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleOpenSlot(c);
                                }}
                              >
                                <ClipboardList className="h-4 w-4" />
                                <span className="hidden sm:inline">{cAllDone ? 'Revisar' : 'Chamada'}</span>
                                {!cAllDone && pendingCount > 0 && (
                                  <Badge
                                    className="h-5 min-w-[20px] px-1.5 bg-destructive text-destructive-foreground border-0 text-[10px] font-bold"
                                  >
                                    {pendingCount}
                                  </Badge>
                                )}
                                <ArrowRight className="h-3.5 w-3.5 hidden sm:inline" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        );
      })()}

      {/* Modal de disciplinas do slot selecionado */}
      <Dialog open={!!openSlot} onOpenChange={(o) => !o && setOpenSlot(null)}>
        <DialogContent className="max-w-md">
          {openSlot && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  {openSlot.classGroupName}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(openSlot.startTime)}–{formatTime(openSlot.endTime)}
                  </span>
                  <span>• {openSlot.schoolName}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Selecione uma disciplina para lançar a chamada
                </span>
                <Badge
                  variant="outline"
                  className={
                    openSlot.doneCount === openSlot.totalCount
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-amber-300 bg-amber-50 text-amber-700'
                  }
                >
                  {openSlot.doneCount}/{openSlot.totalCount} feitas
                </Badge>
              </div>

              <div className="flex flex-col gap-1.5">
                {openSlot.subjects.map((s) => (
                  <button
                    key={s.subjectId}
                    type="button"
                    onClick={() => {
                      navigate(`/frequencia/registro/${openSlot.classGroupId}/${s.subjectId}`);
                      setOpenSlot(null);
                    }}
                    className={`group/sub w-full text-left flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      s.attendanceDone
                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-muted/40 hover:bg-primary/10 text-foreground border border-transparent hover:border-primary/30'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {s.attendanceDone
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        : <ClipboardList className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                      <SubjectNameWithAnp
                        name={s.subjectName}
                        isAnp={anpMap?.bySubject.has(s.subjectId)}
                        compact
                        className="truncate"
                      />
                    </span>
                    <span className="flex items-center gap-1.5 shrink-0">
                      {s.attendanceDone && s.attendanceSummary && s.attendanceSummary.absences > 0 && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-red-300 text-red-600 bg-red-50 gap-0.5">
                          <UserX className="h-2.5 w-2.5" />
                          {s.attendanceSummary.absences}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-5 ${
                          s.attendanceDone
                            ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                            : 'border-amber-300 text-amber-700 bg-amber-50'
                        }`}
                      >
                        {s.attendanceDone ? 'Feita' : 'Pendente'}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 opacity-40 group-hover/sub:opacity-100 transition-opacity" />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
