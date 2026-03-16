-- ================================================
-- QUICK START: Add Monthly Roster Tables to Existing Database
-- Execute this AFTER running COMBINED_MIGRATIONS.sql
-- ================================================

-- This file adds the monthly roster system to your existing database
-- without recreating existing tables.

-- ================================================
-- STEP 1: ADD NEW ENUMS
-- ================================================

-- Create designation enum
DO $$ BEGIN
    CREATE TYPE public.designation_type AS ENUM (
      'SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG', 'INTERN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create specialization enum
DO $$ BEGIN
    CREATE TYPE public.specialization_type AS ENUM (
      'GENERAL', 'CORNEA', 'RETINA', 'GLAUCOMA', 'IOL', 
      'PAEDIATRIC', 'ORBIT', 'UVEA', 'NEURO_OPHTHALMOLOGY',
      'CATARACT', 'OCULOPLASTY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create PG year enum
DO $$ BEGIN
    CREATE TYPE public.pg_year_type AS ENUM ('YEAR1', 'YEAR2', 'YEAR3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- STEP 2: ENHANCE DOCTORS TABLE
-- ================================================

-- Add new columns (safe to run multiple times)
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS designation designation_type DEFAULT 'MO',
  ADD COLUMN IF NOT EXISTS specialization_type specialization_type DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS pg_year pg_year_type,
  ADD COLUMN IF NOT EXISTS eligible_units TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS eligible_departments TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add months_since_joining as a regular column (cannot be GENERATED with CURRENT_DATE)
-- We'll use a function to calculate it dynamically instead
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS months_since_joining INTEGER DEFAULT 0;

-- Create a function to calculate months since joining
CREATE OR REPLACE FUNCTION public.calculate_months_since_joining(p_joining_date DATE)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN p_joining_date IS NULL THEN 0
    ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_joining_date))::INTEGER * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, p_joining_date))::INTEGER
  END;
$$;

-- Create a view that shows doctors with calculated months_since_joining
CREATE OR REPLACE VIEW public.doctors_with_months AS
SELECT 
  d.*,
  public.calculate_months_since_joining(d.joining_date) as calculated_months_since_joining
FROM public.doctors d;

-- Update months_since_joining column for existing doctors (one-time update)
UPDATE public.doctors 
SET months_since_joining = public.calculate_months_since_joining(joining_date)
WHERE joining_date IS NOT NULL;

-- Create trigger to auto-update months_since_joining when joining_date changes
CREATE OR REPLACE FUNCTION public.update_months_since_joining()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.months_since_joining := public.calculate_months_since_joining(NEW.joining_date);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_months_since_joining ON public.doctors;
CREATE TRIGGER trg_update_months_since_joining
  BEFORE INSERT OR UPDATE OF joining_date ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_months_since_joining();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_doctors_designation ON public.doctors(designation);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization_type);
CREATE INDEX IF NOT EXISTS idx_doctors_pg_year ON public.doctors(pg_year);

-- ================================================
-- STEP 3: CREATE DEPARTMENT CONFIGURATION
-- ================================================

CREATE TABLE IF NOT EXISTS public.department_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code TEXT UNIQUE NOT NULL,
  department_name TEXT NOT NULL,
  department_type TEXT NOT NULL CHECK (department_type IN ('UNIT', 'SPECIALTY', 'WARD', 'SPECIAL')),
  min_doctors INTEGER NOT NULL DEFAULT 1,
  max_doctors INTEGER NOT NULL DEFAULT 10,
  require_senior_consultant INTEGER DEFAULT 0,
  require_mo INTEGER DEFAULT 0,
  allowed_designations TEXT[] DEFAULT ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG']::TEXT[],
  specialization_required specialization_type,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert configurations (use ON CONFLICT to avoid duplicates)
