import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Paperclip, Camera, Mic, Image, Video, FileText, X, Square, Upload } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

interface QuickAttachmentProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function QuickAttachment({ onFilesSelected, disabled }: QuickAttachmentProps) {
  const [open, setOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const camera = useCamera();
  const recorder = useAudioRecorder();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
      setOpen(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = async () => {
    const photo = camera.capturePhoto();
    if (photo) {
      const file = await camera.photoToFile(photo, `foto_${Date.now()}.jpg`);
      if (file) {
        onFilesSelected([file]);
        camera.stopCamera();
        setShowCamera(false);
        setOpen(false);
      }
    }
  };

  const handleStartCamera = (mode: 'photo' | 'video') => {
    setCameraMode(mode);
    setShowCamera(true);
    camera.startCamera();
  };

  const handleStopCamera = () => {
    if (isRecordingVideo) stopVideoRecording();
    camera.stopCamera();
    camera.clearPhoto();
    setShowCamera(false);
    setIsRecordingVideo(false);
  };

  const startVideoRecording = () => {
    if (!camera.stream) return;
    videoChunksRef.current = [];
    const mr = new MediaRecorder(camera.stream, { mimeType: 'video/webm' });
    mr.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(videoChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
      onFilesSelected([file]);
      camera.stopCamera();
      setShowCamera(false);
      setIsRecordingVideo(false);
      setOpen(false);
    };
    mr.start();
    videoRecorderRef.current = mr;
    setIsRecordingVideo(true);
  };

  const stopVideoRecording = () => {
    videoRecorderRef.current?.stop();
  };

  const handleSendAudio = () => {
    const file = recorder.audioToFile(`audio_${Date.now()}.webm`);
    if (file) {
      onFilesSelected([file]);
      recorder.clearRecording();
      setOpen(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        onChange={handleFileSelect}
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" disabled={disabled} className="shrink-0">
            <Paperclip className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          {/* Camera view */}
          {showCamera ? (
            <div className="space-y-2">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {camera.capturedPhoto ? (
                  <img src={camera.capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video ref={camera.videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    {isRecordingVideo && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
                        <div className="w-2.5 h-2.5 bg-destructive rounded-full animate-pulse" />
                        <span className="text-[10px] text-white font-mono">REC</span>
                      </div>
                    )}
                  </>
                )}
              </div>
              {camera.error && <p className="text-xs text-destructive">{camera.error}</p>}
              <div className="flex gap-2">
                {camera.capturedPhoto ? (
                  <>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => camera.clearPhoto()}>Refazer</Button>
                    <Button size="sm" className="flex-1" onClick={handleCameraCapture}>Enviar</Button>
                  </>
                ) : cameraMode === 'video' ? (
                  <>
                    <Button size="sm" variant="outline" className="flex-1" onClick={handleStopCamera}>Cancelar</Button>
                    {isRecordingVideo ? (
                      <Button size="sm" variant="destructive" className="flex-1" onClick={stopVideoRecording}>
                        <Square className="h-3 w-3 mr-1 fill-current" /> Parar
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1" onClick={startVideoRecording} disabled={!camera.isActive}>
                        <Video className="h-3 w-3 mr-1" /> Gravar
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="flex-1" onClick={handleStopCamera}>Cancelar</Button>
                    <Button size="sm" className="flex-1" onClick={() => camera.capturePhoto()} disabled={!camera.isActive}>
                      <Camera className="h-3 w-3 mr-1" /> Capturar
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : recorder.isRecording || recorder.audioUrl ? (
            /* Audio recording view */
            <div className="space-y-2">
              {recorder.isRecording ? (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
                  <span className="text-sm font-mono text-foreground">{recorder.formattedDuration}</span>
                  <Button size="icon" variant="ghost" className="ml-auto h-8 w-8" onClick={recorder.stopRecording}>
                    <Square className="h-4 w-4 fill-destructive text-destructive" />
                  </Button>
                </div>
              ) : recorder.audioUrl ? (
                <div className="space-y-2">
                  <audio src={recorder.audioUrl} controls className="w-full h-8" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={recorder.clearRecording}>Descartar</Button>
                    <Button size="sm" className="flex-1" onClick={handleSendAudio}>Enviar</Button>
                  </div>
                </div>
              ) : null}
              {recorder.error && <p className="text-xs text-destructive">{recorder.error}</p>}
            </div>
          ) : (
            /* Menu options */
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors text-foreground" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Arquivo</p>
                  <p className="text-[10px] text-muted-foreground">PDF, DOC, XLS, imagens...</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors text-foreground"
                onClick={() => {
                  const input = fileInputRef.current;
                  if (input) { input.accept = 'image/*'; input.click(); input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv'; }
                }}>
                <Image className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Galeria</p>
                  <p className="text-[10px] text-muted-foreground">Selecionar da galeria</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors text-foreground" onClick={() => handleStartCamera('photo')}>
                <Camera className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Tirar Foto</p>
                  <p className="text-[10px] text-muted-foreground">Câmera do dispositivo</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors text-foreground" onClick={() => handleStartCamera('video')}>
                <Video className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Gravar Vídeo</p>
                  <p className="text-[10px] text-muted-foreground">Até 50MB</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-muted transition-colors text-foreground" onClick={recorder.startRecording}>
                <Mic className="h-4 w-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="font-medium">Gravar Áudio</p>
                  <p className="text-[10px] text-muted-foreground">Mensagem de voz</p>
                </div>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  );
}

// Drag & Drop zone component
interface DragDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function DragDropZone({ onFilesDropped, children, disabled }: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesDropped(files);
  }, [onFilesDropped, disabled]);

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className="relative"
    >
      {children}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-8 w-8" />
            <p className="text-sm font-medium">Solte os arquivos aqui</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface FileUploadProgressProps {
  files: { name: string; progress: number }[];
  onCancel?: (index: number) => void;
}

export function FileUploadProgress({ files, onCancel }: FileUploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2 p-2 bg-muted/50 rounded-lg">
      {files.map((file, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate text-foreground">{file.name}</p>
            <Progress value={file.progress} className="h-1.5 mt-1" />
          </div>
          {onCancel && (
            <button onClick={() => onCancel(i)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Pending files preview with thumbnails
interface PendingFilesPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
}

export function PendingFilesPreview({ files, onRemove }: PendingFilesPreviewProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg">
      {files.map((f, i) => {
        const isImage = f.type.startsWith('image/');
        const isVideo = f.type.startsWith('video/');
        const isAudio = f.type.startsWith('audio/');

        return (
          <div key={i} className="relative group">
            {isImage ? (
              <div className="w-16 h-16 rounded-md overflow-hidden border border-border">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-background rounded-md px-2.5 py-1.5 text-xs border border-border">
                {isVideo ? <Video className="h-3.5 w-3.5 text-muted-foreground" /> :
                 isAudio ? <Mic className="h-3.5 w-3.5 text-muted-foreground" /> :
                 <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="truncate max-w-[100px]">{f.name}</span>
                <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)}KB)</span>
              </div>
            )}
            <button
              onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
