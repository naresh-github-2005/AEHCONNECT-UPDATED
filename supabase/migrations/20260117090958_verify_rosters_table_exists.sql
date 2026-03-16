-- Verify rosters table exists and force PostgREST reload
-- This migration will fail if rosters table doesn't exist

-- Test 1: Query the table (will error if doesn't exist)
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM rosters;
    RAISE NOTICE '✅ rosters table EXISTS - row count: %', v_count;
EXCEPTION
    WHEN undefined_table THEN
        RAISE EXCEPTION '❌ rosters table DOES NOT EXIST!';
END $$;

-- Test 2: Check table structure
DO $$
DECLARE
    v_columns TEXT;
BEGIN
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO v_columns
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rosters';
    
    IF v_columns IS NULL THEN
        RAISE EXCEPTION '❌ rosters table NOT FOUND in information_schema!';
    END IF;
    
    RAISE NOTICE '✅ rosters table columns: %', v_columns;
END $$;

-- Test 3: Try to insert and delete a test row
DO $$
DECLARE
    v_test_id UUID;
BEGIN
    INSERT INTO rosters (month, status)
    VALUES ('9999-99', 'DRAFT')
    RETURNING id INTO v_test_id;
    
    DELETE FROM rosters WHERE id = v_test_id;
    
    RAISE NOTICE '✅ rosters table INSERT/DELETE works! Test ID was: %', v_test_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION '❌ rosters table INSERT/DELETE failed: %', SQLERRM;
END $$;

-- Test 4: Verify other tables
DO $$
DECLARE
    v_dept_count INTEGER;
    v_assign_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_dept_count FROM departments;
    SELECT COUNT(*) INTO v_assign_count FROM roster_assignments;
    
    RAISE NOTICE '✅ departments table: % rows', v_dept_count;
    RAISE NOTICE '✅ roster_assignments table: % rows', v_assign_count;
END $$;

-- Force PostgREST to notice this change by updating table comment with timestamp
DO $$
BEGIN
    EXECUTE 'COMMENT ON TABLE rosters IS ''Monthly roster headers - Last verified: ' || NOW()::TEXT || '''';
    EXECUTE 'COMMENT ON TABLE departments IS ''Hospital departments - Last verified: ' || NOW()::TEXT || '''';
    EXECUTE 'COMMENT ON TABLE roster_assignments IS ''Daily doctor assignments - Last verified: ' || NOW()::TEXT || '''';
    RAISE NOTICE '✅ Table comments updated to force PostgREST reload';
END $$;
