-- SQL Script to Add Sample Duty Assignments for All Units
-- Run this in Supabase SQL Editor to populate duty assignments

-- This will create sample duties for:
-- Unit 1, Unit 2, Unit 3, Unit 4, Free Unit, Cornea, Retina, Glaucoma, 
-- IOL, Uvea, Orbit Pediatric, Physician, Daycare, Block Room

-- First, check if we have doctors
DO $$
DECLARE
  doctor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO doctor_count FROM public.doctors;
  
  IF doctor_count = 0 THEN
    RAISE EXCEPTION 'No doctors found in the database. Please add doctors first.';
  END IF;
  
  RAISE NOTICE 'Found % doctors in the database', doctor_count;
END $$;

-- Clear any existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM public.duty_assignments WHERE duty_date >= CURRENT_DATE;

-- Insert assignments for Unit 1, Unit 2, Unit 3, Unit 4
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 1',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'cornea' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 2',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'retina' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 3',
  '09:00',
  '15:00'
FROM public.doctors d
WHERE d.specialty = 'glaucoma' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 4',
  '09:00',
  '15:00'
FROM public.doctors d
WHERE d.specialty = 'pediatric' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Free Unit
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Free Unit',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.designation = 'fellow' OR d.designation IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Specialty-based OT duties - Cornea
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Cornea',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'cornea' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Retina
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Retina',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'retina' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Glaucoma
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Glaucoma',
  '10:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'glaucoma' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- IOL
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'IOL OT',
  'IOL',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'cataract' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Uvea
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'ORBIT OT',
  'Uvea',
  '10:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'oculoplasty' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Orbit Pediatric
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Pediatrics OT',
  'Orbit Pediatric',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'pediatric' OR d.specialty IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Physician duty
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Physician',
  'Physician',
  '08:00',
  '17:00'
FROM public.doctors d
WHERE d.designation = 'consultant' OR d.designation IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Daycare duty
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Daycare',
  'Daycare',
  '08:00',
  '16:00'
FROM public.doctors d
WHERE d.designation = 'mo' OR d.designation IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Block Room duty
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Block Room',
  'Block Room',
  '07:00',
  '15:00'
FROM public.doctors d
WHERE d.designation = 'fellow' OR d.designation IS NULL
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add some assignments for the next 7 days to show variety in roster
-- This helps test the filter functionality

-- Unit 1-4 for next week (using different doctors each day)
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'OPD',
  'Unit ' || ((i % 4) + 1)::text,
  '08:00',
  '14:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation IN ('pg', 'fellow', 'mo') OR d.designation IS NULL
LIMIT 28
ON CONFLICT DO NOTHING;

-- Add specialty OT duties for next week
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'OT',
  CASE 
    WHEN d.specialty = 'cornea' THEN 'Cornea'
    WHEN d.specialty = 'retina' THEN 'Retina'
    WHEN d.specialty = 'glaucoma' THEN 'Glaucoma'
    WHEN d.specialty = 'cataract' THEN 'IOL'
    WHEN d.specialty = 'oculoplasty' THEN 'Uvea'
    WHEN d.specialty = 'pediatric' THEN 'Orbit Pediatric'
    ELSE 'Cornea'
  END,
  '09:00',
  '13:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.id IS NOT NULL
LIMIT 42
ON CONFLICT DO NOTHING;

-- Add Physician, Daycare, Block Room for the week
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'Physician',
  'Physician',
  '08:00',
  '17:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation = 'consultant' OR d.designation IS NULL
LIMIT 7
ON CONFLICT DO NOTHING;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'Daycare',
  'Daycare',
  '08:00',
  '16:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation IN ('mo', 'fellow') OR d.designation IS NULL
LIMIT 7
ON CONFLICT DO NOTHING;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'Block Room',
  'Block Room',
  '07:00',
  '15:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation IN ('fellow', 'mo') OR d.designation IS NULL
LIMIT 7
ON CONFLICT DO NOTHING;

-- Display summary of what was created
SELECT 
  unit,
  duty_type,
  COUNT(*) as assignment_count,
  MIN(duty_date) as first_date,
  MAX(duty_date) as last_date
FROM public.duty_assignments
WHERE duty_date >= CURRENT_DATE
GROUP BY unit, duty_type
ORDER BY unit, duty_type;
