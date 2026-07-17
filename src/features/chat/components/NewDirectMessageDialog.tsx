import { supabase } from '@/integrations/supabase/client';
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, MessageCircle, MessageSquarePlus } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Quando definido, o diálogo NÃO navega para /chat/:id após criar/abrir a DM —
   * apenas chama este callback (usado pelo popup flutuante para trocar o canal
   * ativo dentro do próprio popup). */
  onChannelReady?: (channelId: string) => void;
}

interface Candidate {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  perfil: string | null;
  existingChannelId: string | null;
}

const ROLE_ORDER = ['admin', 'coordenador', 'rh', 'professor'];
const ROLE_LABELS: Record<string, string> = {
  admin: 'Administradores',
  coordenador: 'Coordenadores',
  rh: 'Recursos Humanos',
  professor: 'Professores',
  outros: 'Outros',
};

export function NewDirectMessageDialog({ open, onOpenChange, onChannelReady }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !organizationId || !user) return;
    setSearch('');
    (async () => {
      setLoading(true);
      const [profilesRes, rolesRes, mineRes, profsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('organization_id', organizationId)
          .order('full_name'),
        supabase
          .from('user_roles')
          .select('user_id, role')
          .eq('organization_id', organizationId),
        supabase
          .from('chat_channel_members')
          .select('channel_id, chat_channels!inner(id, type)')
          .eq('user_id', user.id),
        supabase
          .from('professors')
          .select('user_id, status, deleted_at')
          .eq('organization_id', organizationId),
      ]);

      // DM existentes do usuário atual
      const myDmIds = (mineRes.data || [])
        .filter((m: any) => m.chat_channels?.type === 'direct')
        .map((m: any) => m.channel_id);
      const otherByDm = new Map<string, string>(); // userId -> channelId
      if (myDmIds.length > 0) {
        const { data: others } = await supabase
          .from('chat_channel_members')
          .select('channel_id, user_id')
          .in('channel_id', myDmIds)
          .neq('user_id', user.id);
        (others || []).forEach((o: any) => {
          if (!otherByDm.has(o.user_id)) otherByDm.set(o.user_id, o.channel_id);
        });
      }

      const roleMap = new Map<string, string>();
      (rolesRes.data || []).forEach((r: any) => roleMap.set(r.user_id, r.role));

      // Professores inativos/excluídos não devem aparecer na lista de nova conversa.
      const inactiveProfUserIds = new Set<string>();
      (profsRes.data || []).forEach((p: any) => {
        if (!p.user_id) return;
        if (p.deleted_at || p.status !== 'ACTIVE') inactiveProfUserIds.add(p.user_id);
      });

      const list: Candidate[] = (profilesRes.data || [])
        .filter((p: any) => p.user_id !== user.id)
        .filter((p: any) => !inactiveProfUserIds.has(p.user_id))
        .map((p: any) => ({
          user_id: p.user_id,
          full_name: p.full_name || 'Sem nome',
          avatar_url: p.avatar_url,
          perfil: roleMap.get(p.user_id) || null,
          existingChannelId: otherByDm.get(p.user_id) || null,
        }));
      setCandidates(list);
      setLoading(false);
    })();
  }, [open, organizationId, user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(c =>
      c.full_name.toLowerCase().includes(q) ||
      (c.perfil || '').toLowerCase().includes(q),
    );
  }, [candidates, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Candidate[]>();
    filtered.forEach(c => {
      const key = (c.perfil || '').toLowerCase();
      const bucket = ROLE_ORDER.includes(key) ? key : 'outros';
      const arr = groups.get(bucket) || [];
      arr.push(c);
      groups.set(bucket, arr);
    });
    const orderedKeys = [...ROLE_ORDER, 'outros'].filter(k => groups.has(k));
    return orderedKeys.map(k => ({ key: k, list: groups.get(k)! }));
  }, [filtered]);

  const handleOpenedChannel = (channelId: string) => {
    onOpenChange(false);
    if (onChannelReady) {
      onChannelReady(channelId);
    } else {
      navigate(`/chat/${channelId}`);
    }
  };

  const open1to1 = async (c: Candidate) => {
    if (!user || !organizationId) return;
    if (c.existingChannelId) {
      handleOpenedChannel(c.existingChannelId);
      return;
    }
    setBusyId(c.user_id);
    try {
      const { data: ch, error } = await supabase
        .from('chat_channels')
        .insert({ organization_id: organizationId, name: c.full_name, type: 'direct', is_private: true, created_by: user.id })
        .select('id').single();
      if (error) throw error;
      await chatApi.client.from('chat_channel_members').insert([
        { channel_id: ch.id, user_id: c.user_id, role: 'member' as const, can_post: true },
      ]);
      handleOpenedChannel(ch.id);
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-md">
        <DialogHeader><DialogTitle>Nova mensagem direta</DialogTitle></DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou perfil…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[360px] -mx-6 px-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-3">
              {grouped.map(({ key, list }) => (
                <div key={key}>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pb-1">
                    {ROLE_LABELS[key]} <span className="text-muted-foreground/60">· {list.length}</span>
                  </div>
                  <ul className="space-y-0.5">
                    {list.map(c => {
                      const initials = c.full_name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                      const isBusy = busyId === c.user_id;
                      return (
                        <li key={c.user_id}>
                          <button
                            type="button"
                            onClick={() => open1to1(c)}
                            disabled={isBusy}
                            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left hover:bg-muted/60 disabled:opacity-60"
                          >
                            <Avatar className="h-7 w-7">
                              {c.avatar_url && <AvatarImage src={c.avatar_url} />}
                              <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium truncate leading-tight">{c.full_name}</div>
                              <div className="text-[10px] text-muted-foreground capitalize leading-tight">
                                {c.perfil || 'usuário'}
                              </div>
                            </div>
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            ) : c.existingChannelId ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <MessageCircle className="h-3 w-3" /> abrir
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-primary font-semibold">
                                <MessageSquarePlus className="h-3 w-3" /> iniciar
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
