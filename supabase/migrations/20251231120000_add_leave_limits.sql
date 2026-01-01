-- Add leave management columns to doctors table
-- This migration adds leave limits and tracking for doctors

-- Add leave limit columns to doctors table
ALTER TABLE public.doctors 
ADD COLUMN max_casual_leaves INTEGER NOT NULL DEFAULT 12,
ADD COLUMN max_medical_leaves INTEGER NOT NULL DEFAULT 12,
ADD COLUMN max_emergency_leaves INTEGER NOT NULL DEFAULT 6,
ADD COLUMN max_annual_leaves INTEGER NOT NULL DEFAULT 30;

-- Create a function to calculate leaves taken from approved leave_requests
CREATE OR REPLACE FUNCTION public.calculate_leaves_taken(
  p_doctor_id UUID,
  p_leave_type leave_type,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_days INTEGER;
BEGIN
  SELECT COALESCE(SUM(end_date - start_date + 1), 0)
  INTO total_days
  FROM leave_requests
  WHERE doctor_id = p_doctor_id
    AND leave_type = p_leave_type
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  RETURN total_days;
END;
$$;

-- Create a function to get leave summary for a doctor
CREATE OR REPLACE FUNCTION public.get_doctor_leave_summary(p_doctor_id UUID)
RETURNS TABLE(
  leave_type TEXT,
  max_leaves INTEGER,
  leaves_taken INTEGER,
  leaves_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  doc RECORD;
BEGIN
  SELECT * INTO doc FROM doctors WHERE id = p_doctor_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Casual leaves
  RETURN QUERY SELECT 
    'Casual'::TEXT,
    doc.max_casual_leaves,
    calculate_leaves_taken(p_doctor_id, 'Casual', current_year),
    GREATEST(0, doc.max_casual_leaves - calculate_leaves_taken(p_doctor_id, 'Casual', current_year));
  
  -- Medical leaves
  RETURN QUERY SELECT 
    'Medical'::TEXT,
    doc.max_medical_leaves,
    calculate_leaves_taken(p_doctor_id, 'Medical', current_year),
    GREATEST(0, doc.max_medical_leaves - calculate_leaves_taken(p_doctor_id, 'Medical', current_year));
  
  -- Emergency leaves
  RETURN QUERY SELECT 
    'Emergency'::TEXT,
    doc.max_emergency_leaves,
    calculate_leaves_taken(p_doctor_id, 'Emergency', current_year),
    GREATEST(0, doc.max_emergency_leaves - calculate_leaves_taken(p_doctor_id, 'Emergency', current_year));
  
  -- Annual leaves
  RETURN QUERY SELECT 
    'Annual'::TEXT,
    doc.max_annual_leaves,
    calculate_leaves_taken(p_doctor_id, 'Annual', current_year),
    GREATEST(0, doc.max_annual_leaves - calculate_leaves_taken(p_doctor_id, 'Annual', current_year));
END;
$$;

-- Create a trigger function to validate leave requests against limits
CREATE OR REPLACE FUNCTION public.check_leave_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc RECORD;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  requested_days INTEGER;
  already_taken INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Only check on insert or when status changes to approved
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    -- Calculate requested days
    requested_days := NEW.end_date - NEW.start_date + 1;
    
    -- Get doctor's leave limits
    SELECT * INTO doc FROM doctors WHERE id = NEW.doctor_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Doctor not found';
    END IF;
    
    -- Get already taken leaves (excluding current request if updating)
    SELECT COALESCE(SUM(end_date - start_date + 1), 0)
    INTO already_taken
    FROM leave_requests
    WHERE doctor_id = NEW.doctor_id
      AND leave_type = NEW.leave_type
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = current_year
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Get max allowed based on leave type
    CASE NEW.leave_type
      WHEN 'Casual' THEN max_allowed := doc.max_casual_leaves;
      WHEN 'Medical' THEN max_allowed := doc.max_medical_leaves;
      WHEN 'Emergency' THEN max_allowed := doc.max_emergency_leaves;
      WHEN 'Annual' THEN max_allowed := doc.max_annual_leaves;
      ELSE max_allowed := 0;
    END CASE;
    
    -- Check if limit would be exceeded
    IF (already_taken + requested_days) > max_allowed THEN
      RAISE EXCEPTION 'Leave limit exceeded. % leaves remaining for % type. Requested: % days.',
        (max_allowed - already_taken), NEW.leave_type, requested_days;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on leave_requests
DROP TRIGGER IF EXISTS check_leave_limit_trigger ON public.leave_requests;
CREATE TRIGGER check_leave_limit_trigger
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_leave_limit();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_leaves_taken TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctor_leave_summary TO authenticated;
