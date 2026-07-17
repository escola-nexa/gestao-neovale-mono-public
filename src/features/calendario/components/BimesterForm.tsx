import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { useAcademicCalendar } from '@/hooks/useAcademicCalendar';
import { AcademicCalendar } from '@/types/academic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirm } from '@/hooks/useConfirm';

interface BimesterFormProps {
  open: boolean;
  onClose: () => void;
  calendar: AcademicCalendar;
  onSuccess?: () => void;
}

interface BimesterData {
  number: 1 | 2 | 3 | 4;
  startDate: string;
  endDate: string;
  id?: string;
}

export function BimesterForm({ open, onClose, calendar, onSuccess }: BimesterFormProps) {
  const { createBimester, updateBimester, deleteBimester } = useAcademicCalendar(calendar.organization_id);
  const confirm = useConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bimesters, setBimesters] = useState<BimesterData[]>([]);

  useEffect(() => {
    const existingBimesters = calendar.bimesters || [];
    const allBimesters: BimesterData[] = [1, 2, 3, 4].map((num) => {
      const existing = existingBimesters.find(b => b.number === num);
      return {
        number: num as 1 | 2 | 3 | 4,
        startDate: existing?.start_date || '',
        endDate: existing?.end_date || '',
        id: existing?.id,
      };
    });
    setBimesters(allBimesters);
  }, [calendar]);

  const updateBimesterData = (index: number, field: 'startDate' | 'endDate', value: string) => {
    setBimesters(prev => prev.map((b, i) => 
      i === index ? { ...b, [field]: value } : b
    ));
  };

  const handleSave = async (bimester: BimesterData) => {
    if (!bimester.startDate || !bimester.endDate) return;

    setIsSubmitting(true);
    try {
      let success = false;
      if (bimester.id) {
        success = await updateBimester(bimester.id, {
          start_date: bimester.startDate,
          end_date: bimester.endDate,
        });
      } else {
        const result = await createBimester({
          calendar_id: calendar.id,
          number: bimester.number,
          start_date: bimester.startDate,
          end_date: bimester.endDate,
        });
        success = !!result;
        if (result) {
          setBimesters(prev => prev.map(b => 
            b.number === bimester.number 
              ? { ...b, id: result.id }
              : b
          ));
        }
      }
      if (success) {
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bimester: BimesterData) => {
    if (!bimester.id) return;

    const ok = await confirm({
      title: 'Excluir bimestre',
      description: `Deseja excluir o ${bimester.number}º Bimestre?`,
      confirmText: 'Excluir',
      variant: 'destructive',
    });
    if (ok) {
      setIsSubmitting(true);
      try {
        const success = await deleteBimester(bimester.id);
        if (success) {
          setBimesters(prev => prev.map(b => 
            b.number === bimester.number 
              ? { number: bimester.number, startDate: '', endDate: '' }
              : b
          ));
          onSuccess?.();
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Bimestres - {calendar.academic_year}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {bimesters.map((bimester, index) => (
            <Card key={bimester.number}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{bimester.number}º Bimestre</span>
                  {bimester.id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(bimester)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="date"
                      value={bimester.startDate}
                      onChange={(e) => updateBimesterData(index, 'startDate', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Término</Label>
                    <Input
                      type="date"
                      value={bimester.endDate}
                      min={bimester.startDate}
                      onChange={(e) => updateBimesterData(index, 'endDate', e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={() => handleSave(bimester)}
                    disabled={isSubmitting || !bimester.startDate || !bimester.endDate}
                  >
                    {bimester.id ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
