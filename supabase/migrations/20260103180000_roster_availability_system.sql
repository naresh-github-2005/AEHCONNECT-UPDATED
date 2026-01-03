-- =====================================================
-- ROSTER AVAILABILITY SYSTEM
-- Creates views and functions to track doctor availability
-- for daily roster generation
-- =====================================================

-- Drop existing objects if they exist (for clean recreation)
DROP VIEW IF EXISTS public.daily_doctor_availability CASCADE;
DROP VIEW IF EXISTS public.doctors_on_leave_today CASCADE;
DROP VIEW IF EXISTS public.doctors_with_permissions_today CASCADE;
DROP FUNCTION IF EXISTS public.get_doctors_on_leave(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_doctors_with_permissions(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_available_doctors(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_doctor_availability_for_date(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_roster_availability_summary(DATE) CASCADE;

-- =====================================================
-- 1. VIEW: Doctors on leave for today
-- =====================================================
CREATE OR REPLACE VIEW public.doctors_on_leave_today AS
SELECT 
    lr.id AS leave_request_id,
    lr.doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    lr.leave_type,
    lr.start_date,
    lr.end_date,
    lr.reason,
    lr.status,
    (lr.end_date::date - lr.start_date::date + 1) AS total_days
FROM public.leave_requests lr
JOIN public.doctors d ON lr.doctor_id = d.id
WHERE lr.status = 'approved'
  AND CURRENT_DATE BETWEEN lr.start_date::date AND lr.end_date::date
  AND d.is_active = true;

-- =====================================================
-- 2. VIEW: Doctors with permissions for today
-- =====================================================
CREATE OR REPLACE VIEW public.doctors_with_permissions_today AS
SELECT 
    pr.id AS permission_request_id,
    pr.doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    pr.permission_date,
    pr.start_time,
    pr.end_time,
    pr.hours_requested,
    pr.reason,
    pr.status
FROM public.permission_requests pr
JOIN public.doctors d ON pr.doctor_id = d.id
WHERE pr.status = 'approved'
  AND pr.permission_date::date = CURRENT_DATE
  AND d.is_active = true;

-- =====================================================
-- 3. FUNCTION: Get doctors on leave for a specific date
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_doctors_on_leave(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    leave_type public.leave_type,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    days_remaining INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        lr.leave_type,
        lr.start_date::DATE,
        lr.end_date::DATE,
        lr.reason,
        (lr.end_date::DATE - p_date + 1)::INTEGER AS days_remaining
    FROM public.leave_requests lr
    JOIN public.doctors d ON lr.doctor_id = d.id
    WHERE lr.status = 'approved'
      AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
      AND d.is_active = true
    ORDER BY d.name;
END;
$$;

-- =====================================================
-- 4. FUNCTION: Get doctors with permissions for a specific date
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_doctors_with_permissions(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    permission_date DATE,
    start_time TIME,
    end_time TIME,
    hours_requested NUMERIC,
    reason TEXT,
    is_morning_permission BOOLEAN,
    is_afternoon_permission BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        pr.permission_date::DATE,
        pr.start_time::TIME,
        pr.end_time::TIME,
        pr.hours_requested,
        pr.reason,
        (pr.start_time::TIME < '12:00:00'::TIME) AS is_morning_permission,
        (pr.end_time::TIME > '12:00:00'::TIME) AS is_afternoon_permission
    FROM public.permission_requests pr
    JOIN public.doctors d ON pr.doctor_id = d.id
    WHERE pr.status = 'approved'
      AND pr.permission_date::DATE = p_date
      AND d.is_active = true
    ORDER BY d.name;
END;
$$;

-- =====================================================
-- 5. FUNCTION: Get available doctors for a specific date
-- Returns doctors who are NOT on leave and considers permissions
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_available_doctors(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    seniority public.seniority_level,
    eligible_duties TEXT[],
    availability_status TEXT,
    permission_start_time TIME,
    permission_end_time TIME,
    permission_hours NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        d.seniority,
        d.eligible_duties,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.leave_requests lr
                WHERE lr.doctor_id = d.id
                  AND lr.status = 'approved'
                  AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
            ) THEN 'on_leave'
            WHEN EXISTS (
                SELECT 1 FROM public.permission_requests pr
                WHERE pr.doctor_id = d.id
                  AND pr.status = 'approved'
                  AND pr.permission_date::DATE = p_date
            ) THEN 'partial_availability'
            ELSE 'available'
        END AS availability_status,
        (
            SELECT pr.start_time::TIME 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_start_time,
        (
            SELECT pr.end_time::TIME 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_end_time,
        (
            SELECT pr.hours_requested 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_hours
    FROM public.doctors d
    WHERE d.is_active = true
    ORDER BY 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.leave_requests lr
                WHERE lr.doctor_id = d.id
                  AND lr.status = 'approved'
                  AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
            ) THEN 3
            WHEN EXISTS (
                SELECT 1 FROM public.permission_requests pr
                WHERE pr.doctor_id = d.id
                  AND pr.status = 'approved'
                  AND pr.permission_date::DATE = p_date
            ) THEN 2
            ELSE 1
        END,
        d.name;
END;
$$;

-- =====================================================
-- 6. FUNCTION: Get specific doctor's availability for a date
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_doctor_availability_for_date(
    p_doctor_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    availability_status TEXT,
    leave_type public.leave_type,
    leave_start_date DATE,
    leave_end_date DATE,
    permission_date DATE,
    permission_start_time TIME,
    permission_end_time TIME,
    permission_hours NUMERIC,
    can_do_morning_duty BOOLEAN,
    can_do_afternoon_duty BOOLEAN,
    can_do_night_duty BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_on_leave BOOLEAN := FALSE;
    v_has_permission BOOLEAN := FALSE;
    v_permission_start TIME;
    v_permission_end TIME;
BEGIN
    -- Check if on leave
    SELECT EXISTS (
        SELECT 1 FROM public.leave_requests lr
        WHERE lr.doctor_id = p_doctor_id
          AND lr.status = 'approved'
          AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
    ) INTO v_on_leave;

    -- Check if has permission
    SELECT EXISTS (
        SELECT 1 FROM public.permission_requests pr
        WHERE pr.doctor_id = p_doctor_id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = p_date
    ) INTO v_has_permission;

    -- Get permission times if applicable
    IF v_has_permission THEN
        SELECT pr.start_time::TIME, pr.end_time::TIME
        INTO v_permission_start, v_permission_end
        FROM public.permission_requests pr
        WHERE pr.doctor_id = p_doctor_id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = p_date
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        d.id AS doctor_id,
        d.name AS doctor_name,
        CASE 
            WHEN v_on_leave THEN 'on_leave'
            WHEN v_has_permission THEN 'partial_availability'
            ELSE 'available'
        END AS availability_status,
        lr.leave_type,
        lr.start_date::DATE AS leave_start_date,
        lr.end_date::DATE AS leave_end_date,
        pr.permission_date::DATE,
        pr.start_time::TIME AS permission_start_time,
        pr.end_time::TIME AS permission_end_time,
        pr.hours_requested AS permission_hours,
        -- Can do morning duty (8 AM - 12 PM): Only if not on leave and permission doesn't block it
        CASE 
            WHEN v_on_leave THEN FALSE
            WHEN v_has_permission AND v_permission_start < '12:00:00'::TIME THEN FALSE
            ELSE TRUE
        END AS can_do_morning_duty,
        -- Can do afternoon duty (12 PM - 6 PM): Only if not on leave and permission doesn't block it
        CASE 
            WHEN v_on_leave THEN FALSE
            WHEN v_has_permission AND v_permission_end > '12:00:00'::TIME AND v_permission_start < '18:00:00'::TIME THEN FALSE
            ELSE TRUE
        END AS can_do_afternoon_duty,
        -- Can do night duty (6 PM onwards): Only if not on leave and permission doesn't overlap
        CASE 
            WHEN v_on_leave THEN FALSE
            WHEN v_has_permission AND v_permission_end > '18:00:00'::TIME THEN FALSE
            ELSE d.can_do_night
        END AS can_do_night_duty
    FROM public.doctors d
    LEFT JOIN public.leave_requests lr ON lr.doctor_id = d.id
        AND lr.status = 'approved'
        AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
    LEFT JOIN public.permission_requests pr ON pr.doctor_id = d.id
        AND pr.status = 'approved'
        AND pr.permission_date::DATE = p_date
    WHERE d.id = p_doctor_id;
END;
$$;

-- =====================================================
-- 7. FUNCTION: Get roster availability summary for a date
-- Returns counts and lists for roster planning
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_roster_availability_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    summary_date DATE,
    total_doctors INTEGER,
    doctors_on_leave INTEGER,
    doctors_with_permissions INTEGER,
    fully_available_doctors INTEGER,
    doctors_on_leave_list JSONB,
    doctors_with_permissions_list JSONB,
    available_doctors_list JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_date AS summary_date,
        (SELECT COUNT(*)::INTEGER FROM public.doctors WHERE is_active = true) AS total_doctors,
        (
            SELECT COUNT(DISTINCT lr.doctor_id)::INTEGER 
            FROM public.leave_requests lr
            JOIN public.doctors d ON lr.doctor_id = d.id
            WHERE lr.status = 'approved'
              AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              AND d.is_active = true
        ) AS doctors_on_leave,
        (
            SELECT COUNT(DISTINCT pr.doctor_id)::INTEGER 
            FROM public.permission_requests pr
            JOIN public.doctors d ON pr.doctor_id = d.id
            WHERE pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
              AND d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = pr.doctor_id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
        ) AS doctors_with_permissions,
        (
            SELECT COUNT(*)::INTEGER 
            FROM public.doctors d
            WHERE d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = d.id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.permission_requests pr
                  WHERE pr.doctor_id = d.id
                    AND pr.status = 'approved'
                    AND pr.permission_date::DATE = p_date
              )
        ) AS fully_available_doctors,
        -- List of doctors on leave
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', lr.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'leave_type', lr.leave_type,
                'start_date', lr.start_date,
                'end_date', lr.end_date
            )), '[]'::JSONB)
            FROM public.leave_requests lr
            JOIN public.doctors d ON lr.doctor_id = d.id
            WHERE lr.status = 'approved'
              AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              AND d.is_active = true
        ) AS doctors_on_leave_list,
        -- List of doctors with permissions
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', pr.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'permission_date', pr.permission_date,
                'start_time', pr.start_time,
                'end_time', pr.end_time,
                'hours_requested', pr.hours_requested
            )), '[]'::JSONB)
            FROM public.permission_requests pr
            JOIN public.doctors d ON pr.doctor_id = d.id
            WHERE pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
              AND d.is_active = true
        ) AS doctors_with_permissions_list,
        -- List of fully available doctors
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', d.id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'specialty', d.specialty,
                'designation', d.designation,
                'seniority', d.seniority,
                'eligible_duties', d.eligible_duties,
                'can_do_night', d.can_do_night,
                'can_do_ot', d.can_do_ot,
                'can_do_opd', d.can_do_opd,
                'can_do_ward', d.can_do_ward,
                'can_do_camp', d.can_do_camp
            )), '[]'::JSONB)
            FROM public.doctors d
            WHERE d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = d.id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
        ) AS available_doctors_list;
