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
