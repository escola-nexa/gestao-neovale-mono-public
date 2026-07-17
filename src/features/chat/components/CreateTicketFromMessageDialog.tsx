import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Ticket as TicketIcon } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { ChatMessage } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  message: ChatMessage;
  channelId: string;
  organizationId: string;
}

const PRIORITIES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

export function CreateTicketFromMessageDialog({
  open, onOpenChange, message, channelId, organizationId,
}: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [categoryId, setCategoryId] = useState<string>('');
  const [type, setType] = useState<'interno' | 'escola'>('interno');
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const baseTitle = (message.body || 'Mensagem do chat').slice(0, 80);
    const permalink = `${window.location.origin}/chat/${channelId}?message=${message.id}`;
    setTitle(baseTitle);
    setDescription(
      `Origem: mensagem do chat institucional\nAutor: ${message.author_name || 'Usuário'}\nData: ${new Date(message.created_at).toLocaleString('pt-BR')}\n\nConteúdo:\n${message.body || '(sem texto)'}\n\nLink: ${permalink}`
    );
    setPriority('media');
    setType('interno');
    (async () => {
      const { data } = await supabase
        .from('ticket_categories')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name');
      setCategories(data || []);
      if (data && data[0]) setCategoryId(data[0].id);
    })();
  }, [open, message, channelId, organizationId]);

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error('Informe um título'); return; }
    setSaving(true);
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        organization_id: organizationId,
        title: title.trim().slice(0, 200),
        description,
        priority,
        type,
        category_id: categoryId || null,
        opened_by_id: user.id,
        status: 'aberto',
      })
      .select('id')
      .maybeSingle();
    if (error || !ticket) {
      setSaving(false);
      toast.error('Erro ao criar ticket: ' + (error?.message || 'desconhecido'));
      return;
    }
    await chatApi.client.from('chat_message_tickets').insert({
      message_id: message.id,
      ticket_id: ticket.id,
      created_by: user.id,
    });
    setSaving(false);
    toast.success('Ticket criado e vinculado à mensagem');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TicketIcon className="h-4 w-4" /> Abrir ticket a partir desta mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="t-title">Título</Label>
            <Input id="t-title" value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="t-desc">Descrição</Label>
            <Textarea id="t-desc" rows={6} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno</SelectItem>
                  <SelectItem value="escola">Escola</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Criar ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
