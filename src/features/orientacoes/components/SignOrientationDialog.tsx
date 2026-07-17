import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, RotateCcw, CheckCircle2 } from 'lucide-react';
import { orientacoesApi } from '../api';
import { Orientation } from '@/types/academic';
import { useCamera } from '@/hooks/useCamera';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SignOrientationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orientation: Orientation | null;
    onSuccess: () => void;
}

export function SignOrientationDialog({
    open,
    onOpenChange,
    orientation,
    onSuccess
}: SignOrientationDialogProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const { organizationId } = useOrganization();
    const [loading, setLoading] = useState(false);
    const [currentDateTime] = useState(new Date());

    const {
        videoRef,
        capturedPhoto,
        error: cameraError,
        isActive,
        startCamera,
        stopCamera,
        capturePhoto,
        clearPhoto,
        photoToFile,
    } = useCamera();

    useEffect(() => {
        if (open && !capturedPhoto) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                startCamera();
            }, 300);
            return () => clearTimeout(timer);
        }

        if (!open) {
            stopCamera();
        }
    }, [open]);

    const uploadSignaturePhoto = async (photoDataUrl: string): Promise<string | null> => {
        try {
            const file = await photoToFile(photoDataUrl, `signature-${orientation?.id}-${Date.now()}.jpg`);
            if (!file) return null;

            const filePath = `${organizationId}/orientations/signatures/${orientation?.id}/${file.name}`;

            await orientacoesApi.uploadEvidence(filePath, file);
            return orientacoesApi.getEvidenceUrl(filePath);
        } catch (error) {
            console.error('Error uploading signature photo:', error);
            return null;
        }
    };

    const handleSign = async () => {
        if (!orientation || !user || !capturedPhoto) return;

        setLoading(true);
        try {
            const photoUrl = await uploadSignaturePhoto(capturedPhoto);
            if (!photoUrl) {
                throw new Error('Falha ao fazer upload da foto');
            }

            await orientacoesApi.signOrientation(
                orientation.id,
                user.id,
                null, // No location data in this implementation
                photoUrl
            );

            toast({
                title: 'Orientação assinada com sucesso',
                description: 'A orientação foi finalizada e sua assinatura foi registrada.',
            });

            stopCamera();
            clearPhoto();
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            console.error('Error signing orientation:', error);
            toast({
                title: 'Erro ao assinar orientação',
                description: error.message || 'Ocorreu um erro ao assinar a orientação.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            stopCamera();
            clearPhoto();
            onOpenChange(false);
        }
    };

    const handleRetakePhoto = () => {
        clearPhoto();
        setTimeout(() => startCamera(), 200);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Assinar Orientação
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Alert>
                        <AlertDescription>
                            Para finalizar a orientação, capture uma foto/selfie. A data e hora serão registradas automaticamente.
                        </AlertDescription>
                    </Alert>

                    {/* Date and Time Display */}
                    <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium">Data e Hora da Assinatura:</p>
                        <p className="text-lg font-semibold">
                            {format(currentDateTime, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                    </div>

                    {/* Camera/Photo Section */}
                    <div className="space-y-3">
                        {cameraError && (
                            <Alert variant="destructive">
                                <AlertDescription>
                                    {cameraError}
                                    <Button variant="link" size="sm" className="ml-2 p-0 h-auto" onClick={() => startCamera()}>
                                        Tentar novamente
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                            {!capturedPhoto ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    {!isActive && !cameraError && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                            <div className="text-center">
                                                <Loader2 className="h-6 w-6 animate-spin text-white mx-auto mb-2" />
                                                <p className="text-white text-sm">Iniciando câmera...</p>
                                            </div>
                                        </div>
                                    )}
                                    {cameraError && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                            <div className="text-center px-4">
                                                <Camera className="h-8 w-8 text-white/60 mx-auto mb-2" />
                                                <p className="text-white/80 text-sm">Câmera indisponível</p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <img
                                    src={capturedPhoto}
                                    alt="Foto capturada"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>

                        {/* Camera Controls */}
                        <div className="flex gap-2 justify-center">
                            {!capturedPhoto ? (
                                <Button
                                    onClick={capturePhoto}
                                    disabled={!isActive || loading}
                                    size="lg"
                                    className="gap-2"
                                >
                                    <Camera className="h-5 w-5" />
                                    Capturar Foto
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleRetakePhoto}
                                    variant="outline"
                                    disabled={loading}
                                    className="gap-2"
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    Tirar Nova Foto
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSign}
                        disabled={loading || !capturedPhoto}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Assinatura
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
