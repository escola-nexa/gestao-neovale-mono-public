import { cn } from '@/lib/utils';

interface GlowEffectProps {
  color?: string;
  mode?: 'static' | 'breathe';
  blur?: 'soft' | 'medium' | 'strong';
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlowEffect({
  color = 'hsl(var(--primary))',
  mode = 'static',
  blur = 'soft',
  className,
  intensity = 'low',
}: GlowEffectProps) {
  const blurMap = {
    soft: 'blur-[30px]',
    medium: 'blur-[50px]',
    strong: 'blur-[80px]',
  };

  const opacityMap = {
    low: 'opacity-[0.08]',
    medium: 'opacity-[0.14]',
    high: 'opacity-[0.22]',
  };

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-inherit overflow-hidden',
        className
      )}
      aria-hidden
    >
      <div
        className={cn(
          'absolute inset-0 rounded-[inherit] transition-opacity duration-500',
          blurMap[blur],
          opacityMap[intensity],
          mode === 'breathe' && 'animate-pulse'
        )}
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}, transparent 70%)` }}
      />
    </div>
  );
}
