import {
  Home, BookOpen, GraduationCap, CalendarDays, Briefcase, BarChart3,
  MessageSquare, Share2, ShieldCheck, UserCog, type LucideIcon,
} from 'lucide-react';
import type { HelpCategory, HelpAudience } from './types';

export interface HelpCategoryMeta {
  key: HelpCategory;
  label: string;
  icon: LucideIcon;
  gradient: string; // tailwind classes
  order: number;
}

export const HELP_CATEGORIES: HelpCategoryMeta[] = [
  { key: 'inicio',                   label: 'Início',                  icon: Home,          gradient: 'from-amber-400 to-amber-600',    order: 1 },
  { key: 'cadastros',                label: 'Cadastros',               icon: BookOpen,      gradient: 'from-blue-500 to-blue-700',      order: 2 },
  { key: 'rotina_pedagogica',        label: 'Rotina Pedagógica',       icon: GraduationCap, gradient: 'from-emerald-500 to-emerald-700', order: 3 },
  { key: 'recursos_agenda',          label: 'Recursos e Agenda',       icon: CalendarDays,  gradient: 'from-indigo-500 to-indigo-700',  order: 4 },
  { key: 'rh',                       label: 'R.H.',                    icon: Briefcase,     gradient: 'from-orange-500 to-rose-600',    order: 5 },
  { key: 'analise_acompanhamento',   label: 'Análise & Acompanhamento', icon: BarChart3,    gradient: 'from-purple-500 to-fuchsia-600', order: 6 },
  { key: 'comunicacao',              label: 'Comunicação',             icon: MessageSquare, gradient: 'from-cyan-500 to-sky-700',       order: 7 },
  { key: 'compartilhamento_externo', label: 'Compartilhamento Externo', icon: Share2,       gradient: 'from-pink-500 to-rose-700',      order: 8 },
  { key: 'sistema',                  label: 'Sistema',                 icon: ShieldCheck,   gradient: 'from-slate-600 to-slate-800',    order: 9 },
  { key: 'conta',                    label: 'Conta',                   icon: UserCog,       gradient: 'from-teal-500 to-emerald-700',   order: 10 },
];

export function getCategoryMeta(key: HelpCategory): HelpCategoryMeta {
  return HELP_CATEGORIES.find((c) => c.key === key) ?? HELP_CATEGORIES[0];
}

export const AUDIENCE_OPTIONS: { value: HelpAudience; label: string; description: string }[] = [
  { value: 'admin_coord_rh',   label: 'Admin + Coordenador + R.H.',     description: 'Apenas gestão.' },
  { value: 'admin_coord',      label: 'Admin + Coordenador',            description: 'Conteúdo gerencial.' },
  { value: 'admin_coord_prof', label: 'Admin + Coordenador + Professor', description: 'Tutorial geral (recomendado).' },
];

export const CONTENT_TYPE_LABELS: Record<string, string> = {
  video_upload: 'Vídeo',
  video_link: 'Vídeo',
  pdf: 'PDF',
  image: 'Imagem',
  link: 'Link',
};

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Parses YouTube/Vimeo URL to an embeddable URL */
export function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  // YouTube
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  // Vimeo
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
}
