import { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PortalFooterNavProps {
  /** Callback do botão "Voltar". Se ausente, esconde o botão. */
  onBack?: () => void;
  backLabel?: string;
  /** Callback do botão "Salvar rascunho". Se ausente, esconde o botão. */
  onSaveDraft?: () => void;
  /** Callback do botão principal (próximo passo / enviar). */
  onNext?: () => void;
  nextLabel?: string;
  /** Ícone customizado para o botão principal. Default: ArrowRight. */
  nextIcon?: ReactNode;
  /** Desabilita o botão principal (loading, validação pendente, etc). */
  nextDisabled?: boolean;
  /** Cor do botão principal: 'primary' (amarelo Neovale) | 'success' (verde) */
  nextVariant?: 'primary' | 'success';
  /** Conteúdo extra opcional à esquerda (ex: indicador de progresso). */
  leadingExtra?: ReactNode;
}

/**
 * Barra de navegação institucional do portal externo.
 * Sticky no rodapé da viewport para reduzir scroll, com fundo branco e sombra superior.
 */
export function PortalFooterNav({
  onBack,
  backLabel = 'Voltar',
  onSaveDraft,
  onNext,
  nextLabel = 'Avançar',
  nextIcon,
  nextDisabled,
  nextVariant = 'primary',
  leadingExtra,
}: PortalFooterNavProps) {
  const nextCls = nextVariant === 'success'
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : 'bg-[#FFDA45] hover:bg-[#FFD028] text-[#1B1E2C]';

  return (
    <div className="sticky bottom-3 z-30 mt-6">
      <div className="rounded-2xl border border-[#1B1E2C]/10 bg-white/95 backdrop-blur shadow-[0_-4px_24px_-8px_rgba(27,30,44,0.15)] px-3 sm:px-5 py-3">
        <div className="flex flex-col sm:flex-row justify-between items-stretch gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {onBack && (
              <Button size="lg" variant="outline"
                className="h-11 px-4 rounded-xl border-[#1B1E2C]/15 bg-white text-[#1B1E2C] hover:bg-[#F5F6FA]"
                onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" /> {backLabel}
              </Button>
            )}
            {leadingExtra}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {onSaveDraft && (
              <Button size="lg" variant="outline"
                className="h-11 px-4 rounded-xl border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                onClick={onSaveDraft}>
                <Save className="h-4 w-4 mr-2" /> Salvar rascunho
              </Button>
            )}
            {onNext && (
              <Button size="lg" onClick={onNext} disabled={nextDisabled}
                className={`h-11 px-6 rounded-xl font-bold shadow-[0_4px_14px_-4px_rgba(255,218,69,0.55)] hover:shadow-[0_6px_18px_-4px_rgba(255,218,69,0.7)] transition-all ${nextCls}`}>
                {nextLabel} {nextIcon ?? <ArrowRight className="h-4 w-4 ml-2" />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
