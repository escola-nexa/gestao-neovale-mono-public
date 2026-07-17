import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderBadge {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'info' | 'danger';
}

export interface PageHeaderProps {
  breadcrumbs?: PageHeaderBreadcrumb[];
  title: string;
  description?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'hero' | 'compact';
  badge?: PageHeaderBadge;
  backTo?: string;
  actions?: ReactNode;
  /** Custom highlight (e.g. "Curso X — Disciplinas") shown next to the title in muted tone */
  eyebrow?: string;
  className?: string;
}

const toneClasses: Record<NonNullable<PageHeaderBadge['tone']>, string> = {
  default: 'bg-secondary text-secondary-foreground border-border',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning-foreground border-warning/40',
  info: 'bg-primary/15 text-primary-foreground border-primary/40',
  danger: 'bg-destructive/15 text-destructive border-destructive/30',
};

export function PageHeader({
  breadcrumbs,
  title,
  description,
  icon: Icon,
  variant = 'default',
  badge,
  backTo,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  const headingTextClass = isHero ? 'text-white' : 'text-foreground';
  const subTextClass = isHero ? 'text-white/65' : 'text-muted-foreground';
  const breadcrumbBaseClass = isHero ? 'text-white/55' : 'text-muted-foreground';

  return (
    <header
      className={cn(
        'relative overflow-hidden',
        isHero
          ? 'bg-nexa-gradient text-white border border-white/5 rounded-xl px-5 sm:px-7 py-6 sm:py-7 shadow-2xl shadow-[hsl(228_27%_11%)]/20'
          : 'pb-4',
        className,
      )}
    >
      {/* Hero decorative diagonal yellow block */}
      {isHero && (
        <>
          <div
            aria-hidden
            className="absolute -bottom-16 -right-12 w-[260px] h-[260px] neovale-yellow-block opacity-95 pointer-events-none"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
          />
          <div
            aria-hidden
            className="absolute bottom-5 right-5 hidden sm:flex gap-1.5 opacity-90 z-[1]"
          >
            <div className="w-1.5 h-10 bg-[hsl(228_27%_11%)] rotate-[-15deg]" />
            <div className="w-1.5 h-10 bg-[hsl(228_27%_11%)] rotate-[-15deg]" />
            <div className="w-1.5 h-10 bg-[hsl(228_27%_11%)] rotate-[-15deg]" />
          </div>
          <div
            aria-hidden
            className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
        </>
      )}

      <div className={cn('relative z-[2]', isHero && 'max-w-3xl')}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-2">
            <BreadcrumbList
              className={cn(
                'text-[10px] sm:text-[11px] uppercase tracking-[0.18em] font-semibold',
                breadcrumbBaseClass,
              )}
            >
              {breadcrumbs.map((item, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <BreadcrumbItem key={`${item.label}-${index}`} className="gap-1.5">
                    {index > 0 && (
                      <BreadcrumbSeparator
                        className={cn(isHero ? 'text-white/40' : 'text-muted-foreground/60')}
                      />
                    )}
                    {isLast || !item.href ? (
                      <BreadcrumbPage
                        className={cn(
                          'font-bold',
                          isHero ? 'text-white' : 'text-foreground',
                        )}
                      >
                        {item.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          to={item.href}
                          className={cn(
                            'transition-colors hover:text-primary',
                            breadcrumbBaseClass,
                          )}
                        >
                          {item.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4 min-w-0">
            {backTo && (
              <Button
                type="button"
                variant={isHero ? 'outline' : 'ghost'}
                size="icon"
                onClick={() => navigate(backTo)}
                className={cn(
                  'shrink-0 mt-1',
                  isHero && 'border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white',
                )}
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Yellow vertical accent bar (assinatura editorial) */}
            <div
              aria-hidden
              className={cn(
                'shrink-0 w-1 self-stretch rounded-full',
                'bg-gradient-to-b from-[hsl(48_100%_64%)] to-[hsl(45_92%_49%)]',
                isHero ? 'shadow-[0_0_18px_hsl(48_100%_64%/0.55)]' : 'shadow-[0_0_10px_hsl(48_100%_64%/0.45)]',
                isCompact ? 'min-h-[2.25rem]' : 'min-h-[3rem]',
              )}
            />

            <div className="min-w-0 flex-1">
              {Icon && !isCompact && (
                <div
                  className={cn(
                    'inline-flex items-center justify-center mb-2 h-9 w-9 rounded-lg',
                    'bg-gradient-to-br from-[hsl(48_100%_64%)] to-[hsl(45_92%_49%)]',
                    'text-[hsl(228_24%_14%)] shadow-[0_4px_14px_-4px_hsl(48_100%_64%/0.5)]',
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1
                  className={cn(
                    'font-bold tracking-tight leading-tight',
                    isCompact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl',
                    headingTextClass,
                  )}
                  style={{ fontFamily: 'Sora, system-ui, sans-serif' }}
                >
                  {title}
                </h1>
                {eyebrow && (
                  <span
                    className={cn(
                      'text-base font-normal',
                      isHero ? 'text-white/55' : 'text-muted-foreground',
                    )}
                  >
                    — {eyebrow}
                  </span>
                )}
                {badge && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] uppercase tracking-wider font-bold border',
                      toneClasses[badge.tone || 'default'],
                    )}
                  >
                    {badge.label}
                  </Badge>
                )}
              </div>
              {description && !isCompact && (
                <p className={cn('mt-1.5 text-sm leading-relaxed', subTextClass)}>
                  {description}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>

      {/* Editorial bottom rule (linha + 3 barras diagonais) — somente no default */}
      {variant === 'default' && (
        <div className="page-header-rule mt-5" aria-hidden />
      )}
    </header>
  );
}

export default PageHeader;
