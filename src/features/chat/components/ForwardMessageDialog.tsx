import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Forward } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { stripMentionMarkup } from '../utils/parseMentions';

interface ChannelOption { id: string; name: string; type: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: { id: string; body: string | null; channel_id: string; author_name?: string };
}

export function ForwardMessageDialog({ open, onOpenChange, message }: Props) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<ChannelOption | null>(null);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: mems } = await supabase
        .from('chat_channel_members').select('channel_id').eq('user_id', user.id);
      const ids = (mems || []).map((m: any) => m.channel_id);
      if (ids.length === 0) { setChannels([]); return; }
      const { data: chs } = await supabase
        .from('chat_channels').select('id, name, type').in('id', ids).order('name');
      setChannels((chs || []) as ChannelOption[]);
      setTarget(null); setComment(''); setSearch('');
    })();
  }, [open, user]);

  const filtered = channels.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const send = async () => {
    if (!user || !target) return;
    setSending(true);
    const preview = stripMentionMarkup(message.body || '').slice(0, 400);
    const quoted = `> 🔁 *Encaminhado de ${message.author_name || 'usuário'}*\n> ${preview.replace(/\n/g, '\n> ')}`;
    const fullBody = comment.trim() ? `${comment.trim()}\n\n${quoted}` : quoted;
    const { error } = await chatApi.client.from('chat_messages').insert({
      channel_id: target.id,
      author_id: user.id,
      body: fullBody,
    });
    setSending(false);
    if (error) { toast.error('Erro ao encaminhar: ' + error.message); return; }
    toast.success(`Encaminhado para ${target.name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Forward className="h-4 w-4" /> Encaminhar mensagem</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground max-h-24 overflow-auto whitespace-pre-wrap">
            {stripMentionMarkup(message.body || '') || '[anexo]'}
          </div>
          <div>
            <Input placeholder="Buscar canal ou DM..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ScrollArea className="h-44 border rounded-md">
            <ul className="py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-3 text-xs text-muted-foreground text-center">Nenhum canal encontrado.</li>
              )}
              {filtered.map(c => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setTarget(c)}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between ${
                      target?.id === c.id ? 'bg-primary/15 text-foreground font-semibold' : 'hover:bg-muted/60'
                    }`}
                  >
                    <span className="truncate">{c.type === 'direct' ? '💬 ' : '#'}{c.name}</span>
                    {c.id === message.channel_id && (
                      <span className="text-[10px] text-muted-foreground">(origem)</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
          <Textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Adicionar comentário (opcional)..."
            rows={2}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={send} disabled={!target || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Forward className="h-4 w-4 mr-2" />}
            Encaminhar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
