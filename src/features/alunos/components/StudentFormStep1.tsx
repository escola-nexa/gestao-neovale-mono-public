import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CreateStudentDTO } from '@/types';
import { maskCPF, isValidCPF } from '../utils/cpf';

const ESTADOS_BRASILEIROS = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

interface Props {
  formData: CreateStudentDTO;
  setFormData: React.Dispatch<React.SetStateAction<CreateStudentDTO>>;
}

export function StudentFormStep1({ formData, setFormData }: Props) {
  const updateField = (field: keyof CreateStudentDTO, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateAddress = (field: keyof CreateStudentDTO['endereco'], value: string) => {
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, [field]: value },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-medium">Dados do Aluno</h3>
        <p className="text-sm text-muted-foreground">
          Preencha as informações pessoais do aluno
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="nomeCompleto">Nome Completo *</Label>
          <Input
            id="nomeCompleto"
            value={formData.nomeCompleto}
            onChange={(e) => updateField('nomeCompleto', e.target.value)}
            placeholder="Nome completo do aluno"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="dataNascimento">Data de Nascimento</Label>
            <Input
              id="dataNascimento"
              type="date"
              value={formData.dataNascimento}
              onChange={(e) => updateField('dataNascimento', e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="codigoMatricula">Código da Matrícula *</Label>
            <Input
              id="codigoMatricula"
              value={formData.codigoMatricula}
              onChange={(e) => updateField('codigoMatricula', e.target.value)}
              placeholder="Ex: 2024001"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp}
              onChange={(e) => updateField('whatsapp', e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>
        </div>
      </div>

      <div className="space-y-1 pt-2">
        <h3 className="text-lg font-medium">Documentação e Necessidades</h3>
        <p className="text-sm text-muted-foreground">
          Documentos pessoais e atendimento especializado
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cpf">CPF do Estudante</Label>
            <Input
              id="cpf"
              inputMode="numeric"
              value={formData.cpf || ''}
              onChange={(e) => updateField('cpf', maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {formData.cpf && formData.cpf.replace(/\D/g, '').length > 0 && !isValidCPF(formData.cpf) && (
              <p className="text-xs text-destructive">CPF inválido</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nacionalidade">Nacionalidade</Label>
            <Input
              id="nacionalidade"
              value={formData.nacionalidade ?? 'Brasileira'}
              onChange={(e) => updateField('nacionalidade', e.target.value)}
              placeholder="Brasileira"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="rg">RG (Registro Geral)</Label>
            <Input
              id="rg"
              value={formData.rg || ''}
              onChange={(e) => updateField('rg', e.target.value)}
              placeholder="00.000.000-0"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="orgaoExpedidor">Órgão Expedidor</Label>
            <Input
              id="orgaoExpedidor"
              value={formData.orgaoExpedidor || ''}
              onChange={(e) => updateField('orgaoExpedidor', e.target.value)}
              placeholder="Ex: SSP/SP"
            />
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="educacaoEspecial" className="text-sm font-medium">
                Estudante da Educação Especial
              </Label>
              <p className="text-xs text-muted-foreground">
                Marque caso o aluno necessite de atendimento educacional especializado
              </p>
            </div>
            <Switch
              id="educacaoEspecial"
              checked={!!formData.educacaoEspecial}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, educacaoEspecial: checked }))
              }
            />
          </div>
          {formData.educacaoEspecial && (
            <div className="grid gap-2">
              <Label htmlFor="educacaoEspecialDescricao">
                Especificar necessidade / laudo
              </Label>
              <Textarea
                id="educacaoEspecialDescricao"
                value={formData.educacaoEspecialDescricao || ''}
                onChange={(e) => updateField('educacaoEspecialDescricao', e.target.value)}
                placeholder="Ex: TEA nível 1, dislexia, deficiência auditiva, etc."
                rows={3}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-medium">Endereço</h3>
        <p className="text-sm text-muted-foreground">
          Informações de endereço do aluno
        </p>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 grid gap-2">
            <Label htmlFor="rua">Rua</Label>
            <Input
              id="rua"
              value={formData.endereco.rua}
              onChange={(e) => updateAddress('rua', e.target.value)}
              placeholder="Nome da rua"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={formData.endereco.numero}
              onChange={(e) => updateAddress('numero', e.target.value)}
              placeholder="Nº"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={formData.endereco.bairro}
              onChange={(e) => updateAddress('bairro', e.target.value)}
              placeholder="Nome do bairro"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              value={formData.endereco.cep}
              onChange={(e) => updateAddress('cep', e.target.value)}
              placeholder="00000-000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="municipio">Município</Label>
            <Input
              id="municipio"
              value={formData.endereco.municipio}
              onChange={(e) => updateAddress('municipio', e.target.value)}
              placeholder="Nome do município"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={formData.endereco.estado}
              onValueChange={(value) => updateAddress('estado', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_BRASILEIROS.map((estado) => (
                  <SelectItem key={estado.value} value={estado.value}>
                    {estado.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
