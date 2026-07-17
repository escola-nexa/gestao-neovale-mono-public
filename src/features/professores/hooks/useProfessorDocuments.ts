import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { professoresApi } from '@/features/professores/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ProfessorDocumentData {
  id?: string;
  professor_id: string;
  organization_id: string;
  // Admissional
  admission_date?: string | null;
  function_title?: string | null;
  admission_status?: string;
  termination_date?: string | null;
  registration_code?: string | null;
  specialization?: string | null;
  
  // Pessoais
  full_name?: string | null;
  nationality?: string | null;
  birth_city?: string | null;
  birth_state?: string | null;
  birth_date?: string | null;
  marital_status?: string | null;
  education_level?: string | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  race?: string | null;
  hair_color?: string | null;
  eye_color?: string | null;
  blood_type?: string | null;
  // Documentos
  cpf?: string | null;
  rg_number?: string | null;
  rg_issuer?: string | null;
  rg_state?: string | null;
  rg_issue_date?: string | null;
  work_card_number?: string | null;
  work_card_series?: string | null;
  work_card_state?: string | null;
  cnh_number?: string | null;
  cnh_state?: string | null;
  cnh_category?: string | null;
  cnh_issue_date?: string | null;
  cnh_expiry?: string | null;
  first_license_date?: string | null;
  voter_id?: string | null;
  voter_zone?: string | null;
  voter_section?: string | null;
  military_cert?: string | null;
  pis_nit?: string | null;
  // Endereço
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  address_complement?: string | null;
  neighborhood?: string | null;
  zip_code?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  // Bancário
  bank_name?: string | null;
  bank_branch?: string | null;
  bank_account?: string | null;
  has_sicredi_account?: boolean;
  pix_type?: string | null;
  pix_key?: string | null;
  // Família
  father_name?: string | null;
  mother_name?: string | null;
  spouse_name?: string | null;
  spouse_nationality?: string | null;
  spouse_birth_city?: string | null;
  spouse_birth_state?: string | null;
  spouse_birth_date?: string | null;
}

export interface ProfessorChild {
  id?: string;
  professor_id: string;
  organization_id: string;
  name: string;
  birth_date?: string | null;
  city?: string | null;
  state?: string | null;
  cpf?: string | null;
}

export interface ProfessorDocFile {
  id: string;
  professor_id: string;
  organization_id: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
  uploaded_at: string;
}

