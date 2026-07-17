import { ChevronLeft, Library, Plus, LayoutGrid, Search, Command, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  onBack?: () => void;
  onClassicView: () => void;
  onNewContent?: () => void;
  onManage?: () => void;
  /** Ação primária extra (ex: "Reproduzir 1ª aula") */
  primaryAction?: { label: string; onClick: () => void; icon?: LucideIcon };
  /** Quando informado, embute o campo de busca dentro do hero. */
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  /** Texto curto do badge superior (ex: "Plataforma Neovale"). */
  eyebrow?: string;
  /** Quando true, divide o título em duas linhas e destaca a 2ª palavra em amarelo. */
  highlightSecondWord?: boolean;
  /** Slot opcional renderizado abaixo do hero (ex: breadcrumb com siblings). */
  breadcrumbSlot?: ReactNode;
  /** Abre command palette (⌘K). */
  onOpenPalette?: () => void;
}

export function HeroBanner({
  title, description, icon: Icon = Library, onBack, onClassicView, onNewContent, onManage,
  primaryAction, search, eyebrow, highlightSecondWord, breadcrumbSlot, onOpenPalette,
}: Props) {
  const PrimaryIcon = primaryAction?.icon;

  let titleLead = title;
  let titleAccent: string | null = null;
  if (highlightSecondWord) {
    const parts = title.trim().split(/\s+/);
    if (parts.length >= 2) {
      titleAccent = parts.slice(-1)[0];
      titleLead = parts.slice(0, -1).join(' ');
    }
  }

  return (
    <div className="space-y-3">
      {breadcrumbSlot}

      {/* Hero compacto */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1B1E2C] text-white shadow-lg">
        {/* glow */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-[90px]" aria-hidden />

        <div className="relative px-5 sm:px-7 py-5 sm:py-6 space-y-4">
          {/* Linha 1: ícone + nome */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-primary text-[#1B1E2C] flex items-center justify-center shrink-0 shadow-md">
              <Icon className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-primary/90 mb-0.5">
                  {eyebrow}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-[1.15] font-sora break-words">
                {titleLead}{titleAccent && ' '}
                {titleAccent && <span className="text-primary">{titleAccent}</span>}
              </h1>
              {description && (
                <p className="text-xs sm:text-sm text-white/65 mt-1 break-words">{description}</p>
              )}
            </div>
          </div>

          {/* Linha 2: busca + ações */}
          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <div className="relative flex-1 min-w-[220px] group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-primary transition-colors" />
                <Input
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder ?? 'Pesquisar…'}
                  className={cn(
                    'h-10 pl-9 pr-12 text-sm rounded-xl',
                    'bg-black/25 border border-white/10 text-white placeholder:text-white/40',
                    'focus-visible:bg-black/35 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/30',
                  )}
                />
                {onOpenPalette && (
                  <button
                    type="button"
                    onClick={onOpenPalette}
                    title="Busca rápida (⌘K)"
                    className="hidden sm:flex absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2 items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white/80"
                  >
                    <Command className="h-3 w-3" /> K
                  </button>
                )}
              </div>
            )}

            {onBack && (
              <Button
                type="button" variant="secondary" size="sm"
                onClick={onBack}
                title="Voltar para o nível anterior"
                className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-10 px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            )}
            {primaryAction && (
              <Button
                type="button" size="sm"
                onClick={primaryAction.onClick}
                title={primaryAction.label}
                className="bg-primary text-[#1B1E2C] hover:bg-primary/90 font-bold rounded-xl h-10 px-3 shadow-lg shadow-primary/20"
              >
                {PrimaryIcon && <PrimaryIcon className="h-4 w-4 mr-1.5" />} {primaryAction.label}
              </Button>
            )}
            <Button
              type="button" variant="secondary" size="sm"
              onClick={onClassicView}
              className="bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl h-10 px-3"
              title="Ver como lista clássica"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" /> Visão clássica
            </Button>
            {onNewContent && (
              <Button
                type="button" size="sm"
                onClick={onNewContent}
                title="Cadastrar novo conteúdo"
                className="bg-primary text-[#1B1E2C] hover:bg-primary/90 font-bold rounded-xl h-10 px-3 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Novo conteúdo
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
