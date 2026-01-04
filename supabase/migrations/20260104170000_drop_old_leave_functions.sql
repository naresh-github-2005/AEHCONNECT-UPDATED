-- Drop old leave limit functions that reference removed columns
-- These functions are replaced by the simpler total_annual_leave_limit system

-- Drop old trigger first
DROP TRIGGER IF EXISTS check_leave_limit_trigger ON public.leave_requests;

-- Drop old functions
DROP FUNCTION IF EXISTS public.check_leave_limit();
DROP FUNCTION IF EXISTS public.get_doctor_leave_summary(UUID);
DROP FUNCTION IF EXISTS public.calculate_leaves_taken(UUID, leave_type, INTEGER);

-- Ensure the new trigger from leave_permissions_system is the only one active
-- The validate_leave_request_trigger checks against total_annual_leave_limit only
