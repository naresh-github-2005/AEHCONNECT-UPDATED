-- ================================================
-- Migration: 20251223063219_eb31b3ca-13bd-4307-be71-d079f43d8932.sql
-- ================================================

-- Create enum for duty types
CREATE TYPE public.duty_type AS ENUM ('OPD', 'OT', 'Ward', 'Night Duty', 'Camp', 'Emergency');

-- Create enum for leave types
CREATE TYPE public.leave_type AS ENUM ('Casual', 'Emergency', 'Medical', 'Annual');

-- Create enum for leave status
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor');

-- Create doctors table
CREATE TABLE public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  specialization TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create duty_assignments table
CREATE TABLE public.duty_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  duty_date DATE NOT NULL,
  duty_type duty_type NOT NULL,
  unit TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type leave_type NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  details TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ai_scheduling_suggestions table
CREATE TABLE public.ai_scheduling_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_date DATE NOT NULL,
  suggestions JSONB NOT NULL,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  applied BOOLEAN DEFAULT false
);

-- Enable RLS on all tables
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scheduling_suggestions ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for doctors
CREATE POLICY "Anyone can view doctors" ON public.doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage doctors" ON public.doctors FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for duty_assignments
CREATE POLICY "Anyone can view duty assignments" ON public.duty_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage duty assignments" ON public.duty_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leave_requests
CREATE POLICY "Doctors can view own leave requests" ON public.leave_requests FOR SELECT TO authenticated 
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors can create own leave requests" ON public.leave_requests FOR INSERT TO authenticated 
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage leave requests" ON public.leave_requests FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity_logs
CREATE POLICY "Admins can view activity logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert activity logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (true);

-- RLS Policies for ai_scheduling_suggestions
CREATE POLICY "Admins can view AI suggestions" ON public.ai_scheduling_suggestions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage AI suggestions" ON public.ai_scheduling_suggestions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for doctors
CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- Migration: 20251223063240_cf76fc6c-6afb-4825-a8c2-1fb8f5bfee4d.sql
-- ================================================

-- Fix the update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ================================================
-- Migration: 20251223083257_1d0d423f-529d-486f-ae2d-ac9cc4f38002.sql
-- ================================================

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

-- ================================================
-- Migration: 20251223085252_32e138e7-0d48-495c-92b3-d40d905d29a2.sql
-- ================================================

-- Create chat channels table
CREATE TABLE public.chat_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'team', -- 'team', 'duty', 'announcement', 'direct'
  description TEXT,
  duty_date DATE, -- For duty-linked channels like "Tomorrow's OT Team"
  duty_type duty_type, -- Links to specific duty type
  is_auto_generated BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'announcement', 'system'
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel members table
CREATE TABLE public.channel_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  doctor_id UUID REFERENCES public.doctors(id),
  role TEXT DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_channels
