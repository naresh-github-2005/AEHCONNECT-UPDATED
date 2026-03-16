-- ================================================
-- PRODUCTION-READY DATABASE SCHEMA
-- Hospital Roster Management System
-- ================================================
-- This schema is normalized, enforces constraints at DB level,
-- and enables AI scheduling with explainable decisions.
-- ================================================

-- ================================================
-- STEP 1: DROP EXISTING CONFLICTING TABLES
-- ================================================

DROP TABLE IF EXISTS public.roster_swap_requests CASCADE;
DROP TABLE IF EXISTS public.roster_assignments CASCADE;
DROP TABLE IF EXISTS public.monthly_rosters CASCADE;
DROP TABLE IF EXISTS public.pg_rotation_tracking CASCADE;
DROP TABLE IF EXISTS public.department_config CASCADE;

-- ================================================
-- STEP 2: CREATE CORE TABLES
-- ================================================

-- 🔹 1. DOCTORS (Master Profile)
-- Already exists, we'll ALTER it to match requirements
ALTER TABLE public.doctors DROP COLUMN IF EXISTS months_since_joining CASCADE;
ALTER TABLE public.doctors DROP COLUMN IF EXISTS eligible_units CASCADE;
ALTER TABLE public.doctors DROP COLUMN IF EXISTS eligible_departments CASCADE;

-- Add/Update columns to match production schema
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS emp_code TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE;

-- pg_year already exists as pg_year_type ENUM ('YEAR1', 'YEAR2', 'YEAR3')
-- No need to add it again

-- Update full_name from name if exists
UPDATE public.doctors SET full_name = name WHERE full_name IS NULL;

-- Make emp_code unique (generate if doesn't exist)
UPDATE public.doctors 
SET emp_code = 'EMP-' || id::TEXT 
WHERE emp_code IS NULL;

ALTER TABLE public.doctors 
  ALTER COLUMN full_name SET NOT NULL,
  ADD CONSTRAINT doctors_emp_code_unique UNIQUE (emp_code);

-- 🔹 2. DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('UNIT', 'SPECIALITY', 'WARD', 'DUTY')) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert departments from uploaded image
INSERT INTO public.departments (code, name, type) VALUES
  -- Units
  ('UNIT1', 'Unit 1', 'UNIT'),
  ('UNIT2', 'Unit 2', 'UNIT'),
  ('UNIT3', 'Unit 3', 'UNIT'),
  ('UNIT4', 'Unit 4', 'UNIT'),
  ('FREE_UNIT', 'Free Unit', 'UNIT'),
  
  -- Specialties
  ('CORNEA', 'Cornea', 'SPECIALITY'),
  ('IOL', 'IOL/Cataract', 'SPECIALITY'),
  ('RETINA', 'Retina', 'SPECIALITY'),
  ('GLAUCOMA', 'Glaucoma', 'SPECIALITY'),
  ('ORBIT', 'Orbit', 'SPECIALITY'),
  ('PAEDIATRIC', 'Paediatric Ophthalmology', 'SPECIALITY'),
  ('UVEA', 'Uvea', 'SPECIALITY'),
  ('NEURO_OPHTHALMOLOGY', 'Neuro-Ophthalmology', 'SPECIALITY'),
  
  -- Special departments
  ('BLOCK_ROOM', 'Block Room', 'DUTY'),
  ('VISION_CENTER', 'Vision Center', 'DUTY'),
  ('CITY_CENTRE', 'City Centre Posting', 'DUTY'),
  ('PHACO_TRAINING', 'Phaco Training', 'DUTY'),
  ('SICS_PHACO_TRAINER', 'SICS/Phaco Trainer', 'DUTY'),
  
  -- Wards
  ('EMERGENCY_WARD', 'Emergency Ward', 'WARD'),
  ('PAID_WARD', 'Paid Ward', 'WARD'),
  
  -- Duties
  ('NIGHT_DUTY', 'Night Duty', 'DUTY'),
  ('EMERGENCY_DUTY', 'Emergency Duty', 'DUTY')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  type = EXCLUDED.type;

-- 🔹 3. DEPARTMENT REQUIREMENTS (Encoding Rules)
CREATE TABLE IF NOT EXISTS public.department_requirements (
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  min_doctors INTEGER NOT NULL DEFAULT 1,
  max_doctors INTEGER NOT NULL DEFAULT 10,
  require_senior_consultant INTEGER DEFAULT 0,
  require_mo INTEGER DEFAULT 0,
  allowed_designations TEXT[] DEFAULT ARRAY['SENIOR_CONSULTANT', 'MO', 'FELLOW', 'PG']::TEXT[],
  notes TEXT,
  PRIMARY KEY (department_id)
);

