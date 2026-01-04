-- Migration: Remove can_do_* columns as data is derived from eligible_duties
-- These boolean columns (can_do_opd, can_do_ot, can_do_ward, can_do_camp, can_do_night)
-- are redundant since duty eligibility is tracked in the eligible_duties array

-- First, drop dependent view
DROP VIEW IF EXISTS public.daily_doctor_availability CASCADE;

-- Drop the redundant columns from doctors table
ALTER TABLE public.doctors DROP COLUMN can_do_opd;
ALTER TABLE public.doctors DROP COLUMN can_do_ot;
ALTER TABLE public.doctors DROP COLUMN can_do_ward;
ALTER TABLE public.doctors DROP COLUMN can_do_camp;
ALTER TABLE public.doctors DROP COLUMN can_do_night;

-- Comment explaining the change
COMMENT ON TABLE public.doctors IS 'Doctors table - uses eligible_duties array for duty type eligibility instead of individual boolean columns';
