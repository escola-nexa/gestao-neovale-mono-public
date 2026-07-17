import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';
import { planejamentoApi } from '@/features/planejamento/api';

interface DigitalSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planningId: string;
  planningIds?: string[];
  signatureType?: 'PROFESSOR' | 'COORDINATOR';
  onSuccess: () => void;
}

interface GeolocationData {
  latitude: number;
  longitude: number;
}

export function DigitalSignatureDialog({
  open,
  onOpenChange,
  planningId,
  planningIds,
  signatureType = 'PROFESSOR',
  onSuccess,
}: DigitalSignatureDialogProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [location, setLocation] = useState<GeolocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start camera when dialog opens
  useEffect(() => {
    if (open) {
      startCamera();
      getLocation();
    } else {
      stopCamera();
      setPhoto(null);
      setLocation(null);
      setLocationError(null);
      setCameraError(null);
    }
    
    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraError(null);
    } catch (error) {
      console.error('Error starting camera:', error);
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada pelo navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError('Não foi possível obter a localização. Verifique as permissões.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPhoto(dataUrl);
  }, []);

  const retakePhoto = () => {
    setPhoto(null);
  };

  const handleSign = async () => {
    if (!photo || !location) {
      toast({
        title: 'Dados incompletos',
        description: 'Foto e localização são obrigatórias para assinar.',
        variant: 'destructive',
      });
      return;
    }

    setSigning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Convert base64 to blob
      const response = await fetch(photo);
      const blob = await response.blob();

      // Upload photo to storage (must be in user folder for RLS)
      const fileName = `${user.id}/${planningId}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      // Get signed URL (bucket is private)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('signatures')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10); // 10 years
      
      if (urlError) throw urlError;
      const photoUrl = urlData.signedUrl;

      // Determine all planning IDs to sign
      const idsToSign = planningIds && planningIds.length > 0 ? planningIds : [planningId];

      for (const pId of idsToSign) {
        // Create signature record
        const { error: signatureError } = await supabase
          .from('digital_signatures')
          .insert({
            planning_id: pId,
            user_id: user.id,
            signature_type: signatureType,
            photo_url: photoUrl,
            latitude: location.latitude,
            longitude: location.longitude,
          });

        if (signatureError) throw signatureError;

        // Update planning based on signature type
        if (signatureType === 'COORDINATOR') {
          const { error: updateError } = await supabase
            .from('teacher_plannings')
            .update({
              status: 'ASSINADO' as const,
              coordinator_signed: true,
              finalized_at: new Date().toISOString(),
            })
            .eq('id', pId);
          if (updateError) throw updateError;
        } else {
          const { error: updateError } = await supabase
            .from('teacher_plannings')
            .update({
              professor_signed: true,
              status: 'AGUARDANDO_ASSINATURA_COORDENADOR' as any,
            })
            .eq('id', pId);
          if (updateError) throw updateError;
        }
      }

      toast({ title: idsToSign.length > 1 ? `${idsToSign.length} planejamentos assinados com sucesso!` : 'Planejamento assinado com sucesso!' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error signing:', error);
      toast({
        title: 'Erro ao assinar',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSigning(false);
    }
  };

  const canSign = photo && location && !signing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assinatura Digital do Planejamento</DialogTitle>
          <DialogDescription>
            Capture sua foto e confirme sua localização para assinar o planejamento.
            Esta ação é irreversível.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Camera / Photo */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Foto do Professor
            </label>
            
            {cameraError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            ) : (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {!photo ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button onClick={capturePhoto} disabled={!stream}>
                        <Camera className="mr-2 h-4 w-4" />
                        Capturar Foto
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <img src={photo} alt="Foto capturada" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                      <Button variant="outline" onClick={retakePhoto}>
                        Nova Foto
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Localização
            </label>
            
            {locationError ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {locationError}
                  <Button variant="link" className="ml-2 p-0 h-auto" onClick={getLocation}>
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
            ) : location ? (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  Localização obtida: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>Obtendo localização...</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Warning */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Atenção:</strong> Após a assinatura, o planejamento se tornará imutável 
              e servirá como evidência institucional. Esta ação não pode ser desfeita.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={signing} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSign} disabled={!canSign} className="w-full sm:w-auto">
            {signing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assinar Planejamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
