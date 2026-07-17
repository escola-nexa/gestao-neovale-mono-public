import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Route, GraduationCap, BookOpen, Play, Sparkles, FolderOpen, Library, Search, Plus, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { HeroBanner } from './HeroBanner';
import { ContentRow } from './ContentRow';
import { HierarchyCard } from './HierarchyCard';
import { ContentTile } from './ContentTile';
import { LooseContentBauhausTile } from './LooseContentBauhausTile';
import { BreadcrumbWithSiblings, type CrumbNode } from './BreadcrumbWithSiblings';
import { QuickSearchPalette } from './QuickSearchPalette';
import { ContentViewerDialog } from '../ContentViewerDialog';
import { useRecentContents } from '../../hooks/useRecentContents';
import type { LibraryContentWithRefs } from '../../types';

interface Props {
  tracks: { id: string; name: string }[];
  courses: { id: string; name: string; formative_track_id: string | null }[];
  subjects: { id: string; name: string; course_id: string }[];
  contents: LibraryContentWithRefs[];
  canEditItem: (item: LibraryContentWithRefs) => boolean;
  onClassicView: () => void;
  onNewContent: () => void;
  onManage?: (items: LibraryContentWithRefs[], scopeLabel: string) => void;
  onEditItem: (item: LibraryContentWithRefs) => void;
  onDeleteItem: (item: LibraryContentWithRefs) => void;
}

const NEW_DAYS = 7;
const NEW_THRESHOLD_MS = NEW_DAYS * 24 * 60 * 60 * 1000;

