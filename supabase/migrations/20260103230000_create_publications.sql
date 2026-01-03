-- Create publications table
CREATE TABLE IF NOT EXISTS public.publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE,
  doctor_name TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own publications
CREATE POLICY "Users can view own publications"
ON public.publications FOR SELECT
USING (user_id = auth.uid());

-- Admin can view all publications
CREATE POLICY "Admin can view all publications"
ON public.publications FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own publications
CREATE POLICY "Users can insert own publications"
ON public.publications FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own publications
CREATE POLICY "Users can update own publications"
ON public.publications FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own publications
CREATE POLICY "Users can delete own publications"
ON public.publications FOR DELETE
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_publications_user_id ON public.publications(user_id);
CREATE INDEX idx_publications_doctor_id ON public.publications(doctor_id);
CREATE INDEX idx_publications_created_at ON public.publications(created_at DESC);
