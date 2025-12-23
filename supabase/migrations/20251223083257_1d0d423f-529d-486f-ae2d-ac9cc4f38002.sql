-- Create enum for seniority levels
CREATE TYPE public.seniority_level AS ENUM ('intern', 'resident', 'fellow', 'consultant', 'senior_consultant');

-- Create enum for specialties
CREATE TYPE public.medical_specialty AS ENUM ('general', 'cornea', 'retina', 'glaucoma', 'oculoplasty', 'pediatric', 'neuro', 'cataract');

-- Add new columns to doctors table
ALTER TABLE public.doctors 
ADD COLUMN seniority seniority_level NOT NULL DEFAULT 'resident',
ADD COLUMN specialty medical_specialty NOT NULL DEFAULT 'general',
ADD COLUMN max_night_duties_per_month INTEGER NOT NULL DEFAULT 8,
ADD COLUMN max_hours_per_week INTEGER NOT NULL DEFAULT 48,
ADD COLUMN fixed_off_days TEXT[] DEFAULT '{}',
ADD COLUMN health_constraints TEXT,
ADD COLUMN can_do_opd BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN can_do_ot BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN can_do_ward BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN can_do_camp BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN can_do_night BOOLEAN NOT NULL DEFAULT true;

-- Create camps table
CREATE TABLE public.camps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  camp_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  required_doctors INTEGER NOT NULL DEFAULT 2,
  specialty_required medical_specialty,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on camps
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;

-- Camps policies
CREATE POLICY "Anyone can view camps"
ON public.camps
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage camps"
ON public.camps
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create camp assignments table
CREATE TABLE public.camp_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'confirmed', 'completed', 'cancelled')),
  UNIQUE(camp_id, doctor_id)
);

-- Enable RLS on camp_assignments
ALTER TABLE public.camp_assignments ENABLE ROW LEVEL SECURITY;

-- Camp assignments policies
CREATE POLICY "Anyone can view camp assignments"
ON public.camp_assignments
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage camp assignments"
ON public.camp_assignments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create doctor_duty_stats table for tracking fairness
CREATE TABLE public.doctor_duty_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  night_duty_count INTEGER NOT NULL DEFAULT 0,
  weekend_duty_count INTEGER NOT NULL DEFAULT 0,
  total_hours INTEGER NOT NULL DEFAULT 0,
  camp_count INTEGER NOT NULL DEFAULT 0,
  opd_sessions INTEGER NOT NULL DEFAULT 0,
  ot_sessions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, month, year)
);

-- Enable RLS on doctor_duty_stats
ALTER TABLE public.doctor_duty_stats ENABLE ROW LEVEL SECURITY;

-- Stats policies
CREATE POLICY "Anyone can view duty stats"
ON public.doctor_duty_stats
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage duty stats"
ON public.doctor_duty_stats
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger to update updated_at
CREATE TRIGGER update_doctor_duty_stats_updated_at
BEFORE UPDATE ON public.doctor_duty_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for camps
CREATE TRIGGER update_camps_updated_at
BEFORE UPDATE ON public.camps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();