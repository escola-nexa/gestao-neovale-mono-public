import { useEffect, useRef, useState } from 'react';
import { rotasApi } from '../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useGeoCapture } from '../hooks/useGeoCapture';

type Mode = 'in' | 'out';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  routeId: string;
  stopId: string;
  schoolName: string;
  onDone: () => void;
}

const OCCURRENCE_OPTIONS = [
  { value: 'normal', label: 'Visita normal' },
  { value: 'parcial', label: 'Atendimento parcial' },
  { value: 'sem_atendimento', label: 'Escola não atendeu' },
  { value: 'problema', label: 'Problema técnico/operacional' },
  { value: 'outro', label: 'Outro (descrever)' },
];

export default function CheckEvidenceDialog({ open, onOpenChange, mode, routeId, stopId, schoolName, onDone }: Props) {
  const { capture, loading: geoLoading } = useGeoCapture();
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy_m: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [occurrenceType, setOccurrenceType] = useState('normal');
  const [occurrenceDesc, setOccurrenceDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setGeo(null); setFile(null); setOccurrenceType('normal'); setOccurrenceDesc('');
    }
  }, [open]);

  const handleCaptureGeo = async () => {
    try {
      const g = await capture();
      setGeo(g);
    } catch (e: any) {
      toast.error(e.message ?? 'Falha ao obter GPS');
    }
  };

  const handleSubmit = async () => {
    if (!file) { toast.error('Foto obrigatória'); return; }
    if (!geo) { toast.error('Capture a localização (GPS)'); return; }
    setSubmitting(true);
    try {
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${routeId}/${stopId}/${mode}-${Date.now()}.${ext}`;
      await rotasApi.uploadEvidence(path, file);

      if (mode === 'in') {
        await rotasApi.checkIn(stopId, geo.lat, geo.lng, geo.accuracy_m, path);
      } else {
        await rotasApi.checkOut(stopId, geo.lat, geo.lng, geo.accuracy_m, path, occurrenceType, occurrenceDesc || null);
      }

      toast.success(mode === 'in' ? 'Check-in registrado' : 'Check-out registrado');
      onDone();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? 'Falha ao registrar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'in' ? 'Check-in' : 'Check-out'} · {schoolName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">1. Foto da escola (obrigatória)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" className="w-full mt-1" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4 mr-2" />
              {file ? file.name.slice(0, 40) : 'Tirar foto / escolher imagem'}
            </Button>
          </div>

          <div>
            <Label className="text-xs">2. Localização (GPS obrigatório)</Label>
            <Button type="button" variant="outline" className="w-full mt-1" onClick={handleCaptureGeo} disabled={geoLoading}>
              {geoLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MapPin className="h-4 w-4 mr-2" />}
              {geo ? `OK · ±${Math.round(geo.accuracy_m)}m` : 'Capturar localização atual'}
            </Button>
            {geo && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}
              </p>
            )}
          </div>

          {mode === 'out' && (
            <>
              <div>
                <Label className="text-xs">3. Tipo de ocorrência</Label>
                <Select value={occurrenceType} onValueChange={setOccurrenceType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OCCURRENCE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(occurrenceType !== 'normal') && (
                <div>
                  <Label className="text-xs">Descrição</Label>
                  <Textarea value={occurrenceDesc} onChange={(e) => setOccurrenceDesc(e.target.value)} rows={3} />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting || !file || !geo}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Confirmar {mode === 'in' ? 'check-in' : 'check-out'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
