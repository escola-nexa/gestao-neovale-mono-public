import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Phone, MessageSquare, Send, History } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { professoresApi } from '@/features/professores/api';
import { useAuth } from '@/contexts/AuthContext';
import type { ProfessorData } from '../types';

const CONTACT_TYPES = [
  { value: 'CALL', label: 'Ligação' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'IN_PERSON', label: 'Presencial' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'OTHER', label: 'Outro' },
] as const;

const labelOf = (v: string) => CONTACT_TYPES.find(t => t.value === v)?.label || v;

const schema = z.object({
  contact_type: z.string().min(1),
  description: z.string().trim().min(3, 'Descreva o contato (mín. 3 caracteres)').max(2000, 'Máximo de 2000 caracteres'),
});

interface Props {
  professor: ProfessorData | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

const formatPhone = (raw?: string | null) => {
  if (!raw) return '';
  const d = raw.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return raw;
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function ContactLogDialog({ professor, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [contactType, setContactType] = useState('CALL');
  const [description, setDescription] = useState('');

  const phone = professor?.phone || '';
  const phoneDigits = phone.replace(/\D/g, '');

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['professor-contact-logs', professor?.id],
    queryFn: async () => {
      if (!professor?.id) return [];
      const { data, error } = await supabase
        .from('professor_contact_logs')
        .select('*')
        .eq('professor_id', professor.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!professor?.id && open,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse({ contact_type: contactType, description });
      if (!parsed.success) throw new Error(parsed.error.errors[0].message);
      if (!professor) throw new Error('Professor inválido');
      if (!user?.id) throw new Error('Sessão inválida');
      if (!professor.organization_id) throw new Error('Organização não identificada');

      const { error } = await professoresApi.client.from('professor_contact_logs').insert({
        organization_id: professor.organization_id,
        professor_id: professor.id,
        contact_type: contactType,
        description: description.trim(),
        created_by: user.id,
        created_by_name: user.nomeCompleto || user.email || 'Usuário',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contato registrado.');
      setDescription('');
      setContactType('CALL');
      qc.invalidateQueries({ queryKey: ['professor-contact-logs', professor?.id] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao registrar contato'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registro de contato</DialogTitle>
          <DialogDescription>
            {professor?.full_name}
            {phone && <span className="block text-xs mt-1">Telefone: {formatPhone(phone)}</span>}
          </DialogDescription>
        </DialogHeader>

        {phoneDigits && (
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={`tel:${phoneDigits}`}><Phone className="w-4 h-4 mr-2" />Ligar</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={`https://wa.me/55${phoneDigits}`} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="w-4 h-4 mr-2" />WhatsApp
              </a>
            </Button>
          </div>
        )}

        <div className="space-y-3 border rounded-md p-3 bg-muted/20">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Tipo de contato</label>
            <Select value={contactType} onValueChange={setContactType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o que foi tratado, decisões, próximos passos..."
              rows={4}
              maxLength={2000}
            />
            <span className="text-xs text-muted-foreground text-right">{description.length}/2000</span>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Registrar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <History className="w-4 h-4" /> Histórico de contatos
            {logs.length > 0 && <Badge variant="secondary">{logs.length}</Badge>}
          </h4>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum contato registrado ainda.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l: any) => (
                <li key={l.id} className="border rounded-md p-3 bg-card">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline">{labelOf(l.contact_type)}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{l.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">por {l.created_by_name || 'Usuário'}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
