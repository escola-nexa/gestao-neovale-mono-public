import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CascadingFilterBar } from '@/components/CascadingFilterBar';
import { Library, Plus, Search, Loader2, Tag, Route, BookOpen, GraduationCap, FolderOpen, LayoutGrid, Tv } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { bibliotecaApi } from '@/features/biblioteca/api';
import { useLibrary } from './hooks/useLibrary';
import { ContentFormDialog } from './components/ContentFormDialog';
import { ContentCard } from './components/ContentCard';
import { BibliotecaExplorer } from './components/explorer/BibliotecaExplorer';
import { MANAGE_SCOPE_KEY } from './BibliotecaManagePage';
import type { LibraryContentWithRefs } from './types';

const sb = supabase as any;
const ALL = '__all__';

export default function BibliotecaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isManager = isManagerRole(user?.perfil);

  const openManage = (items: LibraryContentWithRefs[], label: string) => {
    try {
      sessionStorage.setItem(MANAGE_SCOPE_KEY, JSON.stringify({ ids: items.map(i => i.id), label }));
    } catch { /* ignore */ }
    navigate('/biblioteca/gerenciar');
  };

  const {
    organizationId, categories, contents, tracks, courses, subjects,
    folders, contentFolders,
    loading, refresh, createCategory,
  } = useLibrary();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(ALL);
  const [filterTrack, setFilterTrack] = useState(ALL);
  const [filterCourse, setFilterCourse] = useState(ALL);
  const [filterSubject, setFilterSubject] = useState(ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryContentWithRefs | null>(null);
  const [deleting, setDeleting] = useState<LibraryContentWithRefs | null>(null);
  

  const VIEW_KEY = 'neovale.biblioteca.viewMode';
  const [viewMode, setViewMode] = useState<'netflix' | 'classic'>(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      return v === 'classic' ? 'classic' : 'netflix';
    } catch { return 'netflix'; }
  });
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, viewMode); } catch { /* ignore */ } }, [viewMode]);

  const filteredCourses = useMemo(
    () => filterTrack === ALL ? courses : courses.filter((c) => c.formative_track_id === filterTrack),
    [courses, filterTrack],
  );
  const filteredSubjects = useMemo(
    () => filterCourse === ALL ? subjects : subjects.filter((s) => s.course_id === filterCourse),
    [subjects, filterCourse],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return contents.filter((c) => {
      if (filterCategory !== ALL && c.category_id !== filterCategory) return false;
      if (filterTrack !== ALL && c.formative_track_id !== filterTrack) return false;
      if (filterCourse !== ALL && c.course_id !== filterCourse) return false;
      if (filterSubject !== ALL && c.subject_id !== filterSubject) return false;
      if (s && !`${c.title} ${c.description}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [contents, filterCategory, filterTrack, filterCourse, filterSubject, search]);

  const stats = useMemo(() => ({
    total: contents.length,
    categories: categories.length,
    livre: contents.filter((c) => !c.formative_track_id).length,
  }), [contents, categories]);

  const canEditItem = (item: LibraryContentWithRefs) =>
    isManager || item.created_by === user?.id;

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const { error } = await sb.from('library_contents').delete().eq('id', deleting.id);
      if (error) throw error;
      toast({ title: 'Conteúdo removido' });
      setDeleting(null);
      refresh();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message ?? 'Não foi possível remover', variant: 'destructive' });
    }
  };

  const ALL_OPT = { id: ALL, name: 'Todos' };

  if (loading) {
    return (
      <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
    );
  }

  if (viewMode === 'netflix') {
    return (
      <div className="space-y-4 sm:space-y-6">
        <BibliotecaExplorer
          tracks={tracks}
          courses={courses}
          subjects={subjects}
          contents={contents}
          canEditItem={canEditItem}
          onClassicView={() => setViewMode('classic')}
          onNewContent={() => { setEditing(null); setDialogOpen(true); }}
          onManage={isManager ? openManage : undefined}
          onEditItem={(item) => { setEditing(item); setDialogOpen(true); }}
          onDeleteItem={(item) => setDeleting(item)}
        />

        <ContentFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          organizationId={organizationId}
          editing={editing}
          categories={categories}
          tracks={tracks}
          courses={courses}
          subjects={subjects}
          folders={folders}
          contentFolders={contentFolders}
          onFoldersRefreshed={() => refresh()}
          onCreateCategory={createCategory}
          onSaved={refresh}
        />

        <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover conteúdo?</AlertDialogTitle>
              <AlertDialogDescription>
                "{deleting?.title}" será excluído permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <FeatureGuideCard
        title="Como usar a Biblioteca Virtual"
        steps={[
          { icon: Plus, title: 'Cadastrar conteúdo', description: 'Adicione título, descrição e capa.', color: 'blue' },
          { icon: Tag, title: 'Categorias dinâmicas', description: 'Crie categorias livremente conforme necessário.', color: 'purple' },
          { icon: Route, title: 'Organize por itinerário', description: 'Vincule a itinerário, curso e disciplina (opcional).', color: 'amber' },
          { icon: Search, title: 'Filtre em cascata', description: 'Encontre conteúdos por categoria ou eixo acadêmico.', color: 'green' },
        ]}
      />

      <PageHeader
        breadcrumbs={[{ label: 'Pedagógico' }, { label: 'Biblioteca Virtual' }]}
        title="Biblioteca Virtual"
        description="Repositório de conteúdos pedagógicos da organização"
        icon={Library}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setViewMode('netflix')} className="w-full sm:w-auto">
              <Tv className="mr-2 h-4 w-4" /> Visão Netflix
            </Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Novo Conteúdo
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Conteúdos</p>
          <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Categorias</p>
          <p className="text-2xl sm:text-3xl font-bold">{stats.categories}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">Categoria livre</p>
          <p className="text-2xl sm:text-3xl font-bold">{stats.livre}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar título ou descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </CardContent></Card>
      </div>

      <CascadingFilterBar
        resultCount={filtered.length}
        resultLabel="conteúdo(s)"
        fields={[
          {
            key: 'category', label: 'Categoria', icon: Tag,
            value: filterCategory, onChange: setFilterCategory,
            options: [ALL_OPT, ...categories.map((c) => ({ id: c.id, name: c.name }))],
          },
          {
            key: 'track', label: 'Itinerário', icon: Route,
            value: filterTrack,
            onChange: (v) => { setFilterTrack(v); setFilterCourse(ALL); setFilterSubject(ALL); },
            options: [ALL_OPT, ...tracks.map((t) => ({ id: t.id, name: t.name }))],
          },
          {
            key: 'course', label: 'Curso', icon: GraduationCap,
            value: filterCourse,
            onChange: (v) => { setFilterCourse(v); setFilterSubject(ALL); },
            disabled: filterTrack === ALL,
            options: [ALL_OPT, ...filteredCourses.map((c) => ({ id: c.id, name: c.name }))],
          },
          {
            key: 'subject', label: 'Disciplina', icon: BookOpen,
            value: filterSubject, onChange: setFilterSubject,
            disabled: filterCourse === ALL,
            options: [ALL_OPT, ...filteredSubjects.map((s) => ({ id: s.id, name: s.name }))],
          },
        ]}
      />

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Nenhum conteúdo encontrado</p>
          <p className="text-sm">Crie o primeiro conteúdo da sua biblioteca</p>
        </CardContent></Card>
      ) : (
        (() => {
          // Agrupa por categoria, preservando ordem alfabética; "Sem categoria" no fim
          const groups = new Map<string, { name: string; items: LibraryContentWithRefs[] }>();
          for (const item of filtered) {
            const key = item.category_id ?? '__none__';
            const name = item.category?.name ?? 'Sem categoria';
            if (!groups.has(key)) groups.set(key, { name, items: [] });
            groups.get(key)!.items.push(item);
          }
          const sorted = Array.from(groups.entries()).sort(([ka, a], [kb, b]) => {
            if (ka === '__none__') return 1;
            if (kb === '__none__') return -1;
            return a.name.localeCompare(b.name, 'pt-BR');
          });
          return (
            <div className="space-y-8">
              {sorted.map(([key, group]) => (
                <section key={key} className="space-y-3">
                  <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <h2 className="text-base sm:text-lg font-semibold tracking-tight">{group.name}</h2>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {group.items.length} {group.items.length === 1 ? 'conteúdo' : 'conteúdos'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.items.map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        canEdit={canEditItem(item)}
                        onEdit={() => { setEditing(item); setDialogOpen(true); }}
                        onDelete={() => setDeleting(item)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          );
        })()
      )}

      <ContentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={organizationId}
        editing={editing}
        categories={categories}
        tracks={tracks}
        courses={courses}
        subjects={subjects}
        folders={folders}
        contentFolders={contentFolders}
        onFoldersRefreshed={() => refresh()}
        onCreateCategory={createCategory}
        onSaved={refresh}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover conteúdo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleting?.title}" será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
