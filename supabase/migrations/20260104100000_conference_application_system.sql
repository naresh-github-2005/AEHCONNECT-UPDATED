-- =====================================================
-- CONFERENCE APPLICATION SYSTEM
-- Allows doctors to apply for conferences
-- Admins can approve/reject applications
-- Tracks doctors attending conferences for roster exclusion
-- =====================================================

-- Drop existing functions that need to be recreated with different return types
DROP FUNCTION IF EXISTS public.get_available_doctors(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_roster_availability_summary(DATE) CASCADE;

-- Add date range support to classes table for multi-day events
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_multi_day BOOLEAN DEFAULT false;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS max_attendees INTEGER;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Update existing classes to have end_date same as class_date
UPDATE public.classes SET end_date = class_date WHERE end_date IS NULL;

-- Create conference application status enum
DO $$ BEGIN
    CREATE TYPE public.conference_application_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create conference_applications table
CREATE TABLE IF NOT EXISTS public.conference_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    status public.conference_application_status NOT NULL DEFAULT 'pending',
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES public.doctors(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(class_id, doctor_id)
);

-- Create conference_duty_exclusions table to track when doctors are unavailable due to conferences
CREATE TABLE IF NOT EXISTS public.conference_duty_exclusions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.conference_applications(id) ON DELETE CASCADE,
    exclusion_start_date DATE NOT NULL,
    exclusion_end_date DATE NOT NULL,
    reason TEXT DEFAULT 'Conference Attendance',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(doctor_id, class_id)
);

-- Enable RLS
ALTER TABLE public.conference_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conference_duty_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS policies for conference_applications
CREATE POLICY "Authenticated users can view conference applications"
ON public.conference_applications
FOR SELECT
USING (true);

CREATE POLICY "Doctors can create their own applications"
ON public.conference_applications
FOR INSERT
WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

CREATE POLICY "Doctors can cancel their own pending applications"
ON public.conference_applications
FOR UPDATE
USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    AND status = 'pending'
);

CREATE POLICY "Admins can manage all applications"
ON public.conference_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for conference_duty_exclusions
CREATE POLICY "Authenticated users can view conference exclusions"
ON public.conference_duty_exclusions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage conference exclusions"
ON public.conference_duty_exclusions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_conference_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conference_applications_updated_at
BEFORE UPDATE ON public.conference_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_conference_application_updated_at();

-- =====================================================
-- FUNCTIONS FOR CONFERENCE APPLICATION MANAGEMENT
-- =====================================================

-- Function to apply for a conference
CREATE OR REPLACE FUNCTION public.apply_for_conference(
    p_class_id UUID,
    p_doctor_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application_id UUID;
    v_class_record RECORD;
    v_deadline DATE;
BEGIN
    -- Get class details
    SELECT * INTO v_class_record FROM public.classes WHERE id = p_class_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conference not found';
    END IF;
    
    -- Check if it's a conference type
    IF v_class_record.class_type NOT IN ('conference', 'seminar', 'workshop') THEN
        RAISE EXCEPTION 'Can only apply for conferences, seminars, or workshops';
    END IF;
    
    -- Calculate deadline (2 days before start date)
    v_deadline := COALESCE(v_class_record.application_deadline, v_class_record.class_date - INTERVAL '2 days');
    
    -- Check if deadline has passed
    IF CURRENT_DATE > v_deadline THEN
        RAISE EXCEPTION 'Application deadline has passed';
    END IF;
    
    -- Check if already applied
    IF EXISTS (SELECT 1 FROM public.conference_applications WHERE class_id = p_class_id AND doctor_id = p_doctor_id) THEN
        RAISE EXCEPTION 'You have already applied for this conference';
    END IF;
    
    -- Create application
    INSERT INTO public.conference_applications (class_id, doctor_id, doctor_notes)
    VALUES (p_class_id, p_doctor_id, p_notes)
    RETURNING id INTO v_application_id;
    
    RETURN v_application_id;
END;
$$;

-- Function to approve conference application (creates duty exclusion)
CREATE OR REPLACE FUNCTION public.approve_conference_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application RECORD;
    v_class RECORD;
BEGIN
    -- Get application
    SELECT * INTO v_application FROM public.conference_applications WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in pending status';
    END IF;
    
    -- Get class details
    SELECT * INTO v_class FROM public.classes WHERE id = v_application.class_id;
    
    -- Update application status
    UPDATE public.conference_applications
    SET 
        status = 'approved',
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes
    WHERE id = p_application_id;
    
    -- Create duty exclusion record
    INSERT INTO public.conference_duty_exclusions (
        doctor_id,
        class_id,
        application_id,
        exclusion_start_date,
        exclusion_end_date,
        reason
    )
    VALUES (
        v_application.doctor_id,
        v_application.class_id,
        p_application_id,
        v_class.class_date,
        COALESCE(v_class.end_date, v_class.class_date),
        'Conference: ' || v_class.title
    )
    ON CONFLICT (doctor_id, class_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$;

-- Function to reject conference application
CREATE OR REPLACE FUNCTION public.reject_conference_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application RECORD;
BEGIN
    -- Get application
    SELECT * INTO v_application FROM public.conference_applications WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in pending status';
    END IF;
    
    -- Update application status
    UPDATE public.conference_applications
    SET 
        status = 'rejected',
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes
    WHERE id = p_application_id;
    
    -- Remove any existing duty exclusion (shouldn't exist but just in case)
    DELETE FROM public.conference_duty_exclusions 
    WHERE application_id = p_application_id;
    
    RETURN TRUE;
END;
$$;

-- Function to cancel conference application (by doctor)
CREATE OR REPLACE FUNCTION public.cancel_conference_application(
    p_application_id UUID,
    p_doctor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application RECORD;
BEGIN
    -- Get application
    SELECT * INTO v_application FROM public.conference_applications WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    -- Verify ownership
    IF v_application.doctor_id != p_doctor_id THEN
        RAISE EXCEPTION 'You can only cancel your own applications';
    END IF;
    
    IF v_application.status NOT IN ('pending', 'approved') THEN
        RAISE EXCEPTION 'Cannot cancel this application';
    END IF;
    
    -- Update application status
    UPDATE public.conference_applications
    SET status = 'cancelled'
    WHERE id = p_application_id;
    
    -- Remove duty exclusion if exists
    DELETE FROM public.conference_duty_exclusions 
    WHERE application_id = p_application_id;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- VIEWS AND FUNCTIONS FOR ROSTER GENERATION
-- =====================================================

-- View: Doctors attending conferences today
CREATE OR REPLACE VIEW public.doctors_at_conference_today AS
SELECT 
    cde.id AS exclusion_id,
    cde.doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    c.id AS class_id,
    c.title AS conference_title,
    c.class_type,
    c.class_date AS start_date,
    c.end_date,
    c.location,
    cde.exclusion_start_date,
    cde.exclusion_end_date,
    cde.reason
FROM public.conference_duty_exclusions cde
JOIN public.doctors d ON cde.doctor_id = d.id
JOIN public.classes c ON cde.class_id = c.id
WHERE CURRENT_DATE BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
  AND d.is_active = true;

-- Function: Get doctors at conferences for a specific date
CREATE OR REPLACE FUNCTION public.get_doctors_at_conferences(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    conference_title TEXT,
    conference_start_date DATE,
    conference_end_date DATE,
    location TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cde.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        c.title AS conference_title,
        c.class_date AS conference_start_date,
        COALESCE(c.end_date, c.class_date) AS conference_end_date,
        c.location
    FROM public.conference_duty_exclusions cde
    JOIN public.doctors d ON cde.doctor_id = d.id
    JOIN public.classes c ON cde.class_id = c.id
    WHERE p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
      AND d.is_active = true
    ORDER BY d.name;
END;
$$;

-- Function: Get conference applications summary for admin
CREATE OR REPLACE FUNCTION public.get_conference_applications_summary()
RETURNS TABLE (
    class_id UUID,
    conference_title TEXT,
    class_type TEXT,
    start_date DATE,
    end_date DATE,
    location TEXT,
    total_applications BIGINT,
    pending_applications BIGINT,
    approved_applications BIGINT,
    rejected_applications BIGINT,
    application_deadline DATE,
    is_deadline_passed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS class_id,
        c.title AS conference_title,
        c.class_type::TEXT,
        c.class_date AS start_date,
        COALESCE(c.end_date, c.class_date) AS end_date,
        c.location,
        COUNT(ca.id) AS total_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'pending') AS pending_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'approved') AS approved_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'rejected') AS rejected_applications,
        COALESCE(c.application_deadline, c.class_date - INTERVAL '2 days')::DATE AS application_deadline,
        CURRENT_DATE > COALESCE(c.application_deadline, c.class_date - INTERVAL '2 days') AS is_deadline_passed
    FROM public.classes c
    LEFT JOIN public.conference_applications ca ON c.id = ca.class_id
    WHERE c.class_type IN ('conference', 'seminar', 'workshop')
      AND c.class_date >= CURRENT_DATE - INTERVAL '30 days'  -- Include recent past conferences
    GROUP BY c.id, c.title, c.class_type, c.class_date, c.end_date, c.location, c.application_deadline
    ORDER BY c.class_date ASC;
END;
$$;

-- Function: Get applications for a specific conference
CREATE OR REPLACE FUNCTION public.get_conference_applications(p_class_id UUID)
RETURNS TABLE (
    application_id UUID,
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    status public.conference_application_status,
    applied_at TIMESTAMP WITH TIME ZONE,
    doctor_notes TEXT,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id AS application_id,
        ca.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        ca.status,
        ca.applied_at,
        ca.doctor_notes,
        rd.name AS reviewed_by_name,
        ca.reviewed_at,
        ca.admin_notes
    FROM public.conference_applications ca
    JOIN public.doctors d ON ca.doctor_id = d.id
    LEFT JOIN public.doctors rd ON ca.reviewed_by = rd.id
    WHERE ca.class_id = p_class_id
    ORDER BY 
        CASE ca.status 
            WHEN 'pending' THEN 1 
            WHEN 'approved' THEN 2 
            WHEN 'rejected' THEN 3 
            ELSE 4 
        END,
        ca.applied_at ASC;
END;
$$;

-- Function: Get doctor's conference applications
CREATE OR REPLACE FUNCTION public.get_my_conference_applications(p_doctor_id UUID)
RETURNS TABLE (
    application_id UUID,
    class_id UUID,
    conference_title TEXT,
    class_type TEXT,
    start_date DATE,
    end_date DATE,
    location TEXT,
    status public.conference_application_status,
    applied_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    application_deadline DATE,
    can_cancel BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id AS application_id,
        c.id AS class_id,
        c.title AS conference_title,
        c.class_type::TEXT,
        c.class_date AS start_date,
        COALESCE(c.end_date, c.class_date) AS end_date,
        c.location,
        ca.status,
        ca.applied_at,
        ca.reviewed_at,
        ca.admin_notes,
        COALESCE(c.application_deadline, c.class_date - INTERVAL '2 days')::DATE AS application_deadline,
        (ca.status IN ('pending', 'approved') AND c.class_date > CURRENT_DATE) AS can_cancel
    FROM public.conference_applications ca
    JOIN public.classes c ON ca.class_id = c.id
    WHERE ca.doctor_id = p_doctor_id
    ORDER BY c.class_date DESC;
END;
$$;

-- Update the main roster availability function to include conference exclusions
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
    permission_hours NUMERIC,
    conference_title TEXT
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
                SELECT 1 FROM public.conference_duty_exclusions cde
                WHERE cde.doctor_id = d.id
                  AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
            ) THEN 'at_conference'
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
        ) AS permission_hours,
        (
            SELECT c.title 
            FROM public.conference_duty_exclusions cde
            JOIN public.classes c ON cde.class_id = c.id
            WHERE cde.doctor_id = d.id
              AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
            LIMIT 1
        ) AS conference_title
    FROM public.doctors d
    WHERE d.is_active = true
    ORDER BY 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.leave_requests lr
                WHERE lr.doctor_id = d.id
                  AND lr.status = 'approved'
                  AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
            ) THEN 4
            WHEN EXISTS (
                SELECT 1 FROM public.conference_duty_exclusions cde
                WHERE cde.doctor_id = d.id
                  AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
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

-- Update roster availability summary to include conference attendees
CREATE OR REPLACE FUNCTION public.get_roster_availability_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    summary_date DATE,
    total_doctors INTEGER,
    doctors_on_leave INTEGER,
    doctors_at_conferences INTEGER,
    doctors_with_permissions INTEGER,
    fully_available_doctors INTEGER,
    doctors_on_leave_list JSONB,
    doctors_at_conferences_list JSONB,
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
            SELECT COUNT(DISTINCT cde.doctor_id)::INTEGER 
            FROM public.conference_duty_exclusions cde
            JOIN public.doctors d ON cde.doctor_id = d.id
            WHERE p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              AND d.is_active = true
        ) AS doctors_at_conferences,
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
              AND NOT EXISTS (
                  SELECT 1 FROM public.conference_duty_exclusions cde
                  WHERE cde.doctor_id = pr.doctor_id
                    AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
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
                  SELECT 1 FROM public.conference_duty_exclusions cde
                  WHERE cde.doctor_id = d.id
                    AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
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
        -- List of doctors at conferences
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', cde.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'conference_title', c.title,
                'start_date', cde.exclusion_start_date,
                'end_date', cde.exclusion_end_date
            )), '[]'::JSONB)
            FROM public.conference_duty_exclusions cde
            JOIN public.doctors d ON cde.doctor_id = d.id
            JOIN public.classes c ON cde.class_id = c.id
            WHERE p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              AND d.is_active = true
        ) AS doctors_at_conferences_list,
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
              AND NOT EXISTS (
                  SELECT 1 FROM public.conference_duty_exclusions cde
                  WHERE cde.doctor_id = d.id
                    AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              )
        ) AS available_doctors_list;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.conference_applications TO authenticated;
GRANT INSERT, UPDATE ON public.conference_applications TO authenticated;
GRANT SELECT ON public.conference_duty_exclusions TO authenticated;
GRANT SELECT ON public.doctors_at_conference_today TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_for_conference(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_conference_application(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_conference_application(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_conference_application(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctors_at_conferences(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conference_applications_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conference_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conference_applications(UUID) TO authenticated;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_duty_exclusions;

-- Add comments
COMMENT ON TABLE public.conference_applications IS 'Tracks doctor applications for conferences, seminars, and workshops';
COMMENT ON TABLE public.conference_duty_exclusions IS 'Tracks duty exclusions for doctors attending approved conferences - used in roster generation';
COMMENT ON FUNCTION public.apply_for_conference IS 'Allows a doctor to apply for a conference (deadline: 2 days before start)';
COMMENT ON FUNCTION public.approve_conference_application IS 'Admin function to approve application and create duty exclusion';
COMMENT ON FUNCTION public.reject_conference_application IS 'Admin function to reject a conference application';
COMMENT ON FUNCTION public.get_doctors_at_conferences IS 'Get list of doctors at conferences for a specific date - for roster exclusion';
