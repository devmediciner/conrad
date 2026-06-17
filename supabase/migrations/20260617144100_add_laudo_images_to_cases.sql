-- Migration to add laudo_images column to cases table
ALTER TABLE public.cases ADD COLUMN laudo_images TEXT[] DEFAULT '{}';
