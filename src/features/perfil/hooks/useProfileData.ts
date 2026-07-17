import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';
import { perfilApi } from '@/features/perfil/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProfessorId } from '@/hooks/useProfessorId';

export interface ProfileData {
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  role: string;
  organization_name: string;
  organization_id: string | null;
  created_at: string;
}

export interface ProfessorBindings {
  id: string;
  school_name: string;
  course_name: string;
  is_coordinator: boolean;
}

export interface RoleSummary {
  schools_count: number;
  plannings_pending: number;
  orientations_pending: number;
  attendance_pending: number;
  grades_pending: number;
  classes_today: number;
  bindings: ProfessorBindings[];
  schedule_count: number;
}

export function useProfileData() {
  const { user } = useAuth();
  const { professorId, isProfessor } = useProfessorId();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [summary, setSummary] = useState<RoleSummary>({
    schools_count: 0,
    plannings_pending: 0,
    orientations_pending: 0,
    attendance_pending: 0,
    grades_pending: 0,
    classes_today: 0,
    bindings: [],
    schedule_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    // Reset síncrono — evita exibir profile do usuário anterior.
    setProfile(null);
    setSummary({
      schools_count: 0,
      plannings_pending: 0,
      orientations_pending: 0,
      attendance_pending: 0,
      grades_pending: 0,
      classes_today: 0,
      bindings: [],
      schedule_count: 0,
    });
    setLoading(true);

    const requestedUserId = user.id;

    try {
      // Get profile + role + org
      const [profileRes, roleRes] = await Promise.all([
        perfilApi.client.from('profiles').select('full_name, email, avatar_url, phone, organization_id, created_at').eq('user_id', user.id).maybeSingle(),
        perfilApi.client.from('user_roles').select('role, organization_id, organizations:organization_id(name)').eq('user_id', user.id).limit(1).maybeSingle(),
      ]);

      // Se o usuário trocou enquanto o fetch estava em curso, abortar.
      if (requestedUserId !== user.id) return;

      const p = profileRes.data;
      const r = roleRes.data as any;

      setProfile({
        full_name: p?.full_name || user.nomeCompleto,
        email: p?.email || user.email,
        avatar_url: p?.avatar_url || null,
        phone: (p as any)?.phone || null,
        role: r?.role || user.perfil,
        organization_name: r?.organizations?.name || '',
        organization_id: r?.organization_id || p?.organization_id || null,
        created_at: p?.created_at || '',
      });

      // Load role-specific summary
      await loadRoleSummary(r?.role || user.perfil, r?.organization_id);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadRoleSummary = async (role: string, orgId: string | null) => {
    if (!orgId || !user?.id) return;

    const summaryData: RoleSummary = {
      schools_count: 0,
      plannings_pending: 0,
      orientations_pending: 0,
      attendance_pending: 0,
      grades_pending: 0,
      classes_today: 0,
      bindings: [],
      schedule_count: 0,
    };

    try {
      if (role === 'admin' || role === 'coordenador' || role === 'rh') {
        const [schoolsRes, planningsRes, orientationsRes] = await Promise.all([
          perfilApi.client.from('schools').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
          perfilApi.client.from('teacher_plannings').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['ENVIADO', 'PENDING']),
          perfilApi.client.from('orientations').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).in('status', ['AGENDADA', 'PENDENTE']).is('deleted_at', null),
        ]);
        summaryData.schools_count = schoolsRes.count || 0;
        summaryData.plannings_pending = planningsRes.count || 0;
        summaryData.orientations_pending = orientationsRes.count || 0;
      }

      if (role === 'professor' && professorId) {
        const today = new Date().toISOString().split('T')[0];
        const [bindingsRes, scheduleRes, planningsRes, orientationsRes, todayRes] = await Promise.all([
          perfilApi.client.from('professor_school_courses')
            .select('id, is_coordinator, schools:school_id(nome), courses:course_id(nome)')
            .eq('professor_id', professorId).eq('status', 'ACTIVE'),
          perfilApi.client.from('weekly_teaching_models')
            .select('id', { count: 'exact', head: true })
            .eq('professor_id', professorId).eq('status', 'ACTIVE').eq('schedule_type', 'CLASS'),
          perfilApi.client.from('teacher_plannings')
            .select('id', { count: 'exact', head: true })
            .eq('professor_id', professorId).in('status', ['DRAFT', 'CONCLUIDO', 'DEVOLVIDO', 'REJECTED']),
          perfilApi.client.from('orientations')
            .select('id', { count: 'exact', head: true })
            .eq('professor_id', professorId).in('status', ['AGENDADA', 'PENDENTE']).is('deleted_at', null),
          perfilApi.client.from('annual_class_occurrences')
            .select('id, weekly_teaching_models!inner(professor_id)', { count: 'exact', head: true })
            .eq('occurrence_date', today).eq('status', 'SCHEDULED')
            .eq('weekly_teaching_models.professor_id', professorId),
        ]);

        summaryData.bindings = (bindingsRes.data || []).map((b: any) => ({
          id: b.id,
          school_name: b.schools?.nome || '',
          course_name: b.courses?.nome || '',
          is_coordinator: b.is_coordinator,
        }));
        summaryData.schools_count = [...new Set(summaryData.bindings.map(b => b.school_name))].filter(Boolean).length;
        summaryData.schedule_count = scheduleRes.count || 0;
        summaryData.plannings_pending = planningsRes.count || 0;
        summaryData.orientations_pending = orientationsRes.count || 0;
        summaryData.classes_today = todayRes.count || 0;
      }

      // Coordinator bindings
      if (role === 'coordenador' || role === 'rh') {
        const bindingsRes = await perfilApi.client.from('professor_school_courses')
          .select('id, is_coordinator, schools:school_id(nome), courses:course_id(nome), professors!inner(user_id)')
          .eq('professors.user_id', user!.id).eq('status', 'ACTIVE');
        
        summaryData.bindings = (bindingsRes.data || []).map((b: any) => ({
          id: b.id,
          school_name: b.schools?.nome || '',
          course_name: b.courses?.nome || '',
          is_coordinator: b.is_coordinator,
        }));
      }
    } catch (err) {
      console.error('Error loading summary:', err);
    }

    setSummary(summaryData);
  };

  useEffect(() => {
    loadProfile();
  }, [loadProfile, professorId]);

  const updateProfile = async (data: { full_name?: string; phone?: string; avatar_url?: string | null }) => {
    if (!user?.id) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (!error) {
      await loadProfile();
      return true;
    }
    return false;
  };

  const uploadAvatar = async (file: File) => {
    if (!user?.id) return null;
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    // Delete existing
    await perfilApi.client.storage.from('avatars').remove([path]);

    const { error } = await perfilApi.client.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data: urlData } = perfilApi.client.storage.from('avatars').getPublicUrl(path);
    const url = `${urlData.publicUrl}?t=${Date.now()}`;
    await updateProfile({ avatar_url: url });
    return url;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    // CRÍTICO: usar o email do usuário autenticado (AuthContext), NUNCA o
    // do profile em memória — que pode estar stale e fazer login no usuário
    // errado durante a revalidação.
    if (!user?.email) return { success: false, error: 'Sessão inválida' };

    const { error: signInError } = await perfilApi.client.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (signInError) return { success: false, error: 'Senha atual incorreta' };

    const { error } = await perfilApi.client.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  };

  return { profile, summary, loading, updateProfile, uploadAvatar, changePassword, reload: loadProfile };
}
