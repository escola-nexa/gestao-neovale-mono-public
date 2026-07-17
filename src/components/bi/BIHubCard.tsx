import { Card, CardContent } from '@/components/ui/card';
import { GlowEffect } from '@/components/ui/glow-effect';
import { cn } from '@/lib/utils';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BIHubCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  route: string;
  colorStyle: keyof typeof colorMap;
  badge?: string;
  ctaLabel?: string;
}

const colorMap = {
  violet: {
    gradient: 'from-violet-50/80 to-violet-100/40',
    border: 'border-violet-200/60',
    hoverBorder: 'hover:border-violet-300/80',
    iconBg: 'bg-gradient-to-br from-violet-100 to-violet-200/60',
    iconBorder: 'border-violet-200/50',
    iconText: 'text-violet-600',
    title: 'text-violet-950',
    glow: 'hsl(263, 84%, 58%)',
    shadow: 'hover:shadow-violet-200/40',
    ctaText: 'text-violet-600',
  },
  indigo: {
    gradient: 'from-indigo-50/80 to-indigo-100/40',
    border: 'border-indigo-200/60',
    hoverBorder: 'hover:border-indigo-300/80',
    iconBg: 'bg-gradient-to-br from-indigo-100 to-indigo-200/60',
    iconBorder: 'border-indigo-200/50',
    iconText: 'text-indigo-600',
    title: 'text-indigo-950',
    glow: 'hsl(235, 70%, 55%)',
    shadow: 'hover:shadow-indigo-200/40',
    ctaText: 'text-indigo-600',
  },
  blue: {
    gradient: 'from-blue-50/80 to-blue-100/40',
    border: 'border-blue-200/60',
    hoverBorder: 'hover:border-blue-300/80',
    iconBg: 'bg-gradient-to-br from-blue-100 to-blue-200/60',
    iconBorder: 'border-blue-200/50',
    iconText: 'text-blue-600',
    title: 'text-blue-950',
    glow: 'hsl(217, 80%, 55%)',
    shadow: 'hover:shadow-blue-200/40',
    ctaText: 'text-blue-600',
  },
  purple: {
    gradient: 'from-purple-50/80 to-purple-100/40',
    border: 'border-purple-200/60',
    hoverBorder: 'hover:border-purple-300/80',
    iconBg: 'bg-gradient-to-br from-purple-100 to-purple-200/60',
    iconBorder: 'border-purple-200/50',
    iconText: 'text-purple-600',
    title: 'text-purple-950',
    glow: 'hsl(270, 70%, 55%)',
    shadow: 'hover:shadow-purple-200/40',
    ctaText: 'text-purple-600',
  },
  red: {
    gradient: 'from-red-50/80 to-rose-100/40',
    border: 'border-red-200/60',
    hoverBorder: 'hover:border-red-300/80',
    iconBg: 'bg-gradient-to-br from-red-100 to-rose-200/60',
    iconBorder: 'border-red-200/50',
    iconText: 'text-red-600',
    title: 'text-red-950',
    glow: 'hsl(0, 70%, 55%)',
    shadow: 'hover:shadow-red-200/40',
    ctaText: 'text-red-600',
  },
  emerald: {
    gradient: 'from-emerald-50/80 to-emerald-100/40',
    border: 'border-emerald-200/60',
    hoverBorder: 'hover:border-emerald-300/80',
    iconBg: 'bg-gradient-to-br from-emerald-100 to-emerald-200/60',
    iconBorder: 'border-emerald-200/50',
    iconText: 'text-emerald-600',
    title: 'text-emerald-950',
    glow: 'hsl(160, 70%, 40%)',
    shadow: 'hover:shadow-emerald-200/40',
    ctaText: 'text-emerald-600',
  },
  cyan: {
    gradient: 'from-cyan-50/80 to-cyan-100/40',
    border: 'border-cyan-200/60',
    hoverBorder: 'hover:border-cyan-300/80',
    iconBg: 'bg-gradient-to-br from-cyan-100 to-cyan-200/60',
    iconBorder: 'border-cyan-200/50',
    iconText: 'text-cyan-600',
    title: 'text-cyan-950',
    glow: 'hsl(190, 70%, 50%)',
    shadow: 'hover:shadow-cyan-200/40',
    ctaText: 'text-cyan-600',
  },
  amber: {
    gradient: 'from-amber-50/80 to-amber-100/40',
    border: 'border-amber-200/60',
    hoverBorder: 'hover:border-amber-300/80',
    iconBg: 'bg-gradient-to-br from-amber-100 to-amber-200/60',
    iconBorder: 'border-amber-200/50',
    iconText: 'text-amber-600',
    title: 'text-amber-950',
    glow: 'hsl(38, 80%, 50%)',
    shadow: 'hover:shadow-amber-200/40',
    ctaText: 'text-amber-600',
  },
  slate: {
    gradient: 'from-slate-50/80 to-slate-100/40',
    border: 'border-slate-200/60',
    hoverBorder: 'hover:border-slate-300/80',
    iconBg: 'bg-gradient-to-br from-slate-100 to-slate-200/60',
    iconBorder: 'border-slate-200/50',
    iconText: 'text-slate-600',
    title: 'text-slate-950',
    glow: 'hsl(215, 20%, 50%)',
    shadow: 'hover:shadow-slate-200/40',
    ctaText: 'text-slate-600',
  },
  yellow: {
    gradient: 'from-yellow-50/80 to-amber-50/40',
    border: 'border-yellow-200/60',
    hoverBorder: 'hover:border-yellow-300/80',
    iconBg: 'bg-gradient-to-br from-yellow-100 to-amber-100/60',
    iconBorder: 'border-yellow-200/50',
    iconText: 'text-yellow-600',
    title: 'text-yellow-950',
    glow: 'hsl(45, 90%, 50%)',
    shadow: 'hover:shadow-yellow-200/40',
    ctaText: 'text-yellow-600',
  },
  teal: {
    gradient: 'from-teal-50/80 to-teal-100/40',
    border: 'border-teal-200/60',
    hoverBorder: 'hover:border-teal-300/80',
    iconBg: 'bg-gradient-to-br from-teal-100 to-teal-200/60',
    iconBorder: 'border-teal-200/50',
    iconText: 'text-teal-600',
    title: 'text-teal-950',
    glow: 'hsl(170, 60%, 42%)',
    shadow: 'hover:shadow-teal-200/40',
    ctaText: 'text-teal-600',
  },
  rose: {
    gradient: 'from-rose-50/80 to-rose-100/40',
    border: 'border-rose-200/60',
    hoverBorder: 'hover:border-rose-300/80',
    iconBg: 'bg-gradient-to-br from-rose-100 to-rose-200/60',
    iconBorder: 'border-rose-200/50',
    iconText: 'text-rose-600',
    title: 'text-rose-950',
    glow: 'hsl(350, 70%, 55%)',
    shadow: 'hover:shadow-rose-200/40',
    ctaText: 'text-rose-600',
  },
  deep_violet: {
    gradient: 'from-violet-50/80 to-purple-100/40',
    border: 'border-violet-300/60',
    hoverBorder: 'hover:border-violet-400/80',
    iconBg: 'bg-gradient-to-br from-violet-200 to-purple-200/60',
    iconBorder: 'border-violet-300/50',
    iconText: 'text-violet-700',
    title: 'text-violet-950',
    glow: 'hsl(263, 84%, 48%)',
    shadow: 'hover:shadow-violet-300/40',
    ctaText: 'text-violet-700',
  },
  gray: {
    gradient: 'from-gray-50/80 to-gray-100/40',
    border: 'border-gray-200/60',
    hoverBorder: 'hover:border-gray-300/80',
    iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200/60',
    iconBorder: 'border-gray-200/50',
    iconText: 'text-gray-600',
    title: 'text-gray-950',
    glow: 'hsl(220, 10%, 50%)',
    shadow: 'hover:shadow-gray-200/40',
    ctaText: 'text-gray-600',
  },
};

