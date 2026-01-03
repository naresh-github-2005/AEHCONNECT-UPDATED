import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Folder,
  FolderPlus,
  FileText,
  FilePlus,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  Link,
  Plus,
  X,
  ArrowLeft,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface NoteFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  title: string;
  description: string | null;
  drive_links: string[] | null;
  folder_id: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

const Notes: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'note'; id: string } | null>(null);

  // Form states
  const [folderName, setFolderName] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteDescription, setNoteDescription] = useState('');
  const [noteDriveLinks, setNoteDriveLinks] = useState<string[]>([]);
  const [newDriveLink, setNewDriveLink] = useState('');

  // Fetch data
  useEffect(() => {
    if (user?.id) {
      fetchFolders();
      fetchNotes();
    }
  }, [user?.id]);

  const fetchFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('note_folders')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');
      if (error) throw error;
      setFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast({ title: 'Error', description: 'Failed to load folders', variant: 'destructive' });
    }
  };

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({ title: 'Error', description: 'Failed to load notes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Get folder hierarchy
  const getFolderPath = (folderId: string | null): NoteFolder[] => {
    const path: NoteFolder[] = [];
    let currentId = folderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_folder_id;
      } else {
        break;
      }
    }
    return path;
  };

  // Get subfolders of current folder
  const currentSubfolders = useMemo(() => {
    return folders.filter(f => f.parent_folder_id === currentFolderId);
  }, [folders, currentFolderId]);

  // Get notes in current folder
  const currentNotes = useMemo(() => {
    return notes.filter(n => n.folder_id === currentFolderId);
  }, [notes, currentFolderId]);

  // Build folder tree for sidebar
  const buildFolderTree = (parentId: string | null = null): NoteFolder[] => {
    return folders.filter(f => f.parent_folder_id === parentId);
  };

  // Folder operations
  const handleCreateFolder = async () => {
    if (!folderName.trim() || !user?.id) return;

    try {
      const { error } = await supabase.from('note_folders').insert({
        name: folderName.trim(),
        parent_folder_id: currentFolderId,
        user_id: user.id,
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Folder created successfully' });
      setFolderDialogOpen(false);
      setFolderName('');
      fetchFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({ title: 'Error', description: 'Failed to create folder', variant: 'destructive' });
    }
  };

  const handleUpdateFolder = async () => {
    if (!folderName.trim() || !editingFolder) return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .update({ name: folderName.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingFolder.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Folder updated successfully' });
      setFolderDialogOpen(false);
      setFolderName('');
      setEditingFolder(null);
      fetchFolders();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast({ title: 'Error', description: 'Failed to update folder', variant: 'destructive' });
    }
  };

  const handleDeleteFolder = async () => {
    if (!deleteTarget || deleteTarget.type !== 'folder') return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Folder deleted successfully' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      if (currentFolderId === deleteTarget.id) {
        setCurrentFolderId(null);
      }
      fetchFolders();
      fetchNotes();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({ title: 'Error', description: 'Failed to delete folder', variant: 'destructive' });
    }
  };

  // Note operations
  const handleCreateNote = async () => {
    if (!noteTitle.trim() || !user?.id) return;

    try {
      const { error } = await supabase.from('notes').insert({
        title: noteTitle.trim(),
        description: noteDescription.trim() || null,
        drive_links: noteDriveLinks.length > 0 ? noteDriveLinks : null,
        folder_id: currentFolderId,
        user_id: user.id,
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Note created successfully' });
      closeNoteDialog();
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({ title: 'Error', description: 'Failed to create note', variant: 'destructive' });
    }
  };

  const handleUpdateNote = async () => {
    if (!noteTitle.trim() || !editingNote) return;

    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: noteTitle.trim(),
          description: noteDescription.trim() || null,
          drive_links: noteDriveLinks.length > 0 ? noteDriveLinks : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingNote.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Note updated successfully' });
      closeNoteDialog();
      fetchNotes();
      if (selectedNote?.id === editingNote.id) {
        setSelectedNote({ ...editingNote, title: noteTitle.trim(), description: noteDescription.trim(), drive_links: noteDriveLinks });
      }
    } catch (error) {
      console.error('Error updating note:', error);
      toast({ title: 'Error', description: 'Failed to update note', variant: 'destructive' });
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteTarget || deleteTarget.type !== 'note') return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Note deleted successfully' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      if (selectedNote?.id === deleteTarget.id) {
        setSelectedNote(null);
      }
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
    }
  };

  // Dialog helpers
  const openCreateFolderDialog = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderDialogOpen(true);
  };

  const openEditFolderDialog = (folder: NoteFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDialogOpen(true);
  };

  const openCreateNoteDialog = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteDescription('');
    setNoteDriveLinks([]);
    setNewDriveLink('');
    setNoteDialogOpen(true);
  };

  const openEditNoteDialog = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteDescription(note.description || '');
    setNoteDriveLinks(note.drive_links || []);
    setNewDriveLink('');
    setNoteDialogOpen(true);
  };

  const closeNoteDialog = () => {
    setNoteDialogOpen(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteDescription('');
    setNoteDriveLinks([]);
    setNewDriveLink('');
  };

  const addDriveLink = () => {
    if (newDriveLink.trim()) {
      setNoteDriveLinks([...noteDriveLinks, newDriveLink.trim()]);
      setNewDriveLink('');
    }
  };

  const removeDriveLink = (index: number) => {
    setNoteDriveLinks(noteDriveLinks.filter((_, i) => i !== index));
  };

  const confirmDelete = (type: 'folder' | 'note', id: string) => {
    setDeleteTarget({ type, id });
    setDeleteDialogOpen(true);
  };

  // Toggle folder expansion in sidebar
  const toggleFolderExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Render folder tree item
  const renderFolderTreeItem = (folder: NoteFolder, level: number = 0) => {
    const subfolders = folders.filter(f => f.parent_folder_id === folder.id);
    const hasSubfolders = subfolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors ${
            isSelected ? 'bg-primary/10 text-primary' : ''
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => setCurrentFolderId(folder.id)}
        >
          {hasSubfolders ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpand(folder.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <Folder className="h-4 w-4 text-amber-500" />
          <span className="text-sm truncate flex-1">{folder.name}</span>
        </div>
        {hasSubfolders && isExpanded && (
          <div>
            {subfolders.map(sf => renderFolderTreeItem(sf, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const folderPath = getFolderPath(currentFolderId);

  return (
    <div className="h-[calc(100vh-180px)] flex gap-4">
      {/* Sidebar - Folder Tree */}
      <Card className="w-64 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Folder className="h-5 w-5" />
              Folders
            </CardTitle>
            <Button size="sm" variant="outline" onClick={openCreateFolderDialog}>
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Root level */}
            <div
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted transition-colors ${
                currentFolderId === null ? 'bg-primary/10 text-primary' : ''
              }`}
              onClick={() => setCurrentFolderId(null)}
            >
              <Folder className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">All Notes</span>
            </div>
            
            {/* Folder tree */}
            {buildFolderTree(null).map(folder => renderFolderTreeItem(folder))}
          </div>
        </ScrollArea>
      </Card>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Breadcrumb and Actions */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentFolderId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const parent = folders.find(f => f.id === currentFolderId)?.parent_folder_id || null;
                    setCurrentFolderId(parent);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-1 text-sm">
                <span
                  className="cursor-pointer hover:text-primary"
                  onClick={() => setCurrentFolderId(null)}
                >
                  Root
                </span>
                {folderPath.map((folder, idx) => (
                  <React.Fragment key={folder.id}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span
                      className="cursor-pointer hover:text-primary"
                      onClick={() => setCurrentFolderId(folder.id)}
                    >
                      {folder.name}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openCreateFolderDialog}>
                <FolderPlus className="h-4 w-4 mr-1" />
                New Folder
              </Button>
              <Button size="sm" onClick={openCreateNoteDialog}>
                <FilePlus className="h-4 w-4 mr-1" />
                New Note
              </Button>
            </div>
          </div>
        </Card>

        {/* Content Grid */}
        <div className="flex-1 flex gap-4">
          {/* Folders and Notes List */}
          <Card className="flex-1">
            <ScrollArea className="h-[calc(100vh-320px)]">
              <div className="p-4 space-y-4">
                {/* Subfolders */}
                {currentSubfolders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Folders</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {currentSubfolders.map(folder => (
                        <div
                          key={folder.id}
                          className="group relative p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setCurrentFolderId(folder.id)}
                        >
                          <div className="flex items-center gap-2">
                            <Folder className="h-8 w-8 text-amber-500" />
                            <span className="text-sm font-medium truncate">{folder.name}</span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="absolute top-2 right-2 p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditFolderDialog(folder); }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); confirmDelete('folder', folder.id); }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {currentNotes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {currentNotes.map(note => (
                        <div
                          key={note.id}
                          className={`group relative p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${
                            selectedNote?.id === note.id ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedNote(note)}
                        >
                          <div className="flex items-start gap-2">
                            <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">{note.title}</h4>
                              {note.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {note.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {format(new Date(note.created_at), 'MMM d, yyyy')}
                                </Badge>
                                {note.drive_links && note.drive_links.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Link className="h-3 w-3 mr-1" />
                                    {note.drive_links.length} link(s)
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="absolute top-2 right-2 p-1 rounded hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditNoteDialog(note); }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); confirmDelete('note', note.id); }}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {currentSubfolders.length === 0 && currentNotes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Folder className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">This folder is empty</p>
                    <p className="text-sm">Create a folder or note to get started</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Note Detail Panel */}
          {selectedNote && (
            <Card className="w-80">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg truncate">{selectedNote.title}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedNote(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                    <p className="text-sm">{format(new Date(selectedNote.created_at), 'MMMM d, yyyy h:mm a')}</p>
                  </div>
                  
                  {selectedNote.updated_at !== selectedNote.created_at && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Last Updated</p>
                      <p className="text-sm">{format(new Date(selectedNote.updated_at), 'MMMM d, yyyy h:mm a')}</p>
                    </div>
                  )}

                  {selectedNote.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedNote.description}</p>
                    </div>
                  )}

                  {selectedNote.drive_links && selectedNote.drive_links.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Drive Links</p>
                      <div className="space-y-2">
                        {selectedNote.drive_links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted transition-colors text-sm"
                          >
                            <ExternalLink className="h-4 w-4 text-blue-500" />
                            <span className="truncate flex-1">{link}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button size="sm" variant="outline" className="w-full" onClick={() => openEditNoteDialog(selectedNote)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Note
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>

      {/* Create/Edit Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFolder ? 'Rename Folder' : 'Create New Folder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Folder Name</label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="mt-1"
                onKeyPress={(e) => e.key === 'Enter' && (editingFolder ? handleUpdateFolder() : handleCreateFolder())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingFolder ? handleUpdateFolder : handleCreateFolder}>
              {editingFolder ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Enter note title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={noteDescription}
                onChange={(e) => setNoteDescription(e.target.value)}
                placeholder="Enter note description"
                className="mt-1"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Drive Links (Optional)</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newDriveLink}
                  onChange={(e) => setNewDriveLink(e.target.value)}
                  placeholder="Paste a drive link"
                  onKeyPress={(e) => e.key === 'Enter' && addDriveLink()}
                />
                <Button type="button" variant="outline" onClick={addDriveLink}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {noteDriveLinks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {noteDriveLinks.map((link, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 border rounded-md text-sm">
                      <Link className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate flex-1">{link}</span>
                      <button
                        type="button"
                        onClick={() => removeDriveLink(idx)}
                        className="text-destructive hover:text-destructive/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeNoteDialog}>
              Cancel
            </Button>
            <Button onClick={editingNote ? handleUpdateNote : handleCreateNote}>
              {editingNote ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'folder'
                ? 'This will permanently delete this folder and all its contents (subfolders and notes).'
                : 'This will permanently delete this note.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTarget?.type === 'folder' ? handleDeleteFolder : handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notes;
