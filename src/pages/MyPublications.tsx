import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  BookOpen, Plus, Edit, Trash2, ExternalLink, Search,
  FileText, ArrowLeft, Link as LinkIcon, Share2, Copy, Mail,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Publication {
  id: string;
  user_id: string;
  doctor_id: string | null;
  doctor_name: string;
  title: string;
  link: string | null;
  created_at: string;
  updated_at: string;
}

const MyPublications: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingPublication, setEditingPublication] = useState<Publication | null>(null);
  const [formData, setFormData] = useState({ title: '', link: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [sharePublication, setSharePublication] = useState<Publication | null>(null);

  useEffect(() => {
    fetchPublications();
  }, []);

  const fetchPublications = async () => {
    try {
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublications(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPublication(null);
    setFormData({ title: '', link: '' });
    setShowDialog(true);
  };

  const openEditDialog = (pub: Publication) => {
    setEditingPublication(pub);
    setFormData({ title: pub.title, link: pub.link || '' });
    setShowDialog(true);
  };

  const savePublication = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'Error', description: 'Title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingPublication) {
        const { error } = await supabase
          .from('publications')
          .update({
            title: formData.title.trim(),
            link: formData.link.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPublication.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Publication updated' });
      } else {
        const { error } = await supabase
          .from('publications')
          .insert({
            user_id: user?.id,
            doctor_id: user?.doctorId || null,
            doctor_name: user?.name || 'Unknown',
            title: formData.title.trim(),
            link: formData.link.trim() || null,
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Publication added' });
      }

      setShowDialog(false);
      fetchPublications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deletePublication = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('publications')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Publication deleted' });
      setDeleteId(null);
      fetchPublications();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleShare = async (pub: Publication) => {
    const shareText = `${pub.title}${pub.link ? '\n' + pub.link : ''}`;
    
    // Check if native share is available (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: pub.title,
          text: pub.title,
          url: pub.link || undefined,
        });
      } catch (error: any) {
        // User cancelled or error - show manual share dialog
        if (error.name !== 'AbortError') {
          setSharePublication(pub);
        }
      }
    } else {
      // Desktop - show share dialog
      setSharePublication(pub);
    }
  };

  const copyToClipboard = async () => {
    if (!sharePublication) return;
    const shareText = sharePublication.link || sharePublication.title;
    
    try {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Copied!', description: 'Link copied to clipboard' });
      setSharePublication(null);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const shareViaWhatsApp = () => {
    if (!sharePublication) return;
    const text = encodeURIComponent(`${sharePublication.title}${sharePublication.link ? '\n' + sharePublication.link : ''}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setSharePublication(null);
  };

  const shareViaTelegram = () => {
    if (!sharePublication) return;
    const text = encodeURIComponent(sharePublication.title);
    const url = encodeURIComponent(sharePublication.link || '');
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    setSharePublication(null);
  };

  const shareViaEmail = () => {
    if (!sharePublication) return;
    const subject = encodeURIComponent(sharePublication.title);
    const body = encodeURIComponent(`Check out this publication:\n\n${sharePublication.title}${sharePublication.link ? '\n\nLink: ' + sharePublication.link : ''}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setSharePublication(null);
  };

  const shareViaTwitter = () => {
    if (!sharePublication) return;
    const text = encodeURIComponent(sharePublication.title);
    const url = encodeURIComponent(sharePublication.link || '');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    setSharePublication(null);
  };

  const shareViaLinkedIn = () => {
    if (!sharePublication) return;
    const url = encodeURIComponent(sharePublication.link || '');
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
    setSharePublication(null);
  };

  const shareViaFacebook = () => {
    if (!sharePublication) return;
    const url = encodeURIComponent(sharePublication.link || '');
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    setSharePublication(null);
  };

  const filteredPublications = publications.filter(pub =>
    pub.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">My Publications</h1>
          <p className="text-xs text-muted-foreground">{publications.length} publication{publications.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreateDialog} size={isMobile ? 'icon' : 'default'}>
          <Plus className="h-4 w-4" />
          {!isMobile && <span className="ml-1">Add</span>}
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search publications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Publications List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredPublications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No publications found' : 'No publications yet'}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" /> Add Your First Publication
                </Button>
              )}
            </div>
          ) : (
            filteredPublications.map((pub) => (
              <Card key={pub.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm leading-tight">{pub.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          Added {format(new Date(pub.created_at), 'MMM d, yyyy')}
                        </p>
                        {pub.link && (
                          <a
                            href={pub.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                          >
                            <LinkIcon className="h-3 w-3" />
                            View Publication
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleShare(pub)} title="Share">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(pub)} title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(pub.id)} title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPublication ? 'Edit Publication' : 'Add Publication'}</DialogTitle>
            <DialogDescription>
              {editingPublication ? 'Update your publication details.' : 'Add a new publication to your profile.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="Enter publication title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Link (Optional)</Label>
              <Input
                placeholder="https://..."
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={savePublication} disabled={saving}>
              {saving ? 'Saving...' : (editingPublication ? 'Save Changes' : 'Add Publication')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Publication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this publication. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deletePublication} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog */}
      <Dialog open={!!sharePublication} onOpenChange={() => setSharePublication(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Publication</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {sharePublication?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            {/* Copy Link */}
            <button
              onClick={copyToClipboard}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Copy className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs text-center">Copy Link</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={shareViaWhatsApp}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <span className="text-xs text-center">WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              onClick={shareViaTelegram}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <span className="text-xs text-center">Telegram</span>
            </button>

            {/* Email */}
            <button
              onClick={shareViaEmail}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs text-center">Email</span>
            </button>

            {/* Twitter/X */}
            <button
              onClick={shareViaTwitter}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <span className="text-xs text-center">X</span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={shareViaLinkedIn}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <span className="text-xs text-center">LinkedIn</span>
            </button>

            {/* Facebook */}
            <button
              onClick={shareViaFacebook}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <span className="text-xs text-center">Facebook</span>
            </button>

            {/* Messages/SMS */}
            <button
              onClick={() => {
                if (!sharePublication) return;
                const text = encodeURIComponent(`${sharePublication.title}${sharePublication.link ? '\n' + sharePublication.link : ''}`);
                window.open(`sms:?body=${text}`, '_blank');
                setSharePublication(null);
              }}
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs text-center">Messages</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPublications;
