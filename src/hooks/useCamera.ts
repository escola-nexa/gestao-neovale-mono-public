import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingStream = useRef<MediaStream | null>(null);

  // When videoRef gets attached to a video element, connect any pending stream
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && pendingStream.current) {
      node.srcObject = pendingStream.current;
      pendingStream.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Câmera não disponível neste navegador. Tente abrir em um dispositivo com câmera.');
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      
      setStream(mediaStream);
      setIsActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      } else {
        // Store for when videoRef gets attached
        pendingStream.current = mediaStream;
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Por favor, permita o acesso à câmera nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada neste dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('A câmera está sendo usada por outro aplicativo. Feche outros apps e tente novamente.');
      } else {
        setError('Não foi possível acessar a câmera. Verifique as permissões.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsActive(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    pendingStream.current = null;
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !stream) {
      setError('Câmera não está ativa');
      return null;
    }

    try {
      const video = videoRef.current;
      // Ensure video has dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setError('Câmera ainda não está pronta. Aguarde um momento.');
        return null;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (!context) {
        setError('Erro ao processar imagem');
        return null;
      }

      context.drawImage(video, 0, 0);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      setCapturedPhoto(photoDataUrl);
      return photoDataUrl;
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError('Erro ao capturar foto');
      return null;
    }
  }, [stream]);

  const clearPhoto = useCallback(() => {
    setCapturedPhoto(null);
  }, []);

  const photoToBlob = useCallback(async (dataUrl: string): Promise<Blob | null> => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      return blob;
    } catch (err) {
      console.error('Error converting photo to blob:', err);
      setError('Erro ao processar foto');
      return null;
    }
  }, []);

  const photoToFile = useCallback(async (dataUrl: string, filename: string = 'signature.jpg'): Promise<File | null> => {
    const blob = await photoToBlob(dataUrl);
    if (!blob) return null;
    
    return new File([blob], filename, { type: 'image/jpeg' });
  }, [photoToBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      pendingStream.current = null;
    };
  }, []);

  return {
    videoRef: setVideoRef,
    stream,
    capturedPhoto,
    error,
    isActive,
    startCamera,
    stopCamera,
    capturePhoto,
    clearPhoto,
    photoToBlob,
    photoToFile,
  };
}
