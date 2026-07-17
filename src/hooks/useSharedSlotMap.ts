import { useEffect, useState } from 'react';
import { globalApi } from './globalApi';

export interface SharedSlotInfo {
  /** ID da própria disciplina (para excluir do tooltip). */
  subjectId: string;
  /** Nomes das demais disciplinas que compartilham o mesmo slot. */
  others: string[];
}

/**
 * Para cada subject_id informado, descobre quais OUTRAS disciplinas
 * do mesmo professor são lecionadas no mesmo school_time_slot
 * (mesmo school_time_slot_id OU mesma chave weekday|start|end|class_group).
 * Usado para mostrar o badge "UC compartilhada" em listas que renderizam
 * uma linha por disciplina (Planejamento, Frequência, Notas) sem fundir
 * registros (cada disciplina mantém seu próprio dado).
 */
export function useSharedSlotMap(
  professorId: string | null | undefined,
  subjectIds: string[] | undefined,
) {
  const [map, setMap] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    if (!professorId || !subjectIds || subjectIds.length === 0) {
      setMap(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      const data = await globalApi.getSharedSlotMapData(professorId);
      if (cancelled) return;
      // Group rows by slot key
      const slotToSubjects = new Map<string, { id: string; nome: string }[]>();
      (data || []).forEach((row: any) => {
        const slotKey = row.school_time_slot_id
          ? `s:${row.school_time_slot_id}`
          : `t:${row.weekday}|${row.start_time}|${row.end_time}|${row.class_group_id}`;
        const list = slotToSubjects.get(slotKey) || [];
        if (row.subjects?.id && !list.find((s) => s.id === row.subjects.id)) {
          list.push({ id: row.subjects.id, nome: row.subjects.nome });
        }
        slotToSubjects.set(slotKey, list);
      });
      // For each subjectId of interest, collect the union of "others" across slots
      const result = new Map<string, string[]>();
      const wanted = new Set(subjectIds);
      slotToSubjects.forEach((list) => {
        if (list.length < 2) return;
        list.forEach((s) => {
          if (!wanted.has(s.id)) return;
          const others = list.filter((x) => x.id !== s.id).map((x) => x.nome);
          const prev = result.get(s.id) || [];
          // Dedup
          others.forEach((n) => {
            if (!prev.includes(n)) prev.push(n);
          });
          result.set(s.id, prev);
        });
      });
      setMap(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [professorId, subjectIds?.join('|')]);

  return map;
}
