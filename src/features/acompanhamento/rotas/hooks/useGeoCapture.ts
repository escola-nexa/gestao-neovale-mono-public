import { useState } from 'react';

export interface GeoSnapshot {
  lat: number;
  lng: number;
  accuracy_m: number;
}

export function useGeoCapture() {
  const [loading, setLoading] = useState(false);

  const capture = (): Promise<GeoSnapshot> =>
    new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocalização não disponível neste navegador.'));
        return;
      }
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLoading(false);
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy_m: pos.coords.accuracy,
          });
        },
        (err) => {
          setLoading(false);
          reject(new Error(err.message || 'Falha ao capturar localização.'));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  return { capture, loading };
}