CREATE POLICY "Users can view channels they are members of"
ON public.chat_channels FOR SELECT
USING (
  id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
  OR channel_type = 'announcement'
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage channels"
ON public.chat_channels FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their channels"
ON public.chat_messages FOR SELECT
USING (
  channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
  OR channel_id IN (SELECT id FROM public.chat_channels WHERE channel_type = 'announcement')
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can send messages to their channels"
ON public.chat_messages FOR INSERT
WITH CHECK (
  channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage all messages"
ON public.chat_messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for channel_members
CREATE POLICY "Users can view channel memberships"
ON public.channel_members FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage channel members"
ON public.channel_members FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for performance
CREATE INDEX idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX idx_chat_channels_duty_date ON public.chat_channels(duty_date);

-- Update trigger for channels
CREATE TRIGGER update_chat_channels_updated_at
BEFORE UPDATE ON public.chat_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- Migration: 20251223085841_3154d4d3-6f22-4c3e-8b5d-2641b9451347.sql
-- ================================================

-- Allow anyone to insert messages into announcement channels (for demo/testing)
CREATE POLICY "Anyone can send messages to announcement channels"
ON public.chat_messages FOR INSERT
WITH CHECK (
  channel_id IN (SELECT id FROM public.chat_channels WHERE channel_type = 'announcement')
);

-- ================================================
-- Migration: 20251223164204_209b9152-4a63-4313-b877-aa93d80f6bac.sql
-- ================================================

-- Add designation enum type
CREATE TYPE public.designation_level AS ENUM ('pg', 'fellow', 'mo', 'consultant');

-- Add new duty types to existing enum
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Cataract OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Retina OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Glaucoma OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Cornea OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Today Doctor';

-- Add new columns to doctors table
ALTER TABLE public.doctors 
ADD COLUMN IF NOT EXISTS designation designation_level DEFAULT 'pg',
ADD COLUMN IF NOT EXISTS performance_score integer DEFAULT 70 CHECK (performance_score >= 0 AND performance_score <= 100),
ADD COLUMN IF NOT EXISTS eligible_duties text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Unit 1';

-- Update existing doctors with realistic data (cast to enum properly)
UPDATE public.doctors SET 
  designation = CASE 
    WHEN seniority = 'senior_consultant' THEN 'consultant'::designation_level
    WHEN seniority = 'consultant' THEN 'mo'::designation_level
    WHEN seniority = 'fellow' THEN 'fellow'::designation_level
    ELSE 'pg'::designation_level
  END,
  performance_score = CASE 
    WHEN seniority IN ('senior_consultant', 'consultant') THEN 85 + floor(random() * 10)::integer
    WHEN seniority = 'fellow' THEN 75 + floor(random() * 15)::integer
    ELSE 60 + floor(random() * 20)::integer
  END;

-- Set eligible duties based on designation
UPDATE public.doctors SET eligible_duties = ARRAY['Cataract OT', 'Retina OT', 'Glaucoma OT', 'OPD', 'Today Doctor']
WHERE designation IN ('consultant', 'mo');

UPDATE public.doctors SET eligible_duties = ARRAY['Cataract OT', 'Glaucoma OT', 'OPD', 'Night Duty']
WHERE designation = 'fellow';

UPDATE public.doctors SET eligible_duties = ARRAY['OPD', 'Ward', 'Night Duty']
WHERE designation = 'pg';

-- ================================================
-- Migration: 20251223165939_5cadafc0-6ae5-4660-a9bf-c02114f026d3.sql
-- ================================================

-- Allow unauthenticated (demo mode) read access to doctors so /doctors page can load without real auth
-- NOTE: This exposes doctor phone numbers publicly; tighten this policy once real authentication is enabled.
ALTER POLICY "Anyone can view doctors" ON public.doctors TO public USING (true);

-- ================================================
-- Migration: 20251223170600_60d9dc38-26b5-4577-bb02-8ee0caaeb5b0.sql
-- ================================================

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

-- ================================================
-- Migration: 20251223171253_2da53711-b27c-4c2f-bbdc-ad889ef73717.sql
-- ================================================

-- Create swap requests table for duty exchange functionality
CREATE TABLE public.swap_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_assignment_id UUID NOT NULL REFERENCES public.duty_assignments(id) ON DELETE CASCADE,
  target_assignment_id UUID NOT NULL REFERENCES public.duty_assignments(id) ON DELETE CASCADE,
  requester_doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  target_doctor_id UUID NOT NULL REFERENCES public.doctors(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  CONSTRAINT different_assignments CHECK (requester_assignment_id != target_assignment_id)
);

-- Enable RLS
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for swap_requests
CREATE POLICY "Authenticated users can view swap requests"
ON public.swap_requests
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Doctors can create swap requests for their own duties"
ON public.swap_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requester_doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage swap requests"
ON public.swap_requests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Target doctors can update swap request status"
ON public.swap_requests
FOR UPDATE
TO authenticated
USING (
  target_doctor_id IN (
    SELECT id FROM public.doctors WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.duty_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swap_requests;

-- Set replica identity for realtime
ALTER TABLE public.duty_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.swap_requests REPLICA IDENTITY FULL;

-- ================================================
-- Migration: 20251224133102_303b3907-5cfe-4937-976f-7b1f84a426d2.sql
-- ================================================

-- Create attendance records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  punch_in TIMESTAMP WITH TIME ZONE,
  punch_out TIMESTAMP WITH TIME ZONE,
  total_hours NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'absent' CHECK (status IN ('present', 'absent', 'half-day', 'late')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Doctors can view their own attendance
CREATE POLICY "Doctors can view own attendance"
ON public.attendance_records
FOR SELECT
USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Doctors can insert their own attendance
CREATE POLICY "Doctors can punch in/out"
ON public.attendance_records
FOR INSERT
WITH CHECK (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
);

-- Doctors can update their own attendance (for punch out)
CREATE POLICY "Doctors can update own attendance"
ON public.attendance_records
FOR UPDATE
USING (
  doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Admins can manage all attendance
CREATE POLICY "Admins can manage attendance"
ON public.attendance_records
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;

-- ================================================
-- Migration: 20251226030730_98b14960-be35-4ee3-8f96-aac9f0faf660.sql
-- ================================================

-- Create class_type enum
CREATE TYPE public.class_type AS ENUM (
  'lecture',
  'grand_rounds', 
  'case_presentation',
  'journal_club',
  'complication_meeting',
  'nbems_class',
  'pharma_quiz',
  'exam',
  'other'
);

-- Create classes table for academic scheduling
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  class_type public.class_type NOT NULL DEFAULT 'lecture',
  class_date DATE NOT NULL,
  start_time TEXT NOT NULL DEFAULT '16:00',
  end_time TEXT NOT NULL DEFAULT '17:00',
  topic TEXT,
  moderator_id UUID REFERENCES public.doctors(id),
  moderator_name TEXT,
  location TEXT DEFAULT 'Conference Room',
  notes TEXT,
  batch TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create class_attendees table to track who should attend/present
CREATE TABLE public.class_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctors(id),
  doctor_name TEXT,
  role TEXT NOT NULL DEFAULT 'attendee', -- 'attendee', 'presenter', 'moderator'
  attended BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_attendees ENABLE ROW LEVEL SECURITY;

-- RLS policies for classes
CREATE POLICY "Authenticated users can view classes"
ON public.classes
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage classes"
ON public.classes
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for class_attendees
CREATE POLICY "Authenticated users can view class attendees"
ON public.class_attendees
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage class attendees"
ON public.class_attendees
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can update their own attendance"
ON public.class_attendees
FOR UPDATE
USING (
  doctor_id IN (
    SELECT id FROM doctors WHERE user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for classes
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;

-- ================================================
-- Migration: 20251231120000_add_leave_limits.sql
-- ================================================

-- Add leave management columns to doctors table
-- This migration adds leave limits and tracking for doctors

-- Add leave limit columns to doctors table
ALTER TABLE public.doctors 
ADD COLUMN max_casual_leaves INTEGER NOT NULL DEFAULT 12,
ADD COLUMN max_medical_leaves INTEGER NOT NULL DEFAULT 12,
ADD COLUMN max_emergency_leaves INTEGER NOT NULL DEFAULT 6,
ADD COLUMN max_annual_leaves INTEGER NOT NULL DEFAULT 30;

-- Create a function to calculate leaves taken from approved leave_requests
CREATE OR REPLACE FUNCTION public.calculate_leaves_taken(
  p_doctor_id UUID,
  p_leave_type leave_type,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_days INTEGER;
BEGIN
  SELECT COALESCE(SUM(end_date - start_date + 1), 0)
  INTO total_days
  FROM leave_requests
  WHERE doctor_id = p_doctor_id
    AND leave_type = p_leave_type
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  RETURN total_days;
END;
$$;

-- Create a function to get leave summary for a doctor
CREATE OR REPLACE FUNCTION public.get_doctor_leave_summary(p_doctor_id UUID)
RETURNS TABLE(
  leave_type TEXT,
  max_leaves INTEGER,
  leaves_taken INTEGER,
  leaves_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  doc RECORD;
BEGIN
  SELECT * INTO doc FROM doctors WHERE id = p_doctor_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Casual leaves
  RETURN QUERY SELECT 
    'Casual'::TEXT,
    doc.max_casual_leaves,
    calculate_leaves_taken(p_doctor_id, 'Casual', current_year),
    GREATEST(0, doc.max_casual_leaves - calculate_leaves_taken(p_doctor_id, 'Casual', current_year));
  
  -- Medical leaves
  RETURN QUERY SELECT 
    'Medical'::TEXT,
    doc.max_medical_leaves,
    calculate_leaves_taken(p_doctor_id, 'Medical', current_year),
    GREATEST(0, doc.max_medical_leaves - calculate_leaves_taken(p_doctor_id, 'Medical', current_year));
  
  -- Emergency leaves
  RETURN QUERY SELECT 
    'Emergency'::TEXT,
    doc.max_emergency_leaves,
    calculate_leaves_taken(p_doctor_id, 'Emergency', current_year),
    GREATEST(0, doc.max_emergency_leaves - calculate_leaves_taken(p_doctor_id, 'Emergency', current_year));
  
  -- Annual leaves
  RETURN QUERY SELECT 
    'Annual'::TEXT,
    doc.max_annual_leaves,
    calculate_leaves_taken(p_doctor_id, 'Annual', current_year),
    GREATEST(0, doc.max_annual_leaves - calculate_leaves_taken(p_doctor_id, 'Annual', current_year));
END;
$$;

-- Create a trigger function to validate leave requests against limits
CREATE OR REPLACE FUNCTION public.check_leave_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc RECORD;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  requested_days INTEGER;
  already_taken INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Only check on insert or when status changes to approved
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    -- Calculate requested days
    requested_days := NEW.end_date - NEW.start_date + 1;
    
    -- Get doctor's leave limits
    SELECT * INTO doc FROM doctors WHERE id = NEW.doctor_id;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Doctor not found';
    END IF;
    
    -- Get already taken leaves (excluding current request if updating)
    SELECT COALESCE(SUM(end_date - start_date + 1), 0)
    INTO already_taken
    FROM leave_requests
    WHERE doctor_id = NEW.doctor_id
      AND leave_type = NEW.leave_type
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = current_year
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Get max allowed based on leave type
    CASE NEW.leave_type
      WHEN 'Casual' THEN max_allowed := doc.max_casual_leaves;
      WHEN 'Medical' THEN max_allowed := doc.max_medical_leaves;
      WHEN 'Emergency' THEN max_allowed := doc.max_emergency_leaves;
      WHEN 'Annual' THEN max_allowed := doc.max_annual_leaves;
      ELSE max_allowed := 0;
    END CASE;
    
    -- Check if limit would be exceeded
    IF (already_taken + requested_days) > max_allowed THEN
      RAISE EXCEPTION 'Leave limit exceeded. % leaves remaining for % type. Requested: % days.',
        (max_allowed - already_taken), NEW.leave_type, requested_days;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on leave_requests
DROP TRIGGER IF EXISTS check_leave_limit_trigger ON public.leave_requests;
CREATE TRIGGER check_leave_limit_trigger
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_leave_limit();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_leaves_taken TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctor_leave_summary TO authenticated;


-- ================================================
-- Migration: 20260102091500_update_classes_add_materials.sql
-- ================================================



-- ================================================
-- Migration: 20260102134121_add_new_duty_types.sql
-- ================================================

-- Add new duty types to the duty_type enum
-- These include additional OT specialties, Daycare, Physician, and Block Room

-- Add new values to the duty_type enum
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Neuro OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'ORBIT OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Pediatrics OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'IOL OT';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Daycare';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Physician';
ALTER TYPE public.duty_type ADD VALUE IF NOT EXISTS 'Block Room';

-- Note: These new duty types enable:
-- OT specialty filters: Cataract OT, Cornea OT, Retina OT, Glaucoma OT, Neuro OT, ORBIT OT, Pediatrics OT, IOL OT
-- Standalone duty types: Daycare, Physician, Block Room


-- ================================================
-- Migration: 20260102145000_seed_doctors.sql
-- ================================================

-- Seed doctors data for roster generation
-- This creates sample doctors based on mock data structure

-- Insert doctors
INSERT INTO public.doctors (
  name, phone, department, seniority, specialty, designation,
  performance_score, unit, can_do_opd, can_do_ot, can_do_ward,
  can_do_camp, can_do_night, max_night_duties_per_month, is_active
) VALUES
  ('Dr. Anisha Menon', '+91 90000-00001', 'Ophthalmology', 'consultant', 'cataract', 'mo', 88, 'Unit 1', true, true, true, true, false, 0, true),
  ('Dr. Neethu Krishnan', '+91 90000-00002', 'Ophthalmology', 'fellow', 'glaucoma', 'fellow', 82, 'Unit 2', true, true, true, true, true, 8, true),
  ('Dr. Akhil Sharma', '+91 90000-00003', 'Ophthalmology', 'resident', 'general', 'pg', 75, 'Unit 1', true, false, true, true, true, 10, true),
  ('Dr. Priya Nair', '+91 90000-00004', 'Ophthalmology', 'fellow', 'retina', 'fellow', 90, 'Unit 3', true, true, true, true, true, 8, true),
  ('Dr. Rajesh Kumar', '+91 90000-00005', 'Ophthalmology', 'senior_consultant', 'cornea', 'consultant', 95, 'Unit 2', true, true, true, false, false, 0, true),
  ('Dr. Lakshmi Iyer', '+91 90000-00006', 'Ophthalmology', 'consultant', 'pediatric', 'consultant', 85, 'Unit 4', true, true, true, true, false, 0, true),
  ('Dr. Suresh Reddy', '+91 90000-00007', 'Ophthalmology', 'resident', 'general', 'pg', 70, 'Unit 1', true, false, true, true, true, 10, true),
  ('Dr. Meera Gupta', '+91 90000-00008', 'Ophthalmology', 'fellow', 'cataract', 'fellow', 87, 'Unit 3', true, true, true, true, true, 8, true),
  ('Dr. Vikram Singh', '+91 90000-00009', 'Ophthalmology', 'resident', 'general', 'pg', 72, 'Unit 2', true, false, true, true, true, 10, true),
  ('Dr. Sneha Pillai', '+91 90000-00010', 'Ophthalmology', 'consultant', 'oculoplasty', 'consultant', 92, 'Unit 4', true, true, true, true, false, 0, true),
  ('Dr. Arjun Menon', '+91 90000-00011', 'Ophthalmology', 'fellow', 'neuro', 'fellow', 80, 'Unit 1', true, true, true, true, true, 8, true),
  ('Dr. Divya Krishnan', '+91 90000-00012', 'Ophthalmology', 'intern', 'general', 'pg', 65, 'Unit 2', true, false, true, true, true, 12, true),
  ('Dr. Karthik Raman', '+91 90000-00013', 'Ophthalmology', 'resident', 'general', 'pg', 73, 'Unit 3', true, false, true, true, true, 10, true),
  ('Dr. Anjali Nair', '+91 90000-00014', 'Ophthalmology', 'senior_consultant', 'retina', 'consultant', 96, 'Unit 4', true, true, true, false, false, 0, true),
  ('Dr. Mohammed Rafi', '+91 90000-00015', 'Ophthalmology', 'fellow', 'glaucoma', 'fellow', 84, 'Unit 1', true, true, true, true, true, 8, true);


-- ================================================
-- Migration: 20260102160000_create_surgery_logs.sql
-- ================================================

-- Create surgery_logs table for tracking surgery videos and feedback
CREATE TABLE public.surgery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  surgery_date DATE NOT NULL,
  surgery_type TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_title TEXT,
  patient_mrn TEXT, -- Medical Record Number (optional, anonymized)
  notes TEXT,
  -- Feedback fields (filled by admin)
  feedback TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_given_by UUID REFERENCES auth.users(id),
  feedback_given_at TIMESTAMPTZ,
  -- Tracking
  is_viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  viewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_surgery_logs_doctor_id ON public.surgery_logs(doctor_id);
CREATE INDEX idx_surgery_logs_surgery_date ON public.surgery_logs(surgery_date);
CREATE INDEX idx_surgery_logs_surgery_type ON public.surgery_logs(surgery_type);

-- Enable RLS
ALTER TABLE public.surgery_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all surgery logs
CREATE POLICY "Admins can view all surgery logs"
  ON public.surgery_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Doctors can view their own surgery logs
CREATE POLICY "Doctors can view own surgery logs"
  ON public.surgery_logs FOR SELECT
  USING (
    doctor_id IN (
      SELECT id FROM public.doctors WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can insert surgery logs
CREATE POLICY "Admins can insert surgery logs"
  ON public.surgery_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can update surgery logs (for feedback)
CREATE POLICY "Admins can update surgery logs"
  ON public.surgery_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Admins can delete surgery logs
CREATE POLICY "Admins can delete surgery logs"
  ON public.surgery_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Seed sample data with Dr. Karthikeyan K.'s videos
-- Using a doctor from the seeded data (selecting by name to avoid hardcoded UUIDs)
INSERT INTO public.surgery_logs (doctor_id, surgery_date, surgery_type, video_url, video_title)
SELECT 
  d.id,
  v.surgery_date,
  v.surgery_type,
  v.video_url,
  v.video_title
FROM public.doctors d
CROSS JOIN (
  VALUES 
    ('2026-01-02'::date, 'Retina OT', 'https://youtu.be/ZP-olGO0xMg', 'Retina Surgery Case 1'),
    ('2026-01-02'::date, 'Retina OT', 'https://youtu.be/ReYqWL4kHgU', 'Retina Surgery Case 2'),
    ('2026-01-01'::date, 'Retina OT', 'https://youtu.be/IrRVjUS7lAE', 'Retina Surgery Case 3'),
    ('2025-12-31'::date, 'Retina OT', 'https://youtu.be/GGxaURTL_f0', 'Retina Surgery Case 4')
) AS v(surgery_date, surgery_type, video_url, video_title)
WHERE d.name = 'Dr. Priya Nair' -- Retina specialist from seeded doctors
LIMIT 4;


-- ================================================
-- Migration: 20260102170000_add_class_fields_and_seed_jan_2026.sql
-- ================================================

-- Add additional fields to classes table for DNB schedule compatibility
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS speaker_name TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS study_material TEXT;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS material_urls TEXT[];
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS url_display_texts TEXT[];

-- Insert January 2026 DNB Class Schedule Data
INSERT INTO public.classes (title, class_type, class_date, start_time, end_time, department, topic, speaker_name, moderator_name, study_material, material_urls, url_display_texts)
VALUES
-- Week 1
('Paediatric and Congenital Glaucoma Classification/Nomenclature and Evaluation under Anesthesia', 'lecture', '2026-01-01', '07:00', '08:00', 'Glaucoma', 'Paediatric and Congenital Glaucoma Classification/Nomenclature and Evaluation under Anesthesia', 'Dr Manaswini', 'Dr Krishna', 'AAO BSCC Series, Chapter 11 Pg No - 187-192', 
  ARRAY['https://drive.google.com/file/d/1uBXPP-Ua7vtuf3DJHD9m8RJXiq1tbWdA/view?usp=share_link', 'https://drive.google.com/file/d/1JVPWay5CdoZ-vMmiU7spCInT78N9OCpG/view?usp=share_link'],
  ARRAY['Congenital and Paediatric Glaucoma Classification and Nomenclature.pdf', 'Examination under anesthesia: Preferred Practice.pdf']),

('Idiopathic Inflammatory Orbital Disease', 'lecture', '2026-01-02', '07:00', '08:00', 'Orbit', 'Idiopathic Inflammatory Orbital Disease', 'Dr Jithin', 'Dr Jayagayathri', 'Idiopathic Orbital Inflammation: Review of Literature and New Advances',
  ARRAY['https://drive.google.com/file/d/11ZjO-hjooXKcdYRihI_1hlS0Ji5-OVum/view?usp=share_link'],
  ARRAY['idiopathic_orbital_inflammation__review_of.4.pdf']),

-- Week 2
('Fuch''s Heterochromic Uveitis', 'lecture', '2026-01-06', '07:00', '08:00', 'Uvea', 'Fuch''s Heterochromic Uveitis', 'Dr Gokul', 'Dr Balamurugan', 'A literature review on Fuchs uveitis syndrome: an update',
  ARRAY['https://drive.google.com/file/d/1yIBu7LztUEZpQL9iPGpu0zDf1F47ilNa/view?usp=share_link', 'https://drive.google.com/file/d/1XwHHYfo2UWiYnBHEuE1qs7POwiXnNDH3/view?usp=share_link'],
  ARRAY['streilein1987.pdf', 'A literature review on Fuchs uveitis syndrome: an update.pdf']),

('Case Presentation - Cornea', 'case_presentation', '2026-01-07', '07:00', '08:00', 'Cornea', 'Case Presentation', 'Dr Vanitha', 'Dr Vasanth', NULL, NULL, NULL),

('Case Presentation - Retina', 'case_presentation', '2026-01-08', '07:00', '08:00', 'Retina', 'Case Presentation', 'Dr Rucha', 'Dr Suresh', NULL, NULL, NULL),

('OCT Fundamentals', 'lecture', '2026-01-09', '07:00', '08:00', 'General', 'OCT', 'Dr Annapurna', NULL, NULL, NULL, NULL),

-- Week 3
('Paediatric Cataract - Etiology & Morphology', 'lecture', '2026-01-13', '07:00', '08:00', 'Paediatric', 'Paediatric Cataract - Etiology & Morphology', 'Dr Geeta', 'Dr Sivagami', NULL,
  ARRAY['https://drive.google.com/file/d/1mPNYgGHoTcDSS0FbRMw8Ay3E3iVlc6AS/view?usp=share_link', 'https://drive.google.com/file/d/1lUffldAq1r5Ck6SVn1ZB1izsLBbNnJpA/view?usp=share_link', 'https://www.aao.org/education/disease-review/pediatric-cataracts-overview', 'https://www.ncbi.nlm.nih.gov/books/NBK572080/'],
  ARRAY['Paediatric Cataract - Etiology Stat Pearls.pdf', 'Paediatric Cataract - Morphology AAO.pdf', 'FOR MORPHOLOGY', 'FOR ETIOLOGY']),

('Traumatic Cataract', 'lecture', '2026-01-14', '07:00', '08:00', 'Cataract', 'Traumatic Cataract', 'Dr Kaavya', 'Dr Sudha', 'Traumatic Cataract - Narrative Review',
  ARRAY['https://drive.google.com/file/d/11XSC4Wx9qifBSXQN69ijNdbe69pYtqdJ/view?usp=share_link'],
  ARRAY['Traumatic Cataract: Narrative Review.pdf']),

-- Week 4
('Case Presentation - Glaucoma', 'case_presentation', '2026-01-20', '07:00', '08:00', 'Glaucoma', 'Case Presentation', 'Dr Vanitha', 'Dr Saloni', NULL, NULL, NULL),

('Papilledema', 'lecture', '2026-01-21', '07:00', '08:00', 'Neuro', 'Papilledema', 'Dr Siddhi', 'Dr Balraj', 'Papilledma: A review',
  ARRAY['https://drive.google.com/file/d/1CGNigqRLdcOg2pDpEHDqpPi7Rhyq86pG/view?usp=share_link'],
  ARRAY['Papilledema: A review of etiology, pathophysiology, diagnosis, and management.pdf']),

('Retinal Toxicity of Systemic Drugs', 'lecture', '2026-01-22', '07:00', '08:00', 'Retina', 'Retinal Toxicity of Systemic Drugs', 'Dr Suhas', 'Dr Suresh', 'The Impact of Systemic Medications on Retinal Function',
  ARRAY['https://drive.google.com/file/d/13lVrTQcFpgFJPK5Ydgx58P_Yi-uFXcTg/view?usp=sharing', 'https://drive.google.com/file/d/1QTpRfBTKC-kZPIq45l_M5lMbAJYZUoWT/view?usp=share_link'],
  ARRAY['Update on Retinal Drug Toxicities.pdf', 'The Impact of Systemic Medications on Retinal Function.pdf']),

('OCT Advanced', 'lecture', '2026-01-23', '07:00', '08:00', 'General', 'OCT', 'Dr Annapurna', NULL, NULL, NULL, NULL),

-- Week 5
('Neonatal Conjunctivitis', 'lecture', '2026-01-27', '07:00', '08:00', 'Cornea', 'Neonatal Conjunctivitis', 'Dr Utkarsh, Dr Meena', 'Dr Rashmita', 'Neonatal Conjunctivitis: Review',
  ARRAY['https://drive.google.com/file/d/1At7-k0g8TBMMn9ePtreHEjJ65DOSfwVV/view?usp=share_link'],
  ARRAY['Neonatal Conjunctivitis: Review.pdf']),

('Glaucoma Drainage Devices', 'lecture', '2026-01-28', '07:00', '08:00', 'Glaucoma', 'Glaucoma Drainage Devices', 'Dr Ojus', 'Dr Annamalai', 'Glaucoma Drainage Devices',
  ARRAY['https://eyewiki.org/Glaucoma_Drainage_Devices', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9554953/', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10807850/'],
  ARRAY['Glaucoma Drainage Devices - EyeWiki', 'A Review on Glaucoma Drainage Devices and its Complications - PMC', 'Glaucoma Drainage Device Implantation, Outcomes, and Complications - PMC']),

('Radiation/Solar Retinopathy', 'lecture', '2026-01-29', '07:00', '08:00', 'Retina', 'Radiation/Solar Retinopathy', 'Dr Neha Sapar', 'Dr Devika', 'Solar Retinopathy - A literature Review',
  ARRAY['https://pmc.ncbi.nlm.nih.gov/articles/PMC11309525/'],
  ARRAY['Solar retinopathy: A literature review - PMC']),

('Nocardia Keratitis', 'lecture', '2026-01-30', '07:00', '08:00', 'Cornea', 'Nocardia Keratitis', 'Dr Arpit, Dr Pavithra', 'Dr Kunal', 'Current Diagnostic Tools and Modalities of Nocardia Keratitis',
  ARRAY['https://drive.google.com/file/d/1nKaNFOSOoaSnweu6uDHOR2bpFZKxOUTm/view?usp=share_link'],
  ARRAY['Current diagnostic tools and management modalities of Nocardia keratitis.pdf']);


-- ================================================
-- Migration: 20260103100000_create_department_channels.sql
-- ================================================

-- Add category and parent_channel_id for channel hierarchy
ALTER TABLE public.chat_channels 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS parent_channel_id UUID REFERENCES public.chat_channels(id),
ADD COLUMN IF NOT EXISTS eligible_duties TEXT[];

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_chat_channels_category ON public.chat_channels(category);

-- Insert all department channels with proper categorization

-- OPD Main Channel (parent for all OPD sub-units)
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES ('OPD', 'department', 'All OPD related discussions', 'OPD', 
  ARRAY['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Free Unit', 'Cornea', 'Retina', 'Glaucoma', 'Neuro-Ophthalmology', 'IOL', 'UVEA', 'ORBIT', 'Pediatric', 'OPD'],
  true)
ON CONFLICT DO NOTHING;

-- OPD Sub-units
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES 
  ('Unit 1', 'department', 'Unit 1 OPD discussions', 'OPD', ARRAY['Unit 1'], true),
  ('Unit 2', 'department', 'Unit 2 OPD discussions', 'OPD', ARRAY['Unit 2'], true),
  ('Unit 3', 'department', 'Unit 3 OPD discussions', 'OPD', ARRAY['Unit 3'], true),
  ('Unit 4', 'department', 'Unit 4 OPD discussions', 'OPD', ARRAY['Unit 4'], true),
  ('Free Unit', 'department', 'Free Unit OPD discussions', 'OPD', ARRAY['Free Unit'], true),
  ('Cornea', 'department', 'Cornea OPD discussions', 'OPD', ARRAY['Cornea'], true),
  ('Retina', 'department', 'Retina OPD discussions', 'OPD', ARRAY['Retina'], true),
  ('Glaucoma', 'department', 'Glaucoma OPD discussions', 'OPD', ARRAY['Glaucoma'], true),
  ('Neuro-Ophthalmology', 'department', 'Neuro-Ophthalmology OPD discussions', 'OPD', ARRAY['Neuro-Ophthalmology'], true),
  ('IOL', 'department', 'IOL OPD discussions', 'OPD', ARRAY['IOL'], true),
  ('UVEA', 'department', 'UVEA OPD discussions', 'OPD', ARRAY['UVEA'], true),
  ('ORBIT', 'department', 'ORBIT OPD discussions', 'OPD', ARRAY['ORBIT'], true),
  ('Pediatric', 'department', 'Pediatric OPD discussions', 'OPD', ARRAY['Pediatric'], true)
ON CONFLICT DO NOTHING;

-- OT Main Channel (parent for all OT specialties)
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES ('OT', 'department', 'All OT related discussions', 'OT',
  ARRAY['Cataract OT', 'Cornea OT', 'Retina OT', 'Glaucoma OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT'],
  true)
ON CONFLICT DO NOTHING;

-- OT Specialty Channels
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES 
  ('Cataract OT', 'department', 'Cataract OT discussions', 'OT', ARRAY['Cataract OT'], true),
  ('Cornea OT', 'department', 'Cornea OT discussions', 'OT', ARRAY['Cornea OT'], true),
  ('Retina OT', 'department', 'Retina OT discussions', 'OT', ARRAY['Retina OT'], true),
  ('Glaucoma OT', 'department', 'Glaucoma OT discussions', 'OT', ARRAY['Glaucoma OT'], true),
  ('Neuro OT', 'department', 'Neuro OT discussions', 'OT', ARRAY['Neuro OT'], true),
  ('ORBIT OT', 'department', 'ORBIT OT discussions', 'OT', ARRAY['ORBIT OT'], true),
  ('Pediatrics OT', 'department', 'Pediatrics OT discussions', 'OT', ARRAY['Pediatrics OT'], true),
  ('IOL OT', 'department', 'IOL OT discussions', 'OT', ARRAY['IOL OT'], true)
ON CONFLICT DO NOTHING;

-- Ward Channel
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES ('Ward', 'department', 'Ward duty discussions', 'Ward', ARRAY['Ward'], true)
ON CONFLICT DO NOTHING;

-- Camp Main Channel (parent for camp types)
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES ('Camp', 'department', 'All Camp related discussions', 'Camp', ARRAY['Stay Camp', 'Day Camp', 'Camp'], true)
ON CONFLICT DO NOTHING;

-- Camp Sub-types
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES 
  ('Stay Camp', 'department', 'Stay Camp discussions', 'Camp', ARRAY['Stay Camp'], true),
  ('Day Camp', 'department', 'Day Camp discussions', 'Camp', ARRAY['Day Camp'], true)
ON CONFLICT DO NOTHING;

-- Other Department Channels
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES 
  ('Daycare', 'department', 'Daycare discussions', 'Daycare', ARRAY['Daycare'], true),
  ('Physician', 'department', 'Physician duty discussions', 'Physician', ARRAY['Physician'], true),
  ('Block Room', 'department', 'Block Room discussions', 'Block Room', ARRAY['Block Room'], true),
  ('Night Duty', 'department', 'Night Duty discussions', 'Night Duty', ARRAY['Night Duty'], true),
  ('Emergency', 'department', 'Emergency discussions', 'Emergency', ARRAY['Emergency'], true)
ON CONFLICT DO NOTHING;

-- General Announcements Channel (all users)
INSERT INTO public.chat_channels (name, channel_type, description, category, eligible_duties, is_auto_generated)
VALUES ('Announcements', 'announcement', 'Hospital-wide announcements', 'General', ARRAY[]::TEXT[], true)
ON CONFLICT DO NOTHING;

-- Update RLS policy to allow doctors to see channels they are eligible for
DROP POLICY IF EXISTS "Users can view channels they are members of" ON public.chat_channels;

CREATE POLICY "Users can view eligible channels"
ON public.chat_channels FOR SELECT
USING (
  -- Admin can see all channels
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Announcement channels visible to all
  channel_type = 'announcement'
  OR
  -- Department channels visible to eligible doctors
  (channel_type = 'department' AND EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid()
    AND (
      eligible_duties IS NULL 
      OR eligible_duties = '{}'
      OR eligible_duties && d.eligible_duties
    )
  ))
  OR
  -- User is a member of the channel
  id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
);

-- Update message insert policy to allow eligible doctors to send messages
DROP POLICY IF EXISTS "Users can send messages to their channels" ON public.chat_messages;

CREATE POLICY "Users can send messages to eligible channels"
ON public.chat_messages FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
  OR
  channel_id IN (
    SELECT id FROM public.chat_channels 
    WHERE channel_type = 'department' 
    AND EXISTS (
      SELECT 1 FROM public.doctors d
      WHERE d.user_id = auth.uid()
      AND (
        eligible_duties IS NULL 
        OR eligible_duties = '{}'
        OR eligible_duties && d.eligible_duties
      )
    )
  )
  OR
  channel_id IN (SELECT id FROM public.chat_channels WHERE channel_type = 'announcement')
);

-- Function to auto-add doctors to channel_members based on eligible_duties
CREATE OR REPLACE FUNCTION sync_doctor_channel_membership()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove old memberships for this doctor
  DELETE FROM public.channel_members 
  WHERE doctor_id = NEW.id 
  AND channel_id IN (
    SELECT id FROM public.chat_channels WHERE channel_type = 'department'
  );
  
  -- Add new memberships based on eligible_duties
  INSERT INTO public.channel_members (channel_id, user_id, doctor_id, role)
  SELECT 
    c.id,
    NEW.user_id,
    NEW.id,
    'member'
  FROM public.chat_channels c
  WHERE c.channel_type = 'department'
  AND (
    c.eligible_duties IS NULL 
    OR c.eligible_duties = '{}'
    OR c.eligible_duties && NEW.eligible_duties
  )
  ON CONFLICT (channel_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync memberships when doctor is created or updated
DROP TRIGGER IF EXISTS sync_doctor_channel_membership_trigger ON public.doctors;
CREATE TRIGGER sync_doctor_channel_membership_trigger
AFTER INSERT OR UPDATE OF eligible_duties ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION sync_doctor_channel_membership();

-- Initially sync all existing doctors to channels
INSERT INTO public.channel_members (channel_id, user_id, doctor_id, role)
SELECT 
  c.id,
  d.user_id,
  d.id,
  'member'
FROM public.doctors d
CROSS JOIN public.chat_channels c
WHERE c.channel_type = 'department'
AND d.user_id IS NOT NULL
AND (
  c.eligible_duties IS NULL 
  OR c.eligible_duties = '{}'
  OR c.eligible_duties && d.eligible_duties
)
ON CONFLICT (channel_id, user_id) DO NOTHING;


-- ================================================
-- Migration: 20260103123049_seed_comprehensive_mock_data.sql
-- ================================================

-- Seed comprehensive mock data for doctor daily stats
-- Provides realistic data for Profile charts and statistics

-- COMMENTED OUT: Tables 'doctor_daily_stats' and 'academic_targets' don't exist
-- These were likely removed in later migrations or never created
-- If you need these features, create the tables first

-- Clear existing data
-- DELETE FROM doctor_daily_stats;
-- DELETE FROM academic_targets;

-- Insert academic targets for 2026
-- INSERT INTO academic_targets (doctor_id, year, conferences_target, classes_target, cds_target)
-- SELECT 
--   id,
--   2026,
--   CASE WHEN seniority IN ('intern', 'resident') THEN 12 WHEN seniority = 'fellow' THEN 15 ELSE 20 END,
--   CASE WHEN seniority IN ('intern', 'resident') THEN 30 WHEN seniority = 'fellow' THEN 35 ELSE 40 END,
--   CASE WHEN seniority IN ('intern', 'resident') THEN 6 WHEN seniority = 'fellow' THEN 8 ELSE 10 END
-- FROM doctors
-- ON CONFLICT (doctor_id, year) DO UPDATE SET
--   conferences_target = EXCLUDED.conferences_target,
--   classes_target = EXCLUDED.classes_target,
--   cds_target = EXCLUDED.cds_target;

-- Insert academic targets for 2025
-- INSERT INTO academic_targets (doctor_id, year, conferences_target, classes_target, cds_target)
-- SELECT 
--   id,
--   2025,
--   CASE WHEN seniority IN ('intern', 'resident') THEN 12 WHEN seniority = 'fellow' THEN 15 ELSE 20 END,
--   CASE WHEN seniority IN ('intern', 'resident') THEN 30 WHEN seniority = 'fellow' THEN 35 ELSE 40 END,
--   CASE WHEN seniority IN ('intern', 'resident') THEN 6 WHEN seniority = 'fellow' THEN 8 ELSE 10 END
-- FROM doctors
-- ON CONFLICT (doctor_id, year) DO NOTHING;

-- Generate 6 months of daily stats data for all doctors
-- INSERT INTO doctor_daily_stats (doctor_id, date, duty_type, patients_seen, surgeries_performed, hours_worked)
-- SELECT 
--   d.id AS doctor_id,
--   ds.work_date AS date,
--   duty_assignment.duty_type,
--   -- Patients seen
--   CASE duty_assignment.duty_type
--     WHEN 'op' THEN 15 + floor(random() * 35)::int
--     WHEN 'ot' THEN floor(random() * 5)::int
--     WHEN 'night' THEN 5 + floor(random() * 18)::int
--     WHEN 'camp' THEN 35 + floor(random() * 55)::int
--     ELSE 0
--   END AS patients_seen,
--   -- Surgeries
--   CASE duty_assignment.duty_type
--     WHEN 'ot' THEN 
--       CASE 
--         WHEN d.seniority IN ('intern', 'resident') THEN 1 + floor(random() * 3)::int
--         WHEN d.seniority = 'fellow' THEN 2 + floor(random() * 4)::int
--         ELSE 3 + floor(random() * 6)::int
--       END
--     WHEN 'night' THEN floor(random() * 2)::int
--     WHEN 'camp' THEN 5 + floor(random() * 15)::int
--     ELSE 0
--   END AS surgeries_performed,
--   -- Hours
--   CASE duty_assignment.duty_type
--     WHEN 'op' THEN round((6 + random() * 3)::numeric, 1)
--     WHEN 'ot' THEN round((5 + random() * 5)::numeric, 1)
--     WHEN 'night' THEN round((10 + random() * 4)::numeric, 1)
--     WHEN 'camp' THEN round((8 + random() * 4)::numeric, 1)
--     ELSE 0
--   END AS hours_worked
-- FROM doctors d
-- CROSS JOIN (
--   SELECT generate_series(
--     CURRENT_DATE - interval '180 days',
--     CURRENT_DATE - interval '1 day',
--     interval '1 day'
--   )::date AS work_date
-- ) ds
-- CROSS JOIN LATERAL (
--   SELECT 
--     CASE 
--       WHEN random() < 0.12 THEN NULL -- 12% off days
--       WHEN extract(dow from ds.work_date) = 0 AND random() < 0.5 THEN NULL -- Sundays 50% off
--       WHEN random() < 0.40 THEN 'op'
--       WHEN random() < 0.65 THEN 'ot'
--       WHEN random() < 0.85 THEN 'night'
--       ELSE 'camp'
--     END AS duty_type
-- ) duty_assignment
-- WHERE duty_assignment.duty_type IS NOT NULL
-- ON CONFLICT (doctor_id, date, duty_type) DO UPDATE SET
--   patients_seen = EXCLUDED.patients_seen,
--   surgeries_performed = EXCLUDED.surgeries_performed,
--   hours_worked = EXCLUDED.hours_worked;


-- ================================================
-- Migration: 20260103125303_add_conference_enum_and_seed.sql
-- ================================================

-- Add 'conference' and 'seminar' to class_type enum
-- This must be done in a separate transaction before using the new values

ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'conference';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'seminar';
ALTER TYPE public.class_type ADD VALUE IF NOT EXISTS 'workshop';


-- ================================================
-- Migration: 20260103125324_seed_academic_classes_data.sql
-- ================================================

-- Seed academic data for Profile Academic Progress section
-- Shows conducted vs attended for conferences, classes, and CDs

-- Insert conferences over the last 6 months (about 2-3 per month = ~15 total)
INSERT INTO classes (title, class_type, class_date, start_time, end_time, department, topic, speaker_name)
VALUES
  ('Annual Ophthalmology Conference', 'conference', CURRENT_DATE - interval '10 days', '09:00', '17:00', 'Ophthalmology', 'Annual departmental review', 'Dr. HOD'),
  ('Glaucoma Update Conference', 'conference', CURRENT_DATE - interval '25 days', '09:00', '16:00', 'Glaucoma', 'Latest advances in glaucoma management', 'Dr. Specialist'),
  ('Retina Summit', 'conference', CURRENT_DATE - interval '40 days', '09:00', '17:00', 'Retina', 'Retinal surgery updates', 'Dr. Retina Expert'),
  ('Cornea Workshop Conference', 'conference', CURRENT_DATE - interval '55 days', '10:00', '16:00', 'Cornea', 'Corneal transplantation techniques', 'Dr. Cornea'),
  ('Pediatric Eye Conference', 'conference', CURRENT_DATE - interval '70 days', '09:00', '15:00', 'Pediatric', 'Pediatric eye care', 'Dr. Pediatric'),
  ('Cataract Conference 2025', 'conference', CURRENT_DATE - interval '85 days', '09:00', '17:00', 'Cataract', 'New IOL technologies', 'Dr. Cataract'),
  ('Neuro-Ophthalmology Meet', 'conference', CURRENT_DATE - interval '100 days', '10:00', '16:00', 'Neuro', 'Neuro-ophthalmic disorders', 'Dr. Neuro'),
  ('Oculoplasty Conference', 'conference', CURRENT_DATE - interval '115 days', '09:00', '16:00', 'Oculoplasty', 'Reconstructive surgery', 'Dr. Oculoplasty'),
  ('Research Conference', 'conference', CURRENT_DATE - interval '130 days', '09:00', '17:00', 'Research', 'Clinical research presentations', 'Dr. Research'),
  ('Quarterly Review Conference', 'conference', CURRENT_DATE - interval '145 days', '09:00', '15:00', 'General', 'Quarterly department review', 'Dr. HOD'),
  ('Inter-Department Conference', 'conference', CURRENT_DATE - interval '160 days', '10:00', '16:00', 'General', 'Multi-specialty discussion', 'Multiple Speakers'),
  ('CME Conference', 'conference', CURRENT_DATE - interval '175 days', '09:00', '17:00', 'CME', 'Continuing medical education', 'Dr. CME Coordinator')
ON CONFLICT DO NOTHING;

-- Insert seminars and workshops
INSERT INTO classes (title, class_type, class_date, start_time, end_time, department, topic, speaker_name)
VALUES
  ('Advanced Phaco Techniques Seminar', 'seminar', CURRENT_DATE - interval '15 days', '14:00', '16:00', 'Cataract', 'Advanced phaco techniques', 'Dr. Expert'),
  ('OCT Interpretation Workshop', 'workshop', CURRENT_DATE - interval '30 days', '10:00', '13:00', 'Retina', 'OCT interpretation', 'Dr. Imaging'),
  ('Glaucoma Diagnosis Seminar', 'seminar', CURRENT_DATE - interval '45 days', '14:00', '16:00', 'Glaucoma', 'Early diagnosis techniques', 'Dr. Glaucoma'),
  ('Surgical Skills Workshop', 'workshop', CURRENT_DATE - interval '60 days', '09:00', '12:00', 'Surgery', 'Basic surgical skills', 'Dr. Surgeon'),
  ('Contact Lens Fitting Seminar', 'seminar', CURRENT_DATE - interval '75 days', '15:00', '17:00', 'Cornea', 'Contact lens fitting', 'Dr. Optometry'),
  ('Low Vision Aids Workshop', 'workshop', CURRENT_DATE - interval '90 days', '10:00', '13:00', 'Low Vision', 'Low vision rehabilitation', 'Dr. LV Expert'),
  ('Pediatric Screening Seminar', 'seminar', CURRENT_DATE - interval '105 days', '14:00', '16:00', 'Pediatric', 'Pediatric eye screening', 'Dr. Pediatric'),
  ('Emergency Eye Care Workshop', 'workshop', CURRENT_DATE - interval '120 days', '09:00', '12:00', 'Emergency', 'Emergency protocols', 'Dr. Emergency')
ON CONFLICT DO NOTHING;

-- Create attendance records for all doctors for conferences
INSERT INTO class_attendees (class_id, doctor_id, doctor_name, role, attended)
SELECT 
  c.id,
  d.id,
  d.name,
  'attendee',
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.82
    WHEN d.seniority = 'fellow' THEN 0.75
    ELSE 0.68
  END)
FROM classes c
CROSS JOIN doctors d
WHERE c.class_type = 'conference'
  AND c.class_date >= CURRENT_DATE - interval '180 days'
  AND c.class_date <= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM class_attendees ca 
    WHERE ca.class_id = c.id AND ca.doctor_id = d.id
  )
ON CONFLICT DO NOTHING;

-- Create attendance records for seminars and workshops
INSERT INTO class_attendees (class_id, doctor_id, doctor_name, role, attended)
SELECT 
  c.id,
  d.id,
  d.name,
  'attendee',
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.72
    WHEN d.seniority = 'fellow' THEN 0.68
    ELSE 0.62
  END)
FROM classes c
CROSS JOIN doctors d
WHERE c.class_type IN ('seminar', 'workshop')
  AND c.class_date >= CURRENT_DATE - interval '180 days'
  AND c.class_date <= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM class_attendees ca 
    WHERE ca.class_id = c.id AND ca.doctor_id = d.id
  )
ON CONFLICT DO NOTHING;

-- Create attendance records for existing lectures
INSERT INTO class_attendees (class_id, doctor_id, doctor_name, role, attended)
SELECT 
  c.id,
  d.id,
  d.name,
  'attendee',
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.72
    WHEN d.seniority = 'fellow' THEN 0.68
    ELSE 0.62
  END)
FROM classes c
CROSS JOIN doctors d
WHERE c.class_type = 'lecture'
  AND c.class_date >= CURRENT_DATE - interval '180 days'
  AND c.class_date <= CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM class_attendees ca 
    WHERE ca.class_id = c.id AND ca.doctor_id = d.id
  )
ON CONFLICT DO NOTHING;

-- Seed surgery_logs (CDs) for each doctor - 8-15 videos each
INSERT INTO surgery_logs (doctor_id, surgery_date, surgery_type, video_url, video_title, is_viewed, viewed_at)
SELECT 
  d.id,
  (CURRENT_DATE - (gs * 10 || ' days')::interval)::date,
  CASE (gs % 6)
    WHEN 0 THEN 'Cataract - Phaco'
    WHEN 1 THEN 'Glaucoma - Trabeculectomy'
    WHEN 2 THEN 'Retina - Vitrectomy'
    WHEN 3 THEN 'Cornea - DALK'
    WHEN 4 THEN 'Oculoplasty - Ptosis'
    ELSE 'LASIK'
  END,
  'https://videos.hospital.com/surgery/' || d.id || '/video' || gs,
  CASE (gs % 6)
    WHEN 0 THEN 'Phacoemulsification Technique #' || gs
    WHEN 1 THEN 'Trabeculectomy Procedure #' || gs
    WHEN 2 THEN 'Vitrectomy Surgery #' || gs
    WHEN 3 THEN 'DALK Surgery #' || gs
    WHEN 4 THEN 'Ptosis Correction #' || gs
    ELSE 'LASIK Procedure #' || gs
  END,
  (random() < CASE 
    WHEN d.seniority IN ('consultant', 'senior_consultant') THEN 0.68
    WHEN d.seniority = 'fellow' THEN 0.62
    ELSE 0.55
  END),
  CASE 
    WHEN random() < 0.6 THEN CURRENT_TIMESTAMP - (random() * 60 || ' days')::interval
    ELSE NULL
  END
FROM doctors d
CROSS JOIN generate_series(1, 12) gs
ON CONFLICT DO NOTHING;


-- ================================================
-- Migration: 20260103140000_update_duties_and_channels.sql
-- ================================================

-- Migration: Update eligible duties and restructure channels
-- Date: 2026-01-03

-- Step 1: Define the new duty types
-- OPD Units: Unit 1, Unit 2, Unit 3, Unit 4, Free Unit, Cornea, Retina, Glaucoma, Neuro-Ophthalmology, IOL, UVEA, ORBIT, Pediatric
-- OT Specialties: Cataract OT, Cornea OT, Retina OT, Glaucoma OT, Neuro OT, ORBIT OT, Pediatrics OT, IOL OT
-- Others: Ward, Stay Camp, Day Camp, Daycare, Physician, Block Room, Night Duty, Emergency

-- Step 2: Update all doctors with random eligible duties
DO $$
DECLARE
    doc_record RECORD;
    all_duties TEXT[] := ARRAY[
        'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Free Unit',
        'Cornea', 'Retina', 'Glaucoma', 'Neuro-Ophthalmology', 'IOL', 'UVEA', 'ORBIT', 'Pediatric',
        'Cataract OT', 'Cornea OT', 'Retina OT', 'Glaucoma OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT',
        'Ward', 'Stay Camp', 'Day Camp', 'Daycare', 'Physician', 'Block Room', 'Night Duty', 'Emergency'
    ];
    selected_duties TEXT[];
    num_duties INT;
    i INT;
    random_idx INT;
BEGIN
    FOR doc_record IN SELECT id FROM doctors LOOP
        -- Each doctor gets 5-12 random duties
        num_duties := 5 + floor(random() * 8)::INT;
        selected_duties := ARRAY[]::TEXT[];
        
        -- Shuffle and pick duties
        FOR i IN 1..num_duties LOOP
            random_idx := 1 + floor(random() * array_length(all_duties, 1))::INT;
            IF NOT all_duties[random_idx] = ANY(selected_duties) THEN
                selected_duties := array_append(selected_duties, all_duties[random_idx]);
            END IF;
        END LOOP;
        
        -- Update the doctor's eligible duties
        UPDATE doctors SET eligible_duties = selected_duties WHERE id = doc_record.id;
    END LOOP;
END $$;

-- Step 3: Delete all existing channels and messages
DELETE FROM chat_messages;
DELETE FROM channel_members;
DELETE FROM chat_channels;

-- Step 4: Create the new channel structure
-- Main department channels (parent channels)
INSERT INTO chat_channels (id, name, description, channel_type, category, eligible_duties) VALUES
-- OPD Parent - visible to anyone with any OPD unit duty
(gen_random_uuid(), 'OPD', 'General OPD discussions', 'department', 'opd', 
 ARRAY['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Free Unit', 'Cornea', 'Retina', 'Glaucoma', 'Neuro-Ophthalmology', 'IOL', 'UVEA', 'ORBIT', 'Pediatric']),

-- OPD Unit channels - visible only to doctors eligible for that specific unit
(gen_random_uuid(), 'Unit 1', 'OPD Unit 1 discussions', 'department', 'opd', ARRAY['Unit 1']),
(gen_random_uuid(), 'Unit 2', 'OPD Unit 2 discussions', 'department', 'opd', ARRAY['Unit 2']),
(gen_random_uuid(), 'Unit 3', 'OPD Unit 3 discussions', 'department', 'opd', ARRAY['Unit 3']),
(gen_random_uuid(), 'Unit 4', 'OPD Unit 4 discussions', 'department', 'opd', ARRAY['Unit 4']),
(gen_random_uuid(), 'Free Unit', 'OPD Free Unit discussions', 'department', 'opd', ARRAY['Free Unit']),
(gen_random_uuid(), 'Cornea', 'Cornea specialty discussions', 'department', 'opd', ARRAY['Cornea']),
(gen_random_uuid(), 'Retina', 'Retina specialty discussions', 'department', 'opd', ARRAY['Retina']),
(gen_random_uuid(), 'Glaucoma', 'Glaucoma specialty discussions', 'department', 'opd', ARRAY['Glaucoma']),
(gen_random_uuid(), 'Neuro-Ophthalmology', 'Neuro-Ophthalmology specialty discussions', 'department', 'opd', ARRAY['Neuro-Ophthalmology']),
(gen_random_uuid(), 'IOL', 'IOL specialty discussions', 'department', 'opd', ARRAY['IOL']),
(gen_random_uuid(), 'UVEA', 'UVEA specialty discussions', 'department', 'opd', ARRAY['UVEA']),
(gen_random_uuid(), 'ORBIT', 'ORBIT specialty discussions', 'department', 'opd', ARRAY['ORBIT']),
(gen_random_uuid(), 'Pediatric', 'Pediatric specialty discussions', 'department', 'opd', ARRAY['Pediatric']),

-- OT Parent - visible to anyone with any OT specialty duty
(gen_random_uuid(), 'OT', 'General OT discussions', 'department', 'ot',
 ARRAY['Cataract OT', 'Cornea OT', 'Retina OT', 'Glaucoma OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT']),

-- OT Specialty channels - visible only to doctors eligible for that specific OT
(gen_random_uuid(), 'Cataract OT', 'Cataract OT discussions', 'department', 'ot', ARRAY['Cataract OT']),
(gen_random_uuid(), 'Cornea OT', 'Cornea OT discussions', 'department', 'ot', ARRAY['Cornea OT']),
(gen_random_uuid(), 'Retina OT', 'Retina OT discussions', 'department', 'ot', ARRAY['Retina OT']),
(gen_random_uuid(), 'Glaucoma OT', 'Glaucoma OT discussions', 'department', 'ot', ARRAY['Glaucoma OT']),
(gen_random_uuid(), 'Neuro OT', 'Neuro OT discussions', 'department', 'ot', ARRAY['Neuro OT']),
(gen_random_uuid(), 'ORBIT OT', 'ORBIT OT discussions', 'department', 'ot', ARRAY['ORBIT OT']),
(gen_random_uuid(), 'Pediatrics OT', 'Pediatrics OT discussions', 'department', 'ot', ARRAY['Pediatrics OT']),
(gen_random_uuid(), 'IOL OT', 'IOL OT discussions', 'department', 'ot', ARRAY['IOL OT']),

-- Ward channel
(gen_random_uuid(), 'Ward', 'Ward duty discussions', 'department', 'ward', ARRAY['Ward']),

-- Camp Parent - visible to anyone with any camp duty
(gen_random_uuid(), 'Camp', 'General Camp discussions', 'department', 'camp', ARRAY['Stay Camp', 'Day Camp']),

-- Camp type channels
(gen_random_uuid(), 'Stay Camp', 'Stay Camp discussions', 'department', 'camp', ARRAY['Stay Camp']),
(gen_random_uuid(), 'Day Camp', 'Day Camp discussions', 'department', 'camp', ARRAY['Day Camp']),

-- Other department channels
(gen_random_uuid(), 'Daycare', 'Daycare duty discussions', 'department', 'daycare', ARRAY['Daycare']),
(gen_random_uuid(), 'Physician', 'Physician duty discussions', 'department', 'physician', ARRAY['Physician']),
(gen_random_uuid(), 'Block Room', 'Block Room duty discussions', 'department', 'block_room', ARRAY['Block Room']),
(gen_random_uuid(), 'Night Duty', 'Night Duty discussions', 'department', 'night_duty', ARRAY['Night Duty']),
(gen_random_uuid(), 'Emergency', 'Emergency duty discussions', 'department', 'emergency', ARRAY['Emergency']),

-- General Announcements channel - visible to all (no duty restrictions)
(gen_random_uuid(), 'Announcements', 'Hospital-wide announcements', 'announcement', 'general', NULL);


-- ================================================
-- Migration: 20260103150000_create_notes_tables.sql
-- ================================================

-- Migration: Create notes and folders tables
-- Date: 2026-01-03

-- Create folders table for organizing notes
CREATE TABLE IF NOT EXISTS public.note_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    parent_folder_id UUID REFERENCES public.note_folders(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.note_folders(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    drive_links TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON public.note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_note_folders_parent ON public.note_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON public.notes(folder_id);

-- Enable Row Level Security
ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for note_folders
CREATE POLICY "Users can view their own folders"
    ON public.note_folders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders"
    ON public.note_folders FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
    ON public.note_folders FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
    ON public.note_folders FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for notes
CREATE POLICY "Users can view their own notes"
    ON public.notes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
    ON public.notes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON public.notes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON public.notes FOR DELETE
    USING (auth.uid() = user_id);


-- ================================================
-- Migration: 20260103160000_leave_permissions_system.sql
-- ================================================

-- Migration: Leave and Permission Management System
-- Total leave: 25 days per year (across all types)
-- Permission: 3 hours per month maximum

-- First, update the leave_type enum to replace 'Annual' with 'Festival'
ALTER TYPE public.leave_type ADD VALUE IF NOT EXISTS 'Festival';

-- Create permission_requests table
CREATE TABLE IF NOT EXISTS public.permission_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES public.doctors(id) ON DELETE CASCADE NOT NULL,
  permission_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours_requested DECIMAL(3,1) NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- Enable RLS on permission_requests
ALTER TABLE public.permission_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permission_requests
CREATE POLICY "Doctors can view own permission requests" ON public.permission_requests 
  FOR SELECT TO authenticated 
  USING (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can create own permission requests" ON public.permission_requests 
  FOR INSERT TO authenticated 
  WITH CHECK (doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage permission requests" ON public.permission_requests 
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'));

-- Add total_annual_leave_limit column to doctors table if not exists
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS total_annual_leave_limit INTEGER DEFAULT 25;
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS monthly_permission_hours DECIMAL(3,1) DEFAULT 3.0;

-- Drop old individual leave limit columns if they exist and create new structure
-- First check and add the columns we need
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS festival_leaves_taken INTEGER DEFAULT 0;

-- Create or replace function to get total leaves taken this year
CREATE OR REPLACE FUNCTION public.get_total_leaves_taken(
  p_doctor_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_days INTEGER;
BEGIN
  SELECT COALESCE(SUM(
    (end_date - start_date + 1)::INTEGER
  ), 0)
  INTO total_days
  FROM leave_requests
  WHERE doctor_id = p_doctor_id
    AND status = 'approved'
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  RETURN total_days;
END;
$$;

-- Create or replace function to get leaves taken by type this year
CREATE OR REPLACE FUNCTION public.get_leaves_by_type(
  p_doctor_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE(
  leave_type TEXT,
  days_taken INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.leave_type::TEXT,
    COALESCE(SUM((lr.end_date - lr.start_date + 1)::INTEGER), 0)::INTEGER as days_taken
  FROM leave_requests lr
  WHERE lr.doctor_id = p_doctor_id
    AND lr.status = 'approved'
    AND EXTRACT(YEAR FROM lr.start_date) = p_year
  GROUP BY lr.leave_type;
END;
$$;

-- Create function to get permission hours used this month
CREATE OR REPLACE FUNCTION public.get_permission_hours_used(
  p_doctor_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_hours DECIMAL;
BEGIN
  SELECT COALESCE(SUM(hours_requested), 0)
  INTO total_hours
  FROM permission_requests
  WHERE doctor_id = p_doctor_id
    AND status = 'approved'
    AND EXTRACT(YEAR FROM permission_date) = p_year
    AND EXTRACT(MONTH FROM permission_date) = p_month;
  
  RETURN total_hours;
END;
$$;

-- Create trigger function to validate leave request against total annual limit
CREATE OR REPLACE FUNCTION public.validate_leave_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_limit INTEGER;
  already_taken INTEGER;
  requested_days INTEGER;
  remaining_days INTEGER;
BEGIN
  -- Only validate on insert or when status changes to approved
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    -- Get total annual limit
    SELECT COALESCE(total_annual_leave_limit, 25) INTO total_limit
    FROM doctors WHERE id = NEW.doctor_id;
    
    -- Get already taken leaves this year
    SELECT COALESCE(SUM((end_date - start_date + 1)::INTEGER), 0) INTO already_taken
    FROM leave_requests
    WHERE doctor_id = NEW.doctor_id
      AND status = 'approved'
      AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM NEW.start_date)
      AND id != NEW.id;
    
    -- Calculate requested days
    requested_days := (NEW.end_date - NEW.start_date + 1)::INTEGER;
    remaining_days := total_limit - already_taken;
    
    IF requested_days > remaining_days THEN
      RAISE EXCEPTION 'Insufficient leave balance. You have % days remaining but requested % days.', remaining_days, requested_days;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS validate_leave_request_trigger ON public.leave_requests;
CREATE TRIGGER validate_leave_request_trigger
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_leave_request();

-- Create trigger function to validate permission request
CREATE OR REPLACE FUNCTION public.validate_permission_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  monthly_limit DECIMAL;
  already_used DECIMAL;
  remaining_hours DECIMAL;
BEGIN
  -- Only validate on insert or when status changes to approved
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status != 'approved') THEN
    -- Get monthly permission limit
    SELECT COALESCE(monthly_permission_hours, 3.0) INTO monthly_limit
    FROM doctors WHERE id = NEW.doctor_id;
    
    -- Get already used hours this month
    SELECT COALESCE(SUM(hours_requested), 0) INTO already_used
    FROM permission_requests
    WHERE doctor_id = NEW.doctor_id
      AND status = 'approved'
      AND EXTRACT(YEAR FROM permission_date) = EXTRACT(YEAR FROM NEW.permission_date)
      AND EXTRACT(MONTH FROM permission_date) = EXTRACT(MONTH FROM NEW.permission_date)
      AND id != NEW.id;
    
    remaining_hours := monthly_limit - already_used;
    
    IF NEW.hours_requested > remaining_hours THEN
      RAISE EXCEPTION 'Insufficient permission hours. You have % hours remaining but requested % hours.', remaining_hours, NEW.hours_requested;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for permission validation
DROP TRIGGER IF EXISTS validate_permission_request_trigger ON public.permission_requests;
CREATE TRIGGER validate_permission_request_trigger
  BEFORE INSERT OR UPDATE ON public.permission_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_permission_request();

-- Grant necessary permissions
GRANT SELECT ON public.permission_requests TO authenticated;
GRANT INSERT ON public.permission_requests TO authenticated;
GRANT UPDATE ON public.permission_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_leaves_taken TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaves_by_type TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_permission_hours_used TO authenticated;


-- ================================================
-- Migration: 20260103180000_roster_availability_system.sql
-- ================================================

-- =====================================================
-- ROSTER AVAILABILITY SYSTEM
-- Creates views and functions to track doctor availability
-- for daily roster generation
-- =====================================================

-- Drop existing objects if they exist (for clean recreation)
DROP VIEW IF EXISTS public.daily_doctor_availability CASCADE;
DROP VIEW IF EXISTS public.doctors_on_leave_today CASCADE;
DROP VIEW IF EXISTS public.doctors_with_permissions_today CASCADE;
DROP FUNCTION IF EXISTS public.get_doctors_on_leave(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_doctors_with_permissions(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_available_doctors(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_doctor_availability_for_date(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_roster_availability_summary(DATE) CASCADE;

-- =====================================================
-- 1. VIEW: Doctors on leave for today
-- =====================================================
CREATE OR REPLACE VIEW public.doctors_on_leave_today AS
SELECT 
    lr.id AS leave_request_id,
    lr.doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    lr.leave_type,
    lr.start_date,
    lr.end_date,
    lr.reason,
    lr.status,
    (lr.end_date::date - lr.start_date::date + 1) AS total_days
FROM public.leave_requests lr
JOIN public.doctors d ON lr.doctor_id = d.id
WHERE lr.status = 'approved'
  AND CURRENT_DATE BETWEEN lr.start_date::date AND lr.end_date::date
  AND d.is_active = true;

-- =====================================================
-- 2. VIEW: Doctors with permissions for today
-- =====================================================
CREATE OR REPLACE VIEW public.doctors_with_permissions_today AS
SELECT 
    pr.id AS permission_request_id,
    pr.doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    pr.permission_date,
    pr.start_time,
    pr.end_time,
    pr.hours_requested,
    pr.reason,
    pr.status
FROM public.permission_requests pr
JOIN public.doctors d ON pr.doctor_id = d.id
WHERE pr.status = 'approved'
  AND pr.permission_date::date = CURRENT_DATE
  AND d.is_active = true;

-- =====================================================
-- 3. FUNCTION: Get doctors on leave for a specific date
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_doctors_on_leave(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    leave_type public.leave_type,
    start_date DATE,
    end_date DATE,
    reason TEXT,
    days_remaining INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        lr.leave_type,
        lr.start_date::DATE,
        lr.end_date::DATE,
        lr.reason,
        (lr.end_date::DATE - p_date + 1)::INTEGER AS days_remaining
    FROM public.leave_requests lr
    JOIN public.doctors d ON lr.doctor_id = d.id
    WHERE lr.status = 'approved'
      AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
      AND d.is_active = true
    ORDER BY d.name;
END;
$$;

-- =====================================================
-- 4. FUNCTION: Get doctors with permissions for a specific date
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_doctors_with_permissions(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    permission_date DATE,
    start_time TIME,
    end_time TIME,
    hours_requested NUMERIC,
    reason TEXT,
    is_morning_permission BOOLEAN,
    is_afternoon_permission BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pr.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        pr.permission_date::DATE,
        pr.start_time::TIME,
        pr.end_time::TIME,
        pr.hours_requested,
        pr.reason,
        (pr.start_time::TIME < '12:00:00'::TIME) AS is_morning_permission,
        (pr.end_time::TIME > '12:00:00'::TIME) AS is_afternoon_permission
    FROM public.permission_requests pr
    JOIN public.doctors d ON pr.doctor_id = d.id
    WHERE pr.status = 'approved'
      AND pr.permission_date::DATE = p_date
      AND d.is_active = true
    ORDER BY d.name;
END;
$$;

-- =====================================================
-- 5. FUNCTION: Get available doctors for a specific date
-- Returns doctors who are NOT on leave and considers permissions
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_available_doctors(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    seniority public.seniority_level,
    eligible_duties TEXT[],
    availability_status TEXT,
    permission_start_time TIME,
    permission_end_time TIME,
    permission_hours NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        d.seniority,
        d.eligible_duties,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.leave_requests lr
                WHERE lr.doctor_id = d.id
                  AND lr.status = 'approved'
                  AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
            ) THEN 'on_leave'
            WHEN EXISTS (
                SELECT 1 FROM public.permission_requests pr
                WHERE pr.doctor_id = d.id
                  AND pr.status = 'approved'
                  AND pr.permission_date::DATE = p_date
            ) THEN 'partial_availability'
            ELSE 'available'
        END AS availability_status,
        (
            SELECT pr.start_time::TIME 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_start_time,
        (
            SELECT pr.end_time::TIME 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_end_time,
        (
            SELECT pr.hours_requested 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_hours
    FROM public.doctors d
    WHERE d.is_active = true
    ORDER BY 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.leave_requests lr
                WHERE lr.doctor_id = d.id
                  AND lr.status = 'approved'
                  AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
            ) THEN 3
            WHEN EXISTS (
                SELECT 1 FROM public.permission_requests pr
                WHERE pr.doctor_id = d.id
                  AND pr.status = 'approved'
                  AND pr.permission_date::DATE = p_date
            ) THEN 2
            ELSE 1
        END,
        d.name;
END;
$$;

-- =====================================================
-- 6. FUNCTION: Get specific doctor's availability for a date
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_doctor_availability_for_date(
    p_doctor_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    availability_status TEXT,
    leave_type public.leave_type,
    leave_start_date DATE,
    leave_end_date DATE,
    permission_date DATE,
    permission_start_time TIME,
    permission_end_time TIME,
    permission_hours NUMERIC,
    can_do_morning_duty BOOLEAN,
    can_do_afternoon_duty BOOLEAN,
    can_do_night_duty BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_on_leave BOOLEAN := FALSE;
    v_has_permission BOOLEAN := FALSE;
    v_permission_start TIME;
    v_permission_end TIME;
BEGIN
    -- Check if on leave
    SELECT EXISTS (
        SELECT 1 FROM public.leave_requests lr
        WHERE lr.doctor_id = p_doctor_id
          AND lr.status = 'approved'
          AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
    ) INTO v_on_leave;

    -- Check if has permission
    SELECT EXISTS (
        SELECT 1 FROM public.permission_requests pr
        WHERE pr.doctor_id = p_doctor_id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = p_date
    ) INTO v_has_permission;

    -- Get permission times if applicable
    IF v_has_permission THEN
        SELECT pr.start_time::TIME, pr.end_time::TIME
        INTO v_permission_start, v_permission_end
        FROM public.permission_requests pr
        WHERE pr.doctor_id = p_doctor_id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = p_date
        LIMIT 1;
    END IF;

    RETURN QUERY
    SELECT 
        d.id AS doctor_id,
        d.name AS doctor_name,
        CASE 
            WHEN v_on_leave THEN 'on_leave'
            WHEN v_has_permission THEN 'partial_availability'
            ELSE 'available'
        END AS availability_status,
        lr.leave_type,
        lr.start_date::DATE AS leave_start_date,
        lr.end_date::DATE AS leave_end_date,
        pr.permission_date::DATE,
        pr.start_time::TIME AS permission_start_time,
        pr.end_time::TIME AS permission_end_time,
        pr.hours_requested AS permission_hours,
        -- Can do morning duty (8 AM - 12 PM): Only if not on leave and permission doesn't block it
        CASE 
            WHEN v_on_leave THEN FALSE
            WHEN v_has_permission AND v_permission_start < '12:00:00'::TIME THEN FALSE
            ELSE TRUE
        END AS can_do_morning_duty,
        -- Can do afternoon duty (12 PM - 6 PM): Only if not on leave and permission doesn't block it
        CASE 
            WHEN v_on_leave THEN FALSE
            WHEN v_has_permission AND v_permission_end > '12:00:00'::TIME AND v_permission_start < '18:00:00'::TIME THEN FALSE
            ELSE TRUE
        END AS can_do_afternoon_duty,
        -- Can do night duty (6 PM onwards): Only if not on leave and permission doesn't overlap
        CASE 
            WHEN v_on_leave THEN FALSE
            WHEN v_has_permission AND v_permission_end > '18:00:00'::TIME THEN FALSE
            ELSE d.can_do_night
        END AS can_do_night_duty
    FROM public.doctors d
    LEFT JOIN public.leave_requests lr ON lr.doctor_id = d.id
        AND lr.status = 'approved'
        AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
    LEFT JOIN public.permission_requests pr ON pr.doctor_id = d.id
        AND pr.status = 'approved'
        AND pr.permission_date::DATE = p_date
    WHERE d.id = p_doctor_id;
END;
$$;

-- =====================================================
-- 7. FUNCTION: Get roster availability summary for a date
-- Returns counts and lists for roster planning
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_roster_availability_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    summary_date DATE,
    total_doctors INTEGER,
    doctors_on_leave INTEGER,
    doctors_with_permissions INTEGER,
    fully_available_doctors INTEGER,
    doctors_on_leave_list JSONB,
    doctors_with_permissions_list JSONB,
    available_doctors_list JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_date AS summary_date,
        (SELECT COUNT(*)::INTEGER FROM public.doctors WHERE is_active = true) AS total_doctors,
        (
            SELECT COUNT(DISTINCT lr.doctor_id)::INTEGER 
            FROM public.leave_requests lr
            JOIN public.doctors d ON lr.doctor_id = d.id
            WHERE lr.status = 'approved'
              AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              AND d.is_active = true
        ) AS doctors_on_leave,
        (
            SELECT COUNT(DISTINCT pr.doctor_id)::INTEGER 
            FROM public.permission_requests pr
            JOIN public.doctors d ON pr.doctor_id = d.id
            WHERE pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
              AND d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = pr.doctor_id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
        ) AS doctors_with_permissions,
        (
            SELECT COUNT(*)::INTEGER 
            FROM public.doctors d
            WHERE d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = d.id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.permission_requests pr
                  WHERE pr.doctor_id = d.id
                    AND pr.status = 'approved'
                    AND pr.permission_date::DATE = p_date
              )
        ) AS fully_available_doctors,
        -- List of doctors on leave
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', lr.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'leave_type', lr.leave_type,
                'start_date', lr.start_date,
                'end_date', lr.end_date
            )), '[]'::JSONB)
            FROM public.leave_requests lr
            JOIN public.doctors d ON lr.doctor_id = d.id
            WHERE lr.status = 'approved'
              AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              AND d.is_active = true
        ) AS doctors_on_leave_list,
        -- List of doctors with permissions
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', pr.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'permission_date', pr.permission_date,
                'start_time', pr.start_time,
                'end_time', pr.end_time,
                'hours_requested', pr.hours_requested
            )), '[]'::JSONB)
            FROM public.permission_requests pr
            JOIN public.doctors d ON pr.doctor_id = d.id
            WHERE pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
              AND d.is_active = true
        ) AS doctors_with_permissions_list,
        -- List of fully available doctors
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', d.id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'specialty', d.specialty,
                'designation', d.designation,
                'seniority', d.seniority,
                'eligible_duties', d.eligible_duties,
                'can_do_night', d.can_do_night,
                'can_do_ot', d.can_do_ot,
                'can_do_opd', d.can_do_opd,
                'can_do_ward', d.can_do_ward,
                'can_do_camp', d.can_do_camp
            )), '[]'::JSONB)
            FROM public.doctors d
            WHERE d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = d.id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
        ) AS available_doctors_list;
END;
$$;

-- =====================================================
-- 8. VIEW: Daily doctor availability (materialized for performance)
-- =====================================================
CREATE OR REPLACE VIEW public.daily_doctor_availability AS
SELECT 
    d.id AS doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    d.seniority,
    d.eligible_duties,
    d.can_do_night,
    d.can_do_ot,
    d.can_do_opd,
    d.can_do_ward,
    d.can_do_camp,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.leave_requests lr
            WHERE lr.doctor_id = d.id
              AND lr.status = 'approved'
              AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        ) THEN 'on_leave'
        WHEN EXISTS (
            SELECT 1 FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = CURRENT_DATE
        ) THEN 'partial_availability'
        ELSE 'available'
    END AS availability_status,
    (
        SELECT lr.leave_type 
        FROM public.leave_requests lr
        WHERE lr.doctor_id = d.id
          AND lr.status = 'approved'
          AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        LIMIT 1
    ) AS leave_type,
    (
        SELECT lr.end_date::DATE 
        FROM public.leave_requests lr
        WHERE lr.doctor_id = d.id
          AND lr.status = 'approved'
          AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        LIMIT 1
    ) AS leave_end_date,
    (
        SELECT pr.start_time::TIME 
        FROM public.permission_requests pr
        WHERE pr.doctor_id = d.id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = CURRENT_DATE
        LIMIT 1
    ) AS permission_start_time,
    (
        SELECT pr.end_time::TIME 
        FROM public.permission_requests pr
        WHERE pr.doctor_id = d.id
          AND pr.status = 'approved'
          AND pr.permission_date::DATE = CURRENT_DATE
        LIMIT 1
    ) AS permission_end_time
FROM public.doctors d
WHERE d.is_active = true
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.leave_requests lr
            WHERE lr.doctor_id = d.id
              AND lr.status = 'approved'
              AND CURRENT_DATE BETWEEN lr.start_date::DATE AND lr.end_date::DATE
        ) THEN 3
        WHEN EXISTS (
            SELECT 1 FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = CURRENT_DATE
        ) THEN 2
        ELSE 1
    END,
    d.name;

-- =====================================================
-- 9. Grant permissions
-- =====================================================
GRANT SELECT ON public.doctors_on_leave_today TO authenticated;
GRANT SELECT ON public.doctors_with_permissions_today TO authenticated;
GRANT SELECT ON public.daily_doctor_availability TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctors_on_leave(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctors_with_permissions(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_doctors(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctor_availability_for_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_roster_availability_summary(DATE) TO authenticated;

-- =====================================================
-- 10. Add helpful comments
-- =====================================================
COMMENT ON VIEW public.doctors_on_leave_today IS 'Shows all doctors currently on approved leave today';
COMMENT ON VIEW public.doctors_with_permissions_today IS 'Shows all doctors with approved permissions today';
COMMENT ON VIEW public.daily_doctor_availability IS 'Shows availability status of all active doctors for today';
COMMENT ON FUNCTION public.get_doctors_on_leave IS 'Returns list of doctors on approved leave for a given date';
COMMENT ON FUNCTION public.get_doctors_with_permissions IS 'Returns list of doctors with approved permissions for a given date';
COMMENT ON FUNCTION public.get_available_doctors IS 'Returns all doctors with their availability status for a given date';
COMMENT ON FUNCTION public.get_doctor_availability_for_date IS 'Returns detailed availability info for a specific doctor on a given date';
COMMENT ON FUNCTION public.get_roster_availability_summary IS 'Returns comprehensive summary for roster planning with counts and doctor lists';


-- ================================================
-- Migration: 20260103200000_fix_chat_messages_policy.sql
-- ================================================

-- Fix chat_messages INSERT policy to allow all authenticated users to send messages in group channels
-- Announcement channels: Only admins can send
-- Group channels: All authenticated users can send

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can send messages to eligible channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their channels" ON public.chat_messages;

-- Create new policy: Allow all authenticated users to send messages in group channels
CREATE POLICY "Users can send messages to group channels"
ON public.chat_messages FOR INSERT
WITH CHECK (
  -- Admin can send to any channel
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Any authenticated user can send to group channels
  (
    auth.uid() IS NOT NULL
    AND channel_id IN (
      SELECT id FROM public.chat_channels 
      WHERE channel_type = 'group'
    )
  )
);

-- Ensure select policy allows viewing messages in group channels
DROP POLICY IF EXISTS "Users can view messages in their channels" ON public.chat_messages;

CREATE POLICY "Users can view messages in accessible channels"
ON public.chat_messages FOR SELECT
USING (
  -- Admin can see all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Any authenticated user can see messages in group and announcement channels
  (
    auth.uid() IS NOT NULL
    AND channel_id IN (
      SELECT id FROM public.chat_channels 
      WHERE channel_type IN ('group', 'announcement')
    )
  )
  OR
  -- User is a member of the channel
  channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
);


-- ================================================
-- Migration: 20260103210000_fix_channel_eligibility.sql
-- ================================================

-- Update RLS policies for chat system based on eligible_duties
-- Rules:
-- 1. All eligible group members can send messages in BOTH group AND announcement channels
-- 2. Channel visibility based on doctor's eligible_duties matching channel's eligible_duties
-- 3. General category channels (category = 'general') visible to ALL authenticated users
-- 4. Admin can access everything

-- =====================================================
-- CHAT CHANNELS - Visibility based on eligible_duties
-- =====================================================

DROP POLICY IF EXISTS "Users can view channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Users can view their channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admins can manage channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Users can view eligible channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admins can manage all channels" ON public.chat_channels;

-- View channels: Based on eligible_duties OR general category
CREATE POLICY "Users can view eligible channels"
ON public.chat_channels FOR SELECT
USING (
  -- Admin can see all channels
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- General category channels visible to all authenticated users
  (auth.uid() IS NOT NULL AND category = 'general')
  OR
  -- Channels with no eligible_duties restriction (visible to all)
  (auth.uid() IS NOT NULL AND (eligible_duties IS NULL OR eligible_duties = '{}'))
  OR
  -- Channels where user's eligible_duties overlap with channel's eligible_duties
  EXISTS (
    SELECT 1 FROM public.doctors d
    WHERE d.user_id = auth.uid()
    AND d.eligible_duties && eligible_duties
  )
);

-- Admin can manage all channels
CREATE POLICY "Admins can manage all channels"
ON public.chat_channels FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- CHAT MESSAGES - Send/View based on channel eligibility
-- =====================================================

DROP POLICY IF EXISTS "Users can send messages to group channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Eligible users can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view messages in eligible channels" ON public.chat_messages;

-- All eligible members can SEND messages to channels they can see (BOTH group AND announcement)
CREATE POLICY "Eligible users can send messages"
ON public.chat_messages FOR INSERT
WITH CHECK (
  -- Admin can send to any channel
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- User can send if they can see the channel (based on eligible_duties)
  channel_id IN (
    SELECT id FROM public.chat_channels c
    WHERE 
      -- General category - all authenticated can send
      (auth.uid() IS NOT NULL AND c.category = 'general')
      OR
      -- No duty restriction - all authenticated can send
      (auth.uid() IS NOT NULL AND (c.eligible_duties IS NULL OR c.eligible_duties = '{}'))
      OR
      -- User's duties match channel's duties
      EXISTS (
        SELECT 1 FROM public.doctors d
        WHERE d.user_id = auth.uid()
        AND d.eligible_duties && c.eligible_duties
      )
  )
);

-- View messages in channels user can access
CREATE POLICY "Users can view messages in eligible channels"
ON public.chat_messages FOR SELECT
USING (
  -- Admin can see all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- User can view if they can see the channel
  channel_id IN (
    SELECT id FROM public.chat_channels c
    WHERE 
      -- General category
      (auth.uid() IS NOT NULL AND c.category = 'general')
      OR
      -- No duty restriction
      (auth.uid() IS NOT NULL AND (c.eligible_duties IS NULL OR c.eligible_duties = '{}'))
      OR
      -- User's duties match
      EXISTS (
        SELECT 1 FROM public.doctors d
        WHERE d.user_id = auth.uid()
        AND d.eligible_duties && c.eligible_duties
      )
  )
);

-- Admin can manage all messages
CREATE POLICY "Admins can manage all messages"
ON public.chat_messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));


-- ================================================
-- Migration: 20260103220000_add_chat_images.sql
-- ================================================

-- Add image support to chat messages
-- 1. Add image_url column to chat_messages
-- 2. Create storage bucket for chat images
-- 3. Set up storage policies

-- Add image_url column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-images',
  'chat-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff'];

-- Storage policies for chat images
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own chat images" ON storage.objects;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ================================================
-- Migration: 20260103230000_create_publications.sql
-- ================================================

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


-- ================================================
-- Migration: 20260104000000_add_sample_duties_jan4.sql
-- ================================================



-- ================================================
-- Migration: 20260104100000_conference_application_system.sql
-- ================================================

-- =====================================================
-- CONFERENCE APPLICATION SYSTEM
-- Allows doctors to apply for conferences
-- Admins can approve/reject applications
-- Tracks doctors attending conferences for roster exclusion
-- =====================================================

-- Drop existing functions that need to be recreated with different return types
DROP FUNCTION IF EXISTS public.get_available_doctors(DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_roster_availability_summary(DATE) CASCADE;

-- Add date range support to classes table for multi-day events
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS is_multi_day BOOLEAN DEFAULT false;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS max_attendees INTEGER;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Update existing classes to have end_date same as class_date
UPDATE public.classes SET end_date = class_date WHERE end_date IS NULL;

-- Create conference application status enum
DO $$ BEGIN
    CREATE TYPE public.conference_application_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create conference_applications table
CREATE TABLE IF NOT EXISTS public.conference_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    status public.conference_application_status NOT NULL DEFAULT 'pending',
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_by UUID REFERENCES public.doctors(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    doctor_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(class_id, doctor_id)
);

-- Create conference_duty_exclusions table to track when doctors are unavailable due to conferences
CREATE TABLE IF NOT EXISTS public.conference_duty_exclusions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES public.conference_applications(id) ON DELETE CASCADE,
    exclusion_start_date DATE NOT NULL,
    exclusion_end_date DATE NOT NULL,
    reason TEXT DEFAULT 'Conference Attendance',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(doctor_id, class_id)
);

-- Enable RLS
ALTER TABLE public.conference_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conference_duty_exclusions ENABLE ROW LEVEL SECURITY;

-- RLS policies for conference_applications
CREATE POLICY "Authenticated users can view conference applications"
ON public.conference_applications
FOR SELECT
USING (true);

CREATE POLICY "Doctors can create their own applications"
ON public.conference_applications
FOR INSERT
WITH CHECK (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
);

CREATE POLICY "Doctors can cancel their own pending applications"
ON public.conference_applications
FOR UPDATE
USING (
    doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
    AND status = 'pending'
);

CREATE POLICY "Admins can manage all applications"
ON public.conference_applications
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for conference_duty_exclusions
CREATE POLICY "Authenticated users can view conference exclusions"
ON public.conference_duty_exclusions
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage conference exclusions"
ON public.conference_duty_exclusions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_conference_application_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conference_applications_updated_at
BEFORE UPDATE ON public.conference_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_conference_application_updated_at();

-- =====================================================
-- FUNCTIONS FOR CONFERENCE APPLICATION MANAGEMENT
-- =====================================================

-- Function to apply for a conference
CREATE OR REPLACE FUNCTION public.apply_for_conference(
    p_class_id UUID,
    p_doctor_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application_id UUID;
    v_class_record RECORD;
    v_deadline DATE;
BEGIN
    -- Get class details
    SELECT * INTO v_class_record FROM public.classes WHERE id = p_class_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conference not found';
    END IF;
    
    -- Check if it's a conference type
    IF v_class_record.class_type NOT IN ('conference', 'seminar', 'workshop') THEN
        RAISE EXCEPTION 'Can only apply for conferences, seminars, or workshops';
    END IF;
    
    -- Calculate deadline (2 days before start date)
    v_deadline := COALESCE(v_class_record.application_deadline, v_class_record.class_date - INTERVAL '2 days');
    
    -- Check if deadline has passed
    IF CURRENT_DATE > v_deadline THEN
        RAISE EXCEPTION 'Application deadline has passed';
    END IF;
    
    -- Check if already applied
    IF EXISTS (SELECT 1 FROM public.conference_applications WHERE class_id = p_class_id AND doctor_id = p_doctor_id) THEN
        RAISE EXCEPTION 'You have already applied for this conference';
    END IF;
    
    -- Create application
    INSERT INTO public.conference_applications (class_id, doctor_id, doctor_notes)
    VALUES (p_class_id, p_doctor_id, p_notes)
    RETURNING id INTO v_application_id;
    
    RETURN v_application_id;
END;
$$;

-- Function to approve conference application (creates duty exclusion)
CREATE OR REPLACE FUNCTION public.approve_conference_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application RECORD;
    v_class RECORD;
BEGIN
    -- Get application
    SELECT * INTO v_application FROM public.conference_applications WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in pending status';
    END IF;
    
    -- Get class details
    SELECT * INTO v_class FROM public.classes WHERE id = v_application.class_id;
    
    -- Update application status
    UPDATE public.conference_applications
    SET 
        status = 'approved',
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes
    WHERE id = p_application_id;
    
    -- Create duty exclusion record
    INSERT INTO public.conference_duty_exclusions (
        doctor_id,
        class_id,
        application_id,
        exclusion_start_date,
        exclusion_end_date,
        reason
    )
    VALUES (
        v_application.doctor_id,
        v_application.class_id,
        p_application_id,
        v_class.class_date,
        COALESCE(v_class.end_date, v_class.class_date),
        'Conference: ' || v_class.title
    )
    ON CONFLICT (doctor_id, class_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$;

-- Function to reject conference application
CREATE OR REPLACE FUNCTION public.reject_conference_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application RECORD;
BEGIN
    -- Get application
    SELECT * INTO v_application FROM public.conference_applications WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in pending status';
    END IF;
    
    -- Update application status
    UPDATE public.conference_applications
    SET 
        status = 'rejected',
        reviewed_by = p_admin_id,
        reviewed_at = now(),
        admin_notes = p_notes
    WHERE id = p_application_id;
    
    -- Remove any existing duty exclusion (shouldn't exist but just in case)
    DELETE FROM public.conference_duty_exclusions 
    WHERE application_id = p_application_id;
    
    RETURN TRUE;
END;
$$;

-- Function to cancel conference application (by doctor)
CREATE OR REPLACE FUNCTION public.cancel_conference_application(
    p_application_id UUID,
    p_doctor_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_application RECORD;
BEGIN
    -- Get application
    SELECT * INTO v_application FROM public.conference_applications WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    
    -- Verify ownership
    IF v_application.doctor_id != p_doctor_id THEN
        RAISE EXCEPTION 'You can only cancel your own applications';
    END IF;
    
    IF v_application.status NOT IN ('pending', 'approved') THEN
        RAISE EXCEPTION 'Cannot cancel this application';
    END IF;
    
    -- Update application status
    UPDATE public.conference_applications
    SET status = 'cancelled'
    WHERE id = p_application_id;
    
    -- Remove duty exclusion if exists
    DELETE FROM public.conference_duty_exclusions 
    WHERE application_id = p_application_id;
    
    RETURN TRUE;
END;
$$;

-- =====================================================
-- VIEWS AND FUNCTIONS FOR ROSTER GENERATION
-- =====================================================

-- View: Doctors attending conferences today
CREATE OR REPLACE VIEW public.doctors_at_conference_today AS
SELECT 
    cde.id AS exclusion_id,
    cde.doctor_id,
    d.name AS doctor_name,
    d.department,
    d.unit,
    d.specialty,
    d.designation,
    c.id AS class_id,
    c.title AS conference_title,
    c.class_type,
    c.class_date AS start_date,
    c.end_date,
    c.location,
    cde.exclusion_start_date,
    cde.exclusion_end_date,
    cde.reason
FROM public.conference_duty_exclusions cde
JOIN public.doctors d ON cde.doctor_id = d.id
JOIN public.classes c ON cde.class_id = c.id
WHERE CURRENT_DATE BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
  AND d.is_active = true;

-- Function: Get doctors at conferences for a specific date
CREATE OR REPLACE FUNCTION public.get_doctors_at_conferences(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    conference_title TEXT,
    conference_start_date DATE,
    conference_end_date DATE,
    location TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cde.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        c.title AS conference_title,
        c.class_date AS conference_start_date,
        COALESCE(c.end_date, c.class_date) AS conference_end_date,
        c.location
    FROM public.conference_duty_exclusions cde
    JOIN public.doctors d ON cde.doctor_id = d.id
    JOIN public.classes c ON cde.class_id = c.id
    WHERE p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
      AND d.is_active = true
    ORDER BY d.name;
END;
$$;

-- Function: Get conference applications summary for admin
CREATE OR REPLACE FUNCTION public.get_conference_applications_summary()
RETURNS TABLE (
    class_id UUID,
    conference_title TEXT,
    class_type TEXT,
    start_date DATE,
    end_date DATE,
    location TEXT,
    total_applications BIGINT,
    pending_applications BIGINT,
    approved_applications BIGINT,
    rejected_applications BIGINT,
    application_deadline DATE,
    is_deadline_passed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id AS class_id,
        c.title AS conference_title,
        c.class_type::TEXT,
        c.class_date AS start_date,
        COALESCE(c.end_date, c.class_date) AS end_date,
        c.location,
        COUNT(ca.id) AS total_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'pending') AS pending_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'approved') AS approved_applications,
        COUNT(ca.id) FILTER (WHERE ca.status = 'rejected') AS rejected_applications,
        COALESCE(c.application_deadline, c.class_date - INTERVAL '2 days')::DATE AS application_deadline,
        CURRENT_DATE > COALESCE(c.application_deadline, c.class_date - INTERVAL '2 days') AS is_deadline_passed
    FROM public.classes c
    LEFT JOIN public.conference_applications ca ON c.id = ca.class_id
    WHERE c.class_type IN ('conference', 'seminar', 'workshop')
      AND c.class_date >= CURRENT_DATE - INTERVAL '30 days'  -- Include recent past conferences
    GROUP BY c.id, c.title, c.class_type, c.class_date, c.end_date, c.location, c.application_deadline
    ORDER BY c.class_date ASC;
END;
$$;

-- Function: Get applications for a specific conference
CREATE OR REPLACE FUNCTION public.get_conference_applications(p_class_id UUID)
RETURNS TABLE (
    application_id UUID,
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    status public.conference_application_status,
    applied_at TIMESTAMP WITH TIME ZONE,
    doctor_notes TEXT,
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id AS application_id,
        ca.doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        ca.status,
        ca.applied_at,
        ca.doctor_notes,
        rd.name AS reviewed_by_name,
        ca.reviewed_at,
        ca.admin_notes
    FROM public.conference_applications ca
    JOIN public.doctors d ON ca.doctor_id = d.id
    LEFT JOIN public.doctors rd ON ca.reviewed_by = rd.id
    WHERE ca.class_id = p_class_id
    ORDER BY 
        CASE ca.status 
            WHEN 'pending' THEN 1 
            WHEN 'approved' THEN 2 
            WHEN 'rejected' THEN 3 
            ELSE 4 
        END,
        ca.applied_at ASC;
END;
$$;

-- Function: Get doctor's conference applications
CREATE OR REPLACE FUNCTION public.get_my_conference_applications(p_doctor_id UUID)
RETURNS TABLE (
    application_id UUID,
    class_id UUID,
    conference_title TEXT,
    class_type TEXT,
    start_date DATE,
    end_date DATE,
    location TEXT,
    status public.conference_application_status,
    applied_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    application_deadline DATE,
    can_cancel BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ca.id AS application_id,
        c.id AS class_id,
        c.title AS conference_title,
        c.class_type::TEXT,
        c.class_date AS start_date,
        COALESCE(c.end_date, c.class_date) AS end_date,
        c.location,
        ca.status,
        ca.applied_at,
        ca.reviewed_at,
        ca.admin_notes,
        COALESCE(c.application_deadline, c.class_date - INTERVAL '2 days')::DATE AS application_deadline,
        (ca.status IN ('pending', 'approved') AND c.class_date > CURRENT_DATE) AS can_cancel
    FROM public.conference_applications ca
    JOIN public.classes c ON ca.class_id = c.id
    WHERE ca.doctor_id = p_doctor_id
    ORDER BY c.class_date DESC;
END;
$$;

-- Update the main roster availability function to include conference exclusions
CREATE OR REPLACE FUNCTION public.get_available_doctors(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    doctor_id UUID,
    doctor_name TEXT,
    department TEXT,
    unit TEXT,
    specialty public.medical_specialty,
    designation public.designation_level,
    seniority public.seniority_level,
    eligible_duties TEXT[],
    availability_status TEXT,
    permission_start_time TIME,
    permission_end_time TIME,
    permission_hours NUMERIC,
    conference_title TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS doctor_id,
        d.name AS doctor_name,
        d.department,
        d.unit,
        d.specialty,
        d.designation,
        d.seniority,
        d.eligible_duties,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.leave_requests lr
                WHERE lr.doctor_id = d.id
                  AND lr.status = 'approved'
                  AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
            ) THEN 'on_leave'
            WHEN EXISTS (
                SELECT 1 FROM public.conference_duty_exclusions cde
                WHERE cde.doctor_id = d.id
                  AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
            ) THEN 'at_conference'
            WHEN EXISTS (
                SELECT 1 FROM public.permission_requests pr
                WHERE pr.doctor_id = d.id
                  AND pr.status = 'approved'
                  AND pr.permission_date::DATE = p_date
            ) THEN 'partial_availability'
            ELSE 'available'
        END AS availability_status,
        (
            SELECT pr.start_time::TIME 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_start_time,
        (
            SELECT pr.end_time::TIME 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_end_time,
        (
            SELECT pr.hours_requested 
            FROM public.permission_requests pr
            WHERE pr.doctor_id = d.id
              AND pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
            LIMIT 1
        ) AS permission_hours,
        (
            SELECT c.title 
            FROM public.conference_duty_exclusions cde
            JOIN public.classes c ON cde.class_id = c.id
            WHERE cde.doctor_id = d.id
              AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
            LIMIT 1
        ) AS conference_title
    FROM public.doctors d
    WHERE d.is_active = true
    ORDER BY 
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.leave_requests lr
                WHERE lr.doctor_id = d.id
                  AND lr.status = 'approved'
                  AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
            ) THEN 4
            WHEN EXISTS (
                SELECT 1 FROM public.conference_duty_exclusions cde
                WHERE cde.doctor_id = d.id
                  AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
            ) THEN 3
            WHEN EXISTS (
                SELECT 1 FROM public.permission_requests pr
                WHERE pr.doctor_id = d.id
                  AND pr.status = 'approved'
                  AND pr.permission_date::DATE = p_date
            ) THEN 2
            ELSE 1
        END,
        d.name;
END;
$$;

-- Update roster availability summary to include conference attendees
CREATE OR REPLACE FUNCTION public.get_roster_availability_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    summary_date DATE,
    total_doctors INTEGER,
    doctors_on_leave INTEGER,
    doctors_at_conferences INTEGER,
    doctors_with_permissions INTEGER,
    fully_available_doctors INTEGER,
    doctors_on_leave_list JSONB,
    doctors_at_conferences_list JSONB,
    doctors_with_permissions_list JSONB,
    available_doctors_list JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p_date AS summary_date,
        (SELECT COUNT(*)::INTEGER FROM public.doctors WHERE is_active = true) AS total_doctors,
        (
            SELECT COUNT(DISTINCT lr.doctor_id)::INTEGER 
            FROM public.leave_requests lr
            JOIN public.doctors d ON lr.doctor_id = d.id
            WHERE lr.status = 'approved'
              AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              AND d.is_active = true
        ) AS doctors_on_leave,
        (
            SELECT COUNT(DISTINCT cde.doctor_id)::INTEGER 
            FROM public.conference_duty_exclusions cde
            JOIN public.doctors d ON cde.doctor_id = d.id
            WHERE p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              AND d.is_active = true
        ) AS doctors_at_conferences,
        (
            SELECT COUNT(DISTINCT pr.doctor_id)::INTEGER 
            FROM public.permission_requests pr
            JOIN public.doctors d ON pr.doctor_id = d.id
            WHERE pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
              AND d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = pr.doctor_id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.conference_duty_exclusions cde
                  WHERE cde.doctor_id = pr.doctor_id
                    AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              )
        ) AS doctors_with_permissions,
        (
            SELECT COUNT(*)::INTEGER 
            FROM public.doctors d
            WHERE d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = d.id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.conference_duty_exclusions cde
                  WHERE cde.doctor_id = d.id
                    AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.permission_requests pr
                  WHERE pr.doctor_id = d.id
                    AND pr.status = 'approved'
                    AND pr.permission_date::DATE = p_date
              )
        ) AS fully_available_doctors,
        -- List of doctors on leave
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', lr.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'leave_type', lr.leave_type,
                'start_date', lr.start_date,
                'end_date', lr.end_date
            )), '[]'::JSONB)
            FROM public.leave_requests lr
            JOIN public.doctors d ON lr.doctor_id = d.id
            WHERE lr.status = 'approved'
              AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              AND d.is_active = true
        ) AS doctors_on_leave_list,
        -- List of doctors at conferences
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', cde.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'conference_title', c.title,
                'start_date', cde.exclusion_start_date,
                'end_date', cde.exclusion_end_date
            )), '[]'::JSONB)
            FROM public.conference_duty_exclusions cde
            JOIN public.doctors d ON cde.doctor_id = d.id
            JOIN public.classes c ON cde.class_id = c.id
            WHERE p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              AND d.is_active = true
        ) AS doctors_at_conferences_list,
        -- List of doctors with permissions
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', pr.doctor_id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'permission_date', pr.permission_date,
                'start_time', pr.start_time,
                'end_time', pr.end_time,
                'hours_requested', pr.hours_requested
            )), '[]'::JSONB)
            FROM public.permission_requests pr
            JOIN public.doctors d ON pr.doctor_id = d.id
            WHERE pr.status = 'approved'
              AND pr.permission_date::DATE = p_date
              AND d.is_active = true
        ) AS doctors_with_permissions_list,
        -- List of fully available doctors
        (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
                'doctor_id', d.id,
                'doctor_name', d.name,
                'department', d.department,
                'unit', d.unit,
                'specialty', d.specialty,
                'designation', d.designation,
                'seniority', d.seniority,
                'eligible_duties', d.eligible_duties,
                'can_do_night', d.can_do_night,
                'can_do_ot', d.can_do_ot,
                'can_do_opd', d.can_do_opd,
                'can_do_ward', d.can_do_ward,
                'can_do_camp', d.can_do_camp
            )), '[]'::JSONB)
            FROM public.doctors d
            WHERE d.is_active = true
              AND NOT EXISTS (
                  SELECT 1 FROM public.leave_requests lr
                  WHERE lr.doctor_id = d.id
                    AND lr.status = 'approved'
                    AND p_date BETWEEN lr.start_date::DATE AND lr.end_date::DATE
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.conference_duty_exclusions cde
                  WHERE cde.doctor_id = d.id
                    AND p_date BETWEEN cde.exclusion_start_date AND cde.exclusion_end_date
              )
        ) AS available_doctors_list;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.conference_applications TO authenticated;
