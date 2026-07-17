import { useState } from 'react';
import { ChevronDown, ChevronUp, Target, BookOpen, Pencil, Save, Info } from 'lucide-react';

export default function WeeklyCalendarGuide() {
  const [open, setOpen] = useState(false);

  const steps = [
    { icon: Target, color: 'bg-primary/10 text-primary', title: '1. Selecione a semana', desc: 'Clique em qualquer semana para expandir e visualizar as opções de cadastro.' },
    { icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', title: '2. Aulas Planejadas', desc: 'Adicione materiais multimídia (PDFs, imagens, vídeos, textos) para cada semana.' },
    { icon: Pencil, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', title: '3. Conteúdo Pedagógico', desc: 'Preencha os 8 campos pedagógicos obrigatórios para o planejamento mestre.' },
    { icon: Save, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', title: '4. Salve e acompanhe', desc: 'Salve o conteúdo. Indicadores visuais mostram o progresso de cada semana.' },
  ];

  return (
    <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Info className="h-4 w-4 text-primary" />
          </div>
          Como utilizar o Calendário Semanal
        </span>
        <div className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors ${open ? 'bg-primary/10' : 'bg-muted'}`}>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-primary" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/20 transition-colors">
              <div className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center ${step.color}`}>
                <step.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
