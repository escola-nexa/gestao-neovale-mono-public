import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useEffect } from 'react';
import {
  Paperclip, Send, Megaphone, Loader2, X, FileImage, FileText as FileIcon,
  Camera, Mic, FileAudio, AtSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { chatApi } from '@/features/chat/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isAttachmentAllowed, MAX_ATTACHMENTS_PER_MESSAGE } from '../types';
import { AudioRecorder } from './AudioRecorder';
import { EmojiPicker } from './EmojiPicker';
import { MentionAutocomplete, type MentionAutocompleteHandle } from './MentionAutocomplete';
import { useChannelDraft } from '../hooks/useChannelDraft';
import { useTypingPresence } from '../hooks/useTypingPresence';

interface MessageComposerProps {
  channelId: string;
  organizationId: string;
  canPostAnnouncement?: boolean;
  channelName?: string;
  replyToId?: string;
  compact?: boolean;
}

function fileKind(f: File): 'image' | 'file' {
  return f.type.startsWith('image/') ? 'image' : 'file';
}

export function MessageComposer({
  channelId, organizationId, canPostAnnouncement, channelName, replyToId, compact,
}: MessageComposerProps) {
  const { user } = useAuth();
  const draft = useChannelDraft(channelId, replyToId);
  const body = draft.value;
  const setBody = draft.setValue;
  const [files, setFiles] = useState<File[]>([]);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionRef = useRef<MentionAutocompleteHandle>(null);
  const { typing: _typing, notifyTyping } = useTypingPresence(channelId, user ? (user as any).nome || (user as any).full_name || (user as any).email : null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [body]);

  // Detecta @query baseado na posição do caret
  const updateMentionQuery = () => {
    const ta = textareaRef.current;
    if (!ta) { setMentionQuery(null); return; }
    const pos = ta.selectionStart ?? 0;
    const upto = body.slice(0, pos);
    const m = upto.match(/(?:^|\s)@([^\s@]{0,30})$/);
    setMentionQuery(m ? m[1] : null);
  };

  useEffect(() => { updateMentionQuery(); /* eslint-disable-next-line */ }, [body]);

  const insertMention = (member: { user_id: string; full_name: string }) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart ?? body.length;
    const upto = body.slice(0, pos);
    const after = body.slice(pos);
    const replaced = upto.replace(/(?:^|\s)@([^\s@]{0,30})$/, (matched) => {
      const prefix = matched.startsWith('@') ? '' : matched[0];
      return `${prefix}@[${member.full_name}](${member.user_id}) `;
    });
    const next = replaced + after;
    setBody(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      ta.focus();
      const newPos = replaced.length;
      ta.setSelectionRange(newPos, newPos);
    });
  };

  const addFiles = (incoming: File[]) => {
    const accepted: File[] = [];
    for (const f of incoming) {
      if (files.length + accepted.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
        toast.error(`Máximo de ${MAX_ATTACHMENTS_PER_MESSAGE} arquivos por mensagem.`);
        break;
      }
      const v = isAttachmentAllowed(f);
      if (!v.ok) { toast.error((v as { ok: false; reason: string }).reason); continue; }
      accepted.push(f);
    }
    if (accepted.length) setFiles(prev => [...prev, ...accepted]);
  };

  const send = async () => {
    if (!user) return;
    const trimmed = body.trim();
    if (!trimmed && files.length === 0) return;
    setSending(true);
    try {
      const { data: msg, error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          author_id: user.id,
          body: trimmed || null,
          is_announcement: isAnnouncement && !replyToId,
          reply_to_id: replyToId || null,
        })
        .select('id')
        .maybeSingle();
      if (error || !msg) throw error || new Error('Erro ao enviar');

      for (const f of files) {
        const safeName = `${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const path = `${organizationId}/${channelId}/${safeName}`;
        const { error: upErr } = await chatApi.client.storage
          .from('chat-attachments')
          .upload(path, f, { contentType: f.type || undefined });
        if (upErr) {
          toast.error('Erro ao enviar anexo: ' + upErr.message);
          continue;
        }
        await chatApi.client.from('chat_message_attachments').insert({
          message_id: msg.id,
          kind: fileKind(f),
          file_path: path,
          file_name: f.name,
          file_size: f.size,
          mime_type: f.type,
        });
      }

      draft.clear();
      setFiles([]);
      setIsAnnouncement(false);
    } catch (err: any) {
      toast.error('Erro: ' + (err?.message || 'desconhecido'));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Autocompletar menção tem prioridade nas teclas de navegação
    if (mentionRef.current?.onKeyDown(e)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    } else {
      notifyTyping();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted: File[] = [];
    for (const it of Array.from(items)) {
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f && f.type.startsWith('image/')) {
          // Renomeia para extensão correta quando vier sem nome (clipboard image)
          const ext = (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg');
          const named = f.name && f.name !== 'image.png'
            ? f
            : new File([f], `colado_${Date.now()}.${ext}`, { type: f.type });
          pasted.push(named);
        }
      }
    }
    if (pasted.length) {
      e.preventDefault();
      addFiles(pasted);
      toast.success(`${pasted.length} imagem${pasted.length > 1 ? 'ns' : ''} colada${pasted.length > 1 ? 's' : ''}.`);
    }
  };

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setBody(body + emoji);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + emoji + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const insertAt = () => {
    const ta = textareaRef.current;
    const pos = ta?.selectionStart ?? body.length;
    const before = body.slice(0, pos);
    const needsSpace = before.length > 0 && !/\s$/.test(before);
    const next = before + (needsSpace ? ' @' : '@') + body.slice(pos);
    setBody(next);
    requestAnimationFrame(() => {
      ta?.focus();
      const newPos = pos + (needsSpace ? 2 : 1);
      ta?.setSelectionRange(newPos, newPos);
      updateMentionQuery();
    });
  };

  return (
    <div className={cn(
      "border-t bg-background shrink-0",
      compact ? "px-3 py-2" : "px-3 sm:px-5 py-3"
    )}>
      {recording && (
        <div className="mb-2">
          <AudioRecorder
            onComplete={(file) => { addFiles([file]); setRecording(false); }}
            onCancel={() => setRecording(false)}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {files.map((f, i) => {
            const isImg = f.type.startsWith('image/');
            const isAud = f.type.startsWith('audio/');
            const Icon = isImg ? FileImage : isAud ? FileAudio : FileIcon;
            return (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs pl-1.5 pr-1 py-1 rounded-md bg-muted border max-w-[200px]">
                <Icon className="h-3 w-3 shrink-0 text-primary" />
                <span className="truncate">{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  className="h-4 w-4 inline-flex items-center justify-center rounded hover:bg-background/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <MentionAutocomplete
          ref={mentionRef}
          channelId={channelId}
          query={mentionQuery}
          onSelect={insertMention}
          onClose={() => setMentionQuery(null)}
        />
        <div
          className={cn(
            "flex min-w-0 items-end gap-1 rounded-lg border bg-card px-1.5 py-1 transition-colors focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30",
            isAnnouncement && "border-primary/60 bg-primary/5"
          )}
        >
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => fileInputRef.current?.click()} title="Anexar arquivo">
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => cameraInputRef.current?.click()} title="Tirar foto">
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            type="button" size="icon" variant={recording ? "destructive" : "ghost"}
            className="h-8 w-8 shrink-0"
            onClick={() => setRecording(r => !r)}
            title={recording ? 'Cancelar gravação' : 'Gravar áudio'}
          >
            <Mic className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="hidden sm:inline-flex h-8 w-8 shrink-0" onClick={insertAt} title="Mencionar (@)">
            <AtSign className="h-4 w-4" />
          </Button>

          <input
            ref={fileInputRef} type="file" multiple className="hidden"
            accept="image/*,application/pdf,audio/*"
            onChange={e => { e.target.files && addFiles(Array.from(e.target.files)); e.target.value=''; }}
          />
          <input
            ref={cameraInputRef} type="file" className="hidden"
            accept="image/*" capture="environment"
            onChange={e => { e.target.files && addFiles(Array.from(e.target.files)); e.target.value=''; }}
          />

          <Textarea
            ref={textareaRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onClick={updateMentionQuery}
            placeholder={replyToId ? 'Responder na thread… (use @ para mencionar)' : (channelName ? `Mensagem para #${channelName} · @ menciona · cole imagens` : 'Digite uma mensagem…')}
            rows={1}
            className="flex-1 min-w-0 min-h-[36px] max-h-40 resize-none border-0 bg-transparent p-1.5 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 break-words [overflow-wrap:anywhere]"
          />
          <EmojiPicker
            onSelect={insertEmoji}
            triggerClassName="h-8 w-8"
            align="end"
            side="top"
            title="Inserir emoji"
          />
          <Button onClick={send} disabled={sending || (!body.trim() && files.length === 0)} size="icon" className="h-8 w-8 shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between gap-3 mt-1.5 px-1">
          <span className="text-[10px] text-muted-foreground/70">
            <kbd className="font-mono">Enter</kbd> envia · <kbd className="font-mono">@</kbd> menciona · rascunho salvo automaticamente
          </span>
          {canPostAnnouncement && !replyToId && (
            <div className="flex items-center gap-1.5">
              <Switch
                id="announcement"
                checked={isAnnouncement}
                onCheckedChange={setIsAnnouncement}
                className="scale-75 data-[state=checked]:bg-primary"
              />
              <Label htmlFor="announcement" className="text-[11px] flex items-center gap-1 cursor-pointer text-muted-foreground">
                <Megaphone className="h-3 w-3" /> Comunicado oficial
              </Label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
