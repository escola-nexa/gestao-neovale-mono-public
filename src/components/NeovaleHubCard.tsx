import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeovaleHubCardProps {
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
  tag: string;
  badge?: string;
  disabled?: boolean;
}

/**
 * Card padrão dark/editorial Neovale para telas-hub.
 * Usa forwardRef para permitir composição com Tooltip / Sidebar do Radix.
 */
export const NeovaleHubCard = forwardRef<HTMLButtonElement, NeovaleHubCardProps>(
  function NeovaleHubCard({ title, description, url, icon: Icon, tag, badge, disabled }, ref) {
    const navigate = useNavigate();

    return (
      <button
        ref={ref}
        type="button"
        onClick={() => !disabled && navigate(url)}
        disabled={disabled}
        className={cn(
          'group relative overflow-hidden text-left w-full',
          'rounded-2xl bg-[hsl(228_18%_14%)] text-white',
          'border border-white/5',
          'transition-all duration-300',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_20px_60px_-15px_hsl(48_100%_64%/0.4)]',
        )}
      >
        {/* Diagonal yellow accent (top-right) — Neovale signature */}
        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
          <div className="absolute top-4 right-4 flex gap-1 rotate-[-20deg]">
            <span className="block h-3 w-0.5 bg-primary rounded-full" />
            <span className="block h-3 w-0.5 bg-primary rounded-full" />
            <span className="block h-3 w-0.5 bg-primary rounded-full" />
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 group-hover:from-primary/[0.03] group-hover:to-primary/[0.08] transition-opacity duration-500" />

        <div className="relative p-6 flex flex-col gap-5 min-h-[220px]">
          <div className="flex items-start justify-between">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-[0_8px_24px_-6px_hsl(48_100%_64%/0.6)]">
              <Icon className="h-6 w-6 text-[hsl(228_18%_14%)]" />
            </div>
            <div className="flex flex-col items-end gap-1.5 mt-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                {tag}
              </span>
              {badge && (
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {badge}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <h3 className="text-2xl font-extrabold leading-[1.05] tracking-tight whitespace-pre-line">
              {title}
            </h3>
            <p className="text-sm text-white/60 leading-relaxed">
              {description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
              Acessar
            </span>
            <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary transition-colors duration-300">
              <ArrowUpRight className="h-4 w-4 text-white group-hover:text-[hsl(228_18%_14%)] transition-colors" />
            </div>
          </div>
        </div>
      </button>
    );
  },
);

/**
 * Header de seção editorial: barra amarela à esquerda + label mono uppercase.
 */
export const NeovaleSectionHeader = forwardRef<
  HTMLDivElement,
  { label: string; description?: string }
>(function NeovaleSectionHeader({ label, description }, ref) {
  return (
    <div ref={ref} className="flex items-start gap-3 mb-5">
      <span className="block w-1 h-10 bg-primary rounded-full mt-0.5 shrink-0" />
      <div>
        <h2 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-foreground">
          {label}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
});
