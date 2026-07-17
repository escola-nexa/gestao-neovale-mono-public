-- candidato_disciplinas precisa ser jsonb para suportar arrays vindos da nova grade
-- (anteriormente armazenava só uma string PEM/UCI/UCII/UCIII).
-- Conversão preserva valores existentes embrulhando em array jsonb.
ALTER TABLE public.hr_school_indications
  ALTER COLUMN candidato_disciplinas TYPE jsonb
  USING CASE
    WHEN candidato_disciplinas IS NULL OR candidato_disciplinas = '' THEN NULL
    ELSE to_jsonb(candidato_disciplinas)
  END;