-- Add designation enum type
CREATE TYPE public.designation_level AS ENUM ('pg', 'fellow', 'mo', 'consultant');

-- Add new duty types to existing enum
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Cataract OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Retina OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Glaucoma OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Cornea OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Today Doctor';

-- Add new columns to doctors table
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS designation designation_level DEFAULT 'pg',
ADD COLUMN IF NOT EXISTS performance_score integer DEFAULT 70 CHECK (performance_score >= 0 AND performance_score <= 100),
ADD COLUMN IF NOT EXISTS eligible_duties text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Unit 1';

-- Update existing doctors with realistic data (cast to enum properly)
UPDATE public.doctors SET 
  designation = CASE 
    WHEN seniority = 'senior_consultant' THEN 'consultant'::designation_level
    WHEN seniority = 'consultant' THEN 'mo'::designation_level
    WHEN seniority = 'fellow' THEN 'fellow'::designation_level
    ELSE 'pg'::designation_level
  END,
  performance_score = CASE 
    WHEN seniority IN ('senior_consultant', 'consultant') THEN 85 + floor(random() * 10)::integer
    WHEN seniority = 'fellow' THEN 75 + floor(random() * 15)::integer
    ELSE 60 + floor(random() * 20)::integer
  END;

-- Set eligible duties based on designation
UPDATE public.doctors SET eligible_duties = ARRAY['Cataract OT', 'Retina OT', 'Glaucoma OT', 'OPD', 'Today Doctor']
WHERE designation IN ('consultant', 'mo');

UPDATE public.doctors SET eligible_duties = ARRAY['Cataract OT', 'Glaucoma OT', 'OPD', 'Night Duty']
WHERE designation = 'fellow';

UPDATE public.doctors SET eligible_duties = ARRAY['OPD', 'Ward', 'Night Duty']
WHERE designation = 'pg';