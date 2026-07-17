import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CHANNEL_TYPE_LABELS, type ChatChannelType } from '../types';
import { AddMembersDialog } from './AddMembersDialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Quando definido, em vez de navegar para /chat/:id após criar o canal,
   * apenas chama este callback (popup flutuante do chat). */
  onChannelReady?: (channelId: string) => void;
}

const TYPE_HINTS: Record<string, string> = {
  professores: 'Visível para professores adicionados',
  coordenacao: 'Coordenadores e gestão',
  rh: 'Recursos Humanos',
  geral: 'Canal aberto da organização',
  escola: 'Vinculado a uma escola',
  curso: 'Vinculado a um curso',
};

export function CreateChannelDialog({ open, onOpenChange, onChannelReady }: Props) {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChatChannelType>('professores');
  const [isPrivate, setIsPrivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdChannelId, setCreatedChannelId] = useState<string | null>(null);

  const reset = () => {
    setName(''); setDescription(''); setType('professores'); setIsPrivate(true);
    setCreatedChannelId(null);
  };

  const submit = async () => {
    if (!user || !organizationId || !name.trim()) return;
    setSaving(true);
    try {
      const { data: ch, error } = await supabase
        .from('chat_channels')
        .insert({
          organization_id: organizationId,
          name: name.trim(),
          description: description.trim() || null,
          type,
          is_private: isPrivate,
          created_by: user.id,
        })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!ch) throw new Error('Não foi possível criar o canal.');
      toast.success('Canal criado. Adicione pessoas ou pule.');
      onOpenChange(false);
      setCreatedChannelId(ch.id);
    } catch (err: any) {
      toast.error('Erro ao criar canal: ' + (err?.message || 'tente novamente.'));
    } finally { setSaving(false); }
  };

  const finish = () => {
    const id = createdChannelId;
    reset();
    if (!id) return;
    if (onChannelReady) onChannelReady(id);
    else navigate(`/chat/${id}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
        <DialogContent aria-describedby={undefined} className="max-w-md">
          <DialogHeader><DialogTitle>Novo canal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Coordenação Geral" autoFocus />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={v => setType(v as ChatChannelType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CHANNEL_TYPE_LABELS) as ChatChannelType[]).filter(t => t !== 'direct').map(t => (
                    <SelectItem key={t} value={t}>
                      <div className="flex flex-col">
                        <span>{CHANNEL_TYPE_LABELS[t]}</span>
                        {TYPE_HINTS[t] && (
                          <span className="text-[10px] text-muted-foreground">{TYPE_HINTS[t]}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Para que serve este canal?" />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <div className="text-sm font-medium">Canal privado</div>
                <div className="text-[11px] text-muted-foreground">
                  {isPrivate ? 'Apenas membros adicionados podem ver e postar.' : 'Visível para toda a organização.'}
                </div>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              No próximo passo você poderá adicionar pessoas com busca por nome e perfil.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
            <Button onClick={submit} disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar e adicionar pessoas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createdChannelId && organizationId && (
        <AddMembersDialog
          open={!!createdChannelId}
          onOpenChange={(v) => { if (!v) finish(); }}
          channelId={createdChannelId}
          organizationId={organizationId}
          onAdded={finish}
        />
      )}
    </>
  );
}
