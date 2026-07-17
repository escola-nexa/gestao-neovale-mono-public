ALTER TABLE public.hr_school_indications
  DROP CONSTRAINT IF EXISTS hr_school_indications_origem_check;

ALTER TABLE public.hr_school_indications
  ADD CONSTRAINT hr_school_indications_origem_check
  CHECK (origem = ANY (ARRAY[
    'PROFESSOR_EXISTENTE'::text,
    'TALENTO'::text,
    'NOVO'::text,
    'PORTAL_ESCOLA'::text
  ]));

DELETE FROM public.hr_indication_classes WHERE nome = 'TESTE-1A';