export function BIHubCard({
  title,
  subtitle,
  icon: Icon,
  route,
  colorStyle,
  badge,
  ctaLabel = 'Abrir análise',
}: BIHubCardProps) {
  const navigate = useNavigate();
  const colors = colorMap[colorStyle] || colorMap.violet;

  return (
    <Card
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 ease-out',
        'bg-gradient-to-br',
        colors.gradient,
        colors.border,
        colors.hoverBorder,
        colors.shadow,
        'hover:shadow-xl hover:-translate-y-1',
        'min-h-[180px]'
      )}
      onClick={() => navigate(route)}
    >
      {/* Glow effect */}
      <GlowEffect
        color={colors.glow}
        mode="static"
        blur="soft"
        intensity="low"
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      />

      <CardContent className="relative z-10 flex flex-col justify-between p-6 h-full">
        {/* Top section */}
        <div className="flex items-start gap-4">
          {/* Icon container */}
          <div
            className={cn(
              'flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110',
              colors.iconBg,
              colors.iconBorder
            )}
          >
            <Icon className={cn('h-7 w-7', colors.iconText)} />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={cn(
                  'font-bold text-[15px] leading-tight transition-colors duration-200',
                  colors.title
                )}
              >
                {title}
              </h3>
              {badge && (
                <span className="flex-shrink-0 rounded-full bg-white/70 border border-current/10 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {badge}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground line-clamp-2">
              {subtitle}
            </p>
          </div>
        </div>

        {/* CTA Footer */}
        <div
          className={cn(
            'mt-5 flex items-center gap-1.5 text-xs font-semibold tracking-wide opacity-60 transition-all duration-300 group-hover:opacity-100',
            colors.ctaText
          )}
        >
          <span>{ctaLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </div>
      </CardContent>
    </Card>
  );
}