INSERT INTO public.department_config (
  department_code, department_name, department_type, min_doctors, max_doctors, notes
) VALUES
  ('UNIT1', 'Unit 1', 'UNIT', 4, 6, 'General unit'),
  ('UNIT2', 'Unit 2', 'UNIT', 4, 6, 'General unit'),
  ('UNIT3', 'Unit 3', 'UNIT', 4, 6, 'General unit'),
  ('UNIT4', 'Unit 4', 'UNIT', 4, 6, 'General unit'),
  ('FREE_UNIT', 'Free Unit', 'UNIT', 4, 6, 'Fellows first 3 months, PG Y1'),
  ('CORNEA', 'Cornea', 'SPECIALTY', 6, 10, 'PG Y3 mandatory: 30 days'),
  ('RETINA', 'Retina', 'SPECIALTY', 6, 20, 'PG Y3 mandatory: 30 days'),
  ('GLAUCOMA', 'Glaucoma', 'SPECIALTY', 6, 15, 'PG Y3 mandatory: 30 days'),
  ('IOL', 'IOL/Cataract', 'SPECIALTY', 6, 12, 'PG Y3 mandatory: 30 days'),
  ('PAEDIATRIC', 'Paediatric', 'SPECIALTY', 5, 7, 'PG Y3 mandatory: 15 days'),
  ('ORBIT', 'Orbit', 'SPECIALTY', 3, 4, 'PG Y3 mandatory: 15 days'),
  ('UVEA', 'Uvea', 'SPECIALTY', 1, 2, 'PG Y3 mandatory: 15 days'),
  ('PHYSICIAN', 'Physician', 'SPECIALTY', 1, 2, 'PG Year 1'),
  ('NEURO_OPHTHALMOLOGY', 'Neuro-Ophthalmology', 'SPECIALTY', 2, 4, 'Specialized'),
  ('DAYCARE', 'Daycare', 'SPECIAL', 1, 3, 'PG Year 1'),
  ('BLOCK_ROOM', 'Block Room', 'SPECIAL', 4, 5, 'MO & Fellows only'),
  ('EMERGENCY_WARD', 'Emergency Ward', 'WARD', 1, 3, '1 Senior + 1 MO required'),
  ('FREE_WARD', 'Free Ward', 'WARD', 1, 2, '1 MO required'),
  ('PAID_WARD', 'Paid Ward', 'WARD', 2, 3, '1 Senior + 1 MO required'),
  ('NIGHT_DUTY', 'Night Duty', 'SPECIAL', 1, 2, 'Eligible list only')
ON CONFLICT (department_code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.department_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view department config" ON public.department_config;
DROP POLICY IF EXISTS "Admins can manage department config" ON public.department_config;

-- Create policies
CREATE POLICY "Anyone can view department config" 
  ON public.department_config FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage department config" 
  ON public.department_config FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 4: CREATE MONTHLY ROSTERS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.monthly_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  total_days INTEGER NOT NULL CHECK (total_days >= 28 AND total_days <= 31),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'finalized', 'archived')),
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,
  notes TEXT,
  constraints_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_rosters_month_year ON public.monthly_rosters(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_rosters_status ON public.monthly_rosters(status);

ALTER TABLE public.monthly_rosters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view rosters" ON public.monthly_rosters;
DROP POLICY IF EXISTS "Admins can manage rosters" ON public.monthly_rosters;

CREATE POLICY "Anyone can view rosters" 
  ON public.monthly_rosters FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage rosters" 
  ON public.monthly_rosters FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 5: CREATE ROSTER ASSIGNMENTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.roster_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID REFERENCES public.monthly_rosters(id) ON DELETE CASCADE NOT NULL,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  duty_date DATE NOT NULL,
  department_code TEXT REFERENCES public.department_config(department_code) NOT NULL,
  shift_type TEXT DEFAULT 'day' CHECK (shift_type IN ('day', 'night', 'full')),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled', 'swapped')),
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_assignments_roster ON public.roster_assignments(roster_id);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_doctor ON public.roster_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_date ON public.roster_assignments(duty_date);
CREATE INDEX IF NOT EXISTS idx_roster_assignments_department ON public.roster_assignments(department_code);

-- Unique constraint
DROP INDEX IF EXISTS idx_roster_unique_doctor_date;
CREATE UNIQUE INDEX idx_roster_unique_doctor_date 
  ON public.roster_assignments(doctor_id, duty_date) 
  WHERE status != 'cancelled';

ALTER TABLE public.roster_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view roster assignments" ON public.roster_assignments;
DROP POLICY IF EXISTS "Admins can manage roster assignments" ON public.roster_assignments;

CREATE POLICY "Anyone can view roster assignments" 
  ON public.roster_assignments FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage roster assignments" 
  ON public.roster_assignments FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 6: CREATE PG ROTATION TRACKING
-- ================================================

CREATE TABLE IF NOT EXISTS public.pg_rotation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  department_code TEXT REFERENCES public.department_config(department_code) NOT NULL,
  required_days INTEGER NOT NULL,
  completed_days INTEGER DEFAULT 0,
  last_rotation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, department_code)
);

-- Add computed columns
ALTER TABLE public.pg_rotation_tracking 
  ADD COLUMN IF NOT EXISTS remaining_days INTEGER GENERATED ALWAYS AS (required_days - completed_days) STORED,
  ADD COLUMN IF NOT EXISTS is_completed BOOLEAN GENERATED ALWAYS AS (completed_days >= required_days) STORED;

CREATE INDEX IF NOT EXISTS idx_pg_rotation_doctor ON public.pg_rotation_tracking(doctor_id);
CREATE INDEX IF NOT EXISTS idx_pg_rotation_incomplete ON public.pg_rotation_tracking(is_completed) WHERE is_completed = false;