GRANT INSERT, UPDATE ON public.conference_applications TO authenticated;
GRANT SELECT ON public.conference_duty_exclusions TO authenticated;
GRANT SELECT ON public.doctors_at_conference_today TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_for_conference(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_conference_application(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_conference_application(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_conference_application(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_doctors_at_conferences(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conference_applications_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conference_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conference_applications(UUID) TO authenticated;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conference_duty_exclusions;

-- Add comments
COMMENT ON TABLE public.conference_applications IS 'Tracks doctor applications for conferences, seminars, and workshops';
COMMENT ON TABLE public.conference_duty_exclusions IS 'Tracks duty exclusions for doctors attending approved conferences - used in roster generation';
COMMENT ON FUNCTION public.apply_for_conference IS 'Allows a doctor to apply for a conference (deadline: 2 days before start)';
COMMENT ON FUNCTION public.approve_conference_application IS 'Admin function to approve application and create duty exclusion';
COMMENT ON FUNCTION public.reject_conference_application IS 'Admin function to reject a conference application';
COMMENT ON FUNCTION public.get_doctors_at_conferences IS 'Get list of doctors at conferences for a specific date - for roster exclusion';


-- ================================================
-- Migration: 20260104120000_add_admin_doctor_profile.sql
-- ================================================

-- Add admin user to doctors table
-- Admin user_id: cf0d7449-25ec-4aea-9a2b-ab9ed1a9ff0d

-- First, check if admin already exists and delete if present
DELETE FROM doctors WHERE user_id = 'cf0d7449-25ec-4aea-9a2b-ab9ed1a9ff0d';

-- Insert admin user
INSERT INTO doctors (
  user_id,
  name,
  phone,
  department,
  is_active,
  seniority,
  specialty,
  max_night_duties_per_month,
  max_hours_per_week,
  fixed_off_days,
  can_do_opd,
  can_do_ot,
  can_do_ward,
  can_do_camp,
  can_do_night,
  designation,
  performance_score,
  eligible_duties,
  unit,
  max_casual_leaves,
  max_medical_leaves,
  max_emergency_leaves,
  max_annual_leaves,
  total_annual_leave_limit,
  monthly_permission_hours,
  festival_leaves_taken
) VALUES (
  'cf0d7449-25ec-4aea-9a2b-ab9ed1a9ff0d',
  'Administrator',
  '+91 90000-00000',
  'Ophthalmology',
  true,
  'senior_consultant',
  'general',
  0,
  40,
  ARRAY[]::text[],
  true,
  true,
  true,
  true,
  false,
  'consultant',
  100,
  ARRAY['All Duties']::text[],
  'Admin',
  12,
  12,
  6,
  30,
  25,
  '3.0',
  0
);


-- ================================================
-- Migration: 20260104130000_create_test_marks_table.sql
-- ================================================

-- Create test_marks table for tracking fellow and PG test performance
CREATE TABLE IF NOT EXISTS test_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
  total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_marks CHECK (marks_obtained <= total_marks)
);

-- Create index for faster queries
CREATE INDEX idx_test_marks_doctor_id ON test_marks(doctor_id);
CREATE INDEX idx_test_marks_month_year ON test_marks(month, year);
CREATE INDEX idx_test_marks_created_by ON test_marks(created_by);

-- Enable RLS
ALTER TABLE test_marks ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can do everything
CREATE POLICY "Admins can manage all test marks"
  ON test_marks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Fellows and PG can view their own test marks
CREATE POLICY "Doctors can view their own test marks"
  ON test_marks
  FOR SELECT
  TO authenticated
  USING (
    doctor_id IN (
      SELECT id FROM doctors
      WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_test_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_test_marks_updated_at_trigger
  BEFORE UPDATE ON test_marks
  FOR EACH ROW
  EXECUTE FUNCTION update_test_marks_updated_at();

-- Add comment
COMMENT ON TABLE test_marks IS 'Stores test marks for fellows and PG doctors';


-- ================================================
-- Migration: 20260104140000_remove_can_do_columns.sql
-- ================================================

-- Migration: Remove can_do_* columns as data is derived from eligible_duties
-- These boolean columns (can_do_opd, can_do_ot, can_do_ward, can_do_camp, can_do_night)
-- are redundant since duty eligibility is tracked in the eligible_duties array

-- First, drop dependent view
DROP VIEW IF EXISTS public.daily_doctor_availability CASCADE;

-- Drop the redundant columns from doctors table
ALTER TABLE public.doctors DROP COLUMN can_do_opd;
ALTER TABLE public.doctors DROP COLUMN can_do_ot;
ALTER TABLE public.doctors DROP COLUMN can_do_ward;
ALTER TABLE public.doctors DROP COLUMN can_do_camp;
ALTER TABLE public.doctors DROP COLUMN can_do_night;

-- Comment explaining the change
COMMENT ON TABLE public.doctors IS 'Doctors table - uses eligible_duties array for duty type eligibility instead of individual boolean columns';


-- ================================================
-- Migration: 20260104150000_remove_additional_columns.sql
-- ================================================

-- Migration: Remove additional redundant columns from doctors table
-- Columns: fixed_off_days, health_constraints, performance_score, max_*_leaves

-- Drop the columns
ALTER TABLE public.doctors DROP COLUMN fixed_off_days;
ALTER TABLE public.doctors DROP COLUMN health_constraints;
ALTER TABLE public.doctors DROP COLUMN performance_score;
ALTER TABLE public.doctors DROP COLUMN max_casual_leaves;
ALTER TABLE public.doctors DROP COLUMN max_medical_leaves;
ALTER TABLE public.doctors DROP COLUMN max_emergency_leaves;
ALTER TABLE public.doctors DROP COLUMN max_annual_leaves;

-- Comment
COMMENT ON TABLE public.doctors IS 'Doctors table - streamlined with essential fields only';


-- ================================================
-- Migration: 20260104160000_add_sample_duty_assignments.sql
-- ================================================

-- Add sample duty assignments to populate filters
-- This ensures all units and duty types have at least one assignment

-- First, let's insert some sample duty assignments for today and upcoming days
-- We'll use existing doctor IDs from the doctors table

-- Note: This migration will add sample data for all units mentioned in filters
-- Units: Unit 1, Unit 2, Unit 3, Unit 4, Free Unit, Cornea, Retina, Glaucoma, IOL, Uvea, Orbit Pediatric, Physician, Daycare, Block Room

-- Insert assignments for Unit 1, Unit 2, Unit 3, Unit 4
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 1',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'cornea'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 2',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'retina'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 3',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'glaucoma'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Unit 4',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.specialty = 'pediatric'
LIMIT 1;

-- Free Unit
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OPD',
  'Free Unit',
  '08:00',
  '14:00'
FROM public.doctors d
WHERE d.designation = 'fellow'
LIMIT 1;

-- Specialty-based OT duties
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Cornea',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'cornea'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Retina',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'retina'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'OT',
  'Glaucoma',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'glaucoma'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'IOL OT',
  'IOL',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'cataract'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'ORBIT OT',
  'Uvea',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'oculoplasty'
LIMIT 1;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Pediatrics OT',
  'Orbit Pediatric',
  '09:00',
  '13:00'
FROM public.doctors d
WHERE d.specialty = 'pediatric'
LIMIT 1;

-- Physician duty
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Physician',
  'Physician',
  '08:00',
  '17:00'
FROM public.doctors d
WHERE d.designation = 'consultant'
LIMIT 1;

-- Daycare duty
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Daycare',
  'Daycare',
  '08:00',
  '16:00'
FROM public.doctors d
WHERE d.designation = 'mo'
LIMIT 1;

-- Block Room duty
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE,
  'Block Room',
  'Block Room',
  '07:00',
  '15:00'
FROM public.doctors d
WHERE d.designation = 'fellow'
LIMIT 1;

-- Add some assignments for the next 7 days to show in roster
-- Unit 1-4 for next week
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'OPD',
  'Unit ' || ((i % 4) + 1),
  '08:00',
  '14:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation IN ('pg', 'fellow', 'mo')
LIMIT 28;

-- Add specialty OT duties for next week
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'OT',
  CASE d.specialty
    WHEN 'cornea' THEN 'Cornea'
    WHEN 'retina' THEN 'Retina'
    WHEN 'glaucoma' THEN 'Glaucoma'
    WHEN 'cataract' THEN 'IOL'
    WHEN 'oculoplasty' THEN 'Uvea'
    WHEN 'pediatric' THEN 'Orbit Pediatric'
    ELSE 'OT-1'
  END,
  '09:00',
  '13:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.specialty IS NOT NULL
LIMIT 42;

-- Add Physician, Daycare, Block Room for the week
INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'Physician',
  'Physician',
  '08:00',
  '17:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation = 'consultant'
LIMIT 7;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'Daycare',
  'Daycare',
  '08:00',
  '16:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation IN ('mo', 'fellow')
LIMIT 7;

INSERT INTO public.duty_assignments (doctor_id, duty_date, duty_type, unit, start_time, end_time)
SELECT 
  d.id,
  CURRENT_DATE + i,
  'Block Room',
  'Block Room',
  '07:00',
  '15:00'
FROM public.doctors d
CROSS JOIN generate_series(1, 7) i
WHERE d.designation IN ('fellow', 'mo')
LIMIT 7;


-- ================================================
-- Migration: 20260104170000_drop_old_leave_functions.sql
-- ================================================

-- Drop old leave limit functions that reference removed columns
-- These functions are replaced by the simpler total_annual_leave_limit system

-- Drop old trigger first
DROP TRIGGER IF EXISTS check_leave_limit_trigger ON public.leave_requests;

-- Drop old functions
DROP FUNCTION IF EXISTS public.check_leave_limit();
DROP FUNCTION IF EXISTS public.get_doctor_leave_summary(UUID);
DROP FUNCTION IF EXISTS public.calculate_leaves_taken(UUID, leave_type, INTEGER);

-- Ensure the new trigger from leave_permissions_system is the only one active
-- The validate_leave_request_trigger checks against total_annual_leave_limit only



