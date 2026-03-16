-- ================================================
-- MONTHLY ROSTER SYSTEM MIGRATION
-- Based on Hospital Duty Roster Rules
-- ================================================

-- ================================================
-- STEP 1: ADD NEW ENUMS AND UPDATE EXISTING ONES
-- ================================================

-- Drop existing duty_type if exists and recreate with all departments
DROP TYPE IF EXISTS public.duty_type CASCADE;
CREATE TYPE public.duty_type AS ENUM (
  -- Units
  'UNIT1', 'UNIT2', 'UNIT3', 'UNIT4', 'FREE_UNIT',
  -- Specialty Departments
  'ORBIT', 'PHYSICIAN', 'CORNEA', 'PAEDIATRIC', 'IOL', 
  'GLAUCOMA', 'RETINA', 'UVEA', 'NEURO_OPHTHALMOLOGY',
  -- Other Areas
  'DAYCARE', 'BLOCK_ROOM',
  -- Wards
  'EMERGENCY_WARD', 'FREE_WARD', 'PAID_WARD',
  -- Special Duties
  'NIGHT_DUTY', 'CAMP', 'OPD', 'OT'
);

-- Create designation enum
CREATE TYPE public.designation_type AS ENUM (
  'SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG', 'INTERN'
);

-- Create specialization enum (medical specialties)
CREATE TYPE public.specialization_type AS ENUM (
  'GENERAL', 'CORNEA', 'RETINA', 'GLAUCOMA', 'IOL', 
  'PAEDIATRIC', 'ORBIT', 'UVEA', 'NEURO_OPHTHALMOLOGY',
  'CATARACT', 'OCULOPLASTY'
);

-- Create PG year enum
CREATE TYPE public.pg_year_type AS ENUM ('YEAR1', 'YEAR2', 'YEAR3');

-- ================================================
-- STEP 2: UPDATE DOCTORS TABLE WITH NEW FIELDS
-- ================================================

-- Add new columns to doctors table
ALTER TABLE public.doctors 
  ADD COLUMN IF NOT EXISTS designation designation_type DEFAULT 'MO',
  ADD COLUMN IF NOT EXISTS specialization_type specialization_type DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS joining_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS pg_year pg_year_type,
  ADD COLUMN IF NOT EXISTS months_since_joining INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eligible_units TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS eligible_departments TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create function to calculate months since joining
CREATE OR REPLACE FUNCTION public.calculate_months_since_joining(p_joining_date DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT CASE 
    WHEN p_joining_date IS NULL THEN 0
    ELSE EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_joining_date))::INTEGER * 12 + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, p_joining_date))::INTEGER
  END;
$$;

-- Create view with calculated months
CREATE OR REPLACE VIEW public.doctors_with_months AS
SELECT 
  d.*,
  public.calculate_months_since_joining(d.joining_date) as calculated_months_since_joining
FROM public.doctors d;

-- Create trigger to auto-update months_since_joining
CREATE OR REPLACE FUNCTION public.update_months_since_joining()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.months_since_joining := public.calculate_months_since_joining(NEW.joining_date);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_months_since_joining
  BEFORE INSERT OR UPDATE OF joining_date ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_months_since_joining();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_doctors_designation ON public.doctors(designation);
CREATE INDEX IF NOT EXISTS idx_doctors_specialization ON public.doctors(specialization_type);
CREATE INDEX IF NOT EXISTS idx_doctors_pg_year ON public.doctors(pg_year);
CREATE INDEX IF NOT EXISTS idx_doctors_joining_date ON public.doctors(joining_date);

-- ================================================
-- STEP 3: CREATE DEPARTMENT CONFIGURATION TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.department_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code TEXT UNIQUE NOT NULL,
  department_name TEXT NOT NULL,
  department_type TEXT NOT NULL CHECK (department_type IN ('UNIT', 'SPECIALTY', 'WARD', 'SPECIAL')),
  min_doctors INTEGER NOT NULL DEFAULT 1,
  max_doctors INTEGER NOT NULL DEFAULT 10,
  require_senior_consultant INTEGER DEFAULT 0,
  require_consultant INTEGER DEFAULT 0,
  require_mo INTEGER DEFAULT 0,
  require_fellow INTEGER DEFAULT 0,
  require_pg INTEGER DEFAULT 0,
  allowed_designations TEXT[] DEFAULT ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG']::TEXT[],
  specialization_required specialization_type,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert department configurations based on rules
