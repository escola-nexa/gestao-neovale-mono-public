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
import { UserPlus, Activity, AlertTriangle, CheckCircle2, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  selectedIds: string[];
  selectedTickets: any[];
  onClear: () => void;
}

const statusOptions = [
  { value: 'aberto', label: 'Aberto' },
  { value: 'em_atendimento', label: 'Em Atendimento' },
  { value: 'aguardando_escola', label: 'Aguardando Escola' },
  { value: 'resolvido', label: 'Resolvido' },
  { value: 'cancelado', label: 'Cancelado' },
] as const;

const priorityOptions = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
] as const;

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function TicketBulkActionBar({ selectedIds, selectedTickets, onClear }: Props) {
  const { organizationId } = useOrganization();
  const { bulkUpdate } = useTicketMutations();
  const [search, setSearch] = useState('');

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

  const hasCritical = selectedTickets.some(t => t.priority === 'critica');

  const handleAssign = async (userId: string | null) => {
    await bulkUpdate(selectedIds, { nexa_responsible_id: userId });
    onClear();
  };

  const handleStatus = async (status: string) => {
    if (status === 'resolvido' && hasCritical) {
      const ok = window.confirm(`Você está resolvendo ${selectedTickets.length} ticket(s), incluindo crítico(s). Confirmar?`);
      if (!ok) return;
    }
    const patch: any = { status };
    if (status === 'resolvido' || status === 'cancelado') patch.closed_at = new Date().toISOString();
    else patch.closed_at = null;
    await bulkUpdate(selectedIds, patch);
    onClear();
  };

  const handlePriority = async (priority: string) => {
    await bulkUpdate(selectedIds, { priority: priority as any });
    onClear();
  };

  const count = selectedIds.length;

  return (
    <div className={cn(
      'sticky top-2 z-20 flex items-center gap-2 px-4 py-2.5 rounded-xl',
      'bg-primary text-primary-foreground shadow-lg border border-primary/30',
      'animate-in fade-in slide-in-from-top-2',
    )}>
      <CheckCircle2 className="h-4 w-4" />
      <span className="text-sm font-medium">
        {count} ticket{count !== 1 ? 's' : ''} selecionado{count !== 1 ? 's' : ''}
      </span>

      <div className="ml-3 flex items-center gap-1.5">
        {/* Atribuir */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="secondary" className="h-8 gap-1.5">
              <UserPlus className="h-3.5 w-3.5" /> Atribuir
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
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
              <button
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-xs text-destructive"
                onClick={() => handleAssign(null)}
              >
                <X className="h-3.5 w-3.5" /> Remover responsável
              </button>
              {filteredMembers.map((m: any) => (
                <button
                  key={m.id}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-left"
                  onClick={() => handleAssign(m.id)}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(m.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-foreground">{m.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="h-8 gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Mudar para</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {statusOptions.map(s => (
              <DropdownMenuItem key={s.value} onClick={() => handleStatus(s.value)} className="text-xs cursor-pointer">
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Prioridade */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="h-8 gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Prioridade
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">Definir</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {priorityOptions.map(p => (
              <DropdownMenuItem key={p.value} onClick={() => handlePriority(p.value)} className="text-xs cursor-pointer">
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Resolver direto */}
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5"
          onClick={() => handleStatus('resolvido')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Resolver
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto h-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        onClick={onClear}
      >
        <X className="h-4 w-4 mr-1" /> Limpar
      </Button>
    </div>
  );
}
