-- FORCE PostgREST to reload schema immediately
-- Run this to trigger immediate schema reload

-- Method 1: Send notification to PostgREST
NOTIFY pgrst, 'reload schema';

-- Method 2: Alternative notification method  
SELECT pg_notify('pgrst', 'reload schema');

-- Method 3: Touch a table to trigger change detection
COMMENT ON TABLE rosters IS 'Monthly roster headers - FORCE RELOAD ' || now()::TEXT;

-- Method 4: Query the table to verify it exists
SELECT COUNT(*) as table_exists FROM rosters;

-- Verify all roster tables
SELECT 
    'rosters' as table_name,
    COUNT(*) as row_count
FROM rosters
UNION ALL
SELECT 
    'departments',
    COUNT(*)
FROM departments
UNION ALL
SELECT 
    'roster_assignments',
    COUNT(*)
FROM roster_assignments;
