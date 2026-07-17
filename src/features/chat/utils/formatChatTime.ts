import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formato curto estilo WhatsApp:
 *   hoje  -> 14:32
 *   ontem -> ontem
 *   <7d   -> qua
 *   resto -> 15/05
 */
export function formatChatTime(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '';
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'ontem';
  if (differenceInDays(new Date(), d) < 7) return format(d, 'EEE', { locale: ptBR });
  return format(d, 'dd/MM');
}
