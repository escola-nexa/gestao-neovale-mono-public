---
name: Agrupamento UC nas telas do Professor
description: Como o front do professor agrupa disciplinas que compartilham slot (UC) e exibe o período vigente
type: feature
---
- Em Dashboard "Aulas de Hoje" / WeeklyCalendarCard e no Hub Frequência (useTodayClasses + TodayClassesList), entries são agrupadas por `school_time_slot_id` (fallback `school_id|start|end|class_group_id`) e listam todas as disciplinas do slot. Espelha admin/coordenador na Grade Horária.
- `TodayClass.subjects` é `string[]`; consumers existentes devem usar `subjects[0]` quando precisarem de um nome único.
- `useDashboardData.loadProfessorClasses` continua trazendo SEG–SEX e o filtro do dia atual é feito no Dashboard.tsx para alimentar `TodayClassesCard`.
- `useSharedSlotMap(professorId, subjectIds[])` retorna Map<subjectId, others[]>; usado com `<SharedSlotBadge />` em listas que mantêm 1 linha por disciplina (Frequência/Notas) para sinalizar UC compartilhada sem fundir registros (planejamento/notas/frequência continuam por disciplina).
- `<CurrentPeriodBadge />` exibe "1º/2º Semestre · Nº Bimestre (dd/mm – dd/mm)" lendo `useSemester`; presente no Dashboard, FrequenciaDashboardPage e NotasDashboardPage para perfil professor.
