-- Migration to add image_source column to cases table
ALTER TABLE public.cases ADD COLUMN image_source TEXT;
