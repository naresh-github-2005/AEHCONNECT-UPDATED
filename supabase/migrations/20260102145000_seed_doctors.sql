-- Seed doctors data for roster generation
-- This creates sample doctors based on mock data structure

-- Insert doctors
INSERT INTO public.doctors (
  name, phone, department, seniority, specialty, designation,
  performance_score, unit, can_do_opd, can_do_ot, can_do_ward,
  can_do_camp, can_do_night, max_night_duties_per_month, is_active
) VALUES
  ('Dr. Anisha Menon', '+91 90000-00001', 'Ophthalmology', 'consultant', 'cataract', 'mo', 88, 'Unit 1', true, true, true, true, false, 0, true),
  ('Dr. Neethu Krishnan', '+91 90000-00002', 'Ophthalmology', 'fellow', 'glaucoma', 'fellow', 82, 'Unit 2', true, true, true, true, true, 8, true),
  ('Dr. Akhil Sharma', '+91 90000-00003', 'Ophthalmology', 'resident', 'general', 'pg', 75, 'Unit 1', true, false, true, true, true, 10, true),
  ('Dr. Priya Nair', '+91 90000-00004', 'Ophthalmology', 'fellow', 'retina', 'fellow', 90, 'Unit 3', true, true, true, true, true, 8, true),
  ('Dr. Rajesh Kumar', '+91 90000-00005', 'Ophthalmology', 'senior_consultant', 'cornea', 'consultant', 95, 'Unit 2', true, true, true, false, false, 0, true),
  ('Dr. Lakshmi Iyer', '+91 90000-00006', 'Ophthalmology', 'consultant', 'pediatric', 'consultant', 85, 'Unit 4', true, true, true, true, false, 0, true),
  ('Dr. Suresh Reddy', '+91 90000-00007', 'Ophthalmology', 'resident', 'general', 'pg', 70, 'Unit 1', true, false, true, true, true, 10, true),
  ('Dr. Meera Gupta', '+91 90000-00008', 'Ophthalmology', 'fellow', 'cataract', 'fellow', 87, 'Unit 3', true, true, true, true, true, 8, true),
  ('Dr. Vikram Singh', '+91 90000-00009', 'Ophthalmology', 'resident', 'general', 'pg', 72, 'Unit 2', true, false, true, true, true, 10, true),
  ('Dr. Sneha Pillai', '+91 90000-00010', 'Ophthalmology', 'consultant', 'oculoplasty', 'consultant', 92, 'Unit 4', true, true, true, true, false, 0, true),
  ('Dr. Arjun Menon', '+91 90000-00011', 'Ophthalmology', 'fellow', 'neuro', 'fellow', 80, 'Unit 1', true, true, true, true, true, 8, true),
  ('Dr. Divya Krishnan', '+91 90000-00012', 'Ophthalmology', 'intern', 'general', 'pg', 65, 'Unit 2', true, false, true, true, true, 12, true),
  ('Dr. Karthik Raman', '+91 90000-00013', 'Ophthalmology', 'resident', 'general', 'pg', 73, 'Unit 3', true, false, true, true, true, 10, true),
  ('Dr. Anjali Nair', '+91 90000-00014', 'Ophthalmology', 'senior_consultant', 'retina', 'consultant', 96, 'Unit 4', true, true, true, false, false, 0, true),
  ('Dr. Mohammed Rafi', '+91 90000-00015', 'Ophthalmology', 'fellow', 'glaucoma', 'fellow', 84, 'Unit 1', true, true, true, true, true, 8, true);
