
-- Add sequential case_number column
ALTER TABLE public.cases ADD COLUMN case_number SERIAL;

-- Backfill existing rows in order of creation
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.cases
)
UPDATE public.cases SET case_number = numbered.rn FROM numbered WHERE cases.id = numbered.id;

-- Make it unique and not null
ALTER TABLE public.cases ADD CONSTRAINT cases_case_number_unique UNIQUE (case_number);
