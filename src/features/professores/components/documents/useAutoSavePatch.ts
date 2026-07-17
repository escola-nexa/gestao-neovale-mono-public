import { useEffect, useRef } from 'react';

/**
 * Auto-save com debounce. Compara `form` atual com o `original` (vindo do `doc`)
 * e dispara `onAutoSave(patch)` com APENAS os campos alterados.
 *
 * - Não dispara no primeiro render (até o `form` mudar de fato).
 * - Não dispara se nada mudou em relação ao original.
 * - Silencioso: sem toast, sem avanço de aba.
 */
export function useAutoSavePatch<T extends Record<string, any>>(opts: {
  form: T;
  original: T;
  enabled: boolean;
  onAutoSave?: (patch: Partial<T>) => Promise<void> | void;
  delayMs?: number;
  /** Campos a ignorar (ex.: "está vazio mas obrigatório"). */
  validate?: (form: T) => boolean;
}) {
  const { form, original, enabled, onAutoSave, delayMs = 1500, validate } = opts;
  const initializedRef = useRef(false);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !onAutoSave) return;
    // Evita disparo no primeiro render quando form ainda nem foi populado.
    if (!initializedRef.current) {
      initializedRef.current = true;
      lastSavedRef.current = JSON.stringify(form);
      return;
    }
    const currentSerialized = JSON.stringify(form);
    if (currentSerialized === lastSavedRef.current) return;

    if (validate && !validate(form)) return;

    const handle = window.setTimeout(() => {
      const patch: Record<string, any> = {};
      let changed = false;
      Object.keys(form).forEach((key) => {
        const next = (form as any)[key];
        const prev = (original as any)[key];
        const a = next === '' ? null : next;
        const b = prev === '' || prev === undefined ? null : prev;
        if (a !== b) {
          patch[key] = a;
          changed = true;
        }
      });
      if (!changed) {
        lastSavedRef.current = currentSerialized;
        return;
      }
      lastSavedRef.current = currentSerialized;
      Promise.resolve(onAutoSave(patch as Partial<T>)).catch(() => {
        // Silencioso. Usuário pode usar o botão manual para ver erros.
      });
    }, delayMs);

    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(form), enabled]);
}
