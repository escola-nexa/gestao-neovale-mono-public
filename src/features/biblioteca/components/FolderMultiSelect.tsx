import { supabase } from '@/integrations/supabase/client';
import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, FolderPlus, Loader2, X, Folder, FolderOpen, Search, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { bibliotecaApi } from '@/features/biblioteca/api';
import { cn } from '@/lib/utils';
import type { LibraryFolder } from '../types';
import { buildFolderPath } from '../folderUtils';

const sb = supabase as any;

interface Props {
  categoryId: string;
  folders: LibraryFolder[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onFoldersRefreshed: (folders: LibraryFolder[]) => void;
  organizationId: string | null;
}

export function FolderMultiSelect({
  categoryId,
  folders,
  selected,
  onChange,
  onFoldersRefreshed,
  organizationId,
}: Props) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingUnder, setCreatingUnder] = useState<string | null | undefined>(undefined); // undefined = closed, null = root, string = parentId
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const categoryFolders = useMemo(
    () => folders.filter((f) => f.category_id === categoryId),
    [folders, categoryId],
  );

  const childrenMap = useMemo(() => {
    const map = new Map<string | null, LibraryFolder[]>();
    for (const f of categoryFolders) {
      const key = f.parent_id;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    return map;
  }, [categoryFolders]);

  // Filtro: se buscar, expande tudo automaticamente e mantém ancestrais visíveis
  const matchedIds = useMemo(() => {
    if (!search.trim()) return null;
    const s = search.trim().toLowerCase();
    const matches = new Set<string>();
    for (const f of categoryFolders) {
      if (f.name.toLowerCase().includes(s)) {
        // adiciona ele e todos os ancestrais
        let cur: LibraryFolder | undefined = f;
        while (cur) {
          matches.add(cur.id);
          cur = cur.parent_id ? categoryFolders.find((x) => x.id === cur!.parent_id) : undefined;
        }
      }
    }
    return matches;
  }, [search, categoryFolders]);

  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of categoryFolders) {
      m.set(f.id, buildFolderPath(folders, f.id).map((x) => x.name).join(' › '));
    }
    return m;
  }, [categoryFolders, folders]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const refreshFolders = useCallback(async () => {
    if (!organizationId) return;
    const { data } = await sb
      .from('library_folders')
      .select('*')
      .eq('organization_id', organizationId)
      .order('sort_order', { ascending: true });
    onFoldersRefreshed((data ?? []) as LibraryFolder[]);
  }, [organizationId, onFoldersRefreshed]);

  const handleCreate = async () => {
    if (!newName.trim() || !categoryId || creatingUnder === undefined) return;
    setCreating(true);
    try {
      const { data, error } = await sb.rpc('library_folder_create', {
        _category_id: categoryId,
        _parent_id: creatingUnder,
        _name: newName.trim(),
      });
      if (error) throw error;
      await refreshFolders();
      if (data) {
        onChange([...selected, data as string]);
        if (creatingUnder) setExpanded((prev) => new Set(prev).add(creatingUnder));
      }
      setNewName('');
      setCreatingUnder(undefined);
      toast({ title: 'Grupo criado' });
    } catch (err: any) {
      toast({ title: 'Erro ao criar grupo', description: err?.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  if (!categoryId) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        Selecione uma categoria primeiro para organizar em Grupos.
      </div>
    );
  }

  const roots = childrenMap.get(null) ?? [];
  const isEmpty = categoryFolders.length === 0;

  const renderNode = (node: LibraryFolder, depth: number): JSX.Element | null => {
    if (matchedIds && !matchedIds.has(node.id)) return null;
    const kids = childrenMap.get(node.id) ?? [];
    const hasKids = kids.length > 0;
    const isOpen = expanded.has(node.id) || !!matchedIds;
    const isSel = selected.includes(node.id);

    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-muted/60 transition-colors',
            isSel && 'bg-primary/5',
          )}
          style={{ paddingLeft: depth * 16 + 4 }}
        >
          <button
            type="button"
            onClick={() => hasKids && toggleExpand(node.id)}
            className={cn(
              'h-5 w-5 flex items-center justify-center text-muted-foreground shrink-0',
              !hasKids && 'invisible',
            )}
            aria-label={isOpen ? 'Recolher' : 'Expandir'}
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-90')} />
          </button>

          <Checkbox
            checked={isSel}
            onCheckedChange={() => toggle(node.id)}
            className="shrink-0"
            id={`folder-${node.id}`}
          />

          <label
            htmlFor={`folder-${node.id}`}
            className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer text-sm py-0.5"
          >
            {isOpen && hasKids ? (
              <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
            {hasKids && (
              <span className="text-[10px] text-muted-foreground">({kids.length})</span>
            )}
          </label>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCreatingUnder(node.id);
              setExpanded((prev) => new Set(prev).add(node.id));
              setNewName('');
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex items-center justify-center rounded hover:bg-primary/10 text-muted-foreground hover:text-primary shrink-0"
            title="Criar subgrupo aqui"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {creatingUnder === node.id && (
          <InlineCreateRow
            depth={depth + 1}
            value={newName}
            onChange={setNewName}
            onCancel={() => { setCreatingUnder(undefined); setNewName(''); }}
            onConfirm={handleCreate}
            loading={creating}
            placeholder={`Subgrupo de "${node.name}"`}
          />
        )}

        {isOpen && hasKids && (
          <div>{kids.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Chips de selecionados */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pl-2 pr-1 py-1 max-w-full">
              <Folder className="h-3 w-3 text-amber-500 shrink-0" />
              <span className="truncate text-xs">{labelById.get(id) ?? '—'}</span>
              <button
                type="button"
                onClick={() => toggle(id)}
                className="hover:bg-destructive/10 hover:text-destructive rounded p-0.5"
                aria-label="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selected.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-muted-foreground hover:text-destructive underline self-center"
            >
              Limpar todos
            </button>
          )}
        </div>
      )}

      {/* Toolbar: busca + novo grupo raiz */}
      {!isEmpty && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar grupo..."
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={() => { setCreatingUnder(null); setNewName(''); }}
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Novo grupo
          </Button>
        </div>
      )}

      {/* Árvore ou empty state */}
      <div className="rounded-md border bg-background">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FolderPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhum grupo criado ainda</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organize seus conteúdos em pastas livres dentro da categoria.
              </p>
            </div>
            {creatingUnder === undefined ? (
              <Button
                type="button"
                size="sm"
                onClick={() => { setCreatingUnder(null); setNewName(''); }}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Criar primeiro grupo
              </Button>
            ) : (
              <div className="w-full max-w-xs">
                <InlineCreateRow
                  depth={0}
                  value={newName}
                  onChange={setNewName}
                  onCancel={() => setCreatingUnder(undefined)}
                  onConfirm={handleCreate}
                  loading={creating}
                  placeholder="Ex.: Apostilas 1º bimestre"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="max-h-64 overflow-auto py-1">
            {creatingUnder === null && (
              <InlineCreateRow
                depth={0}
                value={newName}
                onChange={setNewName}
                onCancel={() => { setCreatingUnder(undefined); setNewName(''); }}
                onConfirm={handleCreate}
                loading={creating}
                placeholder="Nome do novo grupo (raiz)"
              />
            )}
            {roots.map((r) => renderNode(r, 0))}
            {matchedIds && matchedIds.size === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                Nenhum grupo encontrado para "{search}"
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Dica: passe o mouse sobre um grupo e clique em <Plus className="inline h-2.5 w-2.5" /> para criar um subgrupo dentro dele.
      </p>
    </div>
  );
}

function InlineCreateRow({
  depth,
  value,
  onChange,
  onCancel,
  onConfirm,
  loading,
  placeholder,
}: {
  depth: number;
  value: string;
  onChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
  placeholder: string;
}) {
  return (
    <div
      className="flex items-center gap-1.5 px-1 py-1 bg-primary/5 rounded-md"
      style={{ paddingLeft: depth * 16 + 4 }}
    >
      <FolderPlus className="h-4 w-4 text-primary shrink-0 ml-5" />
      <Input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-sm flex-1"
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
      />
      <Button
        type="button"
        size="icon"
        variant="default"
        className="h-7 w-7 shrink-0"
        onClick={onConfirm}
        disabled={loading || !value.trim()}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        onClick={onCancel}
        disabled={loading}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