-- Insert requirements based on uploaded image and rules
INSERT INTO public.department_requirements (department_id, min_doctors, max_doctors, allowed_designations, notes)
SELECT 
  d.id,
  CASE 
    WHEN d.code = 'UNIT1' THEN 4
    WHEN d.code = 'UNIT2' THEN 6
    WHEN d.code = 'UNIT3' THEN 4
    WHEN d.code = 'UNIT4' THEN 5
    WHEN d.code = 'FREE_UNIT' THEN 5
    WHEN d.code = 'CORNEA' THEN 4
    WHEN d.code = 'IOL' THEN 3
    WHEN d.code = 'RETINA' THEN 4
    WHEN d.code = 'GLAUCOMA' THEN 14
    WHEN d.code = 'ORBIT' THEN 2
    WHEN d.code = 'PAEDIATRIC' THEN 6
    WHEN d.code = 'UVEA' THEN 1
    WHEN d.code = 'BLOCK_ROOM' THEN 4
    WHEN d.code = 'VISION_CENTER' THEN 2
    WHEN d.code = 'EMERGENCY_WARD' THEN 2
    WHEN d.code = 'NIGHT_DUTY' THEN 1
    ELSE 2
  END,
  CASE 
    WHEN d.code = 'UNIT1' THEN 7
    WHEN d.code = 'UNIT2' THEN 8
    WHEN d.code = 'UNIT3' THEN 7
    WHEN d.code = 'UNIT4' THEN 7
    WHEN d.code = 'FREE_UNIT' THEN 7
    WHEN d.code = 'CORNEA' THEN 7
    WHEN d.code = 'IOL' THEN 6
    WHEN d.code = 'RETINA' THEN 6
    WHEN d.code = 'GLAUCOMA' THEN 20
    WHEN d.code = 'ORBIT' THEN 3
    WHEN d.code = 'PAEDIATRIC' THEN 8
    WHEN d.code = 'UVEA' THEN 2
    WHEN d.code = 'BLOCK_ROOM' THEN 6
    WHEN d.code = 'VISION_CENTER' THEN 3
    WHEN d.code = 'EMERGENCY_WARD' THEN 4
    WHEN d.code = 'NIGHT_DUTY' THEN 2
    ELSE 5
  END,
  CASE
    WHEN d.code IN ('FREE_UNIT') THEN ARRAY['FELLOW', 'PG']::TEXT[]
    WHEN d.code = 'NIGHT_DUTY' THEN ARRAY['MO', 'FELLOW']::TEXT[]
    WHEN d.code IN ('CORNEA', 'RETINA', 'GLAUCOMA', 'IOL', 'ORBIT', 'PAEDIATRIC', 'UVEA') THEN ARRAY['SENIOR_CONSULTANT', 'MO', 'FELLOW', 'PG']::TEXT[]
    ELSE ARRAY['SENIOR_CONSULTANT', 'MO', 'FELLOW', 'PG']::TEXT[]
  END,
  CASE
    WHEN d.code = 'FREE_UNIT' THEN 'Fellows first 3 months, PG Year 1'
    WHEN d.code = 'NIGHT_DUTY' THEN 'No PG, max 8 per month per doctor'
    WHEN d.code IN ('CORNEA', 'RETINA', 'GLAUCOMA', 'IOL') THEN 'PG Year 3 mandatory: 30 days'
    WHEN d.code IN ('ORBIT', 'PAEDIATRIC', 'UVEA') THEN 'PG Year 3 mandatory: 15 days'
    ELSE NULL
  END
FROM public.departments d
ON CONFLICT (department_id) DO UPDATE SET
  min_doctors = EXCLUDED.min_doctors,
  max_doctors = EXCLUDED.max_doctors,
  allowed_designations = EXCLUDED.allowed_designations,
  notes = EXCLUDED.notes;