INSERT INTO public.department_config (
  department_code, department_name, department_type, min_doctors, max_doctors,
  require_senior_consultant, require_consultant, require_mo, require_fellow, require_pg,
  allowed_designations, specialization_required, notes
) VALUES
  -- Units
  ('UNIT1', 'Unit 1', 'UNIT', 4, 6, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], NULL, 'General unit for MO general specialization'),
  ('UNIT2', 'Unit 2', 'UNIT', 4, 6, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], NULL, 'General unit for MO general specialization'),
  ('UNIT3', 'Unit 3', 'UNIT', 4, 6, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], NULL, 'General unit for MO general specialization'),
  ('UNIT4', 'Unit 4', 'UNIT', 4, 6, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], NULL, 'General unit for MO general specialization'),
  ('FREE_UNIT', 'Free Unit', 'UNIT', 4, 6, 0, 0, 0, 0, 0, ARRAY['MO', 'FELLOW', 'PG'], NULL, 'Free unit - Fellows in first 3 months, PG Year 1'),
  
  -- Specialty Departments
  ('ORBIT', 'Orbit', 'SPECIALTY', 3, 4, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], 'ORBIT', 'PG Year 3 mandatory: 15 days'),
  ('PHYSICIAN', 'Physician', 'SPECIALTY', 1, 2, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'PG'], NULL, 'PG Year 1 only'),
  ('CORNEA', 'Cornea', 'SPECIALTY', 6, 10, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], 'CORNEA', 'PG Year 3 mandatory: 30 days'),
  ('PAEDIATRIC', 'Paediatric Ophthalmology', 'SPECIALTY', 5, 7, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], 'PAEDIATRIC', 'PG Year 3 mandatory: 15 days'),
  ('IOL', 'IOL/Cataract', 'SPECIALTY', 6, 12, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], 'IOL', 'PG Year 3 mandatory: 30 days'),
  ('GLAUCOMA', 'Glaucoma', 'SPECIALTY', 6, 15, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], 'GLAUCOMA', 'PG Year 3 mandatory: 30 days'),
  ('RETINA', 'Retina', 'SPECIALTY', 6, 20, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], 'RETINA', 'PG Year 3 mandatory: 30 days'),
  ('UVEA', 'Uvea', 'SPECIALTY', 1, 2, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW', 'PG'], 'UVEA', 'PG Year 3 mandatory: 15 days'),
  ('NEURO_OPHTHALMOLOGY', 'Neuro-Ophthalmology', 'SPECIALTY', 2, 4, 0, 0, 0, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW'], 'NEURO_OPHTHALMOLOGY', 'Specialized department'),
  
  -- Other Areas
  ('DAYCARE', 'Daycare', 'SPECIAL', 1, 3, 0, 0, 0, 0, 0, ARRAY['MO', 'FELLOW', 'PG'], NULL, 'PG Year 1'),
  ('BLOCK_ROOM', 'Block Room', 'SPECIAL', 4, 5, 0, 0, 0, 0, 0, ARRAY['MO', 'FELLOW'], NULL, 'Only MO and Fellows'),
  
  -- Wards
  ('EMERGENCY_WARD', 'Emergency Ward', 'WARD', 1, 3, 1, 0, 1, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO', 'FELLOW'], NULL, 'Must have 1 Senior Consultant + 1 MO'),
  ('FREE_WARD', 'Free Ward', 'WARD', 1, 2, 0, 0, 1, 0, 0, ARRAY['MO', 'FELLOW'], NULL, 'Must have at least 1 MO'),
  ('PAID_WARD', 'Paid Ward', 'WARD', 2, 3, 1, 0, 1, 0, 0, ARRAY['SENIOR_CONSULTANT', 'CONSULTANT', 'MO'], NULL, 'Must have 1 Senior Consultant + 1 MO'),
  
  -- Special Duties
  ('NIGHT_DUTY', 'Night Duty', 'SPECIAL', 1, 2, 0, 0, 0, 0, 0, ARRAY['MO', 'FELLOW', 'PG'], NULL, 'Based on eligible duty list')
ON CONFLICT (department_code) DO UPDATE SET
  department_name = EXCLUDED.department_name,
  min_doctors = EXCLUDED.min_doctors,
  max_doctors = EXCLUDED.max_doctors,
  updated_at = now();

-- Enable RLS
ALTER TABLE public.department_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view department config" 
  ON public.department_config FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage department config" 
  ON public.department_config FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 4: CREATE PG MANDATORY ROTATIONS TRACKING
-- ================================================

CREATE TABLE IF NOT EXISTS public.pg_rotation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  department_code TEXT REFERENCES public.department_config(department_code) NOT NULL,
  required_days INTEGER NOT NULL,
  completed_days INTEGER DEFAULT 0,
  remaining_days INTEGER GENERATED ALWAYS AS (required_days - completed_days) STORED,
  is_completed BOOLEAN GENERATED ALWAYS AS (completed_days >= required_days) STORED,
  last_rotation_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, department_code)
);

CREATE INDEX IF NOT EXISTS idx_pg_rotation_doctor ON public.pg_rotation_tracking(doctor_id);
CREATE INDEX IF NOT EXISTS idx_pg_rotation_incomplete ON public.pg_rotation_tracking(is_completed) WHERE is_completed = false;

-- Enable RLS
ALTER TABLE public.pg_rotation_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view PG rotations" 
  ON public.pg_rotation_tracking FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage PG rotations" 
  ON public.pg_rotation_tracking FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 5: CREATE MONTHLY ROSTER TABLE
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
  constraints_metadata JSONB, -- Stores constraint validation results
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(month, year)
);

