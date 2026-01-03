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
