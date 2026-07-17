import { useMemo, useState, useEffect, useRef } from 'react';
import { Search, Plus, Settings, X, PlayCircle, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHelpTutorials, useHelpViews } from './hooks/useHelpTutorials';
import { useOrganization } from '@/hooks/useOrganization';
import { HELP_CATEGORIES, getCategoryMeta, CONTENT_TYPE_LABELS } from './constants';
import { HeroBanner } from './components/HeroBanner';
import { CategoryRail } from './components/CategoryRail';
import { TutorialCard } from './components/TutorialCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HelpCategory } from './types';

export default function AjudaHubPage() {
  const { data: tutorials = [], isLoading } = useHelpTutorials();
  const { data: views = [] } = useHelpViews();
  const { userRole } = useOrganization();
  const canManage = userRole === 'admin' || userRole === 'coordenador';

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<HelpCategory | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const watchedIds = useMemo(() => new Set(views.filter((v) => v.completed).map((v) => v.tutorial_id)), [views]);
  const inProgressIds = useMemo(
    () => new Set(views.filter((v) => !v.completed && v.progress_seconds > 5).map((v) => v.tutorial_id)),
    [views]
  );

  // Continue watching list
  const continueWatching = useMemo(() => {
    const ids = views
      .filter((v) => !v.completed && v.progress_seconds > 5)
      .sort((a, b) => +new Date(b.last_viewed_at) - +new Date(a.last_viewed_at))
      .map((v) => v.tutorial_id);
    return ids.map((id) => tutorials.find((t) => t.id === id)).filter(Boolean) as typeof tutorials;
  }, [views, tutorials]);

  const mostViewed = useMemo(
    () => [...tutorials].sort((a, b) => b.view_count - a.view_count).slice(0, 12).filter((t) => t.view_count > 0),
    [tutorials]
  );

  const featured = useMemo(() => tutorials.filter((t) => t.is_featured), [tutorials]);
  const [heroIdx, setHeroIdx] = useState(0);
  useEffect(() => {
    if (featured.length <= 1) return;
    const i = setInterval(() => setHeroIdx((p) => (p + 1) % featured.length), 7000);
    return () => clearInterval(i);
  }, [featured.length]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tutorials.filter((t) => {
      if (activeCategory !== 'all' && t.category !== activeCategory) return false;
      if (typeFilter !== 'all') {
        const isVideo = typeFilter === 'video' && (t.content_type === 'video_upload' || t.content_type === 'video_link');
        if (!isVideo && t.content_type !== typeFilter) return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.feature_name.toLowerCase().includes(q) ||
        getCategoryMeta(t.category).label.toLowerCase().includes(q)
      );
    });
  }, [tutorials, activeCategory, typeFilter, search]);

  const isSearching = search.trim().length > 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] -mx-4 -my-6 lg:-mx-8 bg-[#0F121C] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-[#0F121C] via-[#0F121C]/95 to-[#0F121C]/80 backdrop-blur-md border-b border-white/5">
        <div className="px-4 sm:px-8 py-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-[#FFDA45] flex items-center justify-center">
              <PlayCircle className="h-5 w-5 text-[#1B1E2C]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Central de Ajuda</h1>
              <p className="text-[11px] text-white/50">Aprenda o sistema com tutoriais em vídeo, PDF e mais</p>
            </div>
          </div>

          <div className="flex-1 min-w-[200px] max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tutoriais... (pressione /)"
                className="w-full rounded-lg bg-white/10 border border-white/10 pl-10 pr-10 py-2.5 text-sm placeholder:text-white/40 focus:outline-none focus:border-[#FFDA45]/50 focus:bg-white/15 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                <Link to="/ajuda/gerenciar"><Settings className="h-4 w-4 mr-1.5" /> Gerenciar</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#FFDA45] hover:bg-[#FFDA45]/90 text-[#1B1E2C] font-semibold">
                <Link to="/ajuda/novo"><Plus className="h-4 w-4 mr-1.5" /> Novo tutorial</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Chips */}
        <div className="px-4 sm:px-8 pb-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
              activeCategory === 'all'
                ? 'bg-[#FFDA45] text-[#1B1E2C] border-[#FFDA45] font-semibold'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10')}
          >
            Todas
          </button>
          {HELP_CATEGORIES.map((c) => {
            const I = c.icon;
            const active = activeCategory === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCategory(c.key)}
                className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors inline-flex items-center gap-1.5',
                  active
                    ? 'bg-[#FFDA45] text-[#1B1E2C] border-[#FFDA45] font-semibold'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10')}
              >
                <I className="h-3.5 w-3.5" />
                {c.label}
              </button>
            );
          })}
          <span className="mx-2 h-4 w-px bg-white/10" />
          {['all', 'video', 'pdf', 'image', 'link'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn('text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                typeFilter === t ? 'bg-white/20 text-white border-white/30' : 'bg-transparent text-white/50 border-white/10 hover:bg-white/5')}
            >
              {t === 'all' ? 'Todos os tipos' : (CONTENT_TYPE_LABELS[t] ?? t)}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-[#FFDA45] border-t-transparent" />
        </div>
      ) : tutorials.length === 0 ? (
        <EmptyState canManage={canManage} />
      ) : isSearching || activeCategory !== 'all' || typeFilter !== 'all' ? (
        <SearchResults tutorials={filtered} watchedIds={watchedIds} inProgressIds={inProgressIds} query={search} />
      ) : (
        <main className="pb-16 space-y-10">
          {/* Hero */}
          {featured.length > 0 && <HeroBanner tutorial={featured[heroIdx]} />}

          <div className="space-y-10 pt-6">
            {continueWatching.length > 0 && (
              <CategoryRail
                category={continueWatching[0].category}
                customTitle="Continuar assistindo"
                customIcon={Clock}
                tutorials={continueWatching}
                watchedIds={watchedIds}
                inProgressIds={inProgressIds}
              />
            )}

            {mostViewed.length > 0 && (
              <CategoryRail
                category={mostViewed[0].category}
                customTitle="Mais assistidos"
                customIcon={TrendingUp}
                tutorials={mostViewed}
                watchedIds={watchedIds}
                inProgressIds={inProgressIds}
              />
            )}

            {/* Featured rail */}
            {featured.length > 1 && (
              <CategoryRail
                category={featured[0].category}
                customTitle="Em destaque"
                customIcon={Sparkles}
                tutorials={featured}
                watchedIds={watchedIds}
                inProgressIds={inProgressIds}
              />
            )}

            {HELP_CATEGORIES.map((c) => (
              <CategoryRail
                key={c.key}
                category={c.key}
                tutorials={tutorials.filter((t) => t.category === c.key)}
                watchedIds={watchedIds}
                inProgressIds={inProgressIds}
              />
            ))}
          </div>
        </main>
      )}
    </div>
  );
}