export function BibliotecaExplorer({
  tracks, courses, subjects, contents,
  canEditItem, onClassicView, onNewContent, onManage, onEditItem, onDeleteItem,
}: Props) {
  const [params, setParams] = useSearchParams();
  const trackId = params.get('track');
  const courseId = params.get('course');
  const subjectId = params.get('subject');

  const [search, setSearch] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [viewerItem, setViewerItem] = useState<LibraryContentWithRefs | null>(null);
  const { recentIds, pushRecent } = useRecentContents();

  const setNav = (next: { track?: string | null; course?: string | null; subject?: string | null }) => {
    const p = new URLSearchParams(params);
    const apply = (k: string, v: string | null | undefined) => {
      if (v === undefined) return;
      if (v === null || v === '') p.delete(k); else p.set(k, v);
    };
    apply('track', next.track);
    apply('course', next.course);
    apply('subject', next.subject);
    setParams(p, { replace: false });
  };

  const goHome = () => setNav({ track: null, course: null, subject: null });
  const goTrack = (id: string) => setNav({ track: id, course: null, subject: null });
  const goCourse = (id: string) => {
    // Inferir track caso não esteja definido
    const c = courses.find(x => x.id === id);
    setNav({ track: c?.formative_track_id ?? null, course: id, subject: null });
  };
  const goSubject = (id: string) => {
    const s = subjects.find(x => x.id === id);
    const c = s ? courses.find(x => x.id === s.course_id) : null;
    setNav({ track: c?.formative_track_id ?? null, course: s?.course_id ?? null, subject: id });
  };

  const openViewer = (item: LibraryContentWithRefs) => {
    pushRecent(item.id);
    // Navegar para o contexto da aula
    setNav({
      track: item.formative_track_id ?? null,
      course: item.course_id ?? null,
      subject: item.subject_id ?? null,
    });
    setViewerItem(item);
  };

  // Estado atual
  const currentTrack = useMemo(() => tracks.find(t => t.id === trackId) || null, [tracks, trackId]);
  const currentCourse = useMemo(() => courses.find(c => c.id === courseId) || null, [courses, courseId]);
  const currentSubject = useMemo(() => subjects.find(s => s.id === subjectId) || null, [subjects, subjectId]);

  // Filtros em cascata
  const visibleCourses = useMemo(
    () => trackId ? courses.filter(c => c.formative_track_id === trackId) : [],
    [courses, trackId],
  );
  const visibleSubjects = useMemo(
    () => courseId ? subjects.filter(s => s.course_id === courseId) : [],
    [subjects, courseId],
  );

  // Busca global
  const searchLower = search.trim().toLowerCase();
  const filteredBySearch = useMemo(() => {
    if (!searchLower) return contents;
    return contents.filter(c =>
      `${c.title} ${c.description ?? ''}`.toLowerCase().includes(searchLower),
    );
  }, [contents, searchLower]);

  // Helpers de contagem
  const countByTrack = (id: string) => contents.filter(c => c.formative_track_id === id).length;
  const countByCourse = (id: string) => contents.filter(c => c.course_id === id).length;
  const countBySubject = (id: string) => contents.filter(c => c.subject_id === id).length;

  // Detecta "novo" (existe conteúdo recente nos últimos 7 dias dentro daquele nó)
  const isNewMap = useMemo(() => {
    const now = Date.now();
    const trackHas = new Map<string, boolean>();
    const courseHas = new Map<string, boolean>();
    const subjectHas = new Map<string, boolean>();
    for (const c of contents) {
      if (!c.created_at) continue;
      const isFresh = now - new Date(c.created_at).getTime() <= NEW_THRESHOLD_MS;
      if (!isFresh) continue;
      if (c.formative_track_id) trackHas.set(c.formative_track_id, true);
      if (c.course_id) courseHas.set(c.course_id, true);
      if (c.subject_id) subjectHas.set(c.subject_id, true);
    }
    return { trackHas, courseHas, subjectHas };
  }, [contents]);

  // Recentes
  const recentItems = useMemo(() => {
    const map = new Map(contents.map(c => [c.id, c] as const));
    return recentIds.map(id => map.get(id)).filter(Boolean) as LibraryContentWithRefs[];
  }, [contents, recentIds]);

  // ----- Breadcrumb com siblings -----
  const breadcrumb: CrumbNode[] = useMemo(() => {
    const nodes: CrumbNode[] = [{ label: 'Biblioteca', onClick: trackId ? goHome : undefined }];

    if (currentTrack) {
      nodes.push({
        label: currentTrack.name,
        siblings: tracks.map(t => ({ id: t.id, label: t.name })),
        currentId: currentTrack.id,
        onSelect: (id) => goTrack(id),
      });
    }
    if (currentCourse) {
      const sib = (currentTrack
        ? courses.filter(c => c.formative_track_id === currentTrack.id)
        : courses
      ).map(c => ({ id: c.id, label: c.name }));
      nodes.push({
        label: currentCourse.name,
        siblings: sib,
        currentId: currentCourse.id,
        onSelect: (id) => goCourse(id),
      });
    }
    if (currentSubject) {
      const sib = subjects
        .filter(s => s.course_id === currentSubject.course_id)
        .map(s => ({ id: s.id, label: s.name }));
      nodes.push({
        label: currentSubject.name,
        siblings: sib,
        currentId: currentSubject.id,
        onSelect: (id) => goSubject(id),
      });
    }
    return nodes;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, courses, subjects, currentTrack, currentCourse, currentSubject, trackId]);

  const breadcrumbSlot = <BreadcrumbWithSiblings nodes={breadcrumb} />;

  // ----- Palette wrapper -----
  const palette = (
    <QuickSearchPalette
      open={paletteOpen}
      onOpenChange={setPaletteOpen}
      tracks={tracks}
      courses={courses}
      subjects={subjects}
      contents={contents}
      onPickTrack={goTrack}
      onPickCourse={goCourse}
      onPickSubject={goSubject}
      onPickContent={openViewer}
    />
  );

  // ---------- Render por nível ----------

  // Pesquisando: mostra resultados achatados (sem hierarquia)
  if (searchLower) {
    return (
      <div className="space-y-6">
        <HeroBanner
          title="Buscar na biblioteca"
          description={`${filteredBySearch.length} resultado(s) para "${search}"`}
          icon={Search}
          onClassicView={onClassicView}
          onNewContent={onNewContent}
          search={{ value: search, onChange: setSearch }}
          onOpenPalette={() => setPaletteOpen(true)}
          breadcrumbSlot={
            <BreadcrumbWithSiblings nodes={[
              { label: 'Biblioteca', onClick: () => setSearch('') },
              { label: 'Resultados' },
            ]} />
          }
        />
        {filteredBySearch.length === 0 ? (
          <EmptyState
            text={`Nenhum conteúdo encontrado para "${search}"`}
            actionLabel="Limpar busca"
            onAction={() => setSearch('')}
          />
        ) : (
          <ContentRow title="Resultados" count={filteredBySearch.length} icon={Sparkles} storageKey="search" onManage={onManage ? () => onManage(filteredBySearch, `Resultados de "${search}"`) : undefined}>
            {filteredBySearch.map(item => (
              <ContentTile
                key={item.id}
                item={item}
                canEdit={canEditItem(item)}
                onOpen={() => openViewer(item)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item)}
              />
            ))}
          </ContentRow>
        )}
        <ContentViewerDialog open={!!viewerItem} onOpenChange={(o) => !o && setViewerItem(null)} item={viewerItem} />
        {palette}
      </div>
    );
  }

  // Nível Disciplina → mostra Aulas
  if (currentSubject) {
    const aulas = contents.filter(c => c.subject_id === currentSubject.id);
    const firstAula = aulas[0];
    return (
      <div className="space-y-6">
        <HeroBanner
          title={currentSubject.name}
          description={currentCourse ? `${currentCourse.name} • ${aulas.length} aula(s) disponíveis` : `${aulas.length} aula(s)`}
          icon={BookOpen}
          onBack={() => setNav({ course: courseId, subject: null })}
          onClassicView={onClassicView}
          onNewContent={onNewContent}
          primaryAction={firstAula ? { label: 'Reproduzir 1ª aula', onClick: () => openViewer(firstAula), icon: Play } : undefined}
          search={{ value: search, onChange: setSearch, placeholder: 'Buscar aula nesta disciplina…' }}
          eyebrow="Disciplina"
          onOpenPalette={() => setPaletteOpen(true)}
          breadcrumbSlot={breadcrumbSlot}
        />
        {aulas.length === 0 ? (
          <EmptyState
            text="Nenhuma aula cadastrada nesta disciplina ainda."
            actionLabel="Adicionar aula"
            onAction={onNewContent}
          />
        ) : (
          <ContentRow title="Aulas" count={aulas.length} icon={Play} storageKey="subject-aulas" onManage={onManage ? () => onManage(aulas, `${currentSubject.name} • Aulas`) : undefined}>
            {aulas.map(item => (
              <ContentTile
                key={item.id}
                item={item}
                canEdit={canEditItem(item)}
                onOpen={() => openViewer(item)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item)}
              />
            ))}
          </ContentRow>
        )}
        <ContentViewerDialog open={!!viewerItem} onOpenChange={(o) => !o && setViewerItem(null)} item={viewerItem} />
        {palette}
      </div>
    );
  }

  // Nível Curso → mostra Disciplinas + Aulas avulsas do curso
  if (currentCourse) {
    const disciplinas = visibleSubjects;
    const aulasAvulsas = contents.filter(c => c.course_id === currentCourse.id && !c.subject_id);
    return (
      <div className="space-y-6">
        <HeroBanner
          title={currentCourse.name}
          description={currentTrack ? `${currentTrack.name} • ${disciplinas.length} disciplina(s)` : undefined}
          icon={GraduationCap}
          onBack={() => setNav({ track: trackId, course: null, subject: null })}
          onClassicView={onClassicView}
          onNewContent={onNewContent}
          search={{ value: search, onChange: setSearch, placeholder: 'Buscar disciplina ou aula neste curso…' }}
          eyebrow="Curso"
          onOpenPalette={() => setPaletteOpen(true)}
          breadcrumbSlot={breadcrumbSlot}
        />
        {disciplinas.length === 0 && aulasAvulsas.length === 0 ? (
          <EmptyState
            text="Este curso ainda não tem disciplinas ou aulas."
            actionLabel="Adicionar conteúdo"
            onAction={onNewContent}
          />
        ) : (
          <div className="space-y-6">
            {disciplinas.length > 0 && (
              <ContentRow title="Disciplinas" count={disciplinas.length} icon={BookOpen} storageKey="course-subjects">
                {disciplinas.map(s => {
                  const subjectContents = contents.filter(c => c.subject_id === s.id);
                  return (
                    <HierarchyCard
                      key={s.id}
                      title={s.name}
                      childrenCount={subjectContents.length}
                      childrenLabel={subjectContents.length === 1 ? 'aula' : 'aulas'}
                      icon={BookOpen}
                      seed={s.id}
                      onClick={() => goSubject(s.id)}
                      isNew={isNewMap.subjectHas.get(s.id)}
                      onManage={onManage && subjectContents.length > 0 ? () => onManage(subjectContents, `${s.name} • Aulas`) : undefined}
                    />
                  );
                })}
              </ContentRow>
            )}
            {aulasAvulsas.length > 0 && (
              <ContentRow title="Aulas do curso (sem disciplina)" count={aulasAvulsas.length} icon={Play} storageKey="course-loose" onManage={onManage ? () => onManage(aulasAvulsas, `${currentCourse.name} • Aulas do curso`) : undefined}>
                {aulasAvulsas.map(item => (
                  <ContentTile
                    key={item.id}
                    item={item}
                    canEdit={canEditItem(item)}
                    onOpen={() => openViewer(item)}
                    onEdit={() => onEditItem(item)}
                    onDelete={() => onDeleteItem(item)}
                  />
                ))}
              </ContentRow>
            )}
          </div>
        )}
        <ContentViewerDialog open={!!viewerItem} onOpenChange={(o) => !o && setViewerItem(null)} item={viewerItem} />
        {palette}
      </div>
    );
  }

  // Nível Itinerário → mostra Cursos + Aulas avulsas do itinerário
  if (currentTrack) {
    const cursos = visibleCourses;
    const aulasAvulsas = contents.filter(c => c.formative_track_id === currentTrack.id && !c.course_id);
    return (
      <div className="space-y-6">
        <HeroBanner
          title={currentTrack.name}
          description={`${cursos.length} curso(s) neste itinerário`}
          icon={Route}
          onBack={goHome}
          onClassicView={onClassicView}
          onNewContent={onNewContent}
          search={{ value: search, onChange: setSearch, placeholder: 'Buscar curso ou aula neste itinerário…' }}
          eyebrow="Itinerário formativo"
          onOpenPalette={() => setPaletteOpen(true)}
          breadcrumbSlot={breadcrumbSlot}
        />
        {cursos.length === 0 && aulasAvulsas.length === 0 ? (
          <EmptyState
            text="Este itinerário ainda não tem cursos ou aulas."
            actionLabel="Adicionar conteúdo"
            onAction={onNewContent}
          />
        ) : (
          <div className="space-y-6">
            {cursos.length > 0 && (
              <ContentRow title="Cursos" count={cursos.length} icon={GraduationCap} storageKey="track-courses">
                {cursos.map(c => (
                  <HierarchyCard
                    key={c.id}
                    title={c.name}
                    childrenCount={countByCourse(c.id)}
                    childrenLabel={countByCourse(c.id) === 1 ? 'aula' : 'aulas'}
                    icon={GraduationCap}
                    seed={c.id}
                    onClick={() => goCourse(c.id)}
                    isNew={isNewMap.courseHas.get(c.id)}
                  />
                ))}
              </ContentRow>
            )}
            {aulasAvulsas.length > 0 && (
              <ContentRow title="Aulas do itinerário" count={aulasAvulsas.length} icon={Play} storageKey="track-loose" onManage={onManage ? () => onManage(aulasAvulsas, `${currentTrack.name} • Aulas do itinerário`) : undefined}>
                {aulasAvulsas.map(item => (
                  <ContentTile
                    key={item.id}
                    item={item}
                    canEdit={canEditItem(item)}
                    onOpen={() => openViewer(item)}
                    onEdit={() => onEditItem(item)}
                    onDelete={() => onDeleteItem(item)}
                  />
                ))}
              </ContentRow>
            )}
          </div>
        )}
        <ContentViewerDialog open={!!viewerItem} onOpenChange={(o) => !o && setViewerItem(null)} item={viewerItem} />
        {palette}
      </div>
    );
  }

  // ---- Nível Início ----
  const tracksWithCount = tracks
    .map(t => ({ ...t, count: countByTrack(t.id) }))
    .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, 'pt-BR'));
  const aulasLivres = contents.filter(c => !c.formative_track_id);
  const ultimasAdicionadas = [...contents].slice(0, 12);

  // KPIs
  const totals = {
    tracks: tracks.length,
    courses: courses.length,
    subjects: subjects.length,
    contents: contents.length,
  };

  return (
    <div className="space-y-6">
      <HeroBanner
        title="Biblioteca Virtual"
        description="Itinerários, cursos, disciplinas e aulas — tudo num só lugar."
        icon={Library}
        onClassicView={onClassicView}
        onNewContent={onNewContent}
        search={{ value: search, onChange: setSearch, placeholder: 'Pesquisar título, curso ou disciplina…' }}
        eyebrow="Plataforma Neovale"
        highlightSecondWord
        onOpenPalette={() => setPaletteOpen(true)}
        breadcrumbSlot={breadcrumbSlot}
      />

      {/* KPI chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <KpiChip icon={Route} label="Itinerários" value={totals.tracks} />
        <KpiChip icon={GraduationCap} label="Cursos" value={totals.courses} />
        <KpiChip icon={BookOpen} label="Disciplinas" value={totals.subjects} />
        <KpiChip icon={Play} label="Aulas" value={totals.contents} />
      </div>

      <div className="space-y-6">
        {recentItems.length > 0 && (
          <ContentRow title="Continue de onde parou" count={recentItems.length} icon={Play} hideViewToggle>
            {recentItems.map(item => (
              <ContentTile
                key={item.id}
                item={item}
                canEdit={canEditItem(item)}
                onOpen={() => openViewer(item)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item)}
              />
            ))}
          </ContentRow>
        )}

        {tracksWithCount.length > 0 && (
          <ContentRow title="Itinerários formativos" count={tracksWithCount.length} icon={Route} storageKey="home-tracks">
            {tracksWithCount.map(t => (
              <HierarchyCard
                key={t.id}
                title={t.name}
                childrenCount={t.count}
                childrenLabel={t.count === 1 ? 'aula' : 'aulas'}
                icon={Route}
                seed={t.id}
                onClick={() => goTrack(t.id)}
                isNew={isNewMap.trackHas.get(t.id)}
              />
            ))}
          </ContentRow>
        )}


        {aulasLivres.length > 0 && (
          <ContentRow title="Categoria livre (sem itinerário)" count={aulasLivres.length} icon={FolderOpen} storageKey="home-loose" onManage={onManage ? () => onManage(aulasLivres, 'Categoria livre (sem itinerário)') : undefined}>
            {aulasLivres.map(item => (
              <LooseContentBauhausTile
                key={item.id}
                item={item}
                canEdit={canEditItem(item)}
                onOpen={() => openViewer(item)}
                onEdit={() => onEditItem(item)}
                onDelete={() => onDeleteItem(item)}
              />
            ))}
          </ContentRow>
        )}

        {tracksWithCount.length === 0 && ultimasAdicionadas.length === 0 && (
          <EmptyState
            text="Nenhum conteúdo cadastrado ainda. Comece criando o primeiro!"
            actionLabel="Criar primeiro conteúdo"
            onAction={onNewContent}
          />
        )}
      </div>

      <ContentViewerDialog open={!!viewerItem} onOpenChange={(o) => !o && setViewerItem(null)} item={viewerItem} />
      {palette}
    </div>
  );
}

// ---------- subcomponentes locais ----------

function KpiChip({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 hover:border-primary/40 transition-colors">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-lg font-bold tabular-nums leading-none mt-0.5 font-sora">
          {String(value).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text, actionLabel, onAction }: { text: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Card>
      <CardContent className="py-16 text-center text-muted-foreground">
        <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">{text}</p>
        {actionLabel && onAction && (
          <Button onClick={onAction} className="mt-5 bg-primary text-[#1B1E2C] hover:bg-primary/90 font-bold rounded-xl">
            <Plus className="h-4 w-4 mr-1.5" /> {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
