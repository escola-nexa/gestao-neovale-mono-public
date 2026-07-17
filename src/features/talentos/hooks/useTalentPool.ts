import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { talentosApi } from '@/features/talentos/api';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';
import {
  TalentCandidate, TalentFormData, RESUME_BUCKET, MAX_PDF_SIZE_MB, TalentClassification,
} from '../types';

interface State { id: string; nome: string; sigla: string; }
interface City { id: string; state_id: string; nome: string; }

export interface TalentFilters {
  search: string;
  stateId: string;
  cityId: string;
  hasLicentiate: 'all' | 'yes' | 'no';
  weekday: string; // single quick filter
  classification: 'all' | 'none' | TalentClassification;
}

export const EMPTY_FILTERS: TalentFilters = {
  search: '',
  stateId: 'all',
  cityId: 'all',
  hasLicentiate: 'all',
  weekday: 'all',
  classification: 'all',
};

export type FileSlot = 'resume_path' | 'schooling_path' | 'graduate_path';

export function useTalentPool() {
  const { organizationId } = useOrganization();
  const [items, setItems] = useState<TalentCandidate[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TalentFilters>(EMPTY_FILTERS);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const [candRes, statesRes, citiesRes] = await Promise.all([
        (supabase as any)
          .from('talent_pool_candidates')
          .select('*, states(nome, sigla), cities(nome)')
          .eq('organization_id', organizationId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        talentosApi.client.from('states' as any).select('id, nome, sigla').eq('organization_id', organizationId).order('sigla'),
        talentosApi.client.from('cities' as any).select('id, state_id, nome').eq('organization_id', organizationId).order('nome'),
      ]);
      if (candRes.error) throw candRes.error;
      const mapped: TalentCandidate[] = (candRes.data || []).map((row: any) => ({
        ...row,
        classifications: Array.isArray(row.classifications) ? row.classifications : [],
        state_name: row.states?.nome || null,
        state_sigla: row.states?.sigla || null,
        city_name: row.cities?.nome || null,
      }));
      setItems(mapped);
      setStates((statesRes.data as any[]) || []);
      setCities((citiesRes.data as any[]) || []);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar candidatos: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);

  const uploadPdf = async (file: File, candidateId: string, slot: FileSlot): Promise<string | null> => {
    if (!organizationId) return null;
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são aceitos');
      return null;
    }
    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      toast.error(`Arquivo excede ${MAX_PDF_SIZE_MB}MB`);
      return null;
    }
    const safe = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const path = `${organizationId}/${candidateId}/${slot}/${safe}`;
    const { error } = await talentosApi.client.storage.from(RESUME_BUCKET).upload(path, file, { upsert: false, contentType: 'application/pdf' });
    if (error) { toast.error('Erro upload: ' + error.message); return null; }
    return path;
  };

  const removePdf = async (path: string) => {
    if (!path) return;
    await talentosApi.client.storage.from(RESUME_BUCKET).remove([path]);
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await talentosApi.client.storage.from(RESUME_BUCKET).createSignedUrl(path, 300);
    if (error) { toast.error('Não foi possível abrir o arquivo'); return null; }
    return data.signedUrl;
  };

  const create = async (
    form: TalentFormData,
    files: { resume?: File | null; schooling?: File | null; graduate?: File | null }
  ): Promise<TalentCandidate | null> => {
    if (!organizationId) return null;
    if (!files.resume) { toast.error('Currículo (PDF) é obrigatório'); return null; }

    const { data: userData } = await talentosApi.client.auth.getUser();
    const payload: any = {
      organization_id: organizationId,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim(),
      phone_is_whatsapp: form.phone_is_whatsapp,
      state_id: form.state_id || null,
      city_id: form.city_id || null,
      free_periods: form.free_periods,
      free_weekdays: form.free_weekdays,
      formation_area: form.formation_area.trim() || null,
      has_licentiate: form.has_licentiate,
      notes: form.notes.trim() || null,
      classifications: form.classifications || [],
      created_by: userData.user?.id || null,
    };

    const { data, error } = await (supabase as any)
      .from('talent_pool_candidates').insert(payload).select().single();
    if (error) { toast.error('Erro ao salvar: ' + error.message); return null; }

    const updates: any = {};
    const r = await uploadPdf(files.resume, data.id, 'resume_path');
    if (r) updates.resume_path = r;
    if (files.schooling) {
      const p = await uploadPdf(files.schooling, data.id, 'schooling_path');
      if (p) updates.schooling_path = p;
    }
    if (files.graduate) {
      const p = await uploadPdf(files.graduate, data.id, 'graduate_path');
      if (p) updates.graduate_path = p;
    }
    if (Object.keys(updates).length > 0) {
      await (supabase as any).from('talent_pool_candidates').update(updates).eq('id', data.id);
    }

    toast.success('Candidato cadastrado');
    await load();
    return data;
  };

  const update = async (
    id: string,
    form: TalentFormData,
    files: { resume?: File | null; schooling?: File | null; graduate?: File | null },
    existing: TalentCandidate,
  ): Promise<boolean> => {
    if (!organizationId) return false;
    const updates: any = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim(),
      phone_is_whatsapp: form.phone_is_whatsapp,
      state_id: form.state_id || null,
      city_id: form.city_id || null,
      free_periods: form.free_periods,
      free_weekdays: form.free_weekdays,
      formation_area: form.formation_area.trim() || null,
      has_licentiate: form.has_licentiate,
      notes: form.notes.trim() || null,
      classifications: form.classifications || [],
    };

    if (files.resume) {
      if (existing.resume_path) await removePdf(existing.resume_path);
      const p = await uploadPdf(files.resume, id, 'resume_path');
      if (p) updates.resume_path = p;
    }
    if (files.schooling) {
      if (existing.schooling_path) await removePdf(existing.schooling_path);
      const p = await uploadPdf(files.schooling, id, 'schooling_path');
      if (p) updates.schooling_path = p;
    }
    if (files.graduate) {
      if (existing.graduate_path) await removePdf(existing.graduate_path);
      const p = await uploadPdf(files.graduate, id, 'graduate_path');
      if (p) updates.graduate_path = p;
    }

    const { error } = await (supabase as any)
      .from('talent_pool_candidates').update(updates).eq('id', id);
    if (error) { toast.error('Erro ao atualizar: ' + error.message); return false; }
    toast.success('Candidato atualizado');
    await load();
    return true;
  };

  const remove = async (cand: TalentCandidate) => {
    const paths = [cand.resume_path, cand.schooling_path, cand.graduate_path].filter(Boolean) as string[];
    if (paths.length > 0) {
      await talentosApi.client.storage.from(RESUME_BUCKET).remove(paths);
    }
    const { error } = await (supabase as any)
      .from('talent_pool_candidates').delete().eq('id', cand.id);
    if (error) { toast.error('Erro ao remover: ' + error.message); return; }
    toast.success('Candidato removido');
    await load();
  };

  const filtered = items.filter((it) => {
    const q = filters.search.trim().toLowerCase();
    if (q && !(
      it.full_name.toLowerCase().includes(q)
      || (it.formation_area || '').toLowerCase().includes(q)
      || (it.email || '').toLowerCase().includes(q)
      || it.phone.includes(q)
    )) return false;
    if (filters.stateId !== 'all' && it.state_id !== filters.stateId) return false;
    if (filters.cityId !== 'all' && it.city_id !== filters.cityId) return false;
    if (filters.hasLicentiate === 'yes' && !it.has_licentiate) return false;
    if (filters.hasLicentiate === 'no' && it.has_licentiate) return false;
    if (filters.weekday !== 'all' && !it.free_weekdays.includes(filters.weekday as any)) return false;
    if (filters.classification === 'none' && (it.classifications?.length || 0) > 0) return false;
    if (filters.classification !== 'all' && filters.classification !== 'none'
        && !it.classifications?.includes(filters.classification as TalentClassification)) return false;
    return true;
  });

  const toggleClassification = async (id: string, value: TalentClassification) => {
    const current = items.find(i => i.id === id);
    if (!current) return false;
    const has = current.classifications?.includes(value);
    const next = has
      ? current.classifications.filter(v => v !== value)
      : [...(current.classifications || []), value];
    // Optimistic
    setItems(prev => prev.map(it => it.id === id ? { ...it, classifications: next } : it));
    const { error } = await (supabase as any)
      .from('talent_pool_candidates').update({ classifications: next }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar etiqueta: ' + error.message);
      await load();
      return false;
    }
    return true;
  };

  const clearClassifications = async (id: string) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, classifications: [] } : it));
    const { error } = await (supabase as any)
      .from('talent_pool_candidates').update({ classifications: [] }).eq('id', id);
    if (error) { toast.error('Erro ao limpar etiquetas: ' + error.message); await load(); return false; }
    return true;
  };

  return {
    items, filtered, states, cities, loading,
    filters, setFilters,
    create, update, remove, getSignedUrl, reload: load,
    toggleClassification, clearClassifications,
  };
}
