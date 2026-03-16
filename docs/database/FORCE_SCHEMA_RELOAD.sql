-- Force PostgREST schema cache reload
-- This migration does nothing but triggers PostgREST to reload schema

DO $$ 
BEGIN
  -- Notify PostgREST to reload schema
  NOTIFY pgrst, 'reload schema';
  
  -- Also try alternative notification
  PERFORM pg_notify('pgrst', 'reload schema');
  
  RAISE NOTICE 'PostgREST schema reload triggered';
END $$;
