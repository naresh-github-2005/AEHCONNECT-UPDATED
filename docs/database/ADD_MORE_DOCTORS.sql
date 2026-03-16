-- ADD MORE DOCTORS FOR ROSTER SCHEDULING
-- Run this in Supabase Dashboard: https://supabase.com/dashboard → Your Project → SQL Editor

-- Add 14 more doctors (total will be ~30 doctors)
-- This ensures enough coverage for 16 daily slots with rotation

INSERT INTO doctors (id, name, phone, department, designation, specialty, is_active, pg_year, fellow_year, experience_years, joining_date)
VALUES 
  -- More PG Residents (5 more)
  (gen_random_uuid(), 'Dr. Ravi Shankar', '+91 90000-00100', 'Ophthalmology', 'pg', 'general', true, 1, NULL, 1, '2025-07-01'),
  (gen_random_uuid(), 'Dr. Pooja Sharma', '+91 90000-00101', 'Ophthalmology', 'pg', 'cornea', true, 1, NULL, 1, '2025-07-01'),
  (gen_random_uuid(), 'Dr. Arun Kumar', '+91 90000-00102', 'Ophthalmology', 'pg', 'retina', true, 2, NULL, 2, '2024-07-01'),
  (gen_random_uuid(), 'Dr. Deepa Menon', '+91 90000-00103', 'Ophthalmology', 'pg', 'glaucoma', true, 2, NULL, 2, '2024-07-01'),
  (gen_random_uuid(), 'Dr. Sanjay Nair', '+91 90000-00104', 'Ophthalmology', 'pg', 'cataract', true, 3, NULL, 3, '2023-07-01'),

  -- More Fellows (5 more)
  (gen_random_uuid(), 'Dr. Kavitha Iyer', '+91 90000-00105', 'Ophthalmology', 'fellow', 'retina', true, NULL, 1, 4, '2025-01-01'),
  (gen_random_uuid(), 'Dr. Rahul Verma', '+91 90000-00106', 'Ophthalmology', 'fellow', 'cornea', true, NULL, 1, 4, '2025-01-01'),
  (gen_random_uuid(), 'Dr. Priyanka Das', '+91 90000-00107', 'Ophthalmology', 'fellow', 'glaucoma', true, NULL, 2, 5, '2024-01-01'),
  (gen_random_uuid(), 'Dr. Sunil Reddy', '+91 90000-00108', 'Ophthalmology', 'fellow', 'cataract', true, NULL, 2, 5, '2024-01-01'),
  (gen_random_uuid(), 'Dr. Anita Pillai', '+91 90000-00109', 'Ophthalmology', 'fellow', 'oculoplasty', true, NULL, 1, 4, '2025-01-01'),

  -- More MOs (2 more)
  (gen_random_uuid(), 'Dr. Venkat Rao', '+91 90000-00110', 'Ophthalmology', 'mo', 'general', true, NULL, NULL, 3, '2023-06-01'),
  (gen_random_uuid(), 'Dr. Gayathri Nair', '+91 90000-00111', 'Ophthalmology', 'mo', 'pediatric', true, NULL, NULL, 4, '2022-06-01'),

  -- More Consultants (2 more)  
  (gen_random_uuid(), 'Dr. Mahesh Kumar', '+91 90000-00112', 'Ophthalmology', 'consultant', 'retina', true, NULL, NULL, 12, '2014-01-01'),
  (gen_random_uuid(), 'Dr. Sunitha Rao', '+91 90000-00113', 'Ophthalmology', 'consultant', 'neuro', true, NULL, NULL, 10, '2016-01-01');

-- Verify total doctors count
SELECT 
  COUNT(*) as total_doctors,
  COUNT(*) FILTER (WHERE designation = 'pg') as pg_count,
  COUNT(*) FILTER (WHERE designation = 'fellow') as fellow_count,
  COUNT(*) FILTER (WHERE designation = 'mo') as mo_count,
  COUNT(*) FILTER (WHERE designation = 'consultant') as consultant_count
FROM doctors
WHERE is_active = true;
