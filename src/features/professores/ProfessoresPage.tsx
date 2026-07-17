import { supabase } from '@/integrations/supabase/client';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Trash2, Link2, Loader2, UserCog, Eye, School, BookOpen, Users, FileEdit, FileDown, Activity, Share2, LayoutDashboard, AlertTriangle, Clock, PhoneCall } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import FeatureGuideCard from '@/components/FeatureGuideCard';
import { toast } from 'sonner';
import { professoresApi } from '@/features/professores/api';
import { professorsApi } from './api';
import { ProfessorForm } from './components/ProfessorForm';
import { BindingsDialog } from './components/BindingsDialog';
import { ExportProfessorDialog } from './components/ExportProfessorDialog';
import { ProfessorStatusDialog } from './components/ProfessorStatusDialog';
import { DeleteProfessorDialog } from './components/DeleteProfessorDialog';
import { ShareProfessorDialog } from './components/ShareProfessorDialog';
import { ProfessorAccessLogsDialog } from './components/ProfessorAccessLogsDialog';
import { ContactLogDialog } from './components/ContactLogDialog';
import { EditBindingWorkloadDialog } from './components/EditBindingWorkloadDialog';
import { SendToHiringDialog } from './components/SendToHiringDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, X, Shirt, Wallet, FileSpreadsheet } from 'lucide-react';
import type { ProfessorData, ProfessorFormData } from './types';
import { exportShareReport } from './utils/exportShareReport';
import { exportShirtSizeReport } from './utils/exportShirtSizeReport';
import { exportShirtSizeBySchoolReport } from './utils/exportShirtSizeBySchoolReport';
import { exportPixReport } from './utils/exportPixReport';
import { exportPixReportXlsx } from './utils/exportPixReportXlsx';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { isManagerRole } from '@/lib/roles';
import { REQUIRED_DOC_DEFS } from '@/hooks/bi/useBIProfessorDocuments';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  ACTIVE: { label: 'Ativo', variant: 'default' },
  INACTIVE: { label: 'Inativo', variant: 'outline' },
  ON_LEAVE: { label: 'Afastado', variant: 'secondary' },
};

interface SchoolOption {
  id: string;
  nome: string;
  cidade?: string | null;
}

