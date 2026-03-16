-- TEST: Verify rosters table exists and structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'rosters'
ORDER BY ordinal_position;

-- TEST: Try to insert a test roster
INSERT INTO rosters (month, status, generated_by)
VALUES ('2026-02', 'DRAFT', NULL)
RETURNING id, month, status, created_at;

-- TEST: Clean up
DELETE FROM rosters WHERE month = '2026-02' AND generated_by IS NULL;
