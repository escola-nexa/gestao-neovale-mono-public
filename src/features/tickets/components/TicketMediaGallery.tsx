import { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image, Video, Volume2, FileText, Download } from 'lucide-react';
import { TicketMediaViewer } from './TicketMediaViewer';
import { ticketApi } from '@/features/tickets/api';

interface Attachment {
  url: string;
  path?: string;
  type: string;
  name: string;
  size?: number;
}

interface TicketMediaGalleryProps {
  messages: any[];
}

function formatTotalSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export function TicketMediaGallery({ messages }: TicketMediaGalleryProps) {
  const allAttachments = useMemo(() => {
    const result: Attachment[] = [];
    for (const msg of messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        for (const att of msg.attachments) {
          if (att?.url || att?.path) result.push(att);
        }
      }
    }
    return result;
  }, [messages]);

  const grouped = useMemo(() => {
    const images: Attachment[] = [];
    const videos: Attachment[] = [];
    const audios: Attachment[] = [];
    const files: Attachment[] = [];

    for (const att of allAttachments) {
      const t = att.type?.toLowerCase() || '';
      const n = att.name?.toLowerCase() || '';
      if (t === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(n)) images.push(att);
      else if (t === 'video' || /\.(mp4|webm|mov|avi|mkv)$/i.test(n)) videos.push(att);
      else if (t === 'audio' || /\.(mp3|wav|ogg|webm|m4a|aac)$/i.test(n)) audios.push(att);
      else files.push(att);
    }

    return { images, videos, audios, files };
  }, [allAttachments]);

  const totalSize = useMemo(() => {
    return allAttachments.reduce((acc, att) => acc + (att.size || 0), 0);
  }, [allAttachments]);

  const handleDownloadAll = async () => {
    // Download each file individually (no zip support without backend)
    for (const att of allAttachments) {
      const url = att.path
        ? (await ticketApi.createSignedUrl(att.path, 300))?.data?.signedUrl || att.url
        : att.url;
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = att.name;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
    }
  };

  if (allAttachments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">Nenhum arquivo compartilhado</p>
      </div>
    );
  }

  const SectionHeader = ({ icon: Icon, label, count, color }: { icon: any; label: string; count: number; color: string }) => (
    <div className="flex items-center gap-2 mb-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{count}</Badge>
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {allAttachments.length} arquivo(s) • {formatTotalSize(totalSize)}
          </span>
        </div>
        {allAttachments.length > 1 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleDownloadAll}>
            <Download className="h-3 w-3 mr-1" /> Baixar Todos
          </Button>
        )}
      </div>

      <ScrollArea className="h-[380px]">
        <div className="space-y-4 pr-2">
          {grouped.images.length > 0 && (
            <div>
              <SectionHeader icon={Image} label="Imagens" count={grouped.images.length} color="text-blue-500" />
              <TicketMediaViewer attachments={grouped.images} />
            </div>
          )}
          {grouped.videos.length > 0 && (
            <div>
              <SectionHeader icon={Video} label="Vídeos" count={grouped.videos.length} color="text-purple-500" />
              <TicketMediaViewer attachments={grouped.videos} />
            </div>
          )}
          {grouped.audios.length > 0 && (
            <div>
              <SectionHeader icon={Volume2} label="Áudios" count={grouped.audios.length} color="text-green-500" />
              <TicketMediaViewer attachments={grouped.audios} />
            </div>
          )}
          {grouped.files.length > 0 && (
            <div>
              <SectionHeader icon={FileText} label="Documentos" count={grouped.files.length} color="text-orange-500" />
              <TicketMediaViewer attachments={grouped.files} />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
