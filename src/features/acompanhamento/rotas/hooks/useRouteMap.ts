import { useEffect, useRef } from 'react';

declare global { interface Window { google: any; __gmaps_loading?: Promise<void> } }

const KEY = (import.meta as any).env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
const CHANNEL = (import.meta as any).env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;

function loadGmaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmaps_loading) return window.__gmaps_loading;
  window.__gmaps_loading = new Promise((resolve, reject) => {
    if (!KEY) { reject(new Error('Browser key Google Maps ausente')); return; }
    (window as any).__initGmaps = () => resolve();
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&loading=async&callback=__initGmaps${CHANNEL ? `&channel=${CHANNEL}` : ''}`;
    s.async = true; s.defer = true;
    s.onerror = () => reject(new Error('Falha ao carregar Google Maps'));
    document.head.appendChild(s);
  });
  return window.__gmaps_loading;
}

interface Point { lat: number; lng: number; label?: string; title?: string }

export function useRouteMap(divRef: React.RefObject<HTMLDivElement>, points: Point[]) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const lineRef = useRef<any>(null);

  useEffect(() => {
    if (!divRef.current || !points.length) return;
    let cancelled = false;
    loadGmaps().then(() => {
      if (cancelled || !divRef.current) return;
      const g = window.google;
      const bounds = new g.maps.LatLngBounds();
      points.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(divRef.current, {
          center: bounds.getCenter(), zoom: 8,
          streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
        });
      }
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = points.map((p, i) => new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapRef.current,
        label: p.label ?? String(i),
        title: p.title ?? '',
      }));
      if (lineRef.current) lineRef.current.setMap(null);
      lineRef.current = new g.maps.Polyline({
        path: points.map(p => ({ lat: p.lat, lng: p.lng })),
        geodesic: true, strokeColor: '#1B1E2C', strokeOpacity: 0.85, strokeWeight: 3,
        map: mapRef.current,
      });
      mapRef.current.fitBounds(bounds, 60);
    }).catch(() => {/* silent */});
    return () => { cancelled = true; };
  }, [JSON.stringify(points)]);
}