function SearchResults({ tutorials, watchedIds, inProgressIds, query }: { tutorials: any[]; watchedIds: Set<string>; inProgressIds: Set<string>; query: string }) {
  return (
    <div className="px-4 sm:px-8 py-6">
      <p className="text-sm text-white/60 mb-4">
        {tutorials.length} {tutorials.length === 1 ? 'resultado' : 'resultados'}
        {query && <> para “<span className="text-[#FFDA45]">{query}</span>”</>}
      </p>
      {tutorials.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-white/60">
          Nenhum tutorial encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tutorials.map((t) => (
            <TutorialCard
              key={t.id}
              tutorial={t}
              watched={watchedIds.has(t.id)}
              inProgress={inProgressIds.has(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ canManage }: { canManage: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#FFDA45] to-amber-500 flex items-center justify-center shadow-2xl mb-6">
        <PlayCircle className="h-10 w-10 text-[#1B1E2C]" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Sua Central de Ajuda está vazia</h2>
      <p className="text-white/60 max-w-md mb-6">
        {canManage
          ? 'Cadastre o primeiro tutorial e ajude sua equipe a dominar o sistema.'
          : 'Os administradores ainda não cadastraram tutoriais. Volte mais tarde!'}
      </p>
      {canManage && (
        <Button asChild className="bg-[#FFDA45] hover:bg-[#FFDA45]/90 text-[#1B1E2C] font-semibold">
          <Link to="/ajuda/novo"><Plus className="h-4 w-4 mr-1.5" /> Cadastrar primeiro tutorial</Link>
        </Button>
      )}
    </div>
  );
}