END;
$$;

-- =====================================================
-- 8. VIEW: Daily doctor availability (materialized for performance)
-- =====================================================
CREATE OR REPLACE VIEW public.daily_doctor_availability AS
SELECT 
    d.id AS doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    d.seniority,
    d.eligible_duties,
    d.can_do_night,
    d.can_do_ot,
    d.can_do_opd,
    d.can_do_ward,
    d.can_do_camp,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.leave_requests lr
            WHERE lr.doctor_id = d.id
              AND lr.status = 'approved'
              AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        ) THEN 'on_leave'
        WHEN EXISTS (
            SELECT 1 FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = CURRENT_DATE
        ) THEN 'partial_availability'
        ELSE 'available'
    END AS availability_status,
    (
        SELECT lr.leave_type 
        FROM public.leave_requests lr
        WHERE lr.doctor_id = d.id
          AND lr.status = 'approved'
          AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        LIMIT 1
    ) AS leave_type,
    (
        SELECT lr.end_date::DATE 
        FROM public.leave_requests lr
        WHERE lr.doctor_id = d.id
          AND lr.status = 'approved'
          AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        LIMIT 1
    ) AS leave_end_date,
    (
        SELECT pr.start_time::TIME 
        FROM public.permission_requests pr
        WHERE pr.doctor_id = d.id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = CURRENT_DATE
        LIMIT 1
    ) AS permission_start_time,
    (
        SELECT pr.end_time::TIME 
        FROM public.permission_requests pr
        WHERE pr.doctor_id = d.id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = CURRENT_DATE
        LIMIT 1
    ) AS permission_end_time
