-- Migration to add comments column to cases table
ALTER TABLE public.cases ADD COLUMN comments TEXT DEFAULT NULL;
