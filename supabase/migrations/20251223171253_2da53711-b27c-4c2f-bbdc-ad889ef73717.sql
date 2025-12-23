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