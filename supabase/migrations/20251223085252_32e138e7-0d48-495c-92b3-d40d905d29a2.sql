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