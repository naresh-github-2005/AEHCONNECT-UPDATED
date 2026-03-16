-- Force PostgREST schema cache reload
-- This migration triggers PostgREST to reload its schema cache

-- Simply add a comment to an existing table to trigger schema change detection
COMMENT ON TABLE rosters IS 'Monthly roster headers - stores high-level roster information';
COMMENT ON TABLE departments IS 'Hospital departments and specialty units';
COMMENT ON TABLE roster_assignments IS 'Daily doctor assignments to departments';

-- Verify tables exist
DO $$ 
DECLARE
    v_rosters_exists boolean;
    v_departments_exists boolean;
    v_assignments_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'rosters'
    ) INTO v_rosters_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'departments'
    ) INTO v_departments_exists;
    
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'roster_assignments'
    ) INTO v_assignments_exists;
    
    IF v_rosters_exists AND v_departments_exists AND v_assignments_exists THEN
        RAISE NOTICE '✅ ALL ROSTER TABLES EXIST';
        RAISE NOTICE '   - rosters: %', v_rosters_exists;
        RAISE NOTICE '   - departments: %', v_departments_exists;
        RAISE NOTICE '   - roster_assignments: %', v_assignments_exists;
    ELSE
        RAISE EXCEPTION 'MISSING TABLES: rosters=%, departments=%, roster_assignments=%', 
            v_rosters_exists, v_departments_exists, v_assignments_exists;
    END IF;
END $$;
