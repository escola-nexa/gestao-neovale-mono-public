import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useCallback } from 'react';
import { bibliotecaApi } from '@/features/biblioteca/api';
import { useOrganization } from '@/hooks/useOrganization';
import type { LibraryCategory, LibraryContentWithRefs, LibraryFolder } from '../types';

// Cast helper — types regenerate after migration finishes
const sb = supabase as unknown as {
  from: (t: string) => any;
  auth: typeof bibliotecaApi.client.auth;
};

export function useLibrary() {
  const { organizationId } = useOrganization();
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [contents, setContents] = useState<LibraryContentWithRefs[]>([]);
  const [tracks, setTracks] = useState<{ id: string; name: string }[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string; formative_track_id: string | null }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; course_id: string }[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [contentFolders, setContentFolders] = useState<Map<string, string[]>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const [cats, conts, trk, crs, subs, fld, cfs] = await Promise.all([
      sb.from('library_categories').select('*').eq('organization_id', organizationId).order('name'),
      sb.from('library_contents')
        .select(`*,
          category:category_id(id,name),
          formative_track:formative_track_id(id,name),
          course:course_id(id,nome),
          subject:subject_id(id,nome)
        `)
        .eq('organization_id', organizationId)
        .is('parent_id', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false }),
      sb.from('formative_tracks').select('id,name').eq('organization_id', organizationId).eq('status', 'ACTIVE').is('deleted_at', null).order('name'),
      sb.from('courses').select('id,nome,formative_track_id').eq('organization_id', organizationId).eq('status', 'ativo').order('nome'),
      sb.from('subjects').select('id,nome,course_id').eq('organization_id', organizationId).eq('status', 'ativo').is('deleted_at', null).order('nome'),
      sb.from('library_folders').select('*').eq('organization_id', organizationId).order('sort_order', { ascending: true }),
      sb.from('library_content_folders').select('content_id,folder_id'),
    ]);

    setCategories((cats.data ?? []) as LibraryCategory[]);

    // Normalize course/subject from "nome" -> "name" for nested refs
    const normalizedContents = ((conts.data ?? []) as any[]).map((c) => ({
      ...c,
      course: c.course ? { id: c.course.id, name: c.course.nome } : null,
      subject: c.subject ? { id: c.subject.id, name: c.subject.nome } : null,
    })) as LibraryContentWithRefs[];
    setContents(normalizedContents);

    setTracks((trk.data ?? []) as { id: string; name: string }[]);
    setCourses(((crs.data ?? []) as any[]).map((c) => ({ id: c.id, name: c.nome, formative_track_id: c.formative_track_id })));
    setSubjects(((subs.data ?? []) as any[]).map((s) => ({ id: s.id, name: s.nome, course_id: s.course_id })));
    setFolders((fld.data ?? []) as LibraryFolder[]);

    const map = new Map<string, string[]>();
    for (const link of (cfs.data ?? []) as { content_id: string; folder_id: string }[]) {
      const arr = map.get(link.content_id) ?? [];
      arr.push(link.folder_id);
      map.set(link.content_id, arr);
    }
    setContentFolders(map);

    setLoading(false);
  }, [organizationId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createCategory = async (name: string): Promise<LibraryCategory | null> => {
    if (!organizationId) return null;
    const { data: { user } } = await bibliotecaApi.client.auth.getUser();
    const { data, error } = await sb.from('library_categories')
      .insert({ organization_id: organizationId, name: name.trim(), created_by: user?.id })
      .select().single();
    if (error) throw error;
    setCategories((prev) => [...prev, data as LibraryCategory].sort((a, b) => a.name.localeCompare(b.name)));
    return data as LibraryCategory;
  };

  return {
    organizationId,
    categories, contents, tracks, courses, subjects,
    folders, contentFolders,
    loading,
    refresh: fetchAll,
    createCategory,
  };
}

