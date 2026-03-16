-- Force PostgREST to reload schema cache
-- This migration adds a comment to the rosters table which triggers schema refresh

-- First, verify the table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rosters') THEN
    RAISE EXCEPTION 'Table public.rosters does not exist!';
  END IF;
  RAISE NOTICE '✅ Table public.rosters exists';
END $$;

-- Add/update comment to force schema cache refresh
COMMENT ON TABLE public.rosters IS 'Monthly roster records - schema refreshed at 2026-01-19';

-- Also comment on roster_assignments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roster_assignments') THEN
    COMMENT ON TABLE public.roster_assignments IS 'Individual duty assignments - schema refreshed at 2026-01-19';
    RAISE NOTICE '✅ Table public.roster_assignments exists';
  END IF;
END $$;

-- Notify PostgREST to reload (this is the key trigger)
NOTIFY pgrst, 'reload schema';

-- Output confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Schema reload notification sent to PostgREST';
END $$;
