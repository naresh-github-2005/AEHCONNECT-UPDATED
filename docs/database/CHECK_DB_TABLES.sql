-- Direct database query to check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('rosters', 'departments', 'roster_assignments')
ORDER BY table_name;
