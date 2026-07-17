import { useState } from 'react';
import { ChevronDown, ChevronRight, HelpCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GuideStep {
  icon: LucideIcon;
  title: string;
  description: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan';
}

interface FeatureGuideCardProps {
  title: string;
  icon?: LucideIcon;
  steps: GuideStep[];
}

const colorMap: Record<string, string> = {
  blue: 'bg-primary/10 text-primary',
  green: 'bg-emerald-500/10 text-emerald-600',
  amber: 'bg-amber-500/10 text-amber-600',
  red: 'bg-red-500/10 text-red-600',
  purple: 'bg-primary/10 text-primary',
  cyan: 'bg-sky-500/10 text-sky-600',
};

export default function FeatureGuideCard({ title, icon: TitleIcon = HelpCircle, steps }: FeatureGuideCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-primary/15 bg-primary/[0.03] transition-all duration-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left rounded-lg hover:bg-primary/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <TitleIcon className="h-3.5 w-3.5 text-primary/70" />
          <span className="text-xs font-medium text-muted-foreground">{title}</span>
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 pt-0.5">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step, i) => {
              const StepIcon = step.icon;
              const cls = colorMap[step.color || 'blue'];
              return (
                <div key={i} className="flex items-start gap-2.5 rounded-md border border-border/40 bg-card/50 p-2.5">
                  <div className={cn('flex items-center justify-center h-7 w-7 rounded shrink-0', cls)}>
                    <StepIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-foreground/90 leading-tight">{step.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
