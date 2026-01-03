import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  MessageSquare, Send, Plus, Menu, Search, Users, 
  MoreVertical, Edit, Trash2, Megaphone, ChevronDown,
  Stethoscope, Building2, Activity, Moon, AlertTriangle, Tent,
  Sun, UserCog, DoorOpen, ImagePlus, X, Loader2
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';

// Supported image formats
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 
  'image/svg+xml', 'image/bmp', 'image/tiff'
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  category: string;
  eligible_duties: string[] | null;
  created_by: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  image_url: string | null;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  general: { label: 'General', icon: <MessageSquare className="h-4 w-4" />, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  opd: { label: 'OPD', icon: <Stethoscope className="h-4 w-4" />, color: 'text-green-600', bgColor: 'bg-green-100' },
  ot: { label: 'Operation Theatre', icon: <Activity className="h-4 w-4" />, color: 'text-red-600', bgColor: 'bg-red-100' },
  ward: { label: 'Ward', icon: <Building2 className="h-4 w-4" />, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  camp: { label: 'Camp', icon: <Tent className="h-4 w-4" />, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  daycare: { label: 'Day Care', icon: <Sun className="h-4 w-4" />, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  physician: { label: 'Physician', icon: <UserCog className="h-4 w-4" />, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  block_room: { label: 'Block Room', icon: <DoorOpen className="h-4 w-4" />, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  night_duty: { label: 'Night Duty', icon: <Moon className="h-4 w-4" />, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  emergency: { label: 'Emergency', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-rose-600', bgColor: 'bg-rose-100' },
};

const DUTY_TYPES = [
  { value: 'OPD', label: 'OPD' },
  { value: 'OT', label: 'Operation Theatre' },
  { value: 'Ward', label: 'Ward' },
  { value: 'Camp', label: 'Camp' },
  { value: 'Daycare', label: 'Day Care' },
  { value: 'Physician', label: 'Physician' },
  { value: 'Block Room', label: 'Block Room' },
  { value: 'Night Duty', label: 'Night Duty' },
  { value: 'Emergency', label: 'Emergency' },
];

const Messages: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChatChannel | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['general']));

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [showChannelDialog, setShowChannelDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChatChannel | null>(null);
  const [channelForm, setChannelForm] = useState({
    name: '',
    description: '',
    channel_type: 'group' as 'group' | 'announcement',
    category: 'general',
    eligible_duties: [] as string[],
  });
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel.id);
      const unsubscribe = subscribeToMessages(selectedChannel.id);
      return () => unsubscribe();
    }
  }, [selectedChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select('*')
        .order('name');
      if (error) throw error;
      setChannels(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
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
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const subscribeToMessages = (channelId: string) => {
    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel_id=eq.${channelId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { subscription.unsubscribe(); };
  };

  // Image handling functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      toast({ 
        title: 'Invalid file type', 
        description: 'Please select a valid image (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF)', 
        variant: 'destructive' 
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      toast({ 
        title: 'File too large', 
        description: 'Image must be less than 5MB', 
        variant: 'destructive' 
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedChannel || !user) return;
    
    setSendingMessage(true);
    setUploadingImage(!!selectedImage);
    
    try {
      let imageUrl: string | null = null;
      
      // Upload image if selected
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
        if (!imageUrl && !newMessage.trim()) {
          // If image upload failed and no text, abort
          setSendingMessage(false);
          setUploadingImage(false);
          return;
        }
      }

      const { error } = await supabase.from('chat_messages').insert({
        channel_id: selectedChannel.id,
        sender_id: user.id,
        sender_name: user.name || 'Unknown User',
        content: newMessage.trim() || (imageUrl ? '📷 Image' : ''),
        image_url: imageUrl,
      });
      
      if (error) throw error;
      
      setNewMessage('');
      clearSelectedImage();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSendingMessage(false);
      setUploadingImage(false);
    }
  };

  const openCreateChannel = () => {
    setEditingChannel(null);
    setChannelForm({ name: '', description: '', channel_type: 'group', category: 'general', eligible_duties: [] });
    setShowChannelDialog(true);
  };

  const openEditChannel = (channel: ChatChannel) => {
    setEditingChannel(channel);
    setChannelForm({
      name: channel.name,
      description: channel.description || '',
      channel_type: (channel.channel_type === 'announcement' ? 'announcement' : 'group') as 'group' | 'announcement',
      category: channel.category,
      eligible_duties: channel.eligible_duties || [],
    });
    setShowChannelDialog(true);
  };

  const saveChannel = async () => {
    if (!channelForm.name.trim()) {
      toast({ title: 'Error', description: 'Channel name is required', variant: 'destructive' });
      return;
    }
    try {
      if (editingChannel) {
        const { error } = await supabase.from('chat_channels').update({
          name: channelForm.name.trim(),
          description: channelForm.description.trim() || null,
          channel_type: channelForm.channel_type,
          category: channelForm.category,
          eligible_duties: channelForm.eligible_duties.length > 0 ? channelForm.eligible_duties : null,
        }).eq('id', editingChannel.id);
        if (error) throw error;
        toast({ title: 'Success', description: 'Channel updated' });
      } else {
        const { error } = await supabase.from('chat_channels').insert({
          name: channelForm.name.trim(),
          description: channelForm.description.trim() || null,
          channel_type: channelForm.channel_type,
          category: channelForm.category,
          eligible_duties: channelForm.eligible_duties.length > 0 ? channelForm.eligible_duties : null,
          created_by: user?.id,
        });
        if (error) throw error;
        toast({ title: 'Success', description: 'Channel created' });
      }
      setShowChannelDialog(false);
      fetchChannels();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const deleteChannel = async () => {
    if (!deleteChannelId) return;
    try {
      await supabase.from('chat_messages').delete().eq('channel_id', deleteChannelId);
      const { error } = await supabase.from('chat_channels').delete().eq('id', deleteChannelId);
      if (error) throw error;
      toast({ title: 'Success', description: 'Channel deleted' });
      setDeleteChannelId(null);
      if (selectedChannel?.id === deleteChannelId) setSelectedChannel(null);
      fetchChannels();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  // Check if user is eligible to see/message in a channel
  const isEligibleForChannel = (channel: ChatChannel): boolean => {
    // Admin can see all channels
    if (isAdmin) return true;
    
    // General category channels visible to all
    if (channel.category === 'general') return true;
    
    // No duty restriction - visible to all
    if (!channel.eligible_duties || channel.eligible_duties.length === 0) return true;
    
    // Check if user's duties overlap with channel's duties
    const userDuties = user?.eligibleDuties || [];
    return channel.eligible_duties.some(duty => userDuties.includes(duty));
  };

  const channelsByCategory = useMemo(() => {
    // First filter by search query and eligibility
    const filtered = channels.filter(ch => 
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) && isEligibleForChannel(ch)
    );
    const grouped: Record<string, ChatChannel[]> = {};
    filtered.forEach(channel => {
      const cat = channel.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(channel);
    });
    return grouped;
  }, [channels, searchQuery, user?.eligibleDuties, isAdmin]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: ChatMessage[] }[] = [];
    let currentGroup: { date: Date; messages: ChatMessage[] } | null = null;
    messages.forEach(msg => {
      const msgDate = new Date(msg.created_at);
      if (!currentGroup || !isSameDay(currentGroup.date, msgDate)) {
        currentGroup = { date: msgDate, messages: [] };
        groups.push(currentGroup);
      }
      currentGroup.messages.push(msg);
    });
    return groups;
  }, [messages]);

  const renderChannelItem = (channel: ChatChannel) => {
    const config = CATEGORY_CONFIG[channel.category] || CATEGORY_CONFIG.general;
    const isSelected = selectedChannel?.id === channel.id;
    return (
      <Card
        key={channel.id}
        className={`p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent'}`}
        onClick={() => { setSelectedChannel(channel); setShowSidebar(false); }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              {channel.channel_type === 'announcement' ? <Megaphone className={`h-4 w-4 ${config.color}`} /> : <span className={config.color}>{config.icon}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{channel.name}</span>
                {channel.channel_type === 'announcement' && <Badge variant="secondary" className="text-xs">Announce</Badge>}
              </div>
              {channel.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{channel.description}</p>}
            </div>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditChannel(channel); }}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteChannelId(channel.id); }}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Card>
    );
  };

  // Sidebar content JSX - not a function to prevent re-render focus loss
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Messages</h2>
          {isAdmin && <Button size="sm" onClick={openCreateChannel}><Plus className="h-4 w-4 mr-1" /> New</Button>}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search channels..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
            const categoryChannels = channelsByCategory[category] || [];
            if (categoryChannels.length === 0) return null;
            return (
              <Collapsible key={category} open={expandedCategories.has(category)} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-2 h-9">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <span className="text-sm font-medium">{config.label}</span>
                      <Badge variant="secondary" className="text-xs">{categoryChannels.length}</Badge>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedCategories.has(category) ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">{categoryChannels.map(renderChannelItem)}</CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  const ChatView = () => {
    if (!selectedChannel) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
          <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
          <h3 className="text-lg font-medium">Select a channel</h3>
          <p className="text-sm text-center mt-1">Choose a channel from the list to start messaging</p>
          {isMobile && <Button variant="outline" className="mt-4" onClick={() => setShowSidebar(true)}><Menu className="h-4 w-4 mr-2" /> View Channels</Button>}
        </div>
      );
    }
    const config = CATEGORY_CONFIG[selectedChannel.category] || CATEGORY_CONFIG.general;
    // ALL eligible users can send messages in BOTH group AND announcement channels
    // If user can see the channel, they can message in it
    const canSendMessage = isEligibleForChannel(selectedChannel);
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="border-b px-4 py-3 flex items-center gap-3">
          {isMobile && <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}><Menu className="h-5 w-5" /></Button>}
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            {selectedChannel.channel_type === 'announcement' ? <Megaphone className={`h-4 w-4 ${config.color}`} /> : <span className={config.color}>{config.icon}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{selectedChannel.name}</h3>
              {selectedChannel.channel_type === 'announcement' && <Badge variant="secondary" className="text-xs">Announcement</Badge>}
            </div>
            {selectedChannel.description && <p className="text-xs text-muted-foreground truncate">{selectedChannel.description}</p>}
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEditChannel(selectedChannel)}><Edit className="h-4 w-4 mr-2" /> Edit Channel</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteChannelId(selectedChannel.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete Channel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-6">
            {groupedMessages.map((group, groupIdx) => (
              <div key={groupIdx}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium">{formatMessageDate(group.date)}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {group.messages.map((msg) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={isOwnMessage ? 'bg-primary text-primary-foreground' : ''}>{msg.sender_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{msg.sender_name}</span>
                            <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), 'h:mm a')}</span>
                          </div>
                          <div className={`rounded-2xl ${msg.image_url ? 'p-1' : 'px-4 py-2'} ${isOwnMessage ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                            {msg.image_url && (
                              <img 
                                src={msg.image_url} 
                                alt="Shared image" 
                                className="rounded-xl max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setPreviewImageUrl(msg.image_url)}
                              />
                            )}
                            {msg.content && msg.content !== '📷 Image' && (
                              <p className={`text-sm whitespace-pre-wrap break-words ${msg.image_url ? 'px-3 py-2' : ''}`}>{msg.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        {canSendMessage ? (
          <div className="border-t p-4">
            {/* Image preview */}
            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-32 rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={clearSelectedImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept={SUPPORTED_IMAGE_TYPES.join(',')}
                onChange={handleImageSelect}
                className="hidden"
              />
              {/* Image upload button */}
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={sendingMessage}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Textarea
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                className="min-h-[44px] max-h-32 resize-none"
                rows={1}
              />
              <Button 
                onClick={sendMessage} 
                disabled={(!newMessage.trim() && !selectedImage) || sendingMessage} 
                size="icon" 
                className="shrink-0"
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t p-4 text-center text-sm text-muted-foreground">You don't have permission to send messages in this channel</div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="flex h-[calc(100vh-120px)] bg-background">
      {!isMobile && <div className="w-80 border-r flex-shrink-0">{sidebarContent}</div>}
      {isMobile && (
        <Sheet open={showSidebar} onOpenChange={setShowSidebar}>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">{sidebarContent}</SheetContent>
        </Sheet>
      )}
      <div className="flex-1 flex flex-col min-w-0"><ChatView /></div>
      <Dialog open={showChannelDialog} onOpenChange={setShowChannelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChannel ? 'Edit Channel' : 'Create Channel'}</DialogTitle>
            <DialogDescription>{editingChannel ? 'Update the channel details below.' : 'Create a new channel for team communication.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Channel Name *</Label>
              <Input placeholder="Enter channel name" value={channelForm.name} onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Enter channel description" value={channelForm.description} onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={channelForm.channel_type} onValueChange={(v) => setChannelForm({ ...channelForm, channel_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group"><div className="flex items-center gap-2"><Users className="h-4 w-4" /> Group</div></SelectItem>
                    <SelectItem value="announcement"><div className="flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcement</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={channelForm.category} onValueChange={(v) => setChannelForm({ ...channelForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}><div className="flex items-center gap-2"><span className={config.color}>{config.icon}</span>{config.label}</div></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Eligible Duties (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Leave empty for all duties, or select specific duties</p>
              <div className="grid grid-cols-2 gap-2">
                {DUTY_TYPES.map((duty) => (
                  <div key={duty.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={duty.value}
                      checked={channelForm.eligible_duties.includes(duty.value)}
                      onCheckedChange={(checked) => {
                        setChannelForm({
                          ...channelForm,
                          eligible_duties: checked ? [...channelForm.eligible_duties, duty.value] : channelForm.eligible_duties.filter((d) => d !== duty.value),
                        });
                      }}
                    />
                    <label htmlFor={duty.value} className="text-sm cursor-pointer">{duty.label}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelDialog(false)}>Cancel</Button>
            <Button onClick={saveChannel}>{editingChannel ? 'Save Changes' : 'Create Channel'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteChannelId} onOpenChange={() => setDeleteChannelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Channel?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this channel and all its messages. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteChannel} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImageUrl} onOpenChange={() => setPreviewImageUrl(null)}>
        <DialogContent className="max-w-4xl p-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setPreviewImageUrl(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {previewImageUrl && (
              <img 
                src={previewImageUrl} 
                alt="Preview" 
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;