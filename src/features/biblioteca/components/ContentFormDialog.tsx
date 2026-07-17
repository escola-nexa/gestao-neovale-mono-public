import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Loader2, Plus, X, Info, Upload, FileText, Image as ImageIcon, Video,
  Link as LinkIcon, Youtube, Files, Trash2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bibliotecaApi } from '@/features/biblioteca/api';
import { CoverPicker } from './CoverPicker';
import type { LibraryCategory, LibraryContentType, LibraryContentWithRefs, LibraryFolder } from '../types';
import { FolderMultiSelect } from './FolderMultiSelect';

type FormType = LibraryContentType | 'multi';

interface FormState {
  title: string;
  description: string;
  category_id: string;
  formative_track_id: string;
  course_id: string;
  subject_id: string;
  lesson_number: string;
  content_type: FormType;
  content_url: string;
  storage_path: string | null;
  file_mime: string | null;
  file_size: number | null;
  cover_color: string;
  cover_icon: string;
}

const initial: FormState = {
  title: '', description: '', category_id: '',
  formative_track_id: '', course_id: '', subject_id: '', lesson_number: '',
  content_type: 'pdf',
  content_url: '', storage_path: null, file_mime: null, file_size: null,
  cover_color: 'blue', cover_icon: 'BookOpen',
};

const ACCEPT_BY_TYPE: Record<LibraryContentType, string> = {
  pdf: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,.doc,.docx,.txt',
  image: 'image/*',
  video: 'video/*',
  video_link: '',
  link: '',
};

const MAX_SIZE_BY_TYPE: Record<LibraryContentType, number> = {
  pdf: 50 * 1024 * 1024,
  image: 10 * 1024 * 1024,
  video: 200 * 1024 * 1024,
  video_link: 0,
  link: 0,
};

const MULTI_MAX_SIZE = 200 * 1024 * 1024; // 200MB por arquivo no modo múltiplo

interface MultiFileItem {
  id: string;
  file: File;
  name: string;
  detected: LibraryContentType;
  storage_path?: string;
  uploading: boolean;
  error?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string | null;
  editing: LibraryContentWithRefs | null;
  categories: LibraryCategory[];
  tracks: { id: string; name: string }[];
  courses: { id: string; name: string; formative_track_id: string | null }[];
  subjects: { id: string; name: string; course_id: string }[];
  folders?: LibraryFolder[];
  contentFolders?: Map<string, string[]>;
  onFoldersRefreshed?: (folders: LibraryFolder[]) => void;
  onCreateCategory: (name: string) => Promise<LibraryCategory | null>;
  onSaved: () => void;
}

const sb = supabase as any;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function detectType(file: File): LibraryContentType {
  const t = (file.type || '').toLowerCase();
  if (t === 'application/pdf') return 'pdf';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  // fallback por extensão
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
  return 'pdf'; // genérico → tratado como documento
}

function stripExt(name: string) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

export function ContentFormDialog({
  open, onOpenChange, organizationId, editing,
  categories, tracks, courses, subjects,
  folders = [], contentFolders, onFoldersRefreshed,
  onCreateCategory, onSaved,
}: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);
  const [multiFiles, setMultiFiles] = useState<MultiFileItem[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description,
        category_id: editing.category_id,
        formative_track_id: editing.formative_track_id ?? '',
        course_id: editing.course_id ?? '',
        subject_id: editing.subject_id ?? '',
        lesson_number: (editing as any).lesson_number ? String((editing as any).lesson_number) : '',
        content_type: (editing.content_type ?? 'link') as LibraryContentType,
        content_url: editing.content_url ?? '',
        storage_path: editing.storage_path ?? null,
        file_mime: editing.file_mime ?? null,
        file_size: editing.file_size ?? null,
        cover_color: editing.cover_color,
        cover_icon: editing.cover_icon,
      });
    } else {
      setForm(initial);
    }
    setMultiFiles([]);
    setNewCatMode(false);
    setNewCatName('');
    if (editing && contentFolders) {
      setSelectedFolderIds(contentFolders.get(editing.id) ?? []);
    } else {
      setSelectedFolderIds([]);
    }
  }, [open, editing, contentFolders]);

  const filteredCourses = useMemo(
    () => form.formative_track_id
      ? courses.filter((c) => c.formative_track_id === form.formative_track_id)
      : [],
    [courses, form.formative_track_id],
  );
  const filteredSubjects = useMemo(
    () => form.course_id ? subjects.filter((s) => s.course_id === form.course_id) : [],
    [subjects, form.course_id],
  );

  // Aulas já utilizadas para a disciplina selecionada (somem da listagem)
  const [usedLessons, setUsedLessons] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (!form.subject_id) { setUsedLessons(new Set()); return; }
    let cancelled = false;
    (async () => {
      let q = sb
        .from('library_contents')
        .select('lesson_number')
        .eq('subject_id', form.subject_id)
        .not('lesson_number', 'is', null);
      if (editing?.id) q = q.neq('id', editing.id);
      const { data } = await q;
      if (cancelled) return;
      const nums = new Set<number>((data ?? []).map((r: any) => r.lesson_number).filter((n: any) => typeof n === 'number'));
      setUsedLessons(nums);
    })();
    return () => { cancelled = true; };
  }, [form.subject_id, editing?.id]);

  const lessonOptions = useMemo(() => {
    const current = form.lesson_number ? Number(form.lesson_number) : null;
    const out: { value: string; label: string }[] = [];
    for (let i = 1; i <= 500; i++) {
      if (usedLessons.has(i) && i !== current) continue;
      out.push({ value: String(i), label: `Aula ${i}` });
    }
    return out;
  }, [usedLessons, form.lesson_number]);

  const isFileType = form.content_type === 'pdf' || form.content_type === 'image' || form.content_type === 'video';
  const isLinkType = form.content_type === 'video_link' || form.content_type === 'link';
  const isMulti = form.content_type === 'multi';

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const cat = await onCreateCategory(newCatName);
      if (cat) {
        setForm((f) => ({ ...f, category_id: cat.id }));
        setNewCatMode(false);
        setNewCatName('');
        toast({ title: 'Categoria criada' });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message ?? 'Não foi possível criar', variant: 'destructive' });
    } finally {
      setCreatingCat(false);
    }
  };

  const translateError = (err: any): string => {
    const raw = (err?.message || err?.error || '').toString().toLowerCase();
    if (raw.includes('row-level security') || raw.includes('rls') || raw.includes('not authorized') || raw.includes('permission')) {
      return 'Você não tem permissão para enviar arquivos para esta organização. Confirme se está logado corretamente.';
    }
    if (raw.includes('payload too large') || raw.includes('exceeded') || raw.includes('size')) {
      return 'Arquivo excede o tamanho máximo permitido pelo servidor.';
    }
    if (raw.includes('mime') || raw.includes('content type') || raw.includes('invalid_mime')) {
      return 'Tipo de arquivo não suportado. Verifique o formato e tente novamente.';
    }
    if (raw.includes('duplicate') || raw.includes('already exists')) {
      return 'Já existe um arquivo com este nome. Tente novamente.';
    }
    if (raw.includes('network') || raw.includes('failed to fetch') || raw.includes('timeout')) {
      return 'Falha de conexão com o servidor. Verifique sua internet e tente novamente.';
    }
    if (raw.includes('bucket') && raw.includes('not found')) {
      return 'Repositório de arquivos indisponível. Contate o administrador.';
    }
    return err?.message || 'Não foi possível concluir a operação. Tente novamente.';
  };

  const handleFileSelect = async (file: File) => {
    if (!organizationId || form.content_type === 'multi') return;
    const type = form.content_type as LibraryContentType;
    const max = MAX_SIZE_BY_TYPE[type];
    if (max > 0 && file.size > max) {
      toast({
        title: 'Arquivo muito grande',
        description: `O arquivo tem ${formatBytes(file.size)}. O tamanho máximo é ${formatBytes(max)}.`,
        variant: 'destructive',
      });
      return;
    }
    const expected = ACCEPT_BY_TYPE[type];
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const matchesAccept = expected.split(',').some((m) => {
      const t = m.trim().toLowerCase();
      if (!t) return false;
      if (t.startsWith('.')) return `.${ext}` === t;
      if (t.endsWith('/*')) return file.type.startsWith(t.slice(0, -1));
      return file.type.toLowerCase() === t;
    });
    if (expected && !matchesAccept) {
      toast({
        title: 'Formato inválido',
        description: `O arquivo selecionado (${file.type || ext || 'tipo desconhecido'}) não corresponde ao tipo "${type}".`,
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
      const path = `${organizationId}/${type}/${crypto.randomUUID()}.${ext}`;
      const { error } = await bibliotecaApi.client.storage.from('library-content').upload(path, file, {
        cacheControl: '3600', upsert: false, contentType: file.type,
      });
      if (error) throw error;
      if (form.storage_path) {
        await bibliotecaApi.client.storage.from('library-content').remove([form.storage_path]).catch(() => {});
      }
      setForm((f) => ({ ...f, storage_path: path, file_mime: file.type, file_size: file.size }));
      toast({ title: 'Arquivo enviado', description: `${file.name} (${formatBytes(file.size)})` });
    } catch (err: any) {
      console.error('[Biblioteca] Erro upload:', err);
      toast({ title: 'Erro ao enviar arquivo', description: translateError(err), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleMultiFilesSelected = async (files: FileList | null) => {
    if (!files || !files.length || !organizationId) return;
    const items: MultiFileItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: '',
      detected: detectType(file),
      uploading: true,
    }));
    setMultiFiles((prev) => [...prev, ...items]);

    for (const item of items) {
      if (item.file.size > MULTI_MAX_SIZE) {
        setMultiFiles((prev) => prev.map((it) => it.id === item.id
          ? { ...it, uploading: false, error: `Arquivo excede ${formatBytes(MULTI_MAX_SIZE)}` }
          : it));
        continue;
      }
      try {
        const ext = (item.file.name.split('.').pop() || 'bin').toLowerCase();
        const path = `${organizationId}/${item.detected}/${crypto.randomUUID()}.${ext}`;
        const { error } = await bibliotecaApi.client.storage.from('library-content').upload(path, item.file, {
          cacheControl: '3600', upsert: false, contentType: item.file.type || 'application/octet-stream',
        });
        if (error) throw error;
        setMultiFiles((prev) => prev.map((it) => it.id === item.id
          ? { ...it, uploading: false, storage_path: path }
          : it));
      } catch (err: any) {
        setMultiFiles((prev) => prev.map((it) => it.id === item.id
          ? { ...it, uploading: false, error: translateError(err) }
          : it));
      }
    }
  };

  // Quando o usuário seleciona múltiplos arquivos no campo único:
  // - Se ainda não há arquivo principal, o primeiro vira o principal e o resto vira anexo.
  // - Se já há principal, todos viram anexos.
  const handleFilesSelectedSmart = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const arr = Array.from(files);
    if (!form.storage_path) {
      const [first, ...rest] = arr;
      await handleFileSelect(first);
      if (rest.length) {
        const dt = new DataTransfer();
        rest.forEach((f) => dt.items.add(f));
        await handleMultiFilesSelected(dt.files);
      }
    } else {
      const dt = new DataTransfer();
      arr.forEach((f) => dt.items.add(f));
      await handleMultiFilesSelected(dt.files);
    }
  };

  const removeMultiFile = async (id: string) => {
    const item = multiFiles.find((x) => x.id === id);
    if (item?.storage_path) {
      await bibliotecaApi.client.storage.from('library-content').remove([item.storage_path]).catch(() => {});
    }
    setMultiFiles((prev) => prev.filter((x) => x.id !== id));
  };

  const validateShared = () => {
    if (!form.description.trim() || !form.category_id) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha descrição e categoria antes de salvar.', variant: 'destructive' });
      return false;
    }
    if (!organizationId) {
      toast({ title: 'Organização não carregada', description: 'Aguarde alguns segundos e tente novamente.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const setContentFolders = async (contentId: string, folderIds: string[]) => {
    const { error } = await sb.rpc('library_content_set_folders', {
      _content_id: contentId,
      _folder_ids: folderIds,
    });
    if (error) throw error;
  };

  const handleSaveMulti = async () => {
    if (!validateShared()) return;
    if (multiFiles.length === 0) {
      toast({ title: 'Nenhum arquivo', description: 'Selecione ao menos um arquivo.', variant: 'destructive' });
      return;
    }
    const ready = multiFiles.filter((x) => x.storage_path && !x.error);
    if (ready.length === 0) {
      toast({ title: 'Nenhum arquivo enviado', description: 'Aguarde o término dos uploads ou remova os com erro.', variant: 'destructive' });
      return;
    }
    if (multiFiles.some((x) => x.uploading)) {
      toast({ title: 'Aguarde', description: 'Há uploads em andamento.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await bibliotecaApi.client.auth.getUser();
      const baseTitle = form.title.trim();
      const rows = ready.map((it) => ({
        organization_id: organizationId,
        created_by: user?.id,
        title: (it.name.trim() || (baseTitle ? `${baseTitle} - ${stripExt(it.file.name)}` : stripExt(it.file.name))).slice(0, 150),
        description: form.description.trim(),
        category_id: form.category_id,
        formative_track_id: form.formative_track_id || null,
        course_id: form.formative_track_id ? (form.course_id || null) : null,
        subject_id: form.formative_track_id && form.course_id ? (form.subject_id || null) : null,
        content_type: it.detected,
        content_url: null,
        storage_path: it.storage_path,
        file_mime: it.file.type || null,
        file_size: it.file.size,
        cover_color: form.cover_color,
        cover_icon: form.cover_icon,
      }));
      const { data: insertedRows, error } = await sb.from('library_contents').insert(rows).select('id');
      if (error) throw error;
      // Vincular cada novo conteúdo aos grupos selecionados
      if (selectedFolderIds.length > 0 && Array.isArray(insertedRows)) {
        await Promise.all(insertedRows.map((row: any) => setContentFolders(row.id, selectedFolderIds)));
      }
      toast({ title: `${rows.length} conteúdo(s) criado(s)` });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error('[Biblioteca] Erro salvar múltiplos:', err);
      toast({ title: 'Erro ao salvar', description: translateError(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (isMulti) return handleSaveMulti();

    if (!form.title.trim() || !form.description.trim() || !form.category_id) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha título, descrição e categoria antes de salvar.', variant: 'destructive' });
      return;
    }
    if (uploading || multiFiles.some((x) => x.uploading)) {
      toast({ title: 'Aguarde', description: 'Há uploads em andamento. Tente novamente em instantes.', variant: 'destructive' });
      return;
    }
    const readyExtras = multiFiles.filter((x) => x.storage_path && !x.error);
    let effectiveContentType = form.content_type as FormType;
    let effectiveStoragePath = form.storage_path;
    let effectiveFileMime = form.file_mime;
    let effectiveFileSize = form.file_size;
    let extrasToPersist = readyExtras;

    // Se o primeiro upload caiu na lista de extras por timing/seleção múltipla,
    // promove em memória e salva no MESMO clique, sem exigir "Salvar" novamente.
    if (isFileType && !effectiveStoragePath) {
      if (readyExtras.length === 0) {
        toast({ title: 'Arquivo obrigatório', description: 'Faça o upload do arquivo antes de salvar.', variant: 'destructive' });
        return;
      }
      const promoted = readyExtras[0];
      effectiveContentType = promoted.detected;
      effectiveStoragePath = promoted.storage_path!;
      effectiveFileMime = promoted.file.type || null;
      effectiveFileSize = promoted.file.size;
      extrasToPersist = readyExtras.filter((x) => x.id !== promoted.id);
    }
    if (isLinkType) {
      const url = form.content_url.trim();
      if (!url) {
        toast({ title: 'URL obrigatória', description: 'Informe o link do conteúdo.', variant: 'destructive' });
        return;
      }
      try {
        const u = new URL(url);
        if (!['http:', 'https:'].includes(u.protocol)) throw new Error('protocolo');
      } catch {
        toast({ title: 'URL inválida', description: 'Informe um link válido começando com http:// ou https://.', variant: 'destructive' });
        return;
      }
    }
    if (!organizationId) {
      toast({ title: 'Organização não carregada', description: 'Aguarde alguns segundos e tente novamente.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await bibliotecaApi.client.auth.getUser();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category_id: form.category_id,
        formative_track_id: form.formative_track_id || null,
        course_id: form.formative_track_id ? (form.course_id || null) : null,
        subject_id: form.formative_track_id && form.course_id ? (form.subject_id || null) : null,
        lesson_number: form.subject_id && form.lesson_number ? Number(form.lesson_number) : null,
        content_type: effectiveContentType as LibraryContentType,
        content_url: isLinkType ? form.content_url.trim() : null,
        storage_path: isFileType ? effectiveStoragePath : null,
        file_mime: isFileType ? effectiveFileMime : null,
        file_size: isFileType ? effectiveFileSize : null,
        cover_color: form.cover_color,
        cover_icon: form.cover_icon,
      };
      let savedId: string | null = editing?.id ?? null;
      if (editing) {
        const { error } = await sb.from('library_contents').update(payload).eq('id', editing.id);
        if (error) throw error;
        const extras = extrasToPersist;
        if (extras.length > 0) {
          const baseTitle = form.title.trim();
          const extraRows = extras.map((it) => ({
            organization_id: organizationId,
            created_by: user?.id,
            parent_id: null,
            title: (it.name.trim() || (baseTitle ? `${baseTitle} - ${stripExt(it.file.name)}` : stripExt(it.file.name))).slice(0, 150),
            description: form.description.trim(),
            category_id: form.category_id,
            formative_track_id: form.formative_track_id || null,
            course_id: form.formative_track_id ? (form.course_id || null) : null,
            subject_id: form.formative_track_id && form.course_id ? (form.subject_id || null) : null,
            content_type: it.detected,
            content_url: null,
            storage_path: it.storage_path,
            file_mime: it.file.type || null,
            file_size: it.file.size,
            cover_color: form.cover_color,
            cover_icon: form.cover_icon,
          }));
          const { data: insertedExtras, error: insErr } = await sb.from('library_contents').insert(extraRows).select('id');
          if (insErr) throw insErr;
          if (selectedFolderIds.length > 0 && Array.isArray(insertedExtras)) {
            await Promise.all(insertedExtras.map((row: any) => setContentFolders(row.id, selectedFolderIds)));
          }
          toast({
            title: `Conteúdo atualizado e ${extras.length} arquivo(s) criado(s) na biblioteca`,
          });
        } else {
          toast({ title: 'Conteúdo atualizado com sucesso' });
        }
      } else {
        const { data: created, error } = await sb.from('library_contents').insert({
          ...payload, organization_id: organizationId, created_by: user?.id,
        }).select('id').maybeSingle();
        if (error) throw error;
        savedId = created?.id ?? null;
        const extras = extrasToPersist;
        if (extras.length > 0) {
          const baseTitle = form.title.trim();
          const extraRows = extras.map((it) => ({
            organization_id: organizationId,
            created_by: user?.id,
            parent_id: null,
            title: (it.name.trim() || (baseTitle ? `${baseTitle} - ${stripExt(it.file.name)}` : stripExt(it.file.name))).slice(0, 150),
            description: form.description.trim(),
            category_id: form.category_id,
            formative_track_id: form.formative_track_id || null,
            course_id: form.formative_track_id ? (form.course_id || null) : null,
            subject_id: form.formative_track_id && form.course_id ? (form.subject_id || null) : null,
            content_type: it.detected,
            content_url: null,
            storage_path: it.storage_path,
            file_mime: it.file.type || null,
            file_size: it.file.size,
            cover_color: form.cover_color,
            cover_icon: form.cover_icon,
          }));
          const { data: insertedExtras, error: insErr } = await sb.from('library_contents').insert(extraRows).select('id');
          if (insErr) throw insErr;
          if (selectedFolderIds.length > 0 && Array.isArray(insertedExtras)) {
            await Promise.all(insertedExtras.map((row: any) => setContentFolders(row.id, selectedFolderIds)));
          }
          toast({
            title: `Conteúdo criado e ${extras.length} arquivo(s) criado(s) na biblioteca`,
          });
        } else {
          toast({ title: 'Conteúdo criado com sucesso' });
        }
      }
      // Vincular Grupos (pastas livres) — também roda com array vazio (limpa vínculos)
      if (savedId) {
        await setContentFolders(savedId, selectedFolderIds);
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error('[Biblioteca] Erro salvar:', err);
      toast({ title: 'Erro ao salvar conteúdo', description: translateError(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (t: FormType) => {
    setForm((f) => ({
      ...f, content_type: t,
      content_url: '', storage_path: null, file_mime: null, file_size: null,
    }));
    if (t !== 'multi') setMultiFiles([]);
  };

  const totalMultiSize = multiFiles.reduce((acc, it) => acc + it.file.size, 0);
  const anyUploading = multiFiles.some((x) => x.uploading);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? (isMulti ? 'Adicionar mais arquivos à biblioteca' : 'Editar conteúdo')
              : 'Novo conteúdo da biblioteca'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <CoverPicker
            color={form.cover_color}
            icon={form.cover_icon}
            onColorChange={(k) => setForm((f) => ({ ...f, cover_color: k }))}
            onIconChange={(k) => setForm((f) => ({ ...f, cover_icon: k }))}
          />

          <div className="space-y-2">
            <Label>{isMulti ? 'Título base (opcional)' : 'Título *'}</Label>
            <Input
              value={form.title}
              maxLength={150}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isMulti
                ? 'Se preenchido, será usado como prefixo do nome de cada arquivo'
                : 'Ex: Introdução à Inteligência Artificial'}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Textarea
              value={form.description}
              maxLength={1000}
              rows={3}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva brevemente este conteúdo"
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria *</Label>
            {!newCatMode ? (
              <div className="flex gap-2">
                <SearchableSelect
                  value={form.category_id}
                  onValueChange={(v) => setForm({ ...form, category_id: v })}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder="Selecione uma categoria"
                  searchPlaceholder="Buscar categoria..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setNewCatMode(true)} title="Nova categoria">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da nova categoria"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                />
                <Button type="button" onClick={handleCreateCategory} disabled={creatingCat || !newCatName.trim()}>
                  {creatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => { setNewCatMode(false); setNewCatName(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Tipo de conteúdo */}
          <div className="space-y-2">
            <Label>Tipo de conteúdo *</Label>
            <Tabs value={form.content_type} onValueChange={(v) => handleTypeChange(v as FormType)}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="pdf"><FileText className="h-4 w-4 mr-1" />PDF</TabsTrigger>
                <TabsTrigger value="image"><ImageIcon className="h-4 w-4 mr-1" />Imagem</TabsTrigger>
                <TabsTrigger value="video"><Video className="h-4 w-4 mr-1" />Vídeo</TabsTrigger>
                <TabsTrigger value="video_link"><Youtube className="h-4 w-4 mr-1" />Link Vídeo</TabsTrigger>
                <TabsTrigger value="link"><LinkIcon className="h-4 w-4 mr-1" />Link</TabsTrigger>
                <TabsTrigger value="multi"><Files className="h-4 w-4 mr-1" />Múltiplos</TabsTrigger>
              </TabsList>

              <TabsContent value={form.content_type} className="mt-3">
                {isMulti ? (
                  <div className="space-y-3">
                    <input
                      ref={multiInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleMultiFilesSelected(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 border-dashed"
                      onClick={() => multiInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Adicionar arquivos (qualquer extensão)
                    </Button>

                    {multiFiles.length > 0 && (
                      <>
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                          <span>{multiFiles.length} arquivo(s) • {formatBytes(totalMultiSize)}</span>
                          <span>Tamanho máximo por arquivo: {formatBytes(MULTI_MAX_SIZE)}</span>
                        </div>
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                          {multiFiles.map((it) => (
                            <div key={it.id} className="flex items-start gap-2 p-2 border rounded-md bg-muted/20">
                              <div className="shrink-0 mt-1">
                                {it.uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
                                  it.error ? <AlertCircle className="h-4 w-4 text-destructive" /> :
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              </div>
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="truncate" title={it.file.name}>{it.file.name}</span>
                                  <span className="shrink-0">({formatBytes(it.file.size)})</span>
                                  <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase">{it.detected}</span>
                                </div>
                                <Input
                                  value={it.name}
                                  onChange={(e) => setMultiFiles((prev) => prev.map((x) => x.id === it.id ? { ...x, name: e.target.value } : x))}
                                  placeholder="Nome do conteúdo (opcional)"
                                  className="h-8 text-sm"
                                  maxLength={150}
                                />
                                {it.error && <p className="text-xs text-destructive">{it.error}</p>}
                              </div>
                              <Button
                                type="button" variant="ghost" size="icon"
                                className="h-7 w-7 shrink-0"
                                onClick={() => removeMultiFile(it.id)}
                                disabled={it.uploading}
                                title="Remover"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Cada arquivo vira um conteúdo independente. Se o nome ficar em branco, usamos o nome do arquivo
                          {form.title.trim() ? ' (com o título base como prefixo).' : '.'}
                        </p>
                      </>
                    )}
                  </div>
                ) : isFileType ? (
                  <div className="rounded-xl border border-orange-200 dark:border-orange-900/40 bg-orange-50/30 dark:bg-orange-950/10 p-4 space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPT_BY_TYPE[form.content_type as LibraryContentType]}
                      className="hidden"
                      onChange={(e) => {
                        handleFilesSelectedSmart(e.target.files);
                        e.target.value = '';
                      }}
                    />

                    {/* Botão único de upload */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-20 border-dashed border-orange-300 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Enviando...</>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 mr-2 text-orange-600" />
                          {form.storage_path ? 'Adicionar mais arquivos' : `Selecionar ${form.content_type === 'pdf' ? 'documento(s) (PDF, Word, TXT)' : form.content_type === 'image' ? 'imagem(s)' : 'vídeo(s)'}`}
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] text-muted-foreground text-center">
                      Você pode selecionar vários arquivos. Máximo: {formatBytes(MAX_SIZE_BY_TYPE[form.content_type as LibraryContentType])} (principal) • {formatBytes(MULTI_MAX_SIZE)} (anexos)
                    </p>

                    {/* Lista unificada: principal + extras */}
                    {(form.storage_path || multiFiles.length > 0) && (
                      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                        {form.storage_path && (
                          <div className="flex items-center gap-2 p-2 border-2 border-orange-300 rounded-md bg-background">
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-500 text-white shrink-0">Principal</span>
                            <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate" title={form.storage_path.split('/').pop()}>{form.storage_path.split('/').pop()}</span>
                              {form.file_size && (
                                <span className="text-muted-foreground shrink-0">({formatBytes(form.file_size)})</span>
                              )}
                            </div>
                            <Button
                              type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                              onClick={async () => {
                                if (form.storage_path) {
                                  await bibliotecaApi.client.storage.from('library-content').remove([form.storage_path]).catch(() => {});
                                }
                                setForm((f) => ({ ...f, storage_path: null, file_mime: null, file_size: null }));
                              }}
                              disabled={uploading}
                              title="Remover principal"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {multiFiles.map((it) => (
                          <div key={it.id} className="flex items-start gap-2 p-2 border rounded-md bg-background">
                            <div className="shrink-0 mt-1">
                              {it.uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> :
                                it.error ? <AlertCircle className="h-4 w-4 text-destructive" /> :
                                <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate" title={it.file.name}>{it.file.name}</span>
                                <span className="shrink-0">({formatBytes(it.file.size)})</span>
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase">{it.detected}</span>
                              </div>
                              <Input
                                value={it.name}
                                onChange={(e) => setMultiFiles((prev) => prev.map((x) => x.id === it.id ? { ...x, name: e.target.value } : x))}
                                placeholder="Nome do conteúdo (opcional)"
                                className="h-8 text-sm"
                                maxLength={150}
                              />
                              {it.error && <p className="text-xs text-destructive">{it.error}</p>}
                            </div>
                            <Button
                              type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                              onClick={() => removeMultiFile(it.id)}
                              disabled={it.uploading}
                              title="Remover"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="url"
                      value={form.content_url}
                      onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                      placeholder={form.content_type === 'video_link' ? 'https://youtube.com/watch?v=...' : 'https://...'}
                    />
                    {form.content_type === 'video_link' && (
                      <p className="text-xs text-muted-foreground">YouTube, Vimeo ou qualquer plataforma de vídeo.</p>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>


          <div className="rounded-lg border border-dashed p-3 space-y-3 bg-muted/30">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Sem itinerário, o conteúdo será salvo como <span className="font-semibold">Categoria Livre</span>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Itinerário Formativo</Label>
                <SearchableSelect
                  value={form.formative_track_id}
                  onValueChange={(v) => setForm({ ...form, formative_track_id: v, course_id: '', subject_id: '', lesson_number: '' })}
                  options={tracks.map((t) => ({ value: t.id, label: t.name }))}
                  placeholder="Opcional"
                  allowClear
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Curso</Label>
                <SearchableSelect
                  value={form.course_id}
                  onValueChange={(v) => setForm({ ...form, course_id: v, subject_id: '', lesson_number: '' })}
                  options={filteredCourses.map((c) => ({ value: c.id, label: c.name }))}
                  placeholder={form.formative_track_id ? 'Selecione...' : 'Escolha o itinerário'}
                  disabled={!form.formative_track_id}
                  allowClear
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Disciplina</Label>
                <SearchableSelect
                  value={form.subject_id}
                  onValueChange={(v) => setForm({ ...form, subject_id: v, lesson_number: '' })}
                  options={filteredSubjects.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder={form.course_id ? 'Selecione...' : 'Escolha o curso'}
                  disabled={!form.course_id}
                  allowClear
                />
              </div>
            </div>
          </div>

          {/* Grupos (pastas livres dentro da Categoria) — opcional, paralelo ao itinerário */}
          <div className="rounded-lg border border-dashed p-3 space-y-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Grupos / Subgrupos (opcional)</Label>
              <span className="text-[11px] text-muted-foreground">Pastas livres dentro da Categoria</span>
            </div>
            <FolderMultiSelect
              categoryId={form.category_id}
              folders={folders}
              selected={selectedFolderIds}
              onChange={setSelectedFolderIds}
              onFoldersRefreshed={(fs) => onFoldersRefreshed?.(fs)}
              organizationId={organizationId}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || uploading || anyUploading} className="w-full sm:w-auto">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isMulti
              ? `${editing ? 'Adicionar' : 'Criar'} ${multiFiles.filter((x) => x.storage_path && !x.error).length || ''} conteúdo(s)`.replace(/\s+/g, ' ').trim()
              : editing ? 'Salvar alterações' : 'Criar conteúdo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
