-- Seed comprehensive mock data for doctor daily stats
-- Provides realistic data for Profile charts and statistics

-- Clear existing data
DELETE FROM doctor_daily_stats;
DELETE FROM academic_targets;

-- Insert academic targets for 2026
INSERT INTO academic_targets (doctor_id, year, conferences_target, classes_target, cds_target)
SELECT 
  id,
  2026,
  CASE WHEN seniority IN ('intern', 'resident') THEN 12 WHEN seniority = 'fellow' THEN 15 ELSE 20 END,
  CASE WHEN seniority IN ('intern', 'resident') THEN 30 WHEN seniority = 'fellow' THEN 35 ELSE 40 END,
  CASE WHEN seniority IN ('intern', 'resident') THEN 6 WHEN seniority = 'fellow' THEN 8 ELSE 10 END
FROM doctors
ON CONFLICT (doctor_id, year) DO UPDATE SET
  conferences_target = EXCLUDED.conferences_target,
  classes_target = EXCLUDED.classes_target,
  cds_target = EXCLUDED.cds_target;

-- Insert academic targets for 2025
INSERT INTO academic_targets (doctor_id, year, conferences_target, classes_target, cds_target)
SELECT 
  id,
  2025,
  CASE WHEN seniority IN ('intern', 'resident') THEN 12 WHEN seniority = 'fellow' THEN 15 ELSE 20 END,
  CASE WHEN seniority IN ('intern', 'resident') THEN 30 WHEN seniority = 'fellow' THEN 35 ELSE 40 END,
  CASE WHEN seniority IN ('intern', 'resident') THEN 6 WHEN seniority = 'fellow' THEN 8 ELSE 10 END
FROM doctors
ON CONFLICT (doctor_id, year) DO NOTHING;

-- Generate 6 months of daily stats data for all doctors
INSERT INTO doctor_daily_stats (doctor_id, date, duty_type, patients_seen, surgeries_performed, hours_worked)
SELECT 
  d.id AS doctor_id,
  ds.work_date AS date,
  duty_assignment.duty_type,
  -- Patients seen
  CASE duty_assignment.duty_type
    WHEN 'op' THEN 15 + floor(random() * 35)::int
    WHEN 'ot' THEN floor(random() * 5)::int
    WHEN 'night' THEN 5 + floor(random() * 18)::int
    WHEN 'camp' THEN 35 + floor(random() * 55)::int
    ELSE 0
  END AS patients_seen,
  -- Surgeries
  CASE duty_assignment.duty_type
    WHEN 'ot' THEN 
      CASE 
        WHEN d.seniority IN ('intern', 'resident') THEN 1 + floor(random() * 3)::int
        WHEN d.seniority = 'fellow' THEN 2 + floor(random() * 4)::int
        ELSE 3 + floor(random() * 6)::int
      END
    WHEN 'night' THEN floor(random() * 2)::int
    WHEN 'camp' THEN 5 + floor(random() * 15)::int
    ELSE 0
  END AS surgeries_performed,
  -- Hours
  CASE duty_assignment.duty_type
    WHEN 'op' THEN round((6 + random() * 3)::numeric, 1)
    WHEN 'ot' THEN round((5 + random() * 5)::numeric, 1)
    WHEN 'night' THEN round((10 + random() * 4)::numeric, 1)
    WHEN 'camp' THEN round((8 + random() * 4)::numeric, 1)
    ELSE 0
  END AS hours_worked
FROM doctors d
CROSS JOIN (
  SELECT generate_series(
    CURRENT_DATE - interval '180 days',
    CURRENT_DATE - interval '1 day',
    interval '1 day'
  )::date AS work_date
) ds
CROSS JOIN LATERAL (
  SELECT 
    CASE 
      WHEN random() < 0.12 THEN NULL -- 12% off days
      WHEN extract(dow from ds.work_date) = 0 AND random() < 0.5 THEN NULL -- Sundays 50% off
      WHEN random() < 0.40 THEN 'op'
      WHEN random() < 0.65 THEN 'ot'
      WHEN random() < 0.85 THEN 'night'
      ELSE 'camp'
    END AS duty_type
) duty_assignment
WHERE duty_assignment.duty_type IS NOT NULL
ON CONFLICT (doctor_id, date, duty_type) DO UPDATE SET
  patients_seen = EXCLUDED.patients_seen,
  surgeries_performed = EXCLUDED.surgeries_performed,
  hours_worked = EXCLUDED.hours_worked;
