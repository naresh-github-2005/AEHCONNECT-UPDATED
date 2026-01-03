-- Add admin user to doctors table
-- Admin user_id: cf0d7449-25ec-4aea-9a2b-ab9ed1a9ff0d

-- First, check if admin already exists and delete if present
DELETE FROM doctors WHERE user_id = 'cf0d7449-25ec-4aea-9a2b-ab9ed1a9ff0d';

-- Insert admin user
INSERT INTO doctors (
  user_id,
  name,
  phone,
  department,
  is_active,
  seniority,
  specialty,
  max_night_duties_per_month,
  max_hours_per_week,
  fixed_off_days,
  can_do_opd,
  can_do_ot,
  can_do_ward,
  can_do_camp,
  can_do_night,
  designation,
  performance_score,
  eligible_duties,
  unit,
  max_casual_leaves,
  max_medical_leaves,
  max_emergency_leaves,
  max_annual_leaves,
  total_annual_leave_limit,
  monthly_permission_hours,
  festival_leaves_taken
) VALUES (
  'cf0d7449-25ec-4aea-9a2b-ab9ed1a9ff0d',
  'Administrator',
  '+91 90000-00000',
  'Ophthalmology',
  true,
  'senior_consultant',
  'general',
  0,
  40,
  ARRAY[]::text[],
  true,
  true,
  true,
  true,
  false,
  'consultant',
  100,
  ARRAY['All Duties']::text[],
  'Admin',
  12,
  12,
  6,
  30,
  25,
  '3.0',
  0
);
