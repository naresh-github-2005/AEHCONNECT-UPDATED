-- Allow anyone to insert messages into announcement channels (for demo/testing)
CREATE POLICY "Anyone can send messages to announcement channels"
ON public.chat_messages FOR INSERT
WITH CHECK (
  channel_id IN (SELECT id FROM public.chat_channels WHERE channel_type = 'announcement')
);