-- Add 'conference' and 'seminar' to class_type enum
-- This must be done in a separate transaction before using the new values

ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'conference';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'seminar';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'workshop';
