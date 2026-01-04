-- Migration: Remove additional redundant columns from doctors table
-- Columns: fixed_off_days, health_constraints, performance_score, max_*_leaves

-- Drop the columns
ALTER TABLE public.doctors DROP COLUMN fixed_off_days;
ALTER TABLE public.doctors DROP COLUMN health_constraints;
ALTER TABLE public.doctors DROP COLUMN performance_score;
ALTER TABLE public.doctors DROP COLUMN max_casual_leaves;
ALTER TABLE public.doctors DROP COLUMN max_medical_leaves;
ALTER TABLE public.doctors DROP COLUMN max_emergency_leaves;
ALTER TABLE public.doctors DROP COLUMN max_annual_leaves;

-- Comment
COMMENT ON TABLE public.doctors IS 'Doctors table - streamlined with essential fields only';
