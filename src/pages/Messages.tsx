import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Send, Plus, Users, ChevronDown, ChevronRight, Hash, Megaphone } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  category: string | null;
  eligible_duties: string[] | null;
  created_at: string;
}

interface Message {
  id: string;
  channel_id: string;
  sender_id: string | null;
  sender_name: string;
  content: string;
  created_at: string;
}

const CHANNEL_CATEGORIES = [
  { value: 'opd', label: 'OPD', icon: '🏥' },
  { value: 'ot', label: 'OT', icon: '🔬' },
  { value: 'ward', label: 'Ward', icon: '🛏️' },
  { value: 'camp', label: 'Camp', icon: '⛺' },
  { value: 'daycare', label: 'Daycare', icon: '☀️' },
  { value: 'physician', label: 'Physician', icon: '👨‍⚕️' },
  { value: 'block_room', label: 'Block Room', icon: '🚪' },
  { value: 'night_duty', label: 'Night Duty', icon: '🌙' },
  { value: 'emergency', label: 'Emergency', icon: '🚨' },
  { value: 'general', label: 'General', icon: '📢' },
];

// OPD Units
const OPD_UNITS = [
  'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Free Unit',
  'Cornea', 'Retina', 'Glaucoma', 'Neuro-Ophthalmology', 'IOL', 'UVEA', 'ORBIT', 'Pediatric'
];

// OT Specialties
const OT_SPECIALTIES = [
  'Cataract OT', 'Cornea OT', 'Retina OT', 'Glaucoma OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT'
];

// Camp Types
const CAMP_TYPES = ['Stay Camp', 'Day Camp'];

// Other Duties
const OTHER_DUTIES = ['Ward', 'Daycare', 'Physician', 'Block Room', 'Night Duty', 'Emergency'];

