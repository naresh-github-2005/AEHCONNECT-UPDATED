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
INSERT INTO public.surgery_logs (doctor_id, surgery_date, surgery_type, video_url, video_title)
VALUES 
  ('28fdd50f-474d-4c00-8618-e795d4cb5f13', '2026-01-02', 'Retina OT', 'https://youtu.be/ZP-olGO0xMg', 'Retina Surgery Case 1'),
  ('28fdd50f-474d-4c00-8618-e795d4cb5f13', '2026-01-02', 'Retina OT', 'https://youtu.be/ReYqWL4kHgU', 'Retina Surgery Case 2'),
  ('28fdd50f-474d-4c00-8618-e795d4cb5f13', '2026-01-01', 'Retina OT', 'https://youtu.be/IrRVjUS7lAE', 'Retina Surgery Case 3'),
  ('28fdd50f-474d-4c00-8618-e795d4cb5f13', '2025-12-31', 'Retina OT', 'https://youtu.be/GGxaURTL_f0', 'Retina Surgery Case 4');
