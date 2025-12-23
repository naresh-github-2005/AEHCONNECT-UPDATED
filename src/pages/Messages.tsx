import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Users, 
  Calendar,
  Megaphone,
  Hash,
  Clock,
  Pin,
  ChevronLeft
} from 'lucide-react';
import { format, isToday, isTomorrow, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  description: string | null;
  duty_date: string | null;
  duty_type: string | null;
  is_auto_generated: boolean;
  created_at: string;
  unread_count?: number;
}

interface Message {
  id: string;
  channel_id: string;
  sender_id: string | null;
  sender_name: string;
  content: string;
  message_type: string;
  is_pinned: boolean;
  created_at: string;
}

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('team');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';

  // Fetch channels
  useEffect(() => {
    fetchChannels();
  }, []);

  // Fetch messages when channel changes
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      subscribeToMessages(selectedChannel.id);
    }
  }, [selectedChannel]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChannels(data || []);
      
      // Auto-select first channel
      if (data && data.length > 0 && !selectedChannel) {
        setSelectedChannel(data[0]);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = (channelId: string) => {
    const channel = supabase
      .channel(`messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Check if ID looks like a valid UUID
  const isValidUUID = (id: string | undefined) => {
    if (!id) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          sender_id: isValidUUID(user?.id) ? user?.id : null,
          sender_name: user?.name || 'Unknown',
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .insert({
          name: newChannelName.trim(),
          channel_type: newChannelType,
          description: newChannelDescription.trim() || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;
      
      setChannels(prev => [data, ...prev]);
      setSelectedChannel(data);
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelDescription('');
      
      toast({
        title: "Channel created",
        description: `#${data.name} is ready for messages`
      });
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: "Failed to create channel",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'announcement': return <Megaphone className="w-4 h-4" />;
      case 'duty': return <Calendar className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
      default: return <Hash className="w-4 h-4" />;
    }
  };

  const getChannelBadge = (channel: Channel) => {
    if (channel.duty_date) {
      const date = new Date(channel.duty_date);
      if (isToday(date)) return <Badge variant="destructive" className="text-[10px] px-1.5">Today</Badge>;
      if (isTomorrow(date)) return <Badge className="bg-amber-500 text-[10px] px-1.5">Tomorrow</Badge>;
    }
    if (channel.channel_type === 'announcement') {
      return <Badge variant="secondary" className="text-[10px] px-1.5">Announcement</Badge>;
    }
    return null;
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a');
    }
    return format(date, 'MMM d, h:mm a');
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Messages
            </h1>
            <p className="text-caption text-muted-foreground">
              Team communication & duty channels
            </p>
          </div>
          {isAdmin && (
            <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Channel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Channel Name</Label>
                    <Input
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="e.g., OT Team Updates"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newChannelType} onValueChange={setNewChannelType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team">Team Channel</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="duty">Duty-linked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      value={newChannelDescription}
                      onChange={(e) => setNewChannelDescription(e.target.value)}
                      placeholder="What's this channel for?"
                      rows={2}
                    />
                  </div>
                  <Button onClick={createChannel} className="w-full">
                    Create Channel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Channel List - Mobile: Full width when no channel selected */}
        <div className={`${selectedChannel ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-col border-r border-border bg-muted/30`}>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {channels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No channels yet</p>
                  {isAdmin && (
                    <p className="text-xs mt-1">Create one to get started</p>
                  )}
                </div>
              ) : (
                channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                      ${selectedChannel?.id === channel.id 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center
                      ${channel.channel_type === 'announcement' 
                        ? 'bg-amber-500/10 text-amber-600' 
                        : channel.channel_type === 'duty'
                        ? 'bg-blue-500/10 text-blue-600'
                        : 'bg-primary/10 text-primary'
                      }`}>
                      {getChannelIcon(channel.channel_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {channel.name}
                        </span>
                        {getChannelBadge(channel)}
                      </div>
                      {channel.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {channel.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {selectedChannel ? (
          <div className="flex-1 flex flex-col min-w-0">
            {/* Channel Header */}
            <div className="px-4 py-3 border-b border-border bg-background flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon"
                className="md:hidden"
                onClick={() => setSelectedChannel(null)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center
                ${selectedChannel.channel_type === 'announcement' 
                  ? 'bg-amber-500/10 text-amber-600' 
                  : selectedChannel.channel_type === 'duty'
                  ? 'bg-blue-500/10 text-blue-600'
                  : 'bg-primary/10 text-primary'
                }`}>
                {getChannelIcon(selectedChannel.channel_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground truncate">
                  {selectedChannel.name}
                </h2>
                {selectedChannel.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedChannel.description}
                  </p>
                )}
              </div>
              {getChannelBadge(selectedChannel)}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === user?.id;
                    const showSender = index === 0 || 
                      messages[index - 1].sender_id !== message.sender_id;
                    
                    return (
                      <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          {showSender && !isOwnMessage && (
                            <p className="text-xs font-medium text-muted-foreground mb-1 ml-1">
                              {message.sender_name}
                            </p>
                          )}
                          <div className={`rounded-2xl px-4 py-2 ${
                            message.message_type === 'announcement'
                              ? 'bg-amber-500/10 border border-amber-500/20'
                              : isOwnMessage 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}>
                            {message.is_pinned && (
                              <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                                <Pin className="w-3 h-3" />
                                Pinned
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                          </div>
                          <p className={`text-[10px] text-muted-foreground mt-1 ${isOwnMessage ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatMessageTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={isSending}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || isSending}
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a channel to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
