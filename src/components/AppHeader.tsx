import { useAuth } from '@/contexts/AuthContext';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, ChevronDown, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import nexaLogo from '@/assets/nexa-logo.svg';

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getPerfilLabel = (perfil: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      coordenador: 'Coordenador',
      rh: 'R.H.',
      professor: 'Professor',
    };
    return labels[perfil] || perfil;
  };

  return (
    <header className="h-16 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10 relative">
      {/* Linha amarela editorial no topo (assinatura folder Neovale) */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

      <div className="flex items-center gap-3">
        <SidebarTrigger className="-ml-1" />
        {/* Mini-marca: 3 barras diagonais */}
        <div className="hidden sm:flex items-center gap-1.5 ml-2 pl-3 border-l border-border/60">
          <div className="flex gap-[3px]">
            <span className="w-[3px] h-4 bg-primary rotate-[-15deg] rounded-sm" />
            <span className="w-[3px] h-4 bg-primary/70 rotate-[-15deg] rounded-sm" />
            <span className="w-[3px] h-4 bg-primary/40 rotate-[-15deg] rounded-sm" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            Neovale
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-auto py-1.5 px-2 rounded-lg hover:bg-primary/5">
              <Avatar className="h-9 w-9 ring-2 ring-primary/30 ring-offset-2 ring-offset-card">
                <AvatarFallback className="bg-gradient-to-br from-primary to-[hsl(45_92%_49%)] text-primary-foreground text-xs font-bold">
                  {user ? getInitials(user.nomeCompleto) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold leading-tight">{user?.nomeCompleto}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight font-medium">
                  {user ? getPerfilLabel(user.perfil) : ''}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/meu-perfil')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes/notificacoes')}>
              <Bell className="mr-2 h-4 w-4" />
              Notificações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
