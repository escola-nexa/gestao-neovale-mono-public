## Mudança
Em `src/features/grade-horaria/components/ScheduleWeekView.tsx`, dentro do card de cada slot, adicionar uma linha com o nome da escola (`model.school_name`) — exibida com o mesmo estilo discreto das demais metas (turma, professor, curso).

Posição sugerida no card (logo após o horário e antes da turma) com ícone `Building2`:
```
🏫 {model.school_name}
{model.class_group_name}
{model.professor_name}
{model.course_name}
```

Exibe para todos os perfis (não há motivo para esconder de coordenadores — ajuda também a leitura geral). Truncado em 1 linha com `truncate opacity-75`, como os outros campos.

## Arquivo
- `src/features/grade-horaria/components/ScheduleWeekView.tsx` — única alteração.
