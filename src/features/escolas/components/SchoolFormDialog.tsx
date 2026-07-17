import { useState, useEffect } from 'react';
import { SchoolData } from '@/services/supabaseApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, School, MapPin, User, Mail, ChevronDown } from 'lucide-react';
import { escolasApi } from '@/features/escolas/api';
import { useOrganization } from '@/hooks/useOrganization';
import { schoolsApi } from '@/services/supabaseApi';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ApiAdapter } from '@/lib/api-adapter';

interface StateOption { id: string; nome: string; sigla: string; }
interface CityOption { id: string; state_id?: string; stateId?: string; nome: string; }

export interface SchoolFormData {
  nome: string; codigo: string; cre: string; cidade: string; endereco: string;
  endereco_cep: string; endereco_rua: string; endereco_numero: string; endereco_bairro: string;
  diretor: string; diretor_telefone: string; diretor_email: string;
  diretor_adjunto: string; diretor_adjunto_telefone: string; diretor_adjunto_email: string;
  supervisor_tecnico_1: string; supervisor_tecnico_1_telefone: string; supervisor_tecnico_1_email: string; supervisor_tecnico_1_turno: string;
  supervisor_tecnico_2: string; supervisor_tecnico_2_telefone: string; supervisor_tecnico_2_email: string; supervisor_tecnico_2_turno: string;
  supervisor_tecnico_3: string; supervisor_tecnico_3_telefone: string; supervisor_tecnico_3_email: string; supervisor_tecnico_3_turno: string;
  coordenador_pedagogico: string; coordenador_pedagogico_telefone: string; coordenador_pedagogico_email: string; coordenador_pedagogico_turno: string;
  email: string; telefone: string; status: 'ativo' | 'inativo';
}

export const emptySchoolForm: SchoolFormData = {
  nome: '', codigo: '', cre: '', cidade: '', endereco: '',
  endereco_cep: '', endereco_rua: '', endereco_numero: '', endereco_bairro: '',
  diretor: '', diretor_telefone: '', diretor_email: '',
  diretor_adjunto: '', diretor_adjunto_telefone: '', diretor_adjunto_email: '',
  supervisor_tecnico_1: '', supervisor_tecnico_1_telefone: '', supervisor_tecnico_1_email: '', supervisor_tecnico_1_turno: '',
  supervisor_tecnico_2: '', supervisor_tecnico_2_telefone: '', supervisor_tecnico_2_email: '', supervisor_tecnico_2_turno: '',
  supervisor_tecnico_3: '', supervisor_tecnico_3_telefone: '', supervisor_tecnico_3_email: '', supervisor_tecnico_3_turno: '',
  coordenador_pedagogico: '', coordenador_pedagogico_telefone: '', coordenador_pedagogico_email: '', coordenador_pedagogico_turno: '',
  email: '', telefone: '', status: 'ativo',
};

