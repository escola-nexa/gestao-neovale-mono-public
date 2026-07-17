import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreateStudentDTO } from '@/types';

interface Props {
  formData: CreateStudentDTO;
  setFormData: React.Dispatch<React.SetStateAction<CreateStudentDTO>>;
}

export function StudentFormStep2({ formData, setFormData }: Props) {
  const updateResponsavel = (field: keyof CreateStudentDTO['responsavel'], value: string) => {
    setFormData(prev => ({
      ...prev,
      responsavel: { ...prev.responsavel, [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">Dados dos Responsáveis</h3>
        <p className="text-sm text-muted-foreground">
          Preencha as informações dos responsáveis pelo aluno
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="nomeMae">Nome Completo da Mãe</Label>
          <Input
            id="nomeMae"
            value={formData.responsavel.nomeMae}
            onChange={(e) => updateResponsavel('nomeMae', e.target.value)}
            placeholder="Nome completo da mãe"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nomePai">Nome Completo do Pai</Label>
          <Input
            id="nomePai"
            value={formData.responsavel.nomePai || ''}
            onChange={(e) => updateResponsavel('nomePai', e.target.value)}
            placeholder="Nome completo do pai (opcional)"
          />
        </div>
      </div>

      <div className="space-y-1 pt-4">
        <h3 className="text-lg font-medium">Contato do Responsável</h3>
        <p className="text-sm text-muted-foreground">
          Informações de contato para comunicação com a escola
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="contatoResponsavel">WhatsApp do Responsável</Label>
            <Input
              id="contatoResponsavel"
              value={formData.responsavel.contatoResponsavel}
              onChange={(e) => updateResponsavel('contatoResponsavel', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emailResponsavel">E-mail do Responsável</Label>
            <Input
              id="emailResponsavel"
              type="email"
              value={formData.responsavel.emailResponsavel}
              onChange={(e) => updateResponsavel('emailResponsavel', e.target.value)}
              placeholder="responsavel@email.com"
            />
          </div>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mt-4">
        <p className="text-sm text-muted-foreground">
          <strong>Importante:</strong> Após cadastrar o aluno, você poderá realizar a matrícula 
          vinculando-o a uma Escola, Curso, Turma e Ano Letivo.
        </p>
      </div>
    </div>
  );
}
