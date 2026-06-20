-- Migration to add is_case_of_the_week column to cases table
ALTER TABLE public.cases ADD COLUMN is_case_of_the_week BOOLEAN DEFAULT false;
