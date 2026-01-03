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
