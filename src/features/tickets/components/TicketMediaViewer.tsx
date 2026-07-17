import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Play, FileText, Volume2, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ticketApi } from '@/features/tickets/api';

interface Attachment {
  url: string;
  path?: string;
  type: string;
  name: string;
  size?: number;
}

interface TicketMediaViewerProps {
  attachments: Attachment[];
  className?: string;
}

function getMediaType(att: Attachment): 'image' | 'video' | 'audio' | 'file' {
  if (att.type === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(att.name)) return 'image';
  if (att.type === 'video' || /\.(mp4|webm|ogg|mov)$/i.test(att.name)) return 'video';
  if (att.type === 'audio' || /\.(mp3|wav|ogg|webm|m4a|aac)$/i.test(att.name)) return 'audio';
  return 'file';
}

function formatSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export function TicketMediaViewer({ attachments, className = '' }: TicketMediaViewerProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<number, string>>({});

  // Resolve signed URLs for attachments that have a path
  useEffect(() => {
    const resolve = async () => {
      const pathsToResolve = attachments
        .map((att, i) => ({ att, i }))
        .filter(({ att }) => att.path);
      
      if (pathsToResolve.length === 0) return;

      const paths = pathsToResolve.map(({ att }) => att.path!);
      const { data } = await supabase.storage
        .from('ticket-attachments')
        .createSignedUrls(paths, 3600);

      if (data) {
        const map: Record<number, string> = {};
        pathsToResolve.forEach(({ i }, idx) => {
          if (data[idx]?.signedUrl) {
            map[i] = data[idx].signedUrl;
          }
        });
        setResolvedUrls(map);
      }
    };
    resolve();
  }, [attachments]);

  const getUrl = (att: Attachment, index: number) => resolvedUrls[index] || att.url;
  if (!attachments?.length) return null;

  return (
    <>
      <div className={`flex flex-wrap gap-2 mt-2 ${className}`}>
        {attachments.map((att, i) => {
          const media = getMediaType(att);
          const url = getUrl(att, i);

          if (media === 'image') {
            return (
              <button
                key={i}
                onClick={() => setLightboxUrl(url)}
                className="relative group rounded-lg overflow-hidden border border-border w-20 h-20 hover:ring-2 hover:ring-primary transition-all"
              >
                <img src={url} alt={att.name} className="w-full h-full object-cover" loading="lazy" />
              </button>
            );
          }

          if (media === 'video') {
            return (
              <div key={i} className="relative rounded-lg overflow-hidden border border-border w-40">
                <video
                  src={url}
                  controls
                  preload="metadata"
                  className="w-full h-24 object-cover bg-black"
                />
                <p className="text-xs text-muted-foreground truncate px-1 py-0.5">{att.name}</p>
              </div>
            );
          }

          if (media === 'audio') {
            return (
              <div key={i} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border min-w-[200px]">
                <Volume2 className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{att.name}</p>
                  <audio src={url} controls preload="metadata" className="w-full h-7 mt-1" />
                </div>
              </div>
            );
          }

          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border border-border hover:bg-muted transition-colors"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate text-foreground">{att.name}</p>
                {att.size ? <p className="text-xs text-muted-foreground">{formatSize(att.size)}</p> : null}
              </div>
              <Download className="h-3 w-3 text-muted-foreground shrink-0" />
            </a>
          );
        })}
      </div>

      {/* Lightbox for images */}
      <Dialog open={!!lightboxUrl} onOpenChange={() => setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[400px]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:bg-white/20 z-10"
              onClick={() => setLightboxUrl(null)}
            >
              <X className="h-5 w-5" />
            </Button>
            {lightboxUrl && (
              <img
                src={lightboxUrl}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
