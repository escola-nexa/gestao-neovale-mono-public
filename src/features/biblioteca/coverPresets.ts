import {
  Library, BookOpen, Code, Palette, Database, Shield,
  Brain, Megaphone, Video, FileText, Lightbulb, Globe,
  type LucideIcon,
} from 'lucide-react';

export interface CoverColor {
  key: string;
  label: string;
  /** Tailwind classes for the cover background */
  bg: string;
  /** Tailwind class for the icon foreground */
  fg: string;
  /** Hex puro (sem '#') usado para halo/efeitos fluorescentes dinâmicos */
  glow: string;
}

export const COVER_COLORS: CoverColor[] = [
  { key: 'yellow',  label: 'Amarelo',     bg: 'bg-[#FFDA45]',                                    fg: 'text-[#1B1E2C]', glow: '#FFDA45' },
  { key: 'navy',    label: 'Azul Marinho', bg: 'bg-[#1B1E2C]',                                   fg: 'text-[#FFDA45]', glow: '#FFDA45' },
  { key: 'blue',    label: 'Azul',         bg: 'bg-gradient-to-br from-blue-500 to-blue-700',    fg: 'text-white',     glow: '#3b82f6' },
  { key: 'indigo',  label: 'Índigo',       bg: 'bg-gradient-to-br from-indigo-500 to-indigo-700', fg: 'text-white',    glow: '#6366f1' },
  { key: 'purple',  label: 'Roxo',         bg: 'bg-gradient-to-br from-purple-500 to-purple-700', fg: 'text-white',    glow: '#a855f7' },
  { key: 'pink',    label: 'Rosa',         bg: 'bg-gradient-to-br from-pink-500 to-pink-700',    fg: 'text-white',     glow: '#ec4899' },
  { key: 'rose',    label: 'Vermelho',     bg: 'bg-gradient-to-br from-rose-500 to-rose-700',    fg: 'text-white',     glow: '#f43f5e' },
  { key: 'orange',  label: 'Laranja',      bg: 'bg-gradient-to-br from-orange-500 to-orange-600', fg: 'text-white',    glow: '#f97316' },
  { key: 'emerald', label: 'Verde',        bg: 'bg-gradient-to-br from-emerald-500 to-emerald-700', fg: 'text-white',  glow: '#10b981' },
  { key: 'slate',   label: 'Grafite',      bg: 'bg-gradient-to-br from-slate-600 to-slate-800',  fg: 'text-white',     glow: '#64748b' },
];

export const COVER_ICONS: { key: string; icon: LucideIcon }[] = [
  { key: 'Library', icon: Library },
  { key: 'BookOpen', icon: BookOpen },
  { key: 'Brain', icon: Brain },
  { key: 'Code', icon: Code },
  { key: 'Database', icon: Database },
  { key: 'Shield', icon: Shield },
  { key: 'Megaphone', icon: Megaphone },
  { key: 'Palette', icon: Palette },
  { key: 'Video', icon: Video },
  { key: 'FileText', icon: FileText },
  { key: 'Lightbulb', icon: Lightbulb },
  { key: 'Globe', icon: Globe },
];

export function getCoverColor(key: string): CoverColor {
  return COVER_COLORS.find((c) => c.key === key) ?? COVER_COLORS[2];
}

export function getCoverIcon(key: string): LucideIcon {
  return (COVER_ICONS.find((i) => i.key === key)?.icon) ?? BookOpen;
}