FROM public.doctors d
WHERE d.is_active = true
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.leave_requests lr
            WHERE lr.doctor_id = d.id
              AND lr.status = 'approved'
              AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        ) THEN 3
        WHEN EXISTS (
            SELECT 1 FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = CURRENT_DATE
        ) THEN 2
        ELSE 1
    END,
    d.name;

-- =====================================================
-- 9. Grant permissions
-- =====================================================
GRANT SELECT ON public.doctors_on_leave_today TO authenticated;
GRANT SELECT ON public.doctors_with_permissions_today TO authenticated;
GRANT SELECT ON public.daily_doctor_availability TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctors_on_leave(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctors_with_permissions(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_doctors(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctor_availability_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roster_availability_summary(DATE) TO authenticated;

-- =====================================================
-- 10. Add helpful comments
-- =====================================================
COMMENT ON VIEW public.doctors_on_leave_today IS 'Shows all doctors currently on approved leave today';
COMMENT ON VIEW public.doctors_with_permissions_today IS 'Shows all doctors with approved permissions today';
COMMENT ON VIEW public.daily_doctor_availability IS 'Shows availability status of all active doctors for today';
COMMENT ON FUNCTION public.get_doctors_on_leave IS 'Returns list of doctors on approved leave for a given date';
COMMENT ON FUNCTION public.get_doctors_with_permissions IS 'Returns list of doctors with approved permissions for a given date';
COMMENT ON FUNCTION public.get_available_doctors IS 'Returns all doctors with their availability status for a given date';
COMMENT ON FUNCTION public.get_doctor_availability_for_date IS 'Returns detailed availability info for a specific doctor on a given date';
COMMENT ON FUNCTION public.get_roster_availability_summary IS 'Returns comprehensive summary for roster planning with counts and doctor lists';
