import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState, useEffect } from 'react';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { GripVertical, Eye, EyeOff, Save, Search, Loader2, Layers, Trash2, CheckSquare, Square } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { bibliotecaApi } from '@/features/biblioteca/api';
import { getCoverColor, getCoverIcon } from '../coverPresets';
import type { LibraryContentWithRefs } from '../types';

const sb = supabase as any;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contents: LibraryContentWithRefs[];
  scopeLabel?: string;
  onChanged: () => void;
}

type FilterMode = 'all' | 'draft' | 'published';

export function ManageContentsDialog({ open, onOpenChange, contents, scopeLabel, onChanged }: Props) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LibraryContentWithRefs[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setItems(contents);
      setSelected(new Set());
      setDirty(false);
      setFilter('all');
      setSearch('');
    }
  }, [open, contents]);

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return items.filter(it => {
      if (filter === 'draft' && it.published_at) return false;
      if (filter === 'published' && !it.published_at) return false;
      if (s && !`${it.title} ${it.description ?? ''}`.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [items, filter, search]);

  const stats = useMemo(() => ({
    total: items.length,
    drafts: items.filter(i => !i.published_at).length,
    published: items.filter(i => i.published_at).length,
  }), [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id);
      const newIdx = prev.findIndex(i => i.id === over.id);
      if (oldIdx < 0 || newIdx < 0) return prev;
      return arrayMove(prev, oldIdx, newIdx);
    });
    setDirty(true);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      const ids = items.map(i => i.id);
      const { error } = await sb.rpc('library_reorder_contents', { _ids: ids });
      if (error) throw error;
      toast({ title: 'Ordem salva' });
      setDirty(false);
      onChanged();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar ordem', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function bulkPublish(publish: boolean) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBusy(true);
    try {
      const { data: { user } } = await bibliotecaApi.client.auth.getUser();
      const payload = publish
        ? { published_at: new Date().toISOString(), published_by: user?.id ?? null }
        : { published_at: null, published_by: null };
      const { error } = await sb.from('library_contents').update(payload).in('id', ids);
      if (error) throw error;
      setItems(prev => prev.map(i => ids.includes(i.id) ? { ...i, ...payload } as LibraryContentWithRefs : i));
      toast({ title: publish ? `${ids.length} publicado(s)` : `${ids.length} despublicado(s)` });
      setSelected(new Set());
      onChanged();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(item: LibraryContentWithRefs) {
    const publish = !item.published_at;
    setBusy(true);
    try {
      const { data: { user } } = await bibliotecaApi.client.auth.getUser();
      const payload = publish
        ? { published_at: new Date().toISOString(), published_by: user?.id ?? null }
        : { published_at: null, published_by: null };
      const { error } = await sb.from('library_contents').update(payload).eq('id', item.id);
      if (error) throw error;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, ...payload } as LibraryContentWithRefs : i));
      toast({ title: publish ? 'Publicado' : 'Despublicado' });
      onChanged();
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allVisibleSelected = visible.length > 0 && visible.every(i => selected.has(i.id));
  function toggleSelectAllVisible() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        visible.forEach(i => next.delete(i.id));
      } else {
        visible.forEach(i => next.add(i.id));
      }
      return next;
    });
  }

  async function bulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBusy(true);
    try {
      const { error } = await sb.from('library_contents').delete().in('id', ids);
      if (error) throw error;
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
      toast({ title: `${ids.length} conteúdo(s) excluído(s)` });
      setSelected(new Set());
      setConfirmDelete(false);
      onChanged();
    } catch (err: any) {
      toast({ title: 'Erro ao excluir', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 font-sora">
            <Layers className="h-5 w-5 text-amber-500" />
            Gerenciar conteúdos {scopeLabel ? `— ${scopeLabel}` : 'da biblioteca'}
          </DialogTitle>
          <DialogDescription>
            Arraste para reordenar. Publique ou despublique para controlar a visibilidade para professores e alunos.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 pb-3 pt-2 border-b bg-muted/30 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
              <TabsList>
                <TabsTrigger value="all">Todos <Badge variant="secondary" className="ml-2">{stats.total}</Badge></TabsTrigger>
                <TabsTrigger value="draft">Rascunhos <Badge variant="secondary" className="ml-2">{stats.drafts}</Badge></TabsTrigger>
                <TabsTrigger value="published">Publicados <Badge variant="secondary" className="ml-2">{stats.published}</Badge></TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar título ou descrição…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleSelectAllVisible}
              disabled={visible.length === 0}
              className="gap-2"
            >
              {allVisibleSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              {allVisibleSelected ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>

            <Button onClick={saveOrder} disabled={!dirty || saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar ordem
            </Button>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-3 py-2">
              <span className="text-sm font-semibold">{selected.size} selecionado(s)</span>
              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => bulkPublish(true)} disabled={busy} className="gap-1">
                  <Eye className="h-3.5 w-3.5" /> Publicar
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkPublish(false)} disabled={busy} className="gap-1">
                  <EyeOff className="h-3.5 w-3.5" /> Despublicar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar</Button>
              </div>
            </div>
          )}
        </div>

        {/* Grade */}
        <div className="flex-1 overflow-y-auto p-6">
          {visible.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Nenhum conteúdo neste filtro.</div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={visible.map(i => i.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {visible.map(item => (
                    <SortableCard
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onToggleSelect={() => toggleSelect(item.id)}
                      onTogglePublish={() => togglePublish(item)}
                      busy={busy}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="border-t px-6 py-3 text-xs text-muted-foreground">
          Dica: a ordem definida aqui é a mesma usada na visão Netflix dos professores. Conteúdos em <strong>Rascunho</strong> só aparecem para Admin/Coordenador.
        </div>
      </DialogContent>

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !busy && setConfirmDelete(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} conteúdo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os arquivos e links selecionados serão removidos permanentemente da biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); bulkDelete(); }}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

function SortableCard({
  item, selected, onToggleSelect, onTogglePublish, busy,
}: {
  item: LibraryContentWithRefs;
  selected: boolean;
  onToggleSelect: () => void;
  onTogglePublish: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const color = getCoverColor(item.cover_color);
  const Icon = getCoverIcon(item.cover_icon);
  const isDraft = !item.published_at;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative rounded-xl overflow-hidden bg-card border-2 transition-all',
        selected ? 'border-amber-500 ring-2 ring-amber-300' : 'border-border',
        isDragging && 'shadow-2xl scale-[1.02]',
      )}
    >
      <div className={cn('relative aspect-[16/10] flex items-center justify-center', color.bg)}>
        <Icon className={cn('h-12 w-12', color.fg)} />

        {/* drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-1.5 left-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/90 backdrop-blur cursor-grab active:cursor-grabbing"
          aria-label="Arrastar"
          type="button"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* checkbox */}
        <div className="absolute top-1.5 right-1.5 rounded-md bg-background/90 backdrop-blur p-1">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Selecionar" />
        </div>

        {/* status badge */}
        <span className={cn(
          'absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider',
          isDraft ? 'bg-amber-400 text-amber-950' : 'bg-emerald-500 text-white',
        )}>
          {isDraft ? 'Rascunho' : 'Publicado'}
        </span>
      </div>

      <div className="p-2.5">
        <h4 className="text-[13px] font-bold leading-tight break-words font-sora line-clamp-2" title={item.title}>
          {item.title}
        </h4>
        {item.subject?.name && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{item.subject.name}</p>
        )}
        <Button
          size="sm"
          variant={isDraft ? 'default' : 'outline'}
          className={cn('w-full mt-2 h-7 text-[11px] gap-1', isDraft && 'bg-amber-500 hover:bg-amber-600 text-amber-950')}
          onClick={onTogglePublish}
          disabled={busy}
        >
          {isDraft ? <><Eye className="h-3 w-3" /> Publicar</> : <><EyeOff className="h-3 w-3" /> Despublicar</>}
        </Button>
      </div>
    </div>
  );
}
