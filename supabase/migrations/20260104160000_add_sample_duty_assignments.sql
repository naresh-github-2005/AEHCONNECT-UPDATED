-- Add sample duty assignments to populate filters
-- This ensures all units and duty types have at least one assignment

-- First, let's insert some sample duty assignments for today and upcoming days
-- We'll use existing doctor IDs from the doctors table

-- Note: This migration will add sample data for all units mentioned in filters
-- Units: Unit 1, Unit 2, Unit 3, Unit 4, Free Unit, Cornea, Retina, Glaucoma, IOL, Uvea, Orbit Pediatric, Physician, Daycare, Block Room

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
WHERE d.specialty = 'cornea'
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
WHERE d.specialty = 'retina'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 3',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'glaucoma'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 4',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'pediatric'
LIMIT 1;

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
WHERE d.designation = 'fellow'
LIMIT 1;

-- Specialty-based OT duties
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Cornea',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'cornea'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Retina',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'retina'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Glaucoma',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'glaucoma'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'IOL OT',
  'IOL',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'cataract'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'ORBIT OT',
  'Uvea',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'oculoplasty'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Pediatrics OT',
  'Orbit Pediatric',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'pediatric'
LIMIT 1;

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
WHERE d.designation = 'consultant'
LIMIT 1;

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
WHERE d.designation = 'mo'
LIMIT 1;

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
WHERE d.designation = 'fellow'
LIMIT 1;

-- Add some assignments for the next 7 days to show in roster
-- Unit 1-4 for next week
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'OPD',
  'Unit ' || ((i % 4) + 1),
  '08:00',
  '14:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation IN ('pg', 'fellow', 'mo')
LIMIT 28;

-- Add specialty OT duties for next week
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'OT',
  CASE d.specialty
    WHEN 'cornea' THEN 'Cornea'
    WHEN 'retina' THEN 'Retina'
    WHEN 'glaucoma' THEN 'Glaucoma'
    WHEN 'cataract' THEN 'IOL'
    WHEN 'oculoplasty' THEN 'Uvea'
    WHEN 'pediatric' THEN 'Orbit Pediatric'
    ELSE 'OT-1'
  END,
  '09:00',
  '13:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.specialty IS NOT NULL
LIMIT 42;

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
WHERE d.designation = 'consultant'
LIMIT 7;

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
WHERE d.designation IN ('mo', 'fellow')
LIMIT 7;

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
WHERE d.designation IN ('fellow', 'mo')
LIMIT 7;
