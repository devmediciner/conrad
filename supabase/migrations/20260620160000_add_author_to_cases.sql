-- Migration to add author column to cases table
ALTER TABLE public.cases ADD COLUMN author TEXT;
