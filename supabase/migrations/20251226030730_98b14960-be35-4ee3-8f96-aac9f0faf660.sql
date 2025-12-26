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