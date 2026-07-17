export type ChatChannelType =
  | 'coordenacao'
  | 'professores'
  | 'projeto'
  | 'rh'
  | 'escola'
  | 'curso'
  | 'direct';

export type ChatMemberRole = 'owner' | 'admin' | 'member';
export type ChatAttachmentKind = 'file' | 'image' | 'link';

export interface ChatChannel {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: ChatChannelType;
  school_id: string | null;
  course_id: string | null;
  is_private: boolean;
  created_by: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatChannelMember {
  channel_id: string;
  user_id: string;
  role: ChatMemberRole;
  can_post: boolean;
  last_read_at: string | null;
  muted_until: string | null;
  joined_at: string;
  full_name?: string;
  avatar_url?: string | null;
}

export interface ChatMessageAttachment {
  id: string;
  message_id: string;
  kind: ChatAttachmentKind;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  url: string | null;
  created_at: string;
}

export interface ChatMessageLabelRef {
  id: string;
  name: string;
  color: string;
}

export interface ChatLinkedTicket {
  ticket_id: string;
  title?: string;
  status?: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  author_id: string;
  body: string | null;
  reply_to_id: string | null;
  is_pinned: boolean;
  is_announcement: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  deleted_by?: string | null;
  created_at: string;
  // joined
  author_name?: string;
  author_avatar?: string | null;
  deleted_by_name?: string | null;
  attachments?: ChatMessageAttachment[];
  read_by?: { user_id: string; read_at: string; full_name?: string; avatar_url?: string | null }[];
  labels?: ChatMessageLabelRef[];
  reply_count?: number;
  last_reply_at?: string | null;
  linked_tickets?: ChatLinkedTicket[];
}

export interface ChatChannelLabel {
  id: string;
  organization_id: string;
  name: string;
  color: string;
}

export interface ChatMessageLabel {
  id: string;
  organization_id: string;
  name: string;
  color: string;
}

export const CHANNEL_TYPE_LABELS: Record<ChatChannelType, string> = {
  coordenacao: 'Coordenação',
  professores: 'Professores',
  projeto: 'Projeto',
  rh: 'RH',
  escola: 'Escola',
  curso: 'Curso',
  direct: 'Mensagem direta',
};

export const ALLOWED_ATTACHMENT_MIME_PREFIXES = ['image/', 'audio/'];
export const ALLOWED_ATTACHMENT_MIME_EXACT = ['application/pdf'];
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 10;

export function isAttachmentAllowed(file: File): { ok: true } | { ok: false; reason: string } {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return { ok: false, reason: `"${file.name}" excede 25 MB.` };
  }
  const t = (file.type || '').toLowerCase();
  if (ALLOWED_ATTACHMENT_MIME_EXACT.includes(t)) return { ok: true };
  if (ALLOWED_ATTACHMENT_MIME_PREFIXES.some(p => t.startsWith(p))) return { ok: true };
  return { ok: false, reason: `"${file.name}" não é um tipo permitido. Aceitos: imagens, PDF e áudio.` };
}