function PersonFields({ label, nameKey, phoneKey, emailKey, turnoKey, formData, setFormData }: {
  label: string; nameKey: keyof SchoolFormData; phoneKey: keyof SchoolFormData; emailKey: keyof SchoolFormData;
  turnoKey?: keyof SchoolFormData; formData: SchoolFormData; setFormData: (fn: (prev: SchoolFormData) => SchoolFormData) => void;
}) {
  return (
    <div className="space-y-2 border-b border-amber-200/50 pb-3 last:border-0 last:pb-0">
      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={formData[nameKey]} onChange={(e) => setFormData(prev => ({ ...prev, [nameKey]: e.target.value }))} placeholder="Nome completo" /></div>
        <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input value={formData[phoneKey]} onChange={(e) => setFormData(prev => ({ ...prev, [phoneKey]: e.target.value }))} placeholder="(67) 9999-9999" /></div>
        <div className="space-y-1"><Label className="text-xs">E-mail</Label><Input type="email" value={formData[emailKey]} onChange={(e) => setFormData(prev => ({ ...prev, [emailKey]: e.target.value }))} placeholder="email@exemplo.com" /></div>
      </div>
      {turnoKey && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Turno de Expediente</Label>
            <Select value={formData[turnoKey] || undefined} onValueChange={(val) => setFormData(prev => ({ ...prev, [turnoKey]: val }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o turno" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="matutino">Matutino</SelectItem>
                <SelectItem value="vespertino">Vespertino</SelectItem>
                <SelectItem value="noturno">Noturno</SelectItem>
                <SelectItem value="integral">Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

interface SchoolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolData | null;
  onSuccess: () => void;
}

export function SchoolFormDialog({ open, onOpenChange, school, onSuccess }: SchoolFormDialogProps) {
  const { toast } = useToast();
  const { organizationId } = useOrganization();
  const [formData, setFormData] = useState<SchoolFormData>(emptySchoolForm);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [selectedStateId, setSelectedStateId] = useState('');

  const filteredCities = selectedStateId ? cities.filter(c => (c.state_id || c.stateId) === selectedStateId) : [];

  useEffect(() => {
    if (organizationId) {
      Promise.all([
        ApiAdapter.locais.getStates(),
        ApiAdapter.locais.getCities()
      ]).then(([statesData, citiesData]) => {
        setStates(statesData as any[]);
        setCities(citiesData as any[]);
      }).catch(err => console.error("Erro locais:", err));
    }
  }, [organizationId]);

  useEffect(() => {
    if (school) {
      setFormData({
        nome: school.nome, codigo: school.codigo, cre: (school as any).cre || '', cidade: school.cidade,
        endereco: school.endereco || '', endereco_cep: school.endereco_cep || '',
        endereco_rua: school.endereco_rua || '', endereco_numero: school.endereco_numero || '',
        endereco_bairro: school.endereco_bairro || '',
        diretor: school.diretor, diretor_telefone: school.diretor_telefone || '', diretor_email: school.diretor_email || '',
        diretor_adjunto: school.diretor_adjunto || '', diretor_adjunto_telefone: school.diretor_adjunto_telefone || '', diretor_adjunto_email: school.diretor_adjunto_email || '',
        supervisor_tecnico_1: school.supervisor_tecnico_1 || '', supervisor_tecnico_1_telefone: school.supervisor_tecnico_1_telefone || '', supervisor_tecnico_1_email: school.supervisor_tecnico_1_email || '', supervisor_tecnico_1_turno: school.supervisor_tecnico_1_turno || '',
        supervisor_tecnico_2: school.supervisor_tecnico_2 || '', supervisor_tecnico_2_telefone: school.supervisor_tecnico_2_telefone || '', supervisor_tecnico_2_email: school.supervisor_tecnico_2_email || '', supervisor_tecnico_2_turno: school.supervisor_tecnico_2_turno || '',
        supervisor_tecnico_3: school.supervisor_tecnico_3 || '', supervisor_tecnico_3_telefone: school.supervisor_tecnico_3_telefone || '', supervisor_tecnico_3_email: school.supervisor_tecnico_3_email || '', supervisor_tecnico_3_turno: school.supervisor_tecnico_3_turno || '',
        coordenador_pedagogico: school.coordenador_pedagogico || '', coordenador_pedagogico_telefone: school.coordenador_pedagogico_telefone || '', coordenador_pedagogico_email: school.coordenador_pedagogico_email || '', coordenador_pedagogico_turno: school.coordenador_pedagogico_turno || '',
        email: school.email, telefone: school.telefone, status: school.status,
      });
      const matchedCity = cities.find(c => c.nome === school.cidade);
      setSelectedStateId(matchedCity ? (matchedCity.state_id || matchedCity.stateId || '') : '');
    } else {
      setFormData(emptySchoolForm);
      setSelectedStateId('');
    }
  }, [school, open, cities]);

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: 'CEP não encontrado', variant: 'destructive' }); return; }
      setFormData(prev => ({ ...prev, endereco_rua: data.logradouro || '', endereco_bairro: data.bairro || '' }));
    } catch { toast({ title: 'Erro', description: 'Não foi possível consultar o CEP', variant: 'destructive' }); }
    finally { setCepLoading(false); }
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo) { toast({ title: 'Erro', description: 'Nome e código são obrigatórios', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const enderecoCompleto = [formData.endereco_rua, formData.endereco_numero, formData.endereco_bairro].filter(Boolean).join(', ');
      const saveData = { ...formData, endereco: enderecoCompleto || formData.endereco };
      if (school) { await schoolsApi.update(school.id, saveData); toast({ title: 'Sucesso', description: 'Escola atualizada' }); }
      else { await schoolsApi.create(saveData); toast({ title: 'Sucesso', description: 'Escola criada' }); }
      onOpenChange(false);
      onSuccess();
    } catch (error: any) { toast({ title: 'Erro', description: error.message || 'Erro ao salvar', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{school ? 'Editar Escola' : 'Nova Escola'}</DialogTitle></DialogHeader>
        
        <Tabs defaultValue="identificacao" className="py-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="identificacao" className="text-xs gap-1"><School className="h-3.5 w-3.5" /> Dados</TabsTrigger>
            <TabsTrigger value="localizacao" className="text-xs gap-1"><MapPin className="h-3.5 w-3.5" /> Local</TabsTrigger>
            <TabsTrigger value="responsaveis" className="text-xs gap-1"><User className="h-3.5 w-3.5" /> Equipe</TabsTrigger>
            <TabsTrigger value="contato" className="text-xs gap-1"><Mail className="h-3.5 w-3.5" /> Contato</TabsTrigger>
          </TabsList>

          <TabsContent value="identificacao" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Código *</Label><Input value={formData.codigo} onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))} placeholder="Ex: 01" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Nome *</Label><Input value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome da escola" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">CRE</Label><Input value={formData.cre} onChange={(e) => setFormData(prev => ({ ...prev, cre: e.target.value }))} placeholder="Ex: CRE 11" /></div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs">Status Ativo</Label>
              <Switch checked={formData.status === 'ativo'} onCheckedChange={(c) => setFormData(prev => ({ ...prev, status: c ? 'ativo' : 'inativo' }))} />
            </div>
          </TabsContent>

          <TabsContent value="localizacao" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Estado</Label>
                <Select value={selectedStateId} onValueChange={(val) => { setSelectedStateId(val); setFormData(prev => ({ ...prev, cidade: '' })); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                  <SelectContent>{states.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nome} ({s.sigla})</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cidade</Label>
                <Select value={formData.cidade || undefined} onValueChange={(val) => setFormData(prev => ({ ...prev, cidade: val }))} disabled={!selectedStateId}>
                  <SelectTrigger><SelectValue placeholder={selectedStateId ? "Selecione a cidade" : "Selecione um estado"} /></SelectTrigger>
                  <SelectContent>{filteredCities.map((c) => (<SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5 col-span-1">
                <Label className="text-xs">CEP</Label>
                <div className="relative">
                  <Input value={formData.endereco_cep} onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 8); const formatted = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val; setFormData(prev => ({ ...prev, endereco_cep: formatted })); if (val.length === 8) handleCepLookup(val); }} placeholder="00000-000" maxLength={9} />
                  {cepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-2"><Label className="text-xs">Rua / Logradouro</Label><Input value={formData.endereco_rua} onChange={(e) => setFormData(prev => ({ ...prev, endereco_rua: e.target.value }))} placeholder="Nome da rua" /></div>
              <div className="space-y-1.5 col-span-1"><Label className="text-xs">Número</Label><Input value={formData.endereco_numero} onChange={(e) => setFormData(prev => ({ ...prev, endereco_numero: e.target.value }))} placeholder="Nº" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Bairro</Label><Input value={formData.endereco_bairro} onChange={(e) => setFormData(prev => ({ ...prev, endereco_bairro: e.target.value }))} placeholder="Nome do bairro" /></div>
          </TabsContent>

          <TabsContent value="responsaveis" className="mt-4 space-y-3">
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent text-sm font-medium">
                <span>Direção</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <PersonFields label="Diretor(a)" nameKey="diretor" phoneKey="diretor_telefone" emailKey="diretor_email" formData={formData} setFormData={setFormData} />
                <PersonFields label="Diretor(a) Adjunto(a)" nameKey="diretor_adjunto" phoneKey="diretor_adjunto_telefone" emailKey="diretor_adjunto_email" formData={formData} setFormData={setFormData} />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent text-sm font-medium">
                <span>Supervisores Técnicos</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <PersonFields label="Supervisor(a) Técnico(a) 1" nameKey="supervisor_tecnico_1" phoneKey="supervisor_tecnico_1_telefone" emailKey="supervisor_tecnico_1_email" turnoKey="supervisor_tecnico_1_turno" formData={formData} setFormData={setFormData} />
                <PersonFields label="Supervisor(a) Técnico(a) 2" nameKey="supervisor_tecnico_2" phoneKey="supervisor_tecnico_2_telefone" emailKey="supervisor_tecnico_2_email" turnoKey="supervisor_tecnico_2_turno" formData={formData} setFormData={setFormData} />
                <PersonFields label="Supervisor(a) Técnico(a) 3" nameKey="supervisor_tecnico_3" phoneKey="supervisor_tecnico_3_telefone" emailKey="supervisor_tecnico_3_email" turnoKey="supervisor_tecnico_3_turno" formData={formData} setFormData={setFormData} />
              </CollapsibleContent>
            </Collapsible>

            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-accent text-sm font-medium">
                <span>Coordenação Pedagógica</span>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                <PersonFields label="Coordenador(a) Pedagógico(a)" nameKey="coordenador_pedagogico" phoneKey="coordenador_pedagogico_telefone" emailKey="coordenador_pedagogico_email" turnoKey="coordenador_pedagogico_turno" formData={formData} setFormData={setFormData} />
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>

          <TabsContent value="contato" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="email@escola.com" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Telefone</Label><Input value={formData.telefone} onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))} placeholder="(67) 9999-9999" /></div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
