-- Final trigger to force PostgREST reload for RPC functions
-- Update function comments to trigger schema reload

DO $$
BEGIN
    -- Update function comments with timestamp to trigger PostgREST detection
    EXECUTE 'COMMENT ON FUNCTION public.create_roster_direct IS ''Create roster - Updated: ' || NOW()::TEXT || '''';
    EXECUTE 'COMMENT ON FUNCTION public.get_roster_by_month IS ''Get roster by month - Updated: ' || NOW()::TEXT || '''';
    EXECUTE 'COMMENT ON FUNCTION public.create_roster_assignment_direct IS ''Create assignment - Updated: ' || NOW()::TEXT || '''';
    
    RAISE NOTICE '✅ Function comments updated - PostgREST should reload';
END $$;

-- Verify functions exist and are callable
DO $$
DECLARE
    v_test_id UUID;
BEGIN
    -- Test create_roster_direct
    SELECT id INTO v_test_id
    FROM create_roster_direct('9999-99', NULL, 'DRAFT')
    LIMIT 1;
    
    -- Clean up test data
    DELETE FROM rosters WHERE month = '9999-99';
    
    RAISE NOTICE '✅ create_roster_direct function works! Test ID: %', v_test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ create_roster_direct function test failed: %', SQLERRM;
END $$;