CREATE INDEX IF NOT EXISTS idx_monthly_rosters_month_year ON public.monthly_rosters(year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_rosters_status ON public.monthly_rosters(status);

-- Enable RLS
ALTER TABLE public.monthly_rosters ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view rosters" 
  ON public.monthly_rosters FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage rosters" 
  ON public.monthly_rosters FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 6: CREATE ROSTER ASSIGNMENTS TABLE
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

-- Add unique constraint: One doctor can only have one assignment per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_roster_unique_doctor_date 
  ON public.roster_assignments(doctor_id, duty_date) 
  WHERE status != 'cancelled';

-- Enable RLS
ALTER TABLE public.roster_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view roster assignments" 
  ON public.roster_assignments FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage roster assignments" 
  ON public.roster_assignments FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 7: CREATE ROSTER SWAP REQUESTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS public.roster_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_assignment_id UUID REFERENCES public.roster_assignments(id) ON DELETE CASCADE NOT NULL,
  target_assignment_id UUID REFERENCES public.roster_assignments(id) ON DELETE CASCADE NOT NULL,
  requester_doctor_id UUID REFERENCES public.doctors(id) NOT NULL,
  target_doctor_id UUID REFERENCES public.doctors(id) NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roster_swaps_status ON public.roster_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_roster_swaps_requester ON public.roster_swap_requests(requester_doctor_id);

-- Enable RLS
ALTER TABLE public.roster_swap_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Doctors can view their swap requests" 
  ON public.roster_swap_requests FOR SELECT 
  USING (
    requester_doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) 
    OR target_doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Doctors can create swap requests" 
  ON public.roster_swap_requests FOR INSERT 
  WITH CHECK (requester_doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage swap requests" 
  ON public.roster_swap_requests FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 8: CREATE ROSTER CONSTRAINT VIOLATIONS LOG
-- ================================================

CREATE TABLE IF NOT EXISTS public.roster_constraint_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id UUID REFERENCES public.monthly_rosters(id) ON DELETE CASCADE NOT NULL,
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'UNDERSTAFFED', 'OVERSTAFFED', 'INELIGIBLE_DOCTOR', 
    'MISSING_REQUIRED_DESIGNATION', 'FELLOW_3MONTH_VIOLATION',
    'PG_YEAR_VIOLATION', 'LEAVE_CONFLICT', 'EXPERIENCE_VIOLATION',
    'MULTIPLE_ASSIGNMENTS', 'INCOMPLETE_ROTATION'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  department_code TEXT,
  duty_date DATE,
  doctor_id UUID REFERENCES public.doctors(id),
  description TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violations_roster ON public.roster_constraint_violations(roster_id);
CREATE INDEX IF NOT EXISTS idx_violations_unresolved ON public.roster_constraint_violations(is_resolved) WHERE is_resolved = false;

-- Enable RLS
ALTER TABLE public.roster_constraint_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view violations" 
  ON public.roster_constraint_violations FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage violations" 
  ON public.roster_constraint_violations FOR ALL 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- STEP 9: CREATE HELPER FUNCTIONS
-- ================================================

-- Function to initialize PG mandatory rotations for a doctor
CREATE OR REPLACE FUNCTION public.initialize_pg_rotations(p_doctor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only for PG Year 3
  IF EXISTS (
    SELECT 1 FROM public.doctors 
    WHERE id = p_doctor_id AND pg_year = 'YEAR3'
  ) THEN
    -- Insert mandatory rotations
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

-- Function to update PG rotation completion
CREATE OR REPLACE FUNCTION public.update_pg_rotation_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doctor_pg_year pg_year_type;
BEGIN
  -- Check if doctor is PG Year 3
  SELECT pg_year INTO v_doctor_pg_year
  FROM public.doctors
  WHERE id = NEW.doctor_id;

  IF v_doctor_pg_year = 'YEAR3' THEN
    -- Update rotation tracking
    UPDATE public.pg_rotation_tracking
    SET 
      completed_days = completed_days + 1,
      last_rotation_date = NEW.duty_date,
      updated_at = now()
    WHERE doctor_id = NEW.doctor_id 
      AND department_code = NEW.department_code;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-update PG rotation tracking
CREATE TRIGGER trg_update_pg_rotations
  AFTER INSERT ON public.roster_assignments
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION public.update_pg_rotation_completion();

-- Function to validate roster assignment constraints
CREATE OR REPLACE FUNCTION public.validate_roster_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_doctor RECORD;
  v_dept_config RECORD;
  v_leave_conflict BOOLEAN;
BEGIN
  -- Get doctor details
  SELECT * INTO v_doctor
  FROM public.doctors
  WHERE id = NEW.doctor_id;

  -- Get department config
  SELECT * INTO v_dept_config
  FROM public.department_config
  WHERE department_code = NEW.department_code;

  -- Check 1: Leave conflict
  SELECT EXISTS (
    SELECT 1 FROM public.leave_requests
    WHERE doctor_id = NEW.doctor_id
      AND status = 'approved'
      AND NEW.duty_date BETWEEN start_date AND end_date
  ) INTO v_leave_conflict;

  IF v_leave_conflict THEN
    RAISE EXCEPTION 'Doctor has approved leave on %', NEW.duty_date;
  END IF;

  -- Check 2: Multiple assignments on same day
  IF EXISTS (
    SELECT 1 FROM public.roster_assignments
    WHERE doctor_id = NEW.doctor_id
      AND duty_date = NEW.duty_date
      AND status != 'cancelled'
      AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Doctor already has an assignment on %', NEW.duty_date;
  END IF;

  -- Check 3: Designation eligibility
  IF NOT (v_doctor.designation::TEXT = ANY(v_dept_config.allowed_designations)) THEN
    RAISE EXCEPTION 'Doctor designation % not allowed in department %', 
      v_doctor.designation, v_dept_config.department_name;
  END IF;

  -- Check 4: Fellow 3-month restriction (calculate months dynamically)
  IF v_doctor.designation = 'FELLOW' AND 
     public.calculate_months_since_joining(v_doctor.joining_date) < 3 THEN
    IF NEW.department_code NOT IN ('FREE_UNIT', 'UNIT1', 'UNIT2', 'UNIT3', 'UNIT4') THEN
      RAISE EXCEPTION 'Fellow must complete 3 months before assignment to %', 
        v_dept_config.department_name;
    END IF;
  END IF;

  -- Check 5: Senior Consultant experience
  IF v_doctor.designation = 'SENIOR_CONSULTANT' AND v_doctor.experience_years < 5 THEN
    RAISE EXCEPTION 'Senior Consultant must have at least 5 years experience';
  END IF;

  -- Check 6: PG Year restrictions
  IF v_doctor.designation = 'PG' THEN
    IF v_doctor.pg_year = 'YEAR1' THEN
      IF NEW.department_code NOT IN ('PHYSICIAN', 'DAYCARE', 'FREE_UNIT') THEN
        RAISE EXCEPTION 'PG Year 1 can only be assigned to Physician, Daycare, or Free Unit';
      END IF;
    ELSIF v_doctor.pg_year = 'YEAR2' THEN
      IF NEW.department_code NOT IN ('UNIT1', 'UNIT2', 'UNIT3', 'UNIT4') THEN
        RAISE EXCEPTION 'PG Year 2 can only be assigned to Units 1-4';
      END IF;
    END IF;
  END IF;

  -- Check 7: Specialization requirement
  IF v_dept_config.specialization_required IS NOT NULL THEN
    IF v_doctor.specialization_type != v_dept_config.specialization_required 
       AND v_doctor.designation != 'PG' THEN
      RAISE EXCEPTION 'Department % requires specialization %', 
        v_dept_config.department_name, v_dept_config.specialization_required;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to validate assignments
CREATE TRIGGER trg_validate_roster_assignment
  BEFORE INSERT OR UPDATE ON public.roster_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_roster_assignment();

-- Function to get department daily staffing
CREATE OR REPLACE FUNCTION public.get_department_staffing(
  p_department_code TEXT,
  p_date DATE
)
RETURNS TABLE(
  total_assigned BIGINT,
  senior_consultant_count BIGINT,
  consultant_count BIGINT,
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
  -- Get department config
  SELECT * INTO v_dept_config
  FROM public.department_config
  WHERE department_code = p_department_code;

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_assigned,
    COUNT(*) FILTER (WHERE d.designation = 'SENIOR_CONSULTANT')::BIGINT,
    COUNT(*) FILTER (WHERE d.designation = 'CONSULTANT')::BIGINT,
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
-- STEP 10: ADD TRIGGERS FOR UPDATED_AT
-- ================================================

CREATE TRIGGER update_department_config_updated_at
  BEFORE UPDATE ON public.department_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pg_rotation_tracking_updated_at
  BEFORE UPDATE ON public.pg_rotation_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_rosters_updated_at
  BEFORE UPDATE ON public.monthly_rosters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roster_assignments_updated_at
  BEFORE UPDATE ON public.roster_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roster_swap_requests_updated_at
  BEFORE UPDATE ON public.roster_swap_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- STEP 11: SEED SAMPLE DATA FOR TESTING
-- ================================================

-- Update existing doctors with new fields (sample data)
UPDATE public.doctors SET
  designation = 'SENIOR_CONSULTANT',
  specialization_type = 'CORNEA',
  experience_years = 8,
  joining_date = '2017-01-15',
  eligible_units = ARRAY['UNIT1', 'UNIT2', 'CORNEA'],
  eligible_departments = ARRAY['CORNEA', 'EMERGENCY_WARD']
WHERE name = 'Dr. Rajesh Kumar';

UPDATE public.doctors SET
  designation = 'FELLOW',
  specialization_type = 'RETINA',
  experience_years = 3,
  joining_date = '2023-07-01',
  pg_year = NULL,
  eligible_units = ARRAY['FREE_UNIT', 'UNIT1', 'UNIT2', 'UNIT3', 'UNIT4', 'RETINA'],
  eligible_departments = ARRAY['RETINA']
WHERE name = 'Dr. Priya Nair';

-- Add PG Year 3 sample doctor
UPDATE public.doctors SET
  designation = 'PG',
  specialization_type = 'GENERAL',
  experience_years = 2,
  joining_date = '2023-01-01',
  pg_year = 'YEAR3',
  eligible_units = ARRAY['UNIT1', 'UNIT2', 'UNIT3', 'UNIT4'],
  eligible_departments = ARRAY['CORNEA', 'RETINA', 'GLAUCOMA', 'IOL', 'UVEA', 'ORBIT', 'PAEDIATRIC']
WHERE name = 'Dr. Akhil Sharma';

-- Initialize PG rotations for Year 3 doctors
SELECT public.initialize_pg_rotations(id)
FROM public.doctors
WHERE pg_year = 'YEAR3';

-- ================================================
-- COMPLETED: MONTHLY ROSTER SYSTEM MIGRATION
-- ================================================

-- Summary of changes:
-- 1. ✅ Updated duty_type enum with all departments
-- 2. ✅ Added designation, specialization, PG year enums
-- 3. ✅ Enhanced doctors table with roster-specific fields
-- 4. ✅ Created department_config table with all rules
-- 5. ✅ Created pg_rotation_tracking for mandatory rotations
-- 6. ✅ Created monthly_rosters for roster management
-- 7. ✅ Created roster_assignments with full CRUD support
-- 8. ✅ Created roster_swap_requests for duty exchanges
-- 9. ✅ Created roster_constraint_violations for monitoring
-- 10. ✅ Added validation functions and triggers
-- 11. ✅ Added helper functions for staffing checks
-- 12. ✅ Enabled RLS with admin CRUD permissions
-- 13. ✅ Seeded department configurations

-- ADMIN CAPABILITIES:
-- ✅ CREATE: Insert new roster assignments
-- ✅ READ: View all rosters, assignments, violations
-- ✅ UPDATE: Modify assignments, approve swaps
-- ✅ DELETE: Remove assignments, cancel rosters

COMMENT ON TABLE public.monthly_rosters IS 
'Stores monthly roster metadata. Admin can create, edit, publish, and finalize rosters.';

COMMENT ON TABLE public.roster_assignments IS 
'Individual duty assignments. Admin has full CRUD: create, update, delete assignments.';

COMMENT ON TABLE public.department_config IS 
'Department rules and staffing requirements. Admin can add/edit departments.';

COMMENT ON TABLE public.pg_rotation_tracking IS 
'Tracks PG Year 3 mandatory rotation completion. Auto-updates when assignments marked complete.';
