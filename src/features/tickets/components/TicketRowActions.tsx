import { supabase } from '@/integrations/supabase/client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ticketApi } from '@/features/tickets/api';
import { useOrganization } from '@/hooks/useOrganization';
import { useTicketMutations } from '../hooks/useTicketMutations';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Check, UserPlus, Activity, CheckCircle2, AlertCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  ticket: any;
  /** Compact: usado dentro do card kanban (sem labels). */
  compact?: boolean;
  className?: string;
}

const statusOptions: { value: string; label: string; tone: string }[] = [
  { value: 'aberto', label: 'Aberto', tone: 'text-blue-600' },
  { value: 'em_atendimento', label: 'Em Atendimento', tone: 'text-amber-600' },
  { value: 'aguardando_escola', label: 'Aguardando Escola', tone: 'text-purple-600' },
  { value: 'resolvido', label: 'Resolvido', tone: 'text-green-600' },
  { value: 'cancelado', label: 'Cancelado', tone: 'text-muted-foreground' },
];

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function TicketRowActions({ ticket, compact, className }: Props) {
  const { organizationId } = useOrganization();
  const { assignNexa, setStatus } = useTicketMutations();
  const [search, setSearch] = useState('');
  const [confirmResolve, setConfirmResolve] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['org-members-assign', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('organization_id', organizationId)
        .order('full_name');
      return (data || []).map((m: any) => ({ id: m.user_id, nome: m.full_name, email: m.email }));
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const s = search.toLowerCase();
    return members.filter((m: any) => m.nome?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s));
  }, [members, search]);

  const currentAssigneeName = members.find((m: any) => m.id === ticket.nexa_responsible_id)?.nome;
  const isResolved = ['resolvido', 'cancelado'].includes(ticket.status);

  const handleResolveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (ticket.priority === 'critica' && !confirmResolve) {
      setConfirmResolve(true);
      toast.warning('Ticket crítico — clique em Resolver novamente para confirmar', {
        duration: 4000,
        onAutoClose: () => setConfirmResolve(false),
      });
      return;
    }
    setConfirmResolve(false);
    setStatus(ticket.id, 'resolvido', ticket.status, ticket.closed_at);
  };

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const sizeCls = compact ? 'h-7 w-7 p-0' : 'h-8 px-2.5 gap-1.5';
  const iconCls = 'h-3.5 w-3.5';

  return (
    <div className={cn('flex items-center gap-1', className)} onClick={stop}>
      {/* Atribuir */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(sizeCls, 'text-muted-foreground hover:text-foreground hover:bg-accent')}
            onClick={stop}
            title="Atribuir responsável"
          >
            <UserPlus className={iconCls} />
            {!compact && <span className="text-xs">Atribuir</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end" onClick={stop} onKeyDown={stop}>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-8 h-8 text-xs"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {ticket.nexa_responsible_id && (
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-xs text-destructive"
                onClick={() => assignNexa(ticket.id, null, ticket.nexa_responsible_id, currentAssigneeName)}
              >
                <X className="h-3.5 w-3.5" /> Remover responsável
              </button>
            )}
            {filteredMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">Nenhum usuário</p>
            ) : (
              filteredMembers.map((m: any) => {
                const isCurrent = m.id === ticket.nexa_responsible_id;
                return (
                  <button
                    key={m.id}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-left"
                    onClick={() => assignNexa(ticket.id, m.id, ticket.nexa_responsible_id, m.nome)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(m.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{m.nome}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                    </div>
                    {isCurrent && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(sizeCls, 'text-muted-foreground hover:text-foreground hover:bg-accent')}
            onClick={stop}
            title="Mudar status"
          >
            <Activity className={iconCls} />
            {!compact && <span className="text-xs">Status</span>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" onClick={stop}>
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Mudar para</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statusOptions.map(s => (
            <DropdownMenuItem
              key={s.value}
              onClick={() => setStatus(ticket.id, s.value as any, ticket.status, ticket.closed_at)}
              className="text-xs cursor-pointer"
              disabled={s.value === ticket.status}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full mr-2', s.tone.replace('text-', 'bg-'))} />
              {s.label}
              {s.value === ticket.status && <Check className="h-3 w-3 ml-auto opacity-60" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resolver (atalho) */}
      {!isResolved && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(sizeCls, 'text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30',
            confirmResolve && 'bg-amber-100 dark:bg-amber-950/40 text-amber-700')}
          onClick={handleResolveClick}
          title={ticket.priority === 'critica' ? 'Crítico — clique 2x para confirmar' : 'Resolver ticket'}
        >
          {confirmResolve ? <AlertCircle className={iconCls} /> : <CheckCircle2 className={iconCls} />}
          {!compact && <span className="text-xs">{confirmResolve ? 'Confirmar' : 'Resolver'}</span>}
        </Button>
      )}
    </div>
  );
}
