import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onComplete: (file: File) => void;
  onCancel?: () => void;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Inline audio recorder using MediaRecorder. Returns a webm/opus File. */
export function AudioRecorder({ onComplete, onCancel }: Props) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    start();
    return () => { cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start();
      setRecording(true);
      setSeconds(0);
      intervalRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (err: any) {
      toast.error('Microfone bloqueado: ' + (err?.message || 'permissão negada'));
      onCancel?.();
    }
  };

  const stop = (sendIt: boolean) => {
    const mr = recorderRef.current;
    if (!mr) { onCancel?.(); return; }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const dur = seconds;
      cleanup();
      setRecording(false);
      if (sendIt && blob.size > 0) {
        const file = new File([blob], `audio_${Date.now()}_${dur}s.webm`, { type: 'audio/webm' });
        onComplete(file);
      } else {
        onCancel?.();
      }
    };
    try { mr.stop(); } catch { /* noop */ }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-destructive/5 border-destructive/30">
      <span className={cn(
        "inline-flex h-2.5 w-2.5 rounded-full bg-destructive",
        recording && "animate-pulse"
      )} />
      <span className="text-xs font-mono font-semibold text-destructive">{fmt(seconds)}</span>
      <span className="flex-1 text-xs text-muted-foreground">Gravando…</span>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => stop(false)} title="Cancelar">
        <X className="h-3.5 w-3.5" />
      </Button>
      <Button type="button" size="icon" variant="default" className="h-7 w-7" onClick={() => stop(true)} title="Enviar">
        <Send className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export function MicTriggerIcon() {
  return <Mic className="h-4 w-4" />;
}
export { Square };