export default function ProfessoresPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canShareExternally = isManagerRole(user?.perfil);
  const [professors, setProfessors] = useState<ProfessorData[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [professorSchoolMap, setProfessorSchoolMap] = useState<Record<string, string[]>>({});
  // Por (professorId -> schoolId -> { hours, pending })
  // pending = true quando algum vínculo daquela escola ainda não teve a CH confirmada (workload_filled_at IS NULL).
  const [professorSchoolHoursMap, setProfessorSchoolHoursMap] = useState<Record<string, Record<string, { hours: number; pending: boolean }>>>({});
  const [editWorkload, setEditWorkload] = useState<{ professorId: string; professorName: string; schoolId: string; schoolName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSchoolId, setFilterSchoolId] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'all'>('ACTIVE');
  const [formOpen, setFormOpen] = useState(false);
  const [bindingsOpen, setBindingsOpen] = useState(false);
  const [bindingsAutoOpenForm, setBindingsAutoOpenForm] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [accessLogsOpen, setAccessLogsOpen] = useState(false);
  const [professorShareMap, setProfessorShareMap] = useState<Record<string, { token: string; createdAt: string; expiresAt: string | null; isActive: boolean; linkId: string }>>({});
  const [accessedProfessorIds, setAccessedProfessorIds] = useState<Set<string>>(new Set());
  const [shareFilter, setShareFilter] = useState<'all' | 'no_link' | 'link_never_accessed'>('all');
  const [docsFilter, setDocsFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [professorDocsCompleteMap, setProfessorDocsCompleteMap] = useState<Record<string, boolean>>({});
  const [hiringProfessorIds, setHiringProfessorIds] = useState<Set<string>>(new Set());
  const [selectedProfessor, setSelectedProfessor] = useState<ProfessorData | null>(null);
  const [exportingShare, setExportingShare] = useState(false);
  const [contactLogProfessor, setContactLogProfessor] = useState<ProfessorData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendHiringOpen, setSendHiringOpen] = useState(false);
  const toggleSelected = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectedProfessors = useMemo(
    () => professors.filter(p => selectedIds.has(p.id)),
    [professors, selectedIds],
  );

  const formatPhone = (raw?: string | null) => {
    if (!raw) return '';
    const d = raw.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return raw;
  };

  const handleExportShareReport = async (groupBy: 'professor' | 'school') => {
    setExportingShare(true);
    const tid = toast.loading('Gerando relatório PDF...');
    try {
      await exportShareReport({
        filter: shareFilter,
        groupBy,
        professors,
        schools,
        professorSchoolMap,
        professorShareMap,
        accessedProfessorIds,
        contextFilters: {
          schoolName: filterSchoolId !== 'all' ? schools.find(s => s.id === filterSchoolId)?.nome : undefined,
          letter: letterFilter,
          search: searchTerm || undefined,
        },
        onProgress: (msg) => toast.loading(msg, { id: tid }),
      });
      toast.success('PDF gerado com sucesso', { id: tid });
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || 'desconhecido'), { id: tid });
    } finally {
      setExportingShare(false);
    }
  };

  const handleExportShirtSizes = async () => {
    setExportingShare(true);
    const tid = toast.loading('Gerando relatório de tamanhos de camisa...');
    try {
      await exportShirtSizeReport({
        professors,
        schools,
        professorSchoolMap,
        contextFilters: {
          schoolName: filterSchoolId !== 'all' ? schools.find(s => s.id === filterSchoolId)?.nome : undefined,
          letter: letterFilter,
          search: searchTerm || undefined,
        },
        onProgress: (msg) => toast.loading(msg, { id: tid }),
      });
      toast.success('PDF gerado com sucesso', { id: tid });
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || 'desconhecido'), { id: tid });
    } finally {
      setExportingShare(false);
    }
  };

  const handleExportShirtSizesBySchool = async () => {
    setExportingShare(true);
    const tid = toast.loading('Gerando relatório de tamanhos por escola...');
    try {
      await exportShirtSizeBySchoolReport({
        professors,
        schools,
        professorSchoolMap,
        contextFilters: {
          schoolName: filterSchoolId !== 'all' ? schools.find(s => s.id === filterSchoolId)?.nome : undefined,
          letter: letterFilter,
          search: searchTerm || undefined,
        },
        onProgress: (msg) => toast.loading(msg, { id: tid }),
      });
      toast.success('PDF gerado com sucesso', { id: tid });
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || 'desconhecido'), { id: tid });
    } finally {
      setExportingShare(false);
    }
  };

  const handleExportPix = async () => {
    setExportingShare(true);
    const tid = toast.loading('Gerando relatório Por Professor - PIX...');
    try {
      await exportPixReport({
        professors,
        contextFilters: {
          schoolName: filterSchoolId !== 'all' ? schools.find(s => s.id === filterSchoolId)?.nome : undefined,
          letter: letterFilter,
          search: searchTerm || undefined,
        },
        onProgress: (msg) => toast.loading(msg, { id: tid }),
      });
      toast.success('PDF gerado com sucesso', { id: tid });
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message || 'desconhecido'), { id: tid });
    } finally {
      setExportingShare(false);
    }
  };

  const handleExportPixXlsx = async () => {
    setExportingShare(true);
    const tid = toast.loading('Gerando planilha Por Professor - PIX...');
    try {
      await exportPixReportXlsx({
        professors,
        contextFilters: {
          schoolName: filterSchoolId !== 'all' ? schools.find(s => s.id === filterSchoolId)?.nome : undefined,
          letter: letterFilter,
          search: searchTerm || undefined,
        },
        onProgress: (msg) => toast.loading(msg, { id: tid }),
      });
      toast.success('XLSX gerado com sucesso', { id: tid });
    } catch (e: any) {
      toast.error('Erro ao gerar XLSX: ' + (e?.message || 'desconhecido'), { id: tid });
    } finally {
      setExportingShare(false);
    }
  };
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState('');
  const [duplicateMessage, setDuplicateMessage] = useState('');
  
  // Paginação por blocos de letras (mantém cada letra inteira na página).
  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const [letterFilter, setLetterFilter] = useState<string>('all'); // 'all' ou letra A-Z, '#'

  // Single effect: load when school filter or search changes (debounce search)
  useEffect(() => {
    const t = setTimeout(() => {
      loadProfessors();
    }, searchTerm ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterSchoolId, filterCity, filterStatus]);

  // Reset page when filter/letter changes
  useEffect(() => { setPage(1); }, [letterFilter, searchTerm, filterSchoolId, filterCity, filterStatus, shareFilter, docsFilter]);

  // When city changes, clear selected school if it doesn't belong to that city
  useEffect(() => {
    if (filterCity === 'all') return;
    if (filterSchoolId === 'all') return;
    const sch = schools.find(s => s.id === filterSchoolId);
    if (!sch || (sch.cidade || '') !== filterCity) {
      setFilterSchoolId('all');
    }
  }, [filterCity, schools]);

  const loadProfessors = async () => {
    setIsLoading(true);
    try {
      // Load schools and bindings (lightweight, no pagination needed)
      const [schoolsRes, bindingsRes] = await Promise.all([

        professoresApi.client.from('schools').select('id, nome, cidade').eq('status', 'ativo').order('nome'),
        supabase
          .from('professor_school_courses')
          .select('professor_id, school_id, workload_morning_hours, workload_afternoon_hours, workload_night_hours, workload_filled_at')
          .eq('status', 'ACTIVE'),
      ]);
      setSchools(schoolsRes.data || []);

      const map: Record<string, string[]> = {};
      const hoursMap: Record<string, Record<string, { hours: number; pending: boolean }>> = {};
      (bindingsRes.data || []).forEach((b: any) => {
        if (!map[b.professor_id]) map[b.professor_id] = [];
        if (!map[b.professor_id].includes(b.school_id)) map[b.professor_id].push(b.school_id);
        if (!hoursMap[b.professor_id]) hoursMap[b.professor_id] = {};
        const m = Number(b.workload_morning_hours) || 0;
        const a = Number(b.workload_afternoon_hours) || 0;
        const n = Number(b.workload_night_hours) || 0;
        const total = m + a + n;
        const isUnconfirmed = b.workload_filled_at == null;
        const prev = hoursMap[b.professor_id][b.school_id];
        if (prev) {
          // Mesma escola pode ter vários cursos: pega o MAX por turno e marca pending se QUALQUER vínculo estiver não-confirmado
          hoursMap[b.professor_id][b.school_id] = {
            hours: Math.max(prev.hours, total),
            pending: prev.pending || isUnconfirmed,
          };
        } else {
          hoursMap[b.professor_id][b.school_id] = { hours: total, pending: isUnconfirmed };
        }
      });
      setProfessorSchoolMap(map);
      setProfessorSchoolHoursMap(hoursMap);

      // Determine which professor IDs to filter by school/city
      let filteredProfessorIds: string[] | null = null;
      const schoolsInCity = filterCity !== 'all'
        ? new Set((schoolsRes.data || []).filter((s: any) => (s.cidade || '') === filterCity).map((s: any) => s.id))
        : null;
      if (filterSchoolId !== 'all' || schoolsInCity) {
        filteredProfessorIds = Object.entries(map)
          .filter(([_, schoolIds]) => {
            if (filterSchoolId !== 'all' && !schoolIds.includes(filterSchoolId)) return false;
            if (schoolsInCity && !schoolIds.some((id) => schoolsInCity.has(id))) return false;
            return true;
          })
          .map(([pid]) => pid);
        if (filteredProfessorIds.length === 0) {
          setProfessors([]);
          setIsLoading(false);
          return;
        }
      }

      // Carrega TODOS os professores (sem range), com batching para passar do limite default (1000) do Supabase
      const BATCH = 1000;
      let from = 0;
      const all: any[] = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let q = professoresApi.client.from('professors').select('*')
          .is('deleted_at', null)
          .order('full_name')
          .range(from, from + BATCH - 1);
        if (filterStatus !== 'all') {
          q = q.eq('status', filterStatus);
        }
        if (searchTerm) {
          q = q.or(`full_name.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
        }
        if (filteredProfessorIds) {
          q = q.in('id', filteredProfessorIds);
        }
        const { data, error } = await q;
        if (error) throw error;
        const chunk = data || [];
        all.push(...chunk);
        if (chunk.length < BATCH) break;
        from += BATCH;
      }

      // Enrich with email from profiles
      const userIds = all.map(p => p.user_id).filter(Boolean);
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await professoresApi.client.from('profiles').select('user_id, email').in('user_id', userIds);
        (profiles || []).forEach(p => { emailMap[p.user_id] = p.email; });
      }

      setProfessors(all.map(p => ({ ...p, email: emailMap[p.user_id] || '' })) as ProfessorData[]);

      // Compute document delivery completeness per professor
      try {
        const profIds = all.map(p => p.id);
        if (profIds.length > 0) {
          const profIdSet = new Set(profIds);
          // Buscar TODOS os documentos/arquivos da organização paginando,
          // pois o PostgREST tem teto server-side de ~1000 linhas.
          const { fetchAllPaginated } = await import('@/lib/supabasePagination');
          const orgId = (all[0] as any).organization_id;
          const [docsRows, filesRows] = await Promise.all([
            fetchAllPaginated<any>((from, to) => (supabase as any)
              .from('professor_documents')
              .select('professor_id, gender')
              .eq('organization_id', orgId)
              .order('professor_id', { ascending: true })
              .order('id', { ascending: true })
              .range(from, to)),
            fetchAllPaginated<any>((from, to) => (supabase as any)
              .from('professor_document_files')
              .select('professor_id, category')
              .eq('organization_id', orgId)
              .order('professor_id', { ascending: true })
              .order('id', { ascending: true })
              .range(from, to)),
          ]);
          const genderMap = new Map<string, string | null>();
          docsRows.forEach((d: any) => { if (profIdSet.has(d.professor_id)) genderMap.set(d.professor_id, d.gender || null); });
          const filesByProf = new Map<string, Set<string>>();
          filesRows.forEach((f: any) => {
            if (!profIdSet.has(f.professor_id)) return;
            if (!filesByProf.has(f.professor_id)) filesByProf.set(f.professor_id, new Set());
            filesByProf.get(f.professor_id)!.add(f.category);
          });
          const completeMap: Record<string, boolean> = {};
          all.forEach((p: any) => {
            const isMale = genderMap.get(p.id) === 'Homem';
            const required = REQUIRED_DOC_DEFS.filter(d => !d.maleOnly || isMale);
            const uploaded = filesByProf.get(p.id) || new Set();
            completeMap[p.id] = required.every(d => uploaded.has(d.value));
          });
          setProfessorDocsCompleteMap(completeMap);
        } else {
          setProfessorDocsCompleteMap({});
        }
      } catch (e) {
        console.warn('docs completeness load failed', e);
      }

      // Load active hiring candidates (sent to hiring) to highlight rows
      try {
        const profIds = all.map(p => p.id);
        if (profIds.length > 0) {
          const { data: hiringRows } = await (supabase as any)
            .from('hr_hiring_candidates')
            .select('professor_id, status')
            .in('professor_id', profIds)
            .not('status', 'in', '(CANCELADO,CONCLUIDO)');
          const hiringSet = new Set<string>(((hiringRows || []) as any[]).map((r: any) => r.professor_id));
          setHiringProfessorIds(hiringSet);
          setSelectedIds(prev => {
            const next = new Set(prev);
            hiringSet.forEach(id => next.delete(id));
            return next;
          });
        } else {
          setHiringProfessorIds(new Set());
        }
      } catch (e) {
        console.warn('hiring candidates load failed', e);
      }

      // Load share map for documentos_professor
      try {
        const { data: shareLinks } = await supabase
          .from('external_links')
          .select('id, token, created_at, expires_at, is_active, scope_json, organization_id')
          .eq('content_type', 'documentos_professor')
          .order('created_at', { ascending: false });
        const shareMap: Record<string, { token: string; createdAt: string; expiresAt: string | null; isActive: boolean; linkId: string }> = {};
        let orgId: string | null = null;
        (shareLinks || []).forEach((l: any) => {
          if (!orgId) orgId = l.organization_id;
          const pid = l.scope_json?.professor_id;
          if (!pid) return;
          if (!shareMap[pid]) {
            // ordered desc, keep most recent as the "current" share link
            shareMap[pid] = { token: l.token, createdAt: l.created_at, expiresAt: l.expires_at, isActive: !!l.is_active, linkId: l.id };
          }
        });
        setProfessorShareMap(shareMap);

        // Verificação confiável feita no banco: lista todos os professores que já tiveram
        // pelo menos um acesso autorizado em QUALQUER link de documentos_professor da organização.
        if (orgId) {
          const { data: accessed, error: accErr } = await supabase
            .rpc('get_professors_with_authorized_doc_access', { _organization_id: orgId });
          if (accErr) {
            console.warn('access check rpc failed', accErr);
            setAccessedProfessorIds(new Set());
          } else {
            setAccessedProfessorIds(new Set((accessed || []).map((r: any) => r.professor_id)));
          }
        } else {
          setAccessedProfessorIds(new Set());
        }
      } catch (e) {
        console.warn('share map load failed', e);
      }
    } catch (error) {
      console.error('Error loading professors:', error);
      toast.error('Erro ao carregar professores');
    } finally {
      setIsLoading(false);
    }
  };


  const handleSave = async (formData: ProfessorFormData) => {
    try {
      if (selectedProfessor) {
        await professorsApi.update(selectedProfessor.id, formData);
        toast.success('Professor atualizado com sucesso');
        loadProfessors();
      } else {
        const created = await professorsApi.create(formData);
        const newId = (created as any)?.id;
        toast.success('Professor criado com sucesso', {
          description: 'Complete o cadastro com CPF, RG, endereço e demais dados.',
          action: newId ? {
            label: 'Documentos do professor →',
            onClick: () => navigate(`/professores/${newId}/documentos`),
          } : undefined,
          duration: 8000,
        });
        loadProfessors();
      }
    } catch (error: any) {
      if (error?.code === 'EMAIL_DUPLICATE') {
        setDuplicateEmail(formData.email || '');
        setDuplicateMessage(error.message || 'E-mail já cadastrado.');
        setDuplicateOpen(true);
      } else {
        toast.error(error.message || 'Erro ao salvar professor');
      }
      throw error;
    }
  };

  const handleDeleteRequest = (professor: ProfessorData) => {
    setSelectedProfessor(professor);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedProfessor) return;
    try {
      await professorsApi.delete(selectedProfessor.id);
      toast.success('Professor excluído com sucesso');
      loadProfessors();
    } catch {
      toast.error('Erro ao excluir professor');
      throw new Error('delete failed');
    }
  };

  const handleBindings = (professor: ProfessorData) => { setSelectedProfessor(professor); setBindingsAutoOpenForm(false); setBindingsOpen(true); };
  const handleExport = (professor: ProfessorData) => { setSelectedProfessor(professor); setExportOpen(true); };
  const handleStatus = (professor: ProfessorData) => { setSelectedProfessor(professor); setStatusOpen(true); };
  const handleNewProfessor = () => { setSelectedProfessor(null); setFormOpen(true); };

  interface SchoolEntry {
    id: string;
    nome: string;
    hours: number;
    pending: boolean;
  }

  const getSchoolList = (professorId: string): SchoolEntry[] => {
    const schoolIds = professorSchoolMap[professorId] || [];
    const hoursForProf = professorSchoolHoursMap[professorId] || {};
    return schoolIds
      .map((id) => {
        const nome = schools.find((s) => s.id === id)?.nome;
        if (!nome) return null;
        const info = hoursForProf[id];
        return { id, nome, hours: info?.hours ?? 0, pending: info?.pending ?? true } as SchoolEntry;
      })
      .filter((e): e is SchoolEntry => e !== null);
  };

  const openBindShortcut = (professor: ProfessorData) => {
    setSelectedProfessor(professor);
    setBindingsAutoOpenForm(true);
    setBindingsOpen(true);
  };

  const openWorkloadEditor = (professor: ProfessorData, school: SchoolEntry) => {
    setEditWorkload({
      professorId: professor.id,
      professorName: professor.full_name,
      schoolId: school.id,
      schoolName: school.nome,
    });
  };

  const SchoolChips = ({ entries, max = 2, professor }: { entries: SchoolEntry[]; max?: number; professor: ProfessorData }) => {
    if (entries.length === 0) {
      return (
        <button
          type="button"
          onClick={() => openBindShortcut(professor)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md ring-2 ring-primary/40 hover:ring-primary/70 hover:shadow-lg hover:-translate-y-0.5 transition-all animate-pulse hover:animate-none"
          title="Vincular professor a uma escola"
        >
          <Plus className="h-3.5 w-3.5 stroke-[3]" />
          Vincular escola
        </button>
      );
    }
    const visible = entries.slice(0, max);
    const hidden = entries.slice(max);
    const missingHidden = hidden.filter((e) => e.pending);
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {visible.map((entry) => {
          const missing = entry.pending;
          return (
            <div key={entry.id} className="relative">
              <span
                title={entry.nome}
                className={[
                  'inline-flex items-center gap-1 max-w-[180px] rounded-full border px-2 py-0.5 text-xs font-medium',
                  missing
                    ? 'border-destructive/40 bg-destructive/5 text-foreground/80 pr-5'
                    : 'border-border/60 bg-muted/40 text-foreground/80',
                ].join(' ')}
              >
                <School className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{entry.nome}</span>
              </span>
              {missing && (
                <button
                  type="button"
                  onClick={() => openWorkloadEditor(professor, entry)}
                  title={`Inserir carga horária em ${entry.nome}`}
                  aria-label={`Inserir carga horária em ${entry.nome}`}
                  className="absolute -top-1.5 -right-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow ring-2 ring-background animate-pulse hover:animate-none hover:scale-110 transition-transform"
                >
                  <AlertTriangle className="h-2.5 w-2.5 stroke-[3]" />
                </button>
              )}
            </div>
          );
        })}
        {hidden.length > 0 && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={[
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold cursor-help',
                    missingHidden.length > 0
                      ? 'bg-destructive/15 text-destructive ring-1 ring-destructive/40'
                      : 'bg-primary/15 text-foreground',
                  ].join(' ')}
                >
                  +{hidden.length}
                  {missingHidden.length > 0 && <AlertTriangle className="h-3 w-3" />}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <ul className="space-y-1 text-xs">
                  {hidden.map((e) => (
                    <li key={e.id} className="flex items-center gap-1">
                      • {e.nome}
                      {e.pending && (
                        <span className="text-destructive font-semibold">(sem carga horária)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <button
          type="button"
          onClick={() => openBindShortcut(professor)}
          className="inline-flex items-center gap-1 rounded-full border border-primary/60 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
          title="Vincular outra escola a este professor"
        >
          <Plus className="h-3 w-3 stroke-[2.5]" />
          Novo vínculo
        </button>
      </div>
    );
  };

  // Todas as letras (A-Z + #) com contagem, considerando o conjunto completo (filtros de busca/escola já aplicados no carregamento)
  const allGroups = useMemo(() => {
    const groups = new Map<string, ProfessorData[]>();
    const filtered = professors.filter((p) => {
      if (shareFilter !== 'all') {
        const share = professorShareMap[p.id];
        if (shareFilter === 'no_link' && share) return false;
        if (shareFilter === 'link_never_accessed' && (!share || accessedProfessorIds.has(p.id))) return false;
      }
      if (docsFilter !== 'all') {
        const isComplete = professorDocsCompleteMap[p.id] === true;
        if (docsFilter === 'complete' && !isComplete) return false;
        if (docsFilter === 'incomplete' && isComplete) return false;
      }
      return true;
    });
    [...filtered]
      .sort((a, b) => {
        // Quando o filtro é "Entregaram todos", professores ainda não enviados
        // para contratação vêm primeiro (dentro de cada letra).
        if (docsFilter === 'complete') {
          const aSent = hiringProfessorIds.has(a.id) ? 1 : 0;
          const bSent = hiringProfessorIds.has(b.id) ? 1 : 0;
          if (aSent !== bSent) return aSent - bSent;
        }
        return a.full_name.localeCompare(b.full_name, 'pt-BR', { sensitivity: 'base' });
      })
      .forEach(p => {
        const first = (p.full_name?.trim()?.[0] || '#').toLocaleUpperCase('pt-BR');
        const letter = /[A-Z]/.test(first) ? first : '#';
        if (!groups.has(letter)) groups.set(letter, []);
        groups.get(letter)!.push(p);
      });
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === '#') return -1;
        if (b === '#') return 1;
        return a.localeCompare(b, 'pt-BR');
      })
      .map(([letter, items]) => ({ letter, items }));
  }, [professors, shareFilter, professorShareMap, accessedProfessorIds, docsFilter, professorDocsCompleteMap, hiringProfessorIds]);

  // Letras presentes (para a barra A-Z)
  const availableLetters = useMemo(() => new Set(allGroups.map(g => g.letter)), [allGroups]);
  const totalProfessorsLoaded = professors.length;

  // Aplica filtro por letra
  const groupsAfterLetter = useMemo(() => {
    if (letterFilter === 'all') return allGroups;
    return allGroups.filter(g => g.letter === letterFilter);
  }, [allGroups, letterFilter]);

  // Total de professores no filtro de letra ativo
  const totalAfterLetter = useMemo(
    () => groupsAfterLetter.reduce((acc, g) => acc + g.items.length, 0),
    [groupsAfterLetter]
  );
  const totalPages = Math.max(1, Math.ceil(totalAfterLetter / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  // Pagina mantendo letras INTEIRAS por página: vai acumulando grupos até atingir PAGE_SIZE
  const groupedProfessors = useMemo(() => {
    const pages: { letter: string; items: ProfessorData[] }[][] = [];
    let cur: { letter: string; items: ProfessorData[] }[] = [];
    let curCount = 0;
    for (const g of groupsAfterLetter) {
      // Se já tem coisa na página e adicionar essa letra estoura PAGE_SIZE, abre nova página
      if (curCount > 0 && curCount + g.items.length > PAGE_SIZE) {
        pages.push(cur);
        cur = [];
        curCount = 0;
      }
      cur.push(g);
      curCount += g.items.length;
    }
    if (cur.length > 0) pages.push(cur);
    if (pages.length === 0) return [];
    return pages[Math.min(safePage - 1, pages.length - 1)] || [];
  }, [groupsAfterLetter, safePage]);

  // Recalcular total de páginas com base no agrupamento real (letras inteiras)
  const realTotalPages = useMemo(() => {
    const pages: number[] = [];
    let curCount = 0;
    for (const g of groupsAfterLetter) {
      if (curCount > 0 && curCount + g.items.length > PAGE_SIZE) {
        pages.push(curCount);
        curCount = 0;
      }
      curCount += g.items.length;
    }
    if (curCount > 0) pages.push(curCount);
    return Math.max(1, pages.length);
  }, [groupsAfterLetter]);


  const ShareCell = ({ professor }: { professor: ProfessorData }) => {
    if (!canShareExternally) return <span className="text-muted-foreground text-xs">—</span>;
    const share = professorShareMap[professor.id];
    const expired = share?.expiresAt ? new Date(share.expiresAt) < new Date() : false;
    const hasActive = !!share && share.isActive && !expired;
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => { setSelectedProfessor(professor); setShareOpen(true); }}
          className={
            hasActive
              ? 'inline-flex items-center gap-1.5 rounded-md bg-[#FFDA45] px-2.5 py-1 text-xs font-bold text-[#1B1E2C] hover:bg-[#FFDA45]/90 transition-colors shadow-sm'
              : 'inline-flex items-center gap-1.5 rounded-md bg-destructive px-2.5 py-1 text-xs font-bold text-[#FFDA45] hover:bg-destructive/90 transition-all animate-pulse hover:animate-none ring-2 ring-destructive/30'
          }
          title={hasActive ? 'Compartilhar / ver link' : 'Gerar link de compartilhamento'}
        >
          <Share2 className="h-3.5 w-3.5" />
          {hasActive ? 'Compartilhar' : 'Gerar link'}
        </button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 border-[#1B1E2C]/20"
          onClick={() => { setSelectedProfessor(professor); setAccessLogsOpen(true); }}
          title="Auditoria de acesso ao link"
        >
          <Activity className="h-3.5 w-3.5 text-[#1B1E2C]" />
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {canShareExternally && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(96vw,720px)] rounded-xl border-2 border-[#FFDA45] bg-[#1B1E2C] px-5 py-3 shadow-2xl flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-bold text-[#FFDA45]">
            {selectedIds.size} professor{selectedIds.size === 1 ? '' : 'es'} selecionado{selectedIds.size === 1 ? '' : 's'}
          </span>
          <Button
            size="sm"
            className="bg-[#FFDA45] text-[#1B1E2C] hover:bg-[#FFDA45]/90 font-semibold"
            onClick={() => setSendHiringOpen(true)}
          >
            <Briefcase className="mr-1.5 h-4 w-4" /> Enviar para contratação
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[#FFDA45] hover:bg-white/10 hover:text-[#FFDA45] ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      )}
      <FeatureGuideCard title="Como usar Professores" steps={[
        { icon: Plus, title: 'Cadastrar professor', description: 'Informe nome, e-mail, especialização e crie a conta automaticamente.', color: 'blue' },
        { icon: Link2, title: 'Vínculos', description: 'Associe o professor a escolas, cursos e disciplinas pelo botão de vínculos.', color: 'green' },
        { icon: Users, title: 'Filtrar por escola', description: 'Use o filtro de escola para localizar professores rapidamente.', color: 'purple' },
        { icon: BookOpen, title: 'Detalhe completo', description: 'Acesse o perfil para ver horários, turmas e histórico do professor.', color: 'amber' },
      ]} />
      <PageHeader
        breadcrumbs={[{ label: 'Acadêmico' }, { label: 'Professores' }]}
        title="Professores"
        description="Gerencie o cadastro de professores e seus vínculos institucionais"
        icon={UserCog}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {canShareExternally && (
              <Button variant="outline" onClick={() => navigate('/professores/kanban')} className="w-full sm:w-auto">
                <LayoutDashboard className="mr-2 h-4 w-4" />Kanban Professores
              </Button>
            )}
            <Button onClick={handleNewProfessor} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />Novo Professor
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Lista de Professores
            <Badge variant="secondary" className="ml-1">{totalProfessorsLoaded}</Badge>
          </CardTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Cidade</label>
              <SearchableSelect
                value={filterCity}
                onValueChange={(v) => { setFilterCity(v); setPage(1); }}
                placeholder="Todas as cidades"
                searchPlaceholder="Buscar cidade..."
                triggerClassName="w-full"
                options={[
                  { value: 'all', label: 'Todas as cidades' },
                  ...Array.from(new Set(schools.map(s => (s.cidade || '').trim()).filter(Boolean)))
                    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                    .map(c => ({ value: c, label: c })),
                ]}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Escola</label>
              <SearchableSelect
                value={filterSchoolId}
                onValueChange={(v) => { setFilterSchoolId(v); setPage(1); }}
                placeholder="Todas as escolas"
                searchPlaceholder="Buscar escola..."
                triggerClassName="w-full"
                options={[
                  { value: 'all', label: 'Todas as escolas' },
                  ...schools
                    .filter(s => filterCity === 'all' || (s.cidade || '') === filterCity)
                    .map(s => ({ value: s.id, label: s.nome })),
                ]}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0 sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Buscar professor</label>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou CPF..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} className="pl-9" />
              </div>
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Status do professor</label>
              <SearchableSelect
                value={filterStatus}
                onValueChange={(v) => { setFilterStatus(v as any); setPage(1); }}
                placeholder="Status"
                searchPlaceholder="Filtrar..."
                triggerClassName="w-full"
                options={[
                  { value: 'ACTIVE', label: 'Ativos' },
                  { value: 'INACTIVE', label: 'Inativos' },
                  { value: 'ON_LEAVE', label: 'Afastados' },
                  { value: 'all', label: 'Todos os status' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Compartilhamento</label>
              <SearchableSelect
                value={shareFilter}
                onValueChange={(v) => setShareFilter(v as any)}
                placeholder="Compartilhamento"
                searchPlaceholder="Filtrar..."
                triggerClassName="w-full"
                options={[
                  { value: 'all', label: 'Todos os professores' },
                  { value: 'no_link', label: 'Sem link gerado' },
                  { value: 'link_never_accessed', label: 'Com link, nunca acessaram' },
                ]}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium text-muted-foreground">Entrega de documentos</label>
              <SearchableSelect
                value={docsFilter}
                onValueChange={(v) => setDocsFilter(v as any)}
                placeholder="Entrega de documentos"
                searchPlaceholder="Filtrar..."
                triggerClassName="w-full"
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'complete', label: 'Entregaram todos' },
                  { value: 'incomplete', label: 'Documentos pendentes' },
                ]}
              />
            </div>
            {canShareExternally && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground hidden xl:block">&nbsp;</label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={exportingShare} title="Exportar PDF do filtro atual" className="w-full">
                      {exportingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      <span className="ml-1.5">Exportar PDF</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Agrupar por</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleExportShareReport('professor')}>
                      <UserCog className="mr-2 h-4 w-4" />Por professor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportShareReport('school')}>
                      <School className="mr-2 h-4 w-4" />Por escola
                    </DropdownMenuItem>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal mt-1">Outros relatórios</DropdownMenuLabel>
                    <DropdownMenuItem onClick={handleExportShirtSizes}>
                      <Shirt className="mr-2 h-4 w-4" />Tamanho de camisa
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportShirtSizesBySchool}>
                      <School className="mr-2 h-4 w-4" />Tamanho de camisa por escola
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPix}>
                      <Wallet className="mr-2 h-4 w-4" />Por Professor - PIX (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPixXlsx}>
                      <FileSpreadsheet className="mr-2 h-4 w-4" />Por Professor - PIX (XLSX)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Barra de navegação A-Z */}
          {!isLoading && totalProfessorsLoaded > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t mt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Letra:</span>
              <button
                type="button"
                onClick={() => setLetterFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-colors ${
                  letterFilter === 'all'
                    ? 'bg-[#1B1E2C] text-[#FFDA45] border-[#1B1E2C]'
                    : 'bg-white text-[#1B1E2C] border-[#1B1E2C]/15 hover:border-[#FFDA45] hover:bg-[#FFDA45]/10'
                }`}
              >
                Todas <span className="ml-0.5 opacity-70 font-normal">({totalProfessorsLoaded})</span>
              </button>
              {['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))].map((L) => {
                const present = availableLetters.has(L);
                const count = allGroups.find(g => g.letter === L)?.items.length ?? 0;
                const active = letterFilter === L;
                return (
                  <button
                    key={L}
                    type="button"
                    disabled={!present}
                    onClick={() => setLetterFilter(L)}
                    className={`min-w-[28px] px-1.5 py-1 rounded-md text-xs font-bold border transition-colors tabular-nums ${
                      active
                        ? 'bg-[#1B1E2C] text-[#FFDA45] border-[#1B1E2C]'
                        : present
                          ? 'bg-white text-[#1B1E2C] border-[#1B1E2C]/15 hover:border-[#FFDA45] hover:bg-[#FFDA45]/10'
                          : 'bg-muted/40 text-muted-foreground/40 border-transparent cursor-not-allowed'
                    }`}
                    title={present ? `${count} professor(es) começando com ${L}` : 'Nenhum professor com esta letra'}
                  >
                    {L}
                    {present && (
                      <span className={`ml-0.5 text-[10px] font-normal ${active ? 'text-[#FFDA45]/70' : 'opacity-60'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : professors.length === 0 ? (
            <div className="text-center py-12 px-4">
              <UserCog className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Nenhum professor encontrado</h3>
              <p className="text-muted-foreground">{searchTerm || filterSchoolId !== 'all' ? 'Tente ajustar seus filtros' : 'Comece cadastrando um novo professor'}</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {canShareExternally && (
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={
                              groupedProfessors.flatMap(g => g.items).filter(p => !hiringProfessorIds.has(p.id)).length > 0 &&
                              groupedProfessors.flatMap(g => g.items).filter(p => !hiringProfessorIds.has(p.id)).every(p => selectedIds.has(p.id))
                            }
                            onCheckedChange={(v) => {
                              const ids = groupedProfessors.flatMap(g => g.items).filter(p => !hiringProfessorIds.has(p.id)).map(p => p.id);
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (v) ids.forEach(id => next.add(id));
                                else ids.forEach(id => next.delete(id));
                                return next;
                              });
                            }}
                            aria-label="Selecionar todos visíveis"
                          />
                        </TableHead>
                      )}
                      <TableHead>Nome</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Escolas</TableHead>
                      <TableHead>Compartilhamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedProfessors.map(group => (
                      <React.Fragment key={`g-${group.letter}`}>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableCell colSpan={canShareExternally ? 7 : 6} className="py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {group.letter}
                            <span className="ml-2 normal-case font-normal text-muted-foreground/70">({group.items.length})</span>
                          </TableCell>
                        </TableRow>
                        {group.items.map((professor) => {
                       const status = statusLabels[professor.status] || statusLabels.ACTIVE;
                       const schoolNames = getSchoolList(professor.id);
                       return (
                         <TableRow key={professor.id} data-state={selectedIds.has(professor.id) ? 'selected' : undefined} className={hiringProfessorIds.has(professor.id) ? 'bg-green-100 hover:bg-green-200/70 dark:bg-green-900/30' : undefined}>
                           {canShareExternally && (
                             <TableCell className="w-[40px]">
                               {hiringProfessorIds.has(professor.id) ? (
                                 <Checkbox
                                   checked
                                   disabled
                                   aria-label={`${professor.full_name} já enviado para contratação`}
                                   title="Já enviado para contratação"
                                 />
                               ) : (
                                 <Checkbox
                                   checked={selectedIds.has(professor.id)}
                                   onCheckedChange={() => toggleSelected(professor.id)}
                                   aria-label={`Selecionar ${professor.full_name}`}
                                 />
                               )}
                             </TableCell>
                           )}
                           <TableCell className="font-medium">{professor.full_name}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5 min-w-[170px]">
                                <span className="text-sm whitespace-nowrap">{formatPhone(professor.phone) || <span className="text-muted-foreground">—</span>}</span>
                                <TooltipProvider delayDuration={200}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 gap-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0 w-fit"
                                        onClick={() => setContactLogProfessor(professor)}
                                      >
                                        <PhoneCall className="h-3.5 w-3.5" />
                                        <span className="text-xs font-medium">Registrar contato</span>
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Registre uma ligação ou conversa com o professor</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                           <TableCell className="max-w-[280px]">
                             <SchoolChips entries={schoolNames} max={2} professor={professor} />
                           </TableCell>
                           <TableCell><ShareCell professor={professor} /></TableCell>
                           <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                           <TableCell>
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                               <DropdownMenuContent align="end" className="w-56">
                                 <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Visualizar</DropdownMenuLabel>
                                 <DropdownMenuItem onClick={() => navigate(`/professores/${professor.id}`)}><Eye className="mr-2 h-4 w-4" />Ver detalhes</DropdownMenuItem>

                                 <DropdownMenuSeparator />
                                 <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Cadastro</DropdownMenuLabel>
                                 <DropdownMenuItem onClick={() => navigate(`/professores/${professor.id}/documentos`)}><FileEdit className="mr-2 h-4 w-4" />Documentos do professor</DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleBindings(professor)}><Link2 className="mr-2 h-4 w-4" />Gerenciar vínculos</DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => handleStatus(professor)}><Activity className="mr-2 h-4 w-4" />Alterar status</DropdownMenuItem>

                                 <DropdownMenuSeparator />
                                 <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">Relatórios</DropdownMenuLabel>
                                 <DropdownMenuItem onClick={() => handleExport(professor)}><FileDown className="mr-2 h-4 w-4" />Exportar cadastro</DropdownMenuItem>
                                 {canShareExternally && (
                                   <DropdownMenuItem onClick={() => { setSelectedProfessor(professor); setShareOpen(true); }}>
                                     <Share2 className="mr-2 h-4 w-4" />Compartilhar externamente
                                   </DropdownMenuItem>
                                 )}

                                 <DropdownMenuSeparator />
                                 <DropdownMenuItem onClick={() => handleDeleteRequest(professor)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir professor</DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </TableCell>
                         </TableRow>
                       );
                     })}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile/Tablet Cards */}
              <div className="lg:hidden divide-y">
                {groupedProfessors.map(group => (
                  <div key={`mg-${group.letter}`}>
                    <div className="px-4 py-2 bg-muted/50 text-xs font-bold uppercase tracking-wider text-muted-foreground border-t">
                      {group.letter}
                      <span className="ml-1 normal-case font-normal text-muted-foreground/70">({group.items.length})</span>
                    </div>
                    {group.items.map((professor) => {
                  const status = statusLabels[professor.status] || statusLabels.ACTIVE;
                  const schoolNames = getSchoolList(professor.id);
                  return (
                    <div key={professor.id} className="p-4 space-y-3 border-t">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{professor.full_name}</p>
                          <p className="text-sm text-muted-foreground truncate">{formatPhone(professor.phone) || 'Sem telefone'}</p>
                        </div>
                        <Badge variant={status.variant} className="shrink-0">{status.label}</Badge>
                      </div>
                      <div>
                        <Button variant="outline" size="sm" onClick={() => setContactLogProfessor(professor)}>
                          <PhoneCall className="h-4 w-4 mr-2" /> Registrar contato
                        </Button>
                      </div>
                      <SchoolChips entries={schoolNames} max={3} professor={professor} />
                      {canShareExternally && <ShareCell professor={professor} />}
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="default" size="sm" className="flex-1" onClick={() => navigate(`/professores/${professor.id}/documentos`)}>
                          <FileEdit className="mr-2 h-4 w-4" /> Documentos do professor
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => navigate(`/professores/${professor.id}`)}><Eye className="mr-2 h-4 w-4" />Ver detalhes</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBindings(professor)}><Link2 className="mr-2 h-4 w-4" />Gerenciar vínculos</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatus(professor)}><Activity className="mr-2 h-4 w-4" />Alterar status</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExport(professor)}><FileDown className="mr-2 h-4 w-4" />Exportar cadastro</DropdownMenuItem>
                            {canShareExternally && (
                              <DropdownMenuItem onClick={() => { setSelectedProfessor(professor); setShareOpen(true); }}>
                                <Share2 className="mr-2 h-4 w-4" />Compartilhar externamente
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteRequest(professor)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir professor</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
                  </div>
                ))}
              </div>
              {realTotalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Página <span className="font-bold text-foreground tabular-nums">{Math.min(safePage, realTotalPages)}</span> de{' '}
                    <span className="font-bold text-foreground tabular-nums">{realTotalPages}</span>
                    <span className="ml-2 hidden sm:inline">·{' '}
                      {totalAfterLetter} professor{totalAfterLetter === 1 ? '' : 'es'}
                      {letterFilter !== 'all' && <> em <span className="font-bold text-foreground">{letterFilter}</span></>}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={safePage >= realTotalPages} onClick={() => setPage(p => Math.min(realTotalPages, p + 1))}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ProfessorForm open={formOpen} onOpenChange={setFormOpen} professor={selectedProfessor} onSave={handleSave} />
      <BindingsDialog
        open={bindingsOpen}
        onOpenChange={(o) => { setBindingsOpen(o); if (!o) { setBindingsAutoOpenForm(false); loadProfessors(); } }}
        professor={selectedProfessor}
        defaultOpenForm={bindingsAutoOpenForm}
      />
      <ExportProfessorDialog open={exportOpen} onOpenChange={setExportOpen} professor={selectedProfessor} />
      <ProfessorStatusDialog open={statusOpen} onOpenChange={setStatusOpen} professor={selectedProfessor} onSaved={loadProfessors} />
      <DeleteProfessorDialog open={deleteOpen} onOpenChange={setDeleteOpen} professor={selectedProfessor} onConfirm={handleDeleteConfirm} />
      {selectedProfessor && (
        <ShareProfessorDialog
          open={shareOpen}
          onOpenChange={(v) => { setShareOpen(v); if (!v) loadProfessors(); }}
          professorId={selectedProfessor.id}
          professorName={selectedProfessor.full_name}
        />
      )}
      {selectedProfessor && (
        <ProfessorAccessLogsDialog
          open={accessLogsOpen}
          onOpenChange={setAccessLogsOpen}
          professorId={selectedProfessor.id}
          professorName={selectedProfessor.full_name}
        />
      )}
      <ContactLogDialog
        professor={contactLogProfessor}
        open={!!contactLogProfessor}
        onOpenChange={(o) => { if (!o) setContactLogProfessor(null); }}
      />
      <EditBindingWorkloadDialog
        open={!!editWorkload}
        onOpenChange={(v) => { if (!v) setEditWorkload(null); }}
        professorId={editWorkload?.professorId ?? null}
        professorName={editWorkload?.professorName ?? ''}
        schoolId={editWorkload?.schoolId ?? null}
        schoolName={editWorkload?.schoolName ?? ''}
        onSaved={loadProfessors}
      />
      <AlertDialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>E-mail já cadastrado</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicateMessage || `Já existe um usuário cadastrado com o e-mail ${duplicateEmail}.`}
              <br /><br />
              Use um endereço de e-mail diferente ou edite o cadastro do professor existente na lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDuplicateOpen(false)}>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SendToHiringDialog
        open={sendHiringOpen}
        onOpenChange={setSendHiringOpen}
        professors={selectedProfessors}
        onSuccess={() => { setSelectedIds(new Set()); loadProfessors(); }}
      />
    </div>
  );
}
