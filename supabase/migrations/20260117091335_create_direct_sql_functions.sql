-- Create direct SQL functions to bypass PostgREST schema cache issues
-- These functions work even when PostgREST hasn't refreshed its schema cache

-- Function 1: Create roster
CREATE OR REPLACE FUNCTION public.create_roster_direct(
    p_month TEXT,
    p_generated_by UUID DEFAULT NULL,
    p_status TEXT DEFAULT 'DRAFT'
)
RETURNS TABLE (
    id UUID,
    month TEXT,
    generated_by UUID,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    INSERT INTO public.rosters (month, generated_by, status)
    VALUES (p_month, p_generated_by, p_status)
    RETURNING 
        rosters.id,
        rosters.month,
        rosters.generated_by,
        rosters.status,
        rosters.created_at,
        rosters.updated_at;
END;
$$;

-- Function 2: Get roster by month
CREATE OR REPLACE FUNCTION public.get_roster_by_month(
    p_month TEXT
)
RETURNS TABLE (
    id UUID,
    month TEXT,
    generated_by UUID,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rosters.id,
        rosters.month,
        rosters.generated_by,
        rosters.status,
        rosters.created_at,
        rosters.updated_at
    FROM public.rosters
    WHERE rosters.month = p_month
    LIMIT 1;
END;
$$;

-- Function 3: Create roster assignment
CREATE OR REPLACE FUNCTION public.create_roster_assignment_direct(
    p_roster_id UUID,
    p_doctor_id UUID,
    p_department_id UUID,
    p_duty_date DATE,
    p_shift_type TEXT DEFAULT 'day'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_assignment_id UUID;
BEGIN
    INSERT INTO public.roster_assignments (
        roster_id,
        doctor_id,
        department_id,
        duty_date,
        shift_type
    )
    VALUES (
        p_roster_id,
        p_doctor_id,
        p_department_id,
        p_duty_date,
        p_shift_type
    )
    RETURNING id INTO v_assignment_id;
    
    RETURN v_assignment_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_roster_direct TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_roster_by_month TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_roster_assignment_direct TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION public.create_roster_direct IS 'Create roster bypassing PostgREST cache - use when schema cache not refreshed';
COMMENT ON FUNCTION public.get_roster_by_month IS 'Get roster by month bypassing PostgREST cache';
COMMENT ON FUNCTION public.create_roster_assignment_direct IS 'Create roster assignment bypassing PostgREST cache';