ALTER TABLE public.pg_rotation_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view PG rotations" ON public.pg_rotation_tracking;
DROP POLICY IF EXISTS "Admins can manage PG rotations" ON public.pg_rotation_tracking;

CREATE POLICY "Anyone can view PG rotations" 
  ON public.pg_rotation_tracking FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage PG rotations" 
  ON public.pg_rotation_tracking FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- ================================================

-- Function to initialize PG rotations
CREATE OR REPLACE FUNCTION public.initialize_pg_rotations(p_doctor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE id = p_doctor_id AND pg_year = 'YEAR3'
  ) THEN
    INSERT INTO public.pg_rotation_tracking (doctor_id, department_code, required_days)
    VALUES
      (p_doctor_id, 'UVEA', 15),
      (p_doctor_id, 'ORBIT', 15),
      (p_doctor_id, 'PAEDIATRIC', 15),
      (p_doctor_id, 'IOL', 30),
      (p_doctor_id, 'RETINA', 30),
      (p_doctor_id, 'GLAUCOMA', 30),
      (p_doctor_id, 'CORNEA', 30)
    ON CONFLICT (doctor_id, department_code) DO NOTHING;
  END IF;
END;
$$;

-- Function to get department staffing
CREATE OR REPLACE FUNCTION public.get_department_staffing(
  p_department_code TEXT,
  p_date DATE
)
RETURNS TABLE(
  total_assigned BIGINT,
  senior_consultant_count BIGINT,
  mo_count BIGINT,
  fellow_count BIGINT,
  pg_count BIGINT,
  min_required INTEGER,
  max_allowed INTEGER,
  is_understaffed BOOLEAN,
  is_overstaffed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dept_config RECORD;
BEGIN
  SELECT * INTO v_dept_config
  FROM public.department_config
  WHERE department_code = p_department_code;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_assigned,
    COUNT(*) FILTER (WHERE d.designation = 'SENIOR_CONSULTANT')::BIGINT,
    COUNT(*) FILTER (WHERE d.designation = 'MO')::BIGINT,
    COUNT(*) FILTER (WHERE d.designation = 'FELLOW')::BIGINT,
    COUNT(*) FILTER (WHERE d.designation = 'PG')::BIGINT,
    v_dept_config.min_doctors,
    v_dept_config.max_doctors,
    COUNT(*) < v_dept_config.min_doctors as is_understaffed,
    COUNT(*) > v_dept_config.max_doctors as is_overstaffed
  FROM public.roster_assignments ra
  JOIN public.doctors d ON ra.doctor_id = d.id
  WHERE ra.department_code = p_department_code
    AND ra.duty_date = p_date
    AND ra.status != 'cancelled';
END;
$$;

-- ================================================
-- STEP 8: ADD TRIGGERS
-- ================================================

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_monthly_rosters_updated_at ON public.monthly_rosters;
CREATE TRIGGER update_monthly_rosters_updated_at
  BEFORE UPDATE ON public.monthly_rosters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_roster_assignments_updated_at ON public.roster_assignments;
CREATE TRIGGER update_roster_assignments_updated_at
  BEFORE UPDATE ON public.roster_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_pg_rotation_tracking_updated_at ON public.pg_rotation_tracking;
CREATE TRIGGER update_pg_rotation_tracking_updated_at
  BEFORE UPDATE ON public.pg_rotation_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_department_config_updated_at ON public.department_config;
CREATE TRIGGER update_department_config_updated_at
  BEFORE UPDATE ON public.department_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- COMPLETED!
-- ================================================

-- Verify installation
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'department_config',
      'monthly_rosters',
      'roster_assignments',
      'pg_rotation_tracking'
    );
  
  IF table_count = 4 THEN
    RAISE NOTICE '✅ Monthly Roster System installed successfully!';
    RAISE NOTICE '📊 4/4 tables created';
    RAISE NOTICE '🔐 RLS policies enabled';
    RAISE NOTICE '⚡ Triggers activated';
    RAISE NOTICE '';
    RAISE NOTICE '📖 Next Steps:';
    RAISE NOTICE '1. Update doctors table with designation and specialization';
    RAISE NOTICE '2. Initialize PG rotations: SELECT initialize_pg_rotations(id) FROM doctors WHERE pg_year = ''YEAR3'';';
    RAISE NOTICE '3. Build frontend UI for roster management';
    RAISE NOTICE '4. Deploy AI scheduling Edge Function';
  ELSE
    RAISE WARNING '⚠️ Only % out of 4 tables created. Check for errors above.', table_count;
  END IF;
END $$;
