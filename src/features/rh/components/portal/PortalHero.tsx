import { ReactNode } from 'react';

interface PortalHeroProps {
  /** Texto do "eyebrow" — ex: "Neovale · Portal do Diretor". */
  eyebrow?: string;
  /** Título principal (h1). */
  title: string;
  /** Subtítulo em itálico. */
  subtitle?: string;
  /** Conteúdo opcional à direita do bloco de texto (ex: badge, contador). */
  trailing?: ReactNode;
  /** Conteúdo opcional abaixo (ex: ações, KPIs, stepper). */
  children?: ReactNode;
}

/**
 * Cabeçalho institucional Neovale (tema light).
 * Card branco com header dark blue arredondado, logo Neovale,
 * faixa de luz amarela superior e barras diagonais da identidade.
 */
export function PortalHero({
  eyebrow = 'Neovale · Portal do Diretor',
  title,
  subtitle,
  trailing,
  children,
}: PortalHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_-12px_rgba(27,30,44,0.18)] ring-1 ring-[#1B1E2C]/8">
      {/* Header dark blue */}
      <div className="relative bg-[#1B1E2C] text-white px-6 py-7 sm:px-8 overflow-hidden">
        {/* Faixa amarela superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FFDA45]" />

        {/* Barras diagonais amarelas */}
        <div className="absolute top-6 right-8 flex gap-1.5 rotate-[-20deg] pointer-events-none">
          <span className="block h-8 w-1 bg-[#FFDA45] rounded-full" />
          <span className="block h-8 w-1 bg-[#FFDA45] rounded-full" />
          <span className="block h-8 w-1 bg-[#FFDA45] rounded-full" />
        </div>

        {/* Glow */}
        <div className="absolute -bottom-16 -right-10 w-64 h-64 rounded-full bg-[#FFDA45]/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-[0_8px_30px_-6px_rgba(255,218,69,0.7)] flex-shrink-0 overflow-hidden ring-2 ring-[#FFDA45]/40">
            <img
              src="/nexa-logo.svg"
              alt="Neovale"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#FFDA45]">
              {eyebrow}
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-0.5 break-words">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-white/70 italic mt-1">{subtitle}</p>
            )}
          </div>
          {trailing && <div className="flex-shrink-0">{trailing}</div>}
        </div>
      </div>

      {/* Slot inferior em fundo claro */}
      {children && (
        <div className="relative px-6 py-5 sm:px-8 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}