// All duty types combined
const ALL_DUTY_TYPES = [...OPD_UNITS, ...OT_SPECIALTIES, ...CAMP_TYPES, ...OTHER_DUTIES];

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['general', 'opd', 'ot']);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCategory, setNewChannelCategory] = useState('general');
  const [newChannelDuties, setNewChannelDuties] = useState<string[]>([]);
  const [newChannelIsAnnouncement, setNewChannelIsAnnouncement] = useState(false);
  const [myEligibleDuties, setMyEligibleDuties] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'admin';

  // Fetch current doctor's eligible duties
  useEffect(() => {
    const fetchMyDuties = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('doctors')
        .select('eligible_duties')
        .eq('user_id', user.id)
        .single();
      if (data?.eligible_duties) {
        setMyEligibleDuties(data.eligible_duties);
      }
    };
    fetchMyDuties();
  }, [user?.id]);

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (!selectedChannel) return;
    const sub = supabase
      .channel('msg-' + selectedChannel.id)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'channel_id=eq.' + selectedChannel.id },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('id, name, description, channel_type, category, eligible_duties, created_at')
        .order('category')
        .order('name');
      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
      toast({ title: 'Error', description: 'Failed to load channels', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, channel_id, sender_id, sender_name, content, created_at')
        .eq('channel_id', channelId)
        .order('created_at');
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    fetchMessages(channel.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel || !user) return;
    setSendingMessage(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        sender_name: user.name || user.email || 'Unknown',
        content: newMessage.trim()
      });
      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast({ title: 'Error', description: 'Channel name is required', variant: 'destructive' });
      return;
    }
    try {
      const { error } = await supabase.from('chat_channels').insert({
        name: newChannelName.trim(),
        category: newChannelCategory,
        channel_type: newChannelIsAnnouncement ? 'announcement' : 'department',
        eligible_duties: newChannelDuties.length > 0 ? newChannelDuties : null,
        created_by: user?.id
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Channel created successfully' });
      setCreateDialogOpen(false);
      setNewChannelName('');
      setNewChannelCategory('general');
      setNewChannelDuties([]);
      setNewChannelIsAnnouncement(false);
      fetchChannels();
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({ title: 'Error', description: 'Failed to create channel', variant: 'destructive' });
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const toggleDuty = (duty: string) => {
    setNewChannelDuties(prev => prev.includes(duty) ? prev.filter(d => d !== duty) : [...prev, duty]);
  };

  const filteredChannels = useMemo(() => {
    if (isAdmin) return channels;
    return channels.filter(ch => {
      if (!ch.eligible_duties || ch.eligible_duties.length === 0) return true;
      return ch.eligible_duties.some(d => myEligibleDuties.includes(d));
    });
  }, [channels, isAdmin, myEligibleDuties]);

  const channelsByCategory = useMemo(() => {
    const grouped: Record<string, Channel[]> = {};
    filteredChannels.forEach(ch => {
      const cat = ch.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ch);
    });
    return grouped;
  }, [filteredChannels]);

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  const formatDate = (d: string) => {
    const date = new Date(d);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] flex gap-4">
      <Card className="w-72 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Channels
            </CardTitle>
            {isAdmin && (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><Plus className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Channel</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium">Channel Name</label>
                      <Input
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        placeholder="Enter channel name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <Select value={newChannelCategory} onValueChange={setNewChannelCategory}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CHANNEL_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              [{cat.icon}] {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Eligible Duty Types</label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Select which duty types can access this channel. Leave empty for all.
                      </p>
                      <ScrollArea className="h-64 border rounded-md p-2">
                        <div className="space-y-4">
                          {/* OPD Units */}
                          <div>
                            <p className="text-xs font-semibold text-primary mb-2">OPD Units</p>
                            <div className="grid grid-cols-2 gap-1">
                              {OPD_UNITS.map((duty) => (
                                <div key={duty} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={duty}
                                    checked={newChannelDuties.includes(duty)}
                                    onCheckedChange={() => toggleDuty(duty)}
                                  />
                                  <label htmlFor={duty} className="text-xs cursor-pointer">{duty}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* OT Specialties */}
                          <div>
                            <p className="text-xs font-semibold text-primary mb-2">OT Specialties</p>
                            <div className="grid grid-cols-2 gap-1">
                              {OT_SPECIALTIES.map((duty) => (
                                <div key={duty} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={duty}
                                    checked={newChannelDuties.includes(duty)}
                                    onCheckedChange={() => toggleDuty(duty)}
                                  />
                                  <label htmlFor={duty} className="text-xs cursor-pointer">{duty}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Camp Types */}
                          <div>
                            <p className="text-xs font-semibold text-primary mb-2">Camp Types</p>
                            <div className="grid grid-cols-2 gap-1">
                              {CAMP_TYPES.map((duty) => (
                                <div key={duty} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={duty}
                                    checked={newChannelDuties.includes(duty)}
                                    onCheckedChange={() => toggleDuty(duty)}
                                  />
                                  <label htmlFor={duty} className="text-xs cursor-pointer">{duty}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Other Duties */}
                          <div>
                            <p className="text-xs font-semibold text-primary mb-2">Other Duties</p>
                            <div className="grid grid-cols-2 gap-1">
                              {OTHER_DUTIES.map((duty) => (
                                <div key={duty} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={duty}
                                    checked={newChannelDuties.includes(duty)}
                                    onCheckedChange={() => toggleDuty(duty)}
                                  />
                                  <label htmlFor={duty} className="text-xs cursor-pointer">{duty}</label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="announcement"
                        checked={newChannelIsAnnouncement}
                        onCheckedChange={(checked) => setNewChannelIsAnnouncement(checked as boolean)}
                      />
                      <label htmlFor="announcement" className="text-sm cursor-pointer">
                        Announcement Channel (only admins can post)
                      </label>
                    </div>
                    <Button onClick={handleCreateChannel} className="w-full">Create Channel</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {CHANNEL_CATEGORIES.map((category) => {
              const catChannels = channelsByCategory[category.value] || [];
              if (catChannels.length === 0) return null;
              const isExpanded = expandedCategories.includes(category.value);
              return (
                <div key={category.value}>
                  <button
                    onClick={() => toggleCategory(category.value)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span>[{category.icon}]</span>
                    <span>{category.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{catChannels.length}</Badge>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 space-y-0.5">
                      {catChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => handleSelectChannel(channel)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                            selectedChannel?.id === channel.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {channel.channel_type === 'announcement' ? <Megaphone className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
                          <span className="truncate">{channel.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      <Card className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedChannel.channel_type === 'announcement' ? <Megaphone className="h-5 w-5" /> : <Hash className="h-5 w-5" />}
                  <CardTitle className="text-lg">{selectedChannel.name}</CardTitle>
                </div>
                {selectedChannel.eligible_duties && selectedChannel.eligible_duties.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    {selectedChannel.eligible_duties.length} duty types
                  </Badge>
                )}
              </div>
              {selectedChannel.description && (
                <p className="text-sm text-muted-foreground">{selectedChannel.description}</p>
              )}
            </CardHeader>
            <Separator />
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Be the first to send a message!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender_id === user?.id;
                    const showDate = index === 0 || formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);
                    return (
                      <React.Fragment key={message.id}>
                        {showDate && (
                          <div className="flex items-center gap-2 my-4">
                            <Separator className="flex-1" />
                            <span className="text-xs text-muted-foreground px-2">{formatDate(message.created_at)}</span>
                            <Separator className="flex-1" />
                          </div>
                        )}
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-lg px-4 py-2 ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {!isOwn && <p className="text-xs font-medium mb-1">{message.sender_name}</p>}
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <Separator />
            <div className="p-4">
              {selectedChannel.channel_type === 'announcement' && !isAdmin ? (
                <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                  <Megaphone className="h-4 w-4 mr-2" />
                  Only admins can post in announcement channels
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    disabled={sendingMessage}
                  />
                  <Button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a channel</p>
              <p className="text-sm">Choose a channel from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Messages;
