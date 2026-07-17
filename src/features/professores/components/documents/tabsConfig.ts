/**
 * ⚠️ NÃO ALTERAR — Paginação OFICIAL dos Documentos do Professor.
 *
 * Esta é a fonte única de verdade das abas exibidas na tela de
 * "Documentos do Professor" (acesso interno e link externo seguro).
 *
 * Ordem e rótulos foram definidos pelo produto e NÃO devem ser
 * renomeados, removidos ou reordenados sem aprovação explícita.
 *
 * Qualquer alteração quebra o teste em src/test/professor-doc-tabs.test.ts.
 */
import { Banknote, FileBadge, MapPin, Paperclip, User, Users as FamilyIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type ProfessorDocTabValue =
  | 'personal'
  | 'documents'
  | 'address'
  | 'banking'
  | 'family'
  | 'attachments';

export interface ProfessorDocTab {
  readonly value: ProfessorDocTabValue;
  readonly label: string;
  readonly icon: LucideIcon;
}

export const PROFESSOR_DOC_TABS: ReadonlyArray<ProfessorDocTab> = Object.freeze([
  { value: 'personal',    label: 'Dados pessoais', icon: User },
  { value: 'documents',   label: 'Documentos',     icon: FileBadge },
  { value: 'address',     label: 'Endereço',       icon: MapPin },
  { value: 'banking',     label: 'Bancário',       icon: Banknote },
  { value: 'family',      label: 'Família',        icon: FamilyIcon },
  { value: 'attachments', label: 'Anexos',         icon: Paperclip },
] as const);
