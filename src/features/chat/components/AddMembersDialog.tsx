import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Loader2, UserPlus, Check } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  channelId: string;
  organizationId: string;
  onAdded?: () => void;
}

interface Candidate {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  perfil: string | null;
  already: boolean;
}

export function AddMembersDialog({ open, onOpenChange, channelId, organizationId, onAdded }: Props) {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setSearch('');
    (async () => {
      setLoading(true);
      const [profilesRes, membersRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('organization_id', organizationId)
          .order('full_name'),
        supabase
          .from('chat_channel_members')
          .select('user_id')
          .eq('channel_id', channelId),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('organization_id', organizationId),
      ]);
      const memberIds = new Set((membersRes.data || []).map((r: any) => r.user_id));
      const roleMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));
      const list: Candidate[] = (profilesRes.data || []).map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name || 'Sem nome',
        avatar_url: p.avatar_url,
        perfil: roleMap.get(p.user_id) || null,
        already: memberIds.has(p.user_id),
      }));
      // Ordena: não-membros primeiro, depois membros existentes
      list.sort((a, b) => Number(a.already) - Number(b.already) || a.full_name.localeCompare(b.full_name));
      setCandidates(list);
      setLoading(false);
    })();
  }, [open, channelId, organizationId, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      (c.perfil || '').toLowerCase().includes(q),
    );
  }, [candidates, search]);

  const toggle = (id: string) => {
    const c = candidates.find(x => x.user_id === id);
    if (c?.already) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    const rows = Array.from(selected).map(uid => ({
      channel_id: channelId,
      user_id: uid,
      role: 'member' as const,
    }));
    const { error } = await chatApi.client.from('chat_channel_members').insert(rows);
    setSaving(false);
    if (error) {
      toast.error('Erro ao adicionar: ' + error.message);
      return;
    }
    toast.success(`${selected.size} pessoa(s) adicionada(s) ao canal`);
    onOpenChange(false);
    onAdded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Adicionar pessoas ao canal
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou perfil…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <ScrollArea className="h-[340px] -mx-6 px-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
          ) : (() => {
            const ROLE_ORDER = ['admin', 'coordenador', 'rh', 'professor'];
            const ROLE_LABELS: Record<string, string> = {
              admin: 'Administradores',
              coordenador: 'Coordenadores',
              rh: 'Recursos Humanos',
              professor: 'Professores',
              outros: 'Outros',
            };
            const groups = new Map<string, typeof filtered>();
            filtered.forEach(c => {
              const key = (c.perfil || '').toLowerCase();
              const bucket = ROLE_ORDER.includes(key) ? key : 'outros';
              const arr = groups.get(bucket) || [];
              arr.push(c);
              groups.set(bucket, arr);
            });
            const orderedKeys = [...ROLE_ORDER, 'outros'].filter(k => groups.has(k));

            return (
              <div className="space-y-3">
                {orderedKeys.map(key => {
                  const list = groups.get(key)!;
                  const selectables = list.filter(c => !c.already);
                  const allSelected = selectables.length > 0 && selectables.every(c => selected.has(c.user_id));
                  const toggleAll = () => {
                    setSelected(prev => {
                      const next = new Set(prev);
                      if (allSelected) selectables.forEach(c => next.delete(c.user_id));
                      else selectables.forEach(c => next.add(c.user_id));
                      return next;
                    });
                  };
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between gap-2 px-2 pb-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {ROLE_LABELS[key]} <span className="text-muted-foreground/60">· {list.length}</span>
                        </div>
                        {selectables.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleAll}
                            className="text-[10px] font-semibold text-primary hover:underline"
                          >
                            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                          </button>
                        )}
                      </div>
                      <ul className="space-y-0.5">
                        {list.map(c => {
                          const initials = c.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                          const isSelected = selected.has(c.user_id);
                          return (
                            <li key={c.user_id}>
                              <button
                                type="button"
                                onClick={() => toggle(c.user_id)}
                                disabled={c.already}
                                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors ${
                                  c.already ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted/60'
                                } ${isSelected ? 'bg-primary/10' : ''}`}
                              >
                                <Checkbox checked={isSelected || c.already} disabled={c.already} className="pointer-events-none" />
                                <Avatar className="h-7 w-7">
                                  {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                                  <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium truncate leading-tight">{c.full_name}</div>
                                  <div className="text-[10px] text-muted-foreground capitalize leading-tight">
                                    {c.perfil || 'usuário'}{c.already && ' · já é membro'}
                                  </div>
                                </div>
                                {c.already && <Check className="h-3.5 w-3.5 text-muted-foreground" />}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || selected.size === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Adicionar {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
