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
  FileText, ArrowLeft, Link as LinkIcon
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(pub)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(pub.id)}>
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
    </div>
  );
};

export default MyPublications;