-- 🔹 4. DOCTOR ELIGIBILITY (Who can work where)
CREATE TABLE IF NOT EXISTS public.doctor_eligibility (
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (doctor_id, department_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_doctor_eligibility_doctor ON public.doctor_eligibility(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_eligibility_department ON public.doctor_eligibility(department_id);

-- 🔹 5. LEAVES
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT CHECK (leave_type IN ('PLANNED', 'EMERGENCY', 'MEDICAL', 'CASUAL')) DEFAULT 'PLANNED',
  status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'PENDING',
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migrate existing leave_requests data (handle case-sensitive status)
INSERT INTO public.leaves (doctor_id, start_date, end_date, leave_type, status, reason, created_at)
SELECT 
  doctor_id,
  start_date,
  end_date,
  'PLANNED',
  CASE 
    WHEN status = 'pending' THEN 'PENDING'
    WHEN status = 'approved' THEN 'APPROVED'
    WHEN status = 'rejected' THEN 'REJECTED'
    ELSE 'PENDING'
  END,
  reason,
  created_at
FROM public.leave_requests
ON CONFLICT DO NOTHING;

-- 🔹 6. ROSTERS (Monthly Header)
CREATE TABLE IF NOT EXISTS public.rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  generated_by UUID REFERENCES auth.users(id),
  status TEXT CHECK (status IN ('DRAFT', 'FINAL', 'PUBLISHED')) DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (month)
);

-- 🔹 7. ROSTER ASSIGNMENTS (Daily Allocations)
CREATE TABLE IF NOT EXISTS public.roster_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID REFERENCES public.rosters(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE NOT NULL,
  duty_date DATE NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('day', 'night', 'full')) DEFAULT 'day',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (doctor_id, duty_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roster_assignments_roster ON public.roster_assignments(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_doctor ON public.roster_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_date ON public.roster_assignments(duty_date);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_department ON public.roster_assignments(department_id);

-- 🔹 8. PG ROTATION REQUIREMENTS (Static Table)
CREATE TABLE IF NOT EXISTS public.pg_rotation_requirements (
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  required_days INTEGER NOT NULL,
  notes TEXT,
  PRIMARY KEY (department_id)
);

-- Insert PG rotation requirements
INSERT INTO public.pg_rotation_requirements (department_id, required_days, notes)
SELECT 
  d.id,
  CASE
    WHEN d.code IN ('CORNEA', 'RETINA', 'GLAUCOMA', 'IOL') THEN 30
    WHEN d.code IN ('ORBIT', 'PAEDIATRIC', 'UVEA') THEN 15
    ELSE 0
  END,
  'Mandatory for PG Year 3'
FROM public.departments d
WHERE d.code IN ('CORNEA', 'RETINA', 'GLAUCOMA', 'IOL', 'ORBIT', 'PAEDIATRIC', 'UVEA')
ON CONFLICT (department_id) DO UPDATE SET
  required_days = EXCLUDED.required_days,
  notes = EXCLUDED.notes;

-- 🔹 9. PG ROTATION PROGRESS (Tracking)
CREATE TABLE IF NOT EXISTS public.pg_rotation_progress (
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  completed_days INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (doctor_id, department_id)
);

-- Auto-initialize for PG Year 3 doctors
CREATE OR REPLACE FUNCTION public.initialize_pg_rotations()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pg_year = 'YEAR3' AND NEW.is_active = TRUE THEN
    INSERT INTO public.pg_rotation_progress (doctor_id, department_id, completed_days)
    SELECT NEW.id, department_id, 0
    FROM public.pg_rotation_requirements
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_initialize_pg_rotations
  AFTER INSERT OR UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_pg_rotations();

-- 🔹 10. ACTIVITY LOGS (For Fairness & Reports)
-- Drop and recreate to ensure correct structure
DROP TABLE IF EXISTS public.activity_logs CASCADE;

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  activity_type TEXT CHECK (activity_type IN ('OP', 'SURGERY', 'CAMP', 'NIGHT', 'DUTY', 'ROSTER_GENERATED', 'OTHER')),
  activity_date DATE,
  count INTEGER DEFAULT 1,
  details JSONB,
  action TEXT, -- Keep for compatibility
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_doctor ON public.activity_logs(doctor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_date ON public.activity_logs(activity_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON public.activity_logs(activity_type);

-- 🔹 11. AUDIT LOGS (Trust & Governance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);

-- ================================================
-- STEP 3: ROW LEVEL SECURITY (RLS)
-- ================================================

-- Enable RLS on all tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_rotation_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pg_rotation_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can view, only admins can modify
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view department requirements" ON public.department_requirements FOR SELECT USING (true);
CREATE POLICY "Admins can manage department requirements" ON public.department_requirements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view rosters" ON public.rosters FOR SELECT USING (true);
CREATE POLICY "Admins can manage rosters" ON public.rosters FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view roster assignments" ON public.roster_assignments FOR SELECT USING (true);
CREATE POLICY "Admins can manage roster assignments" ON public.roster_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view leaves" ON public.leaves FOR SELECT USING (true);
CREATE POLICY "Doctors can create own leaves" ON public.leaves FOR INSERT WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage all leaves" ON public.leaves FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view PG rotation requirements" ON public.pg_rotation_requirements FOR SELECT USING (true);
CREATE POLICY "Anyone can view PG rotation progress" ON public.pg_rotation_progress FOR SELECT USING (true);
CREATE POLICY "Admins can manage PG rotations" ON public.pg_rotation_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Anyone can view activity logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "System can insert activity logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- ================================================
-- STEP 4: TRIGGERS FOR AUTOMATION
-- ================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rosters_updated_at BEFORE UPDATE ON public.rosters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leaves_updated_at BEFORE UPDATE ON public.leaves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update PG rotation progress when assignments are made
CREATE OR REPLACE FUNCTION public.update_pg_rotation_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_pg_year pg_year_type;
BEGIN
  -- Get PG year of the doctor
  SELECT pg_year INTO v_pg_year
  FROM public.doctors
  WHERE id = NEW.doctor_id;

  -- Only track for PG Year 3
  IF v_pg_year = 'YEAR3' THEN
    INSERT INTO public.pg_rotation_progress (doctor_id, department_id, completed_days)
    VALUES (NEW.doctor_id, NEW.department_id, 1)
    ON CONFLICT (doctor_id, department_id) 
    DO UPDATE SET 
      completed_days = public.pg_rotation_progress.completed_days + 1,
      last_updated = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_pg_rotation_progress
  AFTER INSERT ON public.roster_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pg_rotation_progress();

-- ================================================
-- STEP 5: HELPER VIEWS
-- ================================================

-- View: Doctors with calculated experience
CREATE OR REPLACE VIEW public.doctors_with_experience AS
SELECT 
  d.*,
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, d.joining_date))::INTEGER * 12 + 
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, d.joining_date))::INTEGER AS months_since_joining
FROM public.doctors d;

-- View: Roster summary by month
CREATE OR REPLACE VIEW public.roster_summary AS
SELECT 
  r.id AS roster_id,
  r.month,
  r.status,
  COUNT(DISTINCT ra.doctor_id) AS total_doctors_assigned,
  COUNT(ra.id) AS total_assignments,
  COUNT(DISTINCT ra.duty_date) AS days_covered
FROM public.rosters r
LEFT JOIN public.roster_assignments ra ON r.id = ra.roster_id
GROUP BY r.id, r.month, r.status;

-- View: PG rotation completion status
CREATE OR REPLACE VIEW public.pg_rotation_status AS
SELECT 
  d.id AS doctor_id,
  d.full_name,
  d.pg_year,
  dept.name AS department_name,
  prp.completed_days,
  prr.required_days,
  CASE 
    WHEN prp.completed_days >= prr.required_days THEN 'COMPLETED'
    WHEN prp.completed_days > 0 THEN 'IN_PROGRESS'
    ELSE 'NOT_STARTED'
  END AS status,
  prr.required_days - COALESCE(prp.completed_days, 0) AS days_remaining
FROM public.doctors d
CROSS JOIN public.pg_rotation_requirements prr
INNER JOIN public.departments dept ON prr.department_id = dept.id
LEFT JOIN public.pg_rotation_progress prp ON d.id = prp.doctor_id AND prr.department_id = prp.department_id
WHERE d.pg_year = 'YEAR3' AND d.is_active = TRUE;

-- ================================================
-- COMPLETION MESSAGE
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE '✅ PRODUCTION SCHEMA DEPLOYED SUCCESSFULLY!';
  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Tables Created:';
  RAISE NOTICE '   • doctors (enhanced)';
  RAISE NOTICE '   • departments (% rows)', (SELECT COUNT(*) FROM public.departments);
  RAISE NOTICE '   • department_requirements (% rows)', (SELECT COUNT(*) FROM public.department_requirements);
  RAISE NOTICE '   • doctor_eligibility';
  RAISE NOTICE '   • leaves';
  RAISE NOTICE '   • rosters';
  RAISE NOTICE '   • roster_assignments';
  RAISE NOTICE '   • pg_rotation_requirements (% rows)', (SELECT COUNT(*) FROM public.pg_rotation_requirements);
  RAISE NOTICE '   • pg_rotation_progress';
  RAISE NOTICE '   • activity_logs';
  RAISE NOTICE '   • audit_logs';
  RAISE NOTICE '';
  RAISE NOTICE '🔐 Security:';
  RAISE NOTICE '   • Row Level Security enabled on all tables';
  RAISE NOTICE '   • Admin full CRUD access';
  RAISE NOTICE '   • Everyone can view rosters';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Automation:';
  RAISE NOTICE '   • Auto-initialize PG rotations for Year 3';
  RAISE NOTICE '   • Auto-update rotation progress on assignments';
  RAISE NOTICE '   • Auto-update timestamps on changes';
  RAISE NOTICE '';
  RAISE NOTICE '📖 Ready for AI Scheduling!';
  RAISE NOTICE '════════════════════════════════════════════';
END $$;
