import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, ListChecks } from 'lucide-react';

interface GradeConfigSetupProps {
  onSave: (averageType: string, activityNames: string[]) => Promise<void>;
  isSaving: boolean;
  initialAverageType?: string;
  initialActivityNames?: string[];
  isEditing?: boolean;
  onCancel?: () => void;
}

export function GradeConfigSetup({ onSave, isSaving, initialAverageType, initialActivityNames, isEditing, onCancel }: GradeConfigSetupProps) {
  const [averageType, setAverageType] = useState<string>(initialAverageType || 'SOMATORIA');
  const [activityNames, setActivityNames] = useState<string[]>(initialActivityNames?.length ? initialActivityNames : ['']);

  const addActivity = () => {
    setActivityNames(prev => [...prev, '']);
  };

  const removeActivity = (index: number) => {
    if (activityNames.length <= 1) return;
    setActivityNames(prev => prev.filter((_, i) => i !== index));
  };

  const updateActivity = (index: number, value: string) => {
    setActivityNames(prev => prev.map((n, i) => i === index ? value : n));
  };

  const handleSave = () => {
    const valid = activityNames.filter(n => n.trim() !== '');
    if (valid.length === 0) return;
    onSave(averageType, valid);
  };

  const hasValidActivities = activityNames.some(n => n.trim() !== '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ListChecks className="h-5 w-5 text-primary" />
          Configuração de Avaliações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average type */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Tipo de Média</Label>
          <RadioGroup value={averageType} onValueChange={setAverageType} className="flex gap-6">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="SOMATORIA" id="somatoria" />
              <Label htmlFor="somatoria" className="cursor-pointer">Somatória</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="ARITMETICA" id="aritmetica" />
              <Label htmlFor="aritmetica" className="cursor-pointer">Média Aritmética</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Activities */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Atividades / Avaliações</Label>
          <div className="space-y-2">
            {activityNames.map((name, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-6 text-right">{i + 1}.</span>
                <Input
                  value={name}
                  onChange={e => updateActivity(i, e.target.value)}
                  placeholder={`Ex: Atividade ${i + 1}, Prova, Trabalho...`}
                  className="flex-1"
                />
                {activityNames.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeActivity(i)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={addActivity} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Adicionar Atividade
          </Button>
        </div>

        <div className="flex gap-3">
          {isEditing && onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving} className="flex-1">
              Cancelar
            </Button>
          )}
          <Button onClick={handleSave} disabled={isSaving || !hasValidActivities} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : isEditing ? 'Atualizar Configuração' : 'Salvar Configuração'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
