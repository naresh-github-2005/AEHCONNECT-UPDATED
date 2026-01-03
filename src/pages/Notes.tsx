import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
  Menu,
  Home,
  Save,
  Check,
  FolderOpen,
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
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

// View states
type ViewState = 'list' | 'editor';

const Notes: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Core state
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  // View state
  const [viewState, setViewState] = useState<ViewState>('list');
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Current note being edited
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dialog states
  const [createNoteDialogOpen, setCreateNoteDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editFolderDialogOpen, setEditFolderDialogOpen] = useState(false);
  
  // Form states
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteLink, setNewNoteLink] = useState('');
  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'folder' | 'note'; id: string; name: string } | null>(null);

  // Fetch data
  useEffect(() => {
    if (user?.id) {
      fetchFolders();
      fetchNotes();
    }
  }, [user?.id]);

  // Auto-save effect
  useEffect(() => {
    if (hasUnsavedChanges && currentNote) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        handleSaveNote(true);
      }, 3000); // Auto-save after 3 seconds of inactivity
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [noteContent, noteTitle, hasUnsavedChanges]);

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
        .order('updated_at', { ascending: false });
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

  // Build folder tree for drawer
  const buildFolderTree = (parentId: string | null = null): NoteFolder[] => {
    return folders.filter(f => f.parent_folder_id === parentId);
  };

  // ============ CRUD Operations ============

  // Create Folder
  const handleCreateFolder = async () => {
    if (!folderName.trim() || !user?.id) return;

    try {
      const { error } = await supabase.from('note_folders').insert({
        name: folderName.trim(),
        parent_folder_id: currentFolderId,
        user_id: user.id,
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'Folder created' });
      setCreateFolderDialogOpen(false);
      setFolderName('');
      fetchFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({ title: 'Error', description: 'Failed to create folder', variant: 'destructive' });
    }
  };

  // Update Folder
  const handleUpdateFolder = async () => {
    if (!folderName.trim() || !editingFolder) return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .update({ name: folderName.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingFolder.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Folder renamed' });
      setEditFolderDialogOpen(false);
      setFolderName('');
      setEditingFolder(null);
      fetchFolders();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast({ title: 'Error', description: 'Failed to rename folder', variant: 'destructive' });
    }
  };

  // Delete Folder
  const handleDeleteFolder = async () => {
    if (!deleteTarget || deleteTarget.type !== 'folder') return;

    try {
      const { error } = await supabase
        .from('note_folders')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Folder deleted' });
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

  // Create Note - Opens editor after creation
  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !user?.id) return;

    try {
      const driveLinks = newNoteLink.trim() ? [newNoteLink.trim()] : null;
      
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: newNoteTitle.trim(),
          description: '',
          drive_links: driveLinks,
          folder_id: currentFolderId,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Note created' });
      setCreateNoteDialogOpen(false);
      setNewNoteTitle('');
      setNewNoteLink('');
      
      // Open the editor with the new note
      if (data) {
        openNoteEditor(data as Note);
      }
      
      fetchNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      toast({ title: 'Error', description: 'Failed to create note', variant: 'destructive' });
    }
  };

  // Save Note (manual or auto)
  const handleSaveNote = async (isAutoSave = false) => {
    if (!currentNote) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('notes')
        .update({
          title: noteTitle.trim() || currentNote.title,
          description: noteContent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentNote.id);
      
      if (error) throw error;
      
      setHasUnsavedChanges(false);
      if (!isAutoSave) {
        toast({ title: 'Saved', description: 'Note saved successfully' });
      }
      
      // Update local state
      setNotes(prev => prev.map(n => 
        n.id === currentNote.id 
          ? { ...n, title: noteTitle.trim() || n.title, description: noteContent, updated_at: new Date().toISOString() }
          : n
      ));
      setCurrentNote(prev => prev ? { ...prev, title: noteTitle.trim() || prev.title, description: noteContent } : null);
    } catch (error) {
      console.error('Error saving note:', error);
      if (!isAutoSave) {
        toast({ title: 'Error', description: 'Failed to save note', variant: 'destructive' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async () => {
    if (!deleteTarget || deleteTarget.type !== 'note') return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'Note deleted' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      
      if (currentNote?.id === deleteTarget.id) {
        setViewState('list');
        setCurrentNote(null);
      }
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Error', description: 'Failed to delete note', variant: 'destructive' });
    }
  };

  // Update note links
  const handleUpdateNoteLinks = async (noteId: string, links: string[]) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update({ drive_links: links.length > 0 ? links : null, updated_at: new Date().toISOString() })
        .eq('id', noteId);
      
      if (error) throw error;
      
      setNotes(prev => prev.map(n => 
        n.id === noteId ? { ...n, drive_links: links.length > 0 ? links : null } : n
      ));
      
      if (currentNote?.id === noteId) {
        setCurrentNote(prev => prev ? { ...prev, drive_links: links.length > 0 ? links : null } : null);
      }
    } catch (error) {
      console.error('Error updating links:', error);
    }
  };

  // ============ Navigation & UI ============

  const openNoteEditor = (note: Note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.description || '');
    setHasUnsavedChanges(false);
    setViewState('editor');
    setDrawerOpen(false);
  };

  const closeNoteEditor = async () => {
    // Auto-save on close if there are unsaved changes
    if (hasUnsavedChanges && currentNote) {
      await handleSaveNote(true);
    }
    setViewState('list');
    setCurrentNote(null);
    setNoteContent('');
    setNoteTitle('');
    setHasUnsavedChanges(false);
  };

  const handleFolderNavigate = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setDrawerOpen(false);
  };

  const toggleFolderExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const openEditFolderDialog = (folder: NoteFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setEditFolderDialogOpen(true);
  };

  const confirmDelete = (type: 'folder' | 'note', id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  // ============ Render Functions ============

  // Render folder tree item in drawer
  const renderFolderTreeItem = (folder: NoteFolder, level: number = 0) => {
    const subfolders = folders.filter(f => f.parent_folder_id === folder.id);
    const hasSubfolders = subfolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = currentFolderId === folder.id;
    const noteCount = notes.filter(n => n.folder_id === folder.id).length;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all',
            'hover:bg-accent active:scale-[0.98]',
            isSelected && 'bg-primary/10 text-primary border-l-2 border-primary'
          )}
          style={{ marginLeft: `${level * 12}px` }}
          onClick={() => handleFolderNavigate(folder.id)}
        >
          {hasSubfolders ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpand(folder.id);
              }}
              className="p-0.5"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <FolderOpen className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <span className="text-sm font-medium flex-1 truncate">{folder.name}</span>
          {noteCount > 0 && (
            <Badge variant="secondary" className="text-xs">{noteCount}</Badge>
          )}
        </div>
        {hasSubfolders && isExpanded && (
          <div className="mt-1">
            {subfolders.map(sf => renderFolderTreeItem(sf, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Drawer Content
  const DrawerContentComponent = () => (
    <div className="flex flex-col h-full">
      {/* Drawer Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Folder className="h-5 w-5 text-primary" />
            My Notes
          </h2>
          <Button size="sm" variant="outline" onClick={() => { setCreateFolderDialogOpen(true); setDrawerOpen(false); }}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Folder Tree */}
      <ScrollArea className="flex-1 p-3">
        {/* Root/All Notes */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-2',
            'hover:bg-accent active:scale-[0.98]',
            currentFolderId === null && 'bg-primary/10 text-primary border-l-2 border-primary'
          )}
          onClick={() => handleFolderNavigate(null)}
        >
          <Home className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium flex-1">All Notes</span>
          <Badge variant="secondary" className="text-xs">
            {notes.filter(n => n.folder_id === null).length}
          </Badge>
        </div>
        
        {/* Folder Tree */}
        <div className="space-y-1">
          {buildFolderTree(null).map(folder => renderFolderTreeItem(folder))}
        </div>
      </ScrollArea>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const folderPath = getFolderPath(currentFolderId);
  const currentFolderName = currentFolderId 
    ? folders.find(f => f.id === currentFolderId)?.name || 'Folder'
    : 'All Notes';

  // ============ EDITOR VIEW ============
  if (viewState === 'editor' && currentNote) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] bg-background">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-3 border-b bg-background sticky top-0 z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={closeNoteEditor}
            className="h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-muted-foreground">Unsaved</span>
            )}
            {isSaving ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                Saving...
              </span>
            ) : hasUnsavedChanges ? (
              <Badge variant="secondary" className="text-xs">Unsaved</Badge>
            ) : null}
            <Button 
              size="sm" 
              onClick={() => handleSaveNote(false)}
              disabled={isSaving}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => confirmDelete('note', currentNote.id, currentNote.title)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Note
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Editor Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section */}
          <div className="px-4 pt-4 pb-3 border-b bg-muted/20">
            <Input
              value={noteTitle}
              onChange={(e) => {
                setNoteTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Note title"
              className="text-xl font-bold border-none shadow-none px-0 h-auto focus-visible:ring-0 bg-transparent"
            />
            
            {/* Links Section */}
            {currentNote.drive_links && currentNote.drive_links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {currentNote.drive_links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">Link {idx + 1}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {/* Note Content Editor - Large Blank Area */}
          <div className="flex-1 overflow-auto">
            <Textarea
              value={noteContent}
              onChange={(e) => {
                setNoteContent(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Start writing your notes here..."
              className="w-full h-full min-h-[calc(100vh-280px)] resize-none border-none shadow-none focus-visible:ring-0 p-4 text-base leading-relaxed rounded-none"
              autoFocus
            />
          </div>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteNote}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ============ LIST VIEW ============
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] pb-16 md:pb-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b bg-background sticky top-0 z-10">
        {/* Menu/Drawer Button */}
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setDrawerOpen(true)}
            className="h-10 w-10 flex-shrink-0"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <DrawerContent className="h-[85vh]">
            <DrawerHeader className="sr-only">
              <DrawerTitle>Navigation</DrawerTitle>
            </DrawerHeader>
            <DrawerContentComponent />
          </DrawerContent>
        </Drawer>
        
        {/* Breadcrumb / Current Location */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {currentFolderId && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => {
                const parent = folders.find(f => f.id === currentFolderId)?.parent_folder_id || null;
                setCurrentFolderId(parent);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="flex items-center gap-1 min-w-0">
            <FolderOpen className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <span className="font-semibold truncate">{currentFolderName}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button 
            size="icon" 
            variant="outline"
            onClick={() => setCreateFolderDialogOpen(true)}
            className="h-9 w-9"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button 
            size="icon"
            onClick={() => setCreateNoteDialogOpen(true)}
            className="h-9 w-9"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Subfolders */}
          {currentSubfolders.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">FOLDERS</p>
              <div className="space-y-1">
                {currentSubfolders.map(folder => (
                  <div
                    key={folder.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 active:scale-[0.99] cursor-pointer transition-all"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Folder className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{folder.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {notes.filter(n => n.folder_id === folder.id).length} notes
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditFolderDialog(folder); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); confirmDelete('folder', folder.id, folder.name); }}
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
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">NOTES</p>
              <div className="space-y-2">
                {currentNotes.map(note => (
                  <div
                    key={note.id}
                    className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 active:scale-[0.99] cursor-pointer transition-all"
                    onClick={() => openNoteEditor(note)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{note.title}</h4>
                      {note.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {note.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.updated_at), 'MMM d')}
                        </span>
                        {note.drive_links && note.drive_links.length > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            <Link className="h-3 w-3 mr-0.5" />
                            {note.drive_links.length}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 flex-shrink-0 mt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openNoteEditor(note); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); confirmDelete('note', note.id, note.title); }}
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

          {/* Empty State */}
          {currentSubfolders.length === 0 && currentNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 opacity-50" />
              </div>
              <p className="text-lg font-medium">No notes yet</p>
              <p className="text-sm mt-1">Create your first note to get started</p>
              <Button 
                className="mt-4"
                onClick={() => setCreateNoteDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Note
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ============ DIALOGS ============ */}

      {/* Create Note Dialog */}
      <Dialog open={createNoteDialogOpen} onOpenChange={setCreateNoteDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Enter note title"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Link (Optional)</label>
              <Input
                value={newNoteLink}
                onChange={(e) => setNewNoteLink(e.target.value)}
                placeholder="Paste a link (e.g., Google Drive)"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreateNoteDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleCreateNote} disabled={!newNoteTitle.trim()} className="w-full sm:w-auto gap-1.5">
              <FilePlus className="h-4 w-4" />
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <label className="text-sm font-medium">Folder Name</label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-1.5"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreateFolderDialogOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!folderName.trim()} className="w-full sm:w-auto">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={editFolderDialogOpen} onOpenChange={setEditFolderDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <label className="text-sm font-medium">Folder Name</label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-1.5"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleUpdateFolder()}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => { setEditFolderDialogOpen(false); setEditingFolder(null); }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleUpdateFolder} disabled={!folderName.trim()} className="w-full sm:w-auto">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === 'folder'
                ? 'This will delete the folder and all notes inside it.'
                : 'This note will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTarget?.type === 'folder' ? handleDeleteFolder : handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
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
