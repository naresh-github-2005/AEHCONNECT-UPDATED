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