import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns a set of subject_ids that have ANP hours (ch_anp > 0)
 * in any class within the user's accessible scope.
 *
 * Use `.has(subjectId)` to check whether to render the ANP badge.
 *
 * For per-class precision, also returns a composite map keyed by
 * `${subject_id}:${class_group_id}:${semester}` -> true.
 */
export function useAnpSubjectMap() {
  return useQuery({
    queryKey: ["anp-subject-map"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("class_subject_modality")
        .select("subject_id, class_group_id, semester, ch_anp")
        .gt("ch_anp", 0);

      if (error) throw error;

      const bySubject = new Set<string>();
      const byClass = new Set<string>();
      for (const row of data ?? []) {
        bySubject.add(row.subject_id);
        byClass.add(`${row.subject_id}:${row.class_group_id}:${row.semester}`);
      }
      return { bySubject, byClass };
    },
  });
}

export function isAnpForSubject(map: { bySubject: Set<string> } | undefined, subjectId: string | null | undefined) {
  if (!map || !subjectId) return false;
  return map.bySubject.has(subjectId);
}

export function isAnpForClass(
  map: { byClass: Set<string> } | undefined,
  subjectId: string | null | undefined,
  classGroupId: string | null | undefined,
  semester: string | null | undefined,
) {
  if (!map || !subjectId || !classGroupId || !semester) return false;
  return map.byClass.has(`${subjectId}:${classGroupId}:${semester}`);
}
