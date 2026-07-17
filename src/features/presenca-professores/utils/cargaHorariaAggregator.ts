import type { FolhaPontoTarget } from '../hooks/useFolhaPontoTargets';

export interface CHRow {
  /** "Disciplina · Turma" */
  label: string;
  subject: string;
  classGroup: string | null;
  ha: number;
}

export interface CHSchool {
  schoolId: string;
  schoolName: string;
  rows: CHRow[];
  totalHa: number;
}

export interface CHProfessor {
  professorId: string;
  professorName: string;
  schools: CHSchool[];
  totalGeral: number;
}

/**
 * Agrupa targets (escola×turno) por professor → escola → (disciplina+turma),
 * somando 1 H/A por ocorrência semanal de CLASS. PLANNING é ignorado.
 *
 * Quando o filtro de Escola da modal está aplicado, o caller já passa apenas
 * targets daquela escola, então este aggregator simplesmente reflete a entrada.
 */
export function aggregateCargaHoraria(targets: FolhaPontoTarget[]): CHProfessor[] {
  const byProf = new Map<string, CHProfessor>();

  for (const t of targets) {
    if (!byProf.has(t.professorId)) {
      byProf.set(t.professorId, {
        professorId: t.professorId,
        professorName: t.professorName,
        schools: [],
        totalGeral: 0,
      });
    }
    const prof = byProf.get(t.professorId)!;

    let school = prof.schools.find((s) => s.schoolId === t.schoolId);
    if (!school) {
      school = { schoolId: t.schoolId, schoolName: t.schoolName, rows: [], totalHa: 0 };
      prof.schools.push(school);
    }

    // (disciplina + turma) → count
    const byKey = new Map<string, CHRow>();
    for (const r of school.rows) byKey.set(`${r.subject}__${r.classGroup ?? ''}`, r);

    for (const m of t.models) {
      if (m.schedule_type !== 'CLASS') continue;
      const subject = (m.subject_name || '—').trim();
      const classGroup = m.class_group_name ? m.class_group_name.trim() : null;
      const key = `${subject}__${classGroup ?? ''}`;
      let row = byKey.get(key);
      if (!row) {
        row = {
          subject,
          classGroup,
          label: classGroup ? `${subject} · ${classGroup}` : subject,
          ha: 0,
        };
        byKey.set(key, row);
        school.rows.push(row);
      }
      row.ha += 1;
      school.totalHa += 1;
      prof.totalGeral += 1;
    }
  }

  // Ordenação estável
  const profs = Array.from(byProf.values());
  for (const p of profs) {
    p.schools.sort((a, b) => a.schoolName.localeCompare(b.schoolName, 'pt-BR'));
    for (const s of p.schools) {
      s.rows.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
    }
  }
  profs.sort((a, b) => a.professorName.localeCompare(b.professorName, 'pt-BR'));
  return profs;
}
