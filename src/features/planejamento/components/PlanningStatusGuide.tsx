import { useState, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HelpCircle, ChevronDown, FileText, Send, RotateCcw, PenTool, CheckCircle2, Eye, ClipboardCheck, MessageSquare, AlertTriangle, Edit } from 'lucide-react';

const STATUS_STEPS = [
  {
    icon: <FileText className="h-4 w-4" />,
    label: 'Rascunho',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    description: 'Planejamento gerado pelo coordenador. Aguardando aceitação do professor.',
  },
  {
    icon: <Edit className="h-4 w-4" />,
    label: 'Em edição',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'O professor aceitou e está editando o planejamento.',
  },
  {
    icon: <Send className="h-4 w-4" />,
    label: 'Enviado para coordenação',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'O professor enviou o planejamento para avaliação do coordenador.',
  },
  {
    icon: <RotateCcw className="h-4 w-4" />,
    label: 'Devolvido',
    color: 'bg-red-50 text-red-700 border-red-200',
    description: 'O coordenador devolveu o planejamento com observações de melhoria. O professor deve ajustar e reenviar.',
  },
  {
    icon: <PenTool className="h-4 w-4" />,
    label: 'Aguardando assinatura do professor',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Planejamento aprovado pelo coordenador. Aguarda a assinatura digital do professor.',
  },
  {
    icon: <PenTool className="h-4 w-4" />,
    label: 'Aguardando assinatura do coordenador',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    description: 'O professor assinou. Aguarda a assinatura final do coordenador para conclusão.',
  },
  {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Assinado',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Planejamento finalizado com todas as assinaturas digitais. Documento imutável.',
  },
];

const GUIDE_STEPS = [
  {
    icon: <Eye className="h-4 w-4" />,
    label: '1. Conferir',
    description: 'Clique em "Conferir Planejamento" para visualizar todas as semanas enviadas pelo professor.',
  },
  {
    icon: <ClipboardCheck className="h-4 w-4" />,
    label: '2. Revisar Conteúdo',
    description: 'Verifique as "Aulas Planejadas" e os "Conteúdos Pedagógicos" de cada semana.',
  },
  {
    icon: <MessageSquare className="h-4 w-4" />,
    label: '3. Observações',
    description: 'Adicione observações por semana e/ou uma observação geral. Devolva para ajustes se necessário.',
  },
  {
    icon: <PenTool className="h-4 w-4" />,
    label: '4. Aprovar',
    description: 'Quando satisfeito, envie para assinatura do professor e finalize com sua assinatura.',
  },
];

const GUIDE_SEEN_KEY = 'planning-status-guide-seen';

export function PlanningStatusGuide() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(GUIDE_SEEN_KEY);
    if (!seen) {
      setIsOpen(true);
      localStorage.setItem(GUIDE_SEEN_KEY, 'true');
    }
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group w-full">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Guia de Status e Conferência</span>
          <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-xl border bg-card p-4 shadow-sm space-y-4">
          {/* Status Guide */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Status do Planejamento
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {STATUS_STEPS.map((step) => (
                <div key={step.label} className={`flex items-start gap-2 p-2.5 rounded-lg border ${step.color}`}>
                  <div className="shrink-0 mt-0.5">{step.icon}</div>
                  <div>
                    <p className="text-[11px] font-semibold">{step.label}</p>
                    <p className="text-[10px] leading-relaxed opacity-80">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How to use */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Como Conferir Planejamentos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {GUIDE_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shrink-0">{i + 1}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">{step.label}</p>
                    <p className="text-[10px] text-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