export interface ProfessorMedicalReport {
  id: string;
  professor_id: string;
  organization_id: string;
  cid_code: string;
  description?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfessorDocuments(professorId: string | undefined) {
  const { user } = useAuth();
  const [doc, setDoc] = useState<ProfessorDocumentData | null>(null);
  const [children, setChildren] = useState<ProfessorChild[]>([]);
  const [files, setFiles] = useState<ProfessorDocFile[]>([]);
  const [medicalReports, setMedicalReports] = useState<ProfessorMedicalReport[]>([]);
  const [professor, setProfessor] = useState<{ id: string; full_name: string; user_id: string; organization_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isOwnProfessor = !!user && !!professor && professor.user_id === user.id;
  const canEditAdmission = !!user && (user.perfil === 'admin' || user.perfil === 'rh');

  const load = useCallback(async () => {
    if (!professorId) return;
    setLoading(true);
    try {
      const { data: prof, error: profErr } = await supabase
        .from('professors')
        .select('id, full_name, user_id, organization_id')
        .eq('id', professorId)
        .maybeSingle();
      if (profErr) throw profErr;
      if (!prof) { toast.error('Professor não encontrado'); setLoading(false); return; }
      setProfessor(prof as any);

      const [docRes, childrenRes, filesRes, reportsRes] = await Promise.all([
        professoresApi.client.from('professor_documents').select('*').eq('professor_id', professorId).maybeSingle(),
        professoresApi.client.from('professor_children').select('*').eq('professor_id', professorId).order('created_at'),
        professoresApi.client.from('professor_document_files').select('*').eq('professor_id', professorId).order('uploaded_at', { ascending: false }),
        professoresApi.client.from('professor_medical_reports').select('*').eq('professor_id', professorId).order('created_at', { ascending: false }),
      ]);

      if (docRes.data) {
        setDoc(docRes.data);
      } else {
        // Initialize empty doc with professor's full_name as default
        setDoc({
          professor_id: prof.id,
          organization_id: prof.organization_id,
          full_name: prof.full_name,
          admission_status: 'em_analise',
        });
      }
      setChildren(childrenRes.data || []);
      setFiles(filesRes.data || []);
      setMedicalReports(reportsRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar documentos: ' + (err.message || 'desconhecido'));
    } finally {
      setLoading(false);
    }
  }, [professorId]);

  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<ProfessorDocumentData>) => {
    if (!doc || !professor) return;
    setSaving(true);
    try {
      const merged = { ...doc, ...patch };
      const payload: any = { ...merged };
      delete payload.id;

      let result;
      if (doc.id) {
        result = await professoresApi.client.from('professor_documents').update(payload).eq('id', doc.id).select().single();
      } else {
        result = await professoresApi.client.from('professor_documents').insert(payload).select().single();
      }
      if (result.error) throw result.error;
      setDoc(result.data);

      // Mirror key fields back to the `professors` table so the main list stays in sync.
      const mirror: Record<string, any> = {};
      if ('cpf' in patch) mirror.cpf = patch.cpf ?? null;
      if ('phone' in patch) mirror.phone = patch.phone ?? null;
      if ('registration_code' in patch) mirror.registration_code = patch.registration_code ?? null;
      if ('specialization' in patch) mirror.specialization = patch.specialization ?? null;
      if ('full_name' in patch && patch.full_name) mirror.full_name = patch.full_name;
      if (Object.keys(mirror).length > 0) {
        await professoresApi.client.from('professors').update(mirror).eq('id', professor.id);
      }

      toast.success('Dados salvos');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar: ' + (err.message || 'desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const addChild = async (child: Omit<ProfessorChild, 'id' | 'professor_id' | 'organization_id'>) => {
    if (!professor) return;
    const payload = { ...child, professor_id: professor.id, organization_id: professor.organization_id };
    const { data, error } = await professoresApi.client.from('professor_children').insert(payload).select().single();
    if (error) { toast.error('Erro: ' + error.message); return; }
    setChildren(prev => [...prev, data]);
    toast.success('Filho adicionado');
  };

  const updateChild = async (id: string, patch: Partial<ProfessorChild>) => {
    const { data, error } = await professoresApi.client.from('professor_children').update(patch).eq('id', id).select().single();
    if (error) { toast.error('Erro: ' + error.message); return; }
    setChildren(prev => prev.map(c => c.id === id ? data : c));
  };

  const deleteChild = async (id: string) => {
    const { error } = await professoresApi.client.from('professor_children').delete().eq('id', id);
    if (error) { toast.error('Erro: ' + error.message); return; }
    setChildren(prev => prev.filter(c => c.id !== id));
    toast.success('Filho removido');
  };

  const uploadFile = async (file: File, category: string) => {
    if (!professor || !user) return;
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const path = `${professor.organization_id}/${professor.id}/${category}/${safeName}`;

      const { error: upErr } = await professoresApi.client.storage
        .from('professor-documents')
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await professoresApi.client.from('professor_document_files').insert({
        professor_id: professor.id,
        organization_id: professor.organization_id,
        category,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      }).select().single();
      if (error) throw error;
      setFiles(prev => [data, ...prev]);
      toast.success('Arquivo enviado');
    } catch (err: any) {
      toast.error('Erro no upload: ' + (err.message || 'desconhecido'));
    }
  };

  const deleteFile = async (file: ProfessorDocFile) => {
    try {
      await professoresApi.client.storage.from('professor-documents').remove([file.file_path]);
      const { error } = await professoresApi.client.from('professor_document_files').delete().eq('id', file.id);
      if (error) throw error;
      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success('Arquivo removido');
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'desconhecido'));
    }
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await professoresApi.client.storage.from('professor-documents').createSignedUrl(path, 300);
    if (error) { toast.error('Erro ao gerar URL'); return null; }
    return data.signedUrl;
  };

  const addMedicalReport = async (
    cidCode: string,
    description: string | null,
    file: File | null,
  ) => {
    if (!professor || !user) return;
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;
      let mimeType: string | null = null;

      if (file) {
        const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = `${professor.organization_id}/${professor.id}/medical_reports/${safeName}`;
        const { error: upErr } = await professoresApi.client.storage
          .from('professor-documents')
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        filePath = path;
        fileName = file.name;
        fileSize = file.size;
        mimeType = file.type;
      }

      const { data, error } = await (supabase as any)
        .from('professor_medical_reports')
        .insert({
          professor_id: professor.id,
          organization_id: professor.organization_id,
          cid_code: cidCode,
          description,
          file_path: filePath,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
          uploaded_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      setMedicalReports(prev => [data, ...prev]);
      toast.success('Laudo adicionado');
    } catch (err: any) {
      toast.error('Erro ao adicionar laudo: ' + (err.message || 'desconhecido'));
    }
  };

  const deleteMedicalReport = async (report: ProfessorMedicalReport) => {
    try {
      if (report.file_path) {
        await professoresApi.client.storage.from('professor-documents').remove([report.file_path]);
      }
      const { error } = await (supabase as any)
        .from('professor_medical_reports')
        .delete()
        .eq('id', report.id);
      if (error) throw error;
      setMedicalReports(prev => prev.filter(r => r.id !== report.id));
      toast.success('Laudo removido');
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'desconhecido'));
    }
  };

  return {
    professor, doc, children, files, medicalReports,
    loading, saving,
    isOwnProfessor, canEditAdmission,
    save, addChild, updateChild, deleteChild,
    uploadFile, deleteFile, getSignedUrl,
    addMedicalReport, deleteMedicalReport,
    reload: load,
  };
}
