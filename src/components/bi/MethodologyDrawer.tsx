import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

export function MethodologyDrawer() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5" /> Como calculamos
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Metodologia de Cálculo</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6 text-sm text-foreground">
          <section>
            <h3 className="font-semibold text-foreground mb-2">Índice de Conformidade Docente</h3>
            <p className="text-muted-foreground mb-3">Score composto (0-100) baseado em 5 dimensões com pesos:</p>
            <ul className="space-y-2">
              <li className="flex justify-between"><span>📋 Planejamento</span><span className="font-semibold">30%</span></li>
              <li className="flex justify-between"><span>📅 Frequência</span><span className="font-semibold">25%</span></li>
              <li className="flex justify-between"><span>📊 Notas</span><span className="font-semibold">20%</span></li>
              <li className="flex justify-between"><span>💬 Orientações</span><span className="font-semibold">15%</span></li>
              <li className="flex justify-between"><span>⏰ Regularidade</span><span className="font-semibold">10%</span></li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-2">Faixas de Desempenho</h3>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> <span>Excelente (90-100%)</span></li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> <span>Adequado (75-89%)</span></li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> <span>Atenção (60-74%)</span></li>
              <li className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> <span>Crítico (0-59%)</span></li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-foreground mb-2">Índice de Risco</h3>
            <p className="text-muted-foreground">Calculado como o inverso da conformidade (100 - conformidade). Quanto maior o risco, menor a conformidade do professor.</p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
