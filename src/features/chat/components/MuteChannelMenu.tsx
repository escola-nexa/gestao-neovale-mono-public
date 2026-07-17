import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props { channelId: string; }

export function MuteChannelMenu({ channelId }: Props) {
  const { user } = useAuth();
  const [mutedUntil, setMutedUntil] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('chat_channel_members').select('muted_until')
        .eq('channel_id', channelId).eq('user_id', user.id).maybeSingle();
      setMutedUntil(data?.muted_until || null);
    })();
  }, [channelId, user]);

  const isMuted = mutedUntil && new Date(mutedUntil) > new Date();

  const setMute = async (hours: number | null) => {
    if (!user) return;
    setBusy(true);
    const value = hours === null ? null : new Date(Date.now() + hours * 3600_000).toISOString();
    const { error } = await supabase
      .from('chat_channel_members')
      .update({ muted_until: value })
      .eq('channel_id', channelId).eq('user_id', user.id);
    setBusy(false);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setMutedUntil(value);
    toast.success(hours === null ? 'Notificações reativadas' : `Silenciado por ${hours}h`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          title={isMuted ? `Silenciado até ${format(parseISO(mutedUntil!), "dd/MM HH:mm", { locale: ptBR })}` : 'Silenciar canal'}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isMuted
            ? <BellOff className="h-4 w-4 text-amber-500" />
            : <Bell className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">
          {isMuted
            ? `Silenciado até ${format(parseISO(mutedUntil!), "dd/MM HH:mm", { locale: ptBR })}`
            : 'Silenciar notificações'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setMute(1)}>Por 1 hora</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMute(8)}>Por 8 horas</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMute(24)}>Por 24 horas</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMute(24 * 365)}>Até reativar</DropdownMenuItem>
        {isMuted && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setMute(null)} className="text-primary">
              Reativar notificações
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
