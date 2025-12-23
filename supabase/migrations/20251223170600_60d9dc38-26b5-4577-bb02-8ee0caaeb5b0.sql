-- Tighten RLS policy for doctors table to require authentication
DROP POLICY IF EXISTS "Anyone can view doctors" ON public.doctors;
CREATE POLICY "Authenticated users can view doctors" 
ON public.doctors 
FOR SELECT 
TO authenticated
USING (true);

-- Tighten RLS policy for duty_assignments to require authentication
DROP POLICY IF EXISTS "Anyone can view duty assignments" ON public.duty_assignments;
CREATE POLICY "Authenticated users can view duty assignments" 
ON public.duty_assignments 
FOR SELECT 
TO authenticated
USING (true);

-- Tighten RLS policy for camps to require authentication  
DROP POLICY IF EXISTS "Anyone can view camps" ON public.camps;
CREATE POLICY "Authenticated users can view camps" 
ON public.camps 
FOR SELECT 
TO authenticated
USING (true);

-- Tighten RLS policy for camp_assignments to require authentication
DROP POLICY IF EXISTS "Anyone can view camp assignments" ON public.camp_assignments;
CREATE POLICY "Authenticated users can view camp assignments" 
ON public.camp_assignments 
FOR SELECT 
TO authenticated
USING (true);

-- Tighten RLS policy for doctor_duty_stats to require authentication
DROP POLICY IF EXISTS "Anyone can view duty stats" ON public.doctor_duty_stats;
CREATE POLICY "Authenticated users can view duty stats" 
ON public.doctor_duty_stats 
FOR SELECT 
TO authenticated
USING (true);