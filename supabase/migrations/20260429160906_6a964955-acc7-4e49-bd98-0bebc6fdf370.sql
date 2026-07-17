create or replace function public.check_professor_binding_dependencies(_binding_ids uuid[])
returns table (
  binding_id uuid,
  professor_id uuid,
  school_id uuid,
  course_id uuid,
  weekly_slots bigint,
  plannings bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    psc.id as binding_id,
    psc.professor_id,
    psc.school_id,
    psc.course_id,
    coalesce((
      select count(*) from public.weekly_teaching_models w
      where w.school_id = psc.school_id
        and w.course_id = psc.course_id
        and w.professor_id = psc.professor_id
        and w.status = 'ACTIVE'
    ), 0) as weekly_slots,
    coalesce((
      select count(*) from public.teacher_plannings t
      where t.school_id = psc.school_id
        and t.course_id = psc.course_id
        and t.professor_id = psc.professor_id
    ), 0) as plannings
  from public.professor_school_courses psc
  where psc.id = any(_binding_ids);
$$;

create or replace function public.check_course_school_dependencies(_school_id uuid, _course_id uuid)
returns table (
  professors bigint,
  students bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.professor_school_courses
       where school_id = _school_id and course_id = _course_id and status = 'ACTIVE') as professors,
    (select count(*) from public.enrollments
       where school_id = _school_id and course_id = _course_id and status = 'ativa') as students;
$$;

grant execute on function public.check_professor_binding_dependencies(uuid[]) to authenticated;
grant execute on function public.check_course_school_dependencies(uuid, uuid) to authenticated;