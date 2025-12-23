-- Allow unauthenticated (demo mode) read access to doctors so /doctors page can load without real auth
-- NOTE: This exposes doctor phone numbers publicly; tighten this policy once real authentication is enabled.
ALTER POLICY "Anyone can view doctors" ON public.doctors TO public USING (true);