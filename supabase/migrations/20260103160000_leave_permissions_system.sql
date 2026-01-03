-- Migration: Leave and Permission Management System
-- Total leave: 25 days per year (across all types)
-- Permission: 3 hours per month maximum

-- First, update the leave_type enum to replace 'Annual' with 'Festival'
ALTER TYPE public.leave_type ADD VALUE IF NOT EXISTS 'Festival';

-- Create permission_requests table
CREATE TABLE IF NOT EXISTS public.permission_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  permission_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours_requested DECIMAL(3,1) NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- Enable RLS on permission_requests
ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permission_requests
CREATE POLICY "Doctors can view own permission requests" ON public.permission_requests 
  FOR SELECT TO authenticated 
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can create own permission requests" ON public.permission_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage permission requests" ON public.permission_requests 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Add total_annual_leave_limit column to doctors table if not exists
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS total_annual_leave_limit INTEGER DEFAULT 25;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS monthly_permission_hours DECIMAL(3,1) DEFAULT 3.0;

-- Drop old individual leave limit columns if they exist and create new structure
-- First check and add the columns we need
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS festival_leaves_taken INTEGER DEFAULT 0;

-- Create or replace function to get total leaves taken this year
CREATE OR REPLACE FUNCTION public.get_total_leaves_taken(
  p_doctor_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_days INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    (end_date - start_date + 1)::INTEGER
  ), 0)
  INTO total_days
  FROM leave_requests
  WHERE doctor_id = p_doctor_id
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  RETURN total_days;
END;
$$;

-- Create or replace function to get leaves taken by type this year
CREATE OR REPLACE FUNCTION public.get_leaves_by_type(
  p_doctor_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
  leave_type TEXT,
  days_taken INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.leave_type::TEXT,
    COALESCE(SUM((lr.end_date - lr.start_date + 1)::INTEGER), 0)::INTEGER as days_taken
  FROM leave_requests lr
  WHERE lr.doctor_id = p_doctor_id
    AND lr.status = 'approved'
    AND EXTRACT(YEAR FROM lr.start_date) = p_year
  GROUP BY lr.leave_type;
END;
$$;

-- Create function to get permission hours used this month
CREATE OR REPLACE FUNCTION public.get_permission_hours_used(
  p_doctor_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_hours DECIMAL;
BEGIN
  SELECT COALESCE(SUM(hours_requested), 0)
  INTO total_hours
  FROM permission_requests
  WHERE doctor_id = p_doctor_id
    AND status = 'approved'
    AND EXTRACT(YEAR FROM permission_date) = p_year
    AND EXTRACT(MONTH FROM permission_date) = p_month;
  
  RETURN total_hours;
END;
$$;

-- Create trigger function to validate leave request against total annual limit
CREATE OR REPLACE FUNCTION public.validate_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_limit INTEGER;
  already_taken INTEGER;
  requested_days INTEGER;
  remaining_days INTEGER;
BEGIN
  -- Only validate on insert or when status changes to approved
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    -- Get total annual limit
    SELECT COALESCE(total_annual_leave_limit, 25) INTO total_limit
    FROM doctors WHERE id = NEW.doctor_id;
    
    -- Get already taken leaves this year
    SELECT COALESCE(SUM((end_date - start_date + 1)::INTEGER), 0) INTO already_taken
    FROM leave_requests
    WHERE doctor_id = NEW.doctor_id
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NEW.start_date)
      AND id != NEW.id;
    
    -- Calculate requested days
    requested_days := (NEW.end_date - NEW.start_date + 1)::INTEGER;
    remaining_days := total_limit - already_taken;
    
    IF requested_days > remaining_days THEN
      RAISE EXCEPTION 'Insufficient leave balance. You have % days remaining but requested % days.', remaining_days, requested_days;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS validate_leave_request_trigger ON public.leave_requests;
CREATE TRIGGER validate_leave_request_trigger
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_leave_request();

-- Create trigger function to validate permission request
CREATE OR REPLACE FUNCTION public.validate_permission_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  monthly_limit DECIMAL;
  already_used DECIMAL;
  remaining_hours DECIMAL;
BEGIN
  -- Only validate on insert or when status changes to approved
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    -- Get monthly permission limit
    SELECT COALESCE(monthly_permission_hours, 3.0) INTO monthly_limit
    FROM doctors WHERE id = NEW.doctor_id;
    
    -- Get already used hours this month
    SELECT COALESCE(SUM(hours_requested), 0) INTO already_used
    FROM permission_requests
    WHERE doctor_id = NEW.doctor_id
      AND status = 'approved'
      AND EXTRACT(YEAR FROM permission_date) = EXTRACT(YEAR FROM NEW.permission_date)
      AND EXTRACT(MONTH FROM permission_date) = EXTRACT(MONTH FROM NEW.permission_date)
      AND id != NEW.id;
    
    remaining_hours := monthly_limit - already_used;
    
    IF NEW.hours_requested > remaining_hours THEN
      RAISE EXCEPTION 'Insufficient permission hours. You have % hours remaining but requested % hours.', remaining_hours, NEW.hours_requested;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for permission validation
DROP TRIGGER IF EXISTS validate_permission_request_trigger ON public.permission_requests;
CREATE TRIGGER validate_permission_request_trigger
  BEFORE INSERT OR UPDATE ON public.permission_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_permission_request();

-- Grant necessary permissions
GRANT SELECT ON public.permission_requests TO authenticated;
GRANT INSERT ON public.permission_requests TO authenticated;
GRANT UPDATE ON public.permission_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_leaves_taken TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaves_by_type TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permission_hours_used TO authenticated;
