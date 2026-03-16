-- QUICK VERIFICATION SCRIPT
-- Run this anytime to verify roster system is ready

-- 1. Check all required tables exist
SELECT 
    'rosters' as table_name,
    EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rosters') as exists
UNION ALL
SELECT 
    'departments',
    EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments')
UNION ALL
SELECT 
    'roster_assignments',
    EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roster_assignments')
UNION ALL
SELECT 
    'department_requirements',
    EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'department_requirements')
UNION ALL
SELECT 
    'pg_rotation_requirements',
    EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_rotation_requirements')
UNION ALL
SELECT 
    'pg_rotation_progress',
    EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_rotation_progress');

-- 2. Check departments count
SELECT COUNT(*) as departments_count FROM departments;

-- 3. Check PG rotation requirements count
SELECT COUNT(*) as pg_requirements_count FROM pg_rotation_requirements;

-- 4. Check if any rosters exist
SELECT COUNT(*) as rosters_count FROM rosters;

-- 5. Show sample department data
SELECT id, code, name, is_specialty FROM departments LIMIT 5;
