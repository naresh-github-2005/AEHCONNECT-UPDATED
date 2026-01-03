import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, isToday, differenceInDays, addDays } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Calendar, 
  BookOpen, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  GraduationCap,
  Pencil,
  Trash2,
  ExternalLink,
  FileText,
  X,
  Building,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type ClassType = 'lecture' | 'grand_rounds' | 'case_presentation' | 'journal_club' | 'complication_meeting' | 'nbems_class' | 'pharma_quiz' | 'exam' | 'conference' | 'seminar' | 'workshop' | 'other';
type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface ClassItem {
  id: string;
  title: string;
  class_type: ClassType;
  class_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  topic: string | null;
  moderator_name: string | null;
  location: string | null;
  notes: string | null;
  batch: string | null;
  department: string | null;
  speaker_name: string | null;
  study_material: string | null;
  material_urls: string[] | null;
  url_display_texts: string[] | null;
  application_deadline: string | null;
  is_multi_day: boolean | null;
}

interface ConferenceApplication {
  id: string;
  class_id: string;
  doctor_id: string;
  status: ApplicationStatus;
  applied_at: string;
  doctor_notes: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

const classTypeColors: Record<ClassType, string> = {
  lecture: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  grand_rounds: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
  case_presentation: 'bg-green-500/20 text-green-600 border-green-500/30',
  journal_club: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  complication_meeting: 'bg-red-500/20 text-red-600 border-red-500/30',
  nbems_class: 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30',
  pharma_quiz: 'bg-pink-500/20 text-pink-600 border-pink-500/30',
  exam: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
  conference: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
  seminar: 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30',
  workshop: 'bg-teal-500/20 text-teal-600 border-teal-500/30',
  other: 'bg-gray-500/20 text-gray-600 border-gray-500/30'
};

const classTypeLabels: Record<ClassType, string> = {
  lecture: 'Lecture',
  grand_rounds: 'Grand Rounds',
  case_presentation: 'Case Presentation',
  journal_club: 'Journal Club',
  complication_meeting: 'Complication Meeting',
  nbems_class: 'NBEMS Class',
  pharma_quiz: 'Pharma Quiz',
  exam: 'Exam',
  conference: 'Conference',
  seminar: 'Seminar',
  workshop: 'Workshop',
  other: 'Other'
};

const departments = [
  'General', 'Glaucoma', 'Retina', 'Cornea', 'Uvea', 'Orbit', 'Neuro', 
  'Paediatric', 'Cataract', 'Oculoplasty', 'Squint', 'Refraction'
];

const Academic: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1)); // January 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [classTypeFilter, setClassTypeFilter] = useState<ClassType | 'all'>('all');
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [applicationNotes, setApplicationNotes] = useState('');
  
  // Form data with new fields including end_date for date range
  const [formData, setFormData] = useState({
    title: '',
    class_type: 'lecture' as ClassType,
    class_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    start_time: '07:00',
    end_time: '08:00',
    topic: '',
    moderator_name: '',
    location: 'Conference Room',
    notes: '',
    batch: '',
    department: '',
    speaker_name: '',
    study_material: '',
    material_urls: '',
    url_display_texts: ''
  });

  const isAdmin = user?.role === 'admin';
  const doctorId = user?.doctorId;

  // Fetch classes for the current month
  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes', format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .gte('class_date', start)
        .lte('class_date', end)
        .order('class_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data as ClassItem[];
    }
  });

  // Fetch my conference applications (for doctors)
  const { data: myApplications = [] } = useQuery({
    queryKey: ['my-conference-applications', doctorId],
    queryFn: async () => {
      if (!doctorId) return [];
      
      const { data, error } = await supabase
        .rpc('get_my_conference_applications', { p_doctor_id: doctorId });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!doctorId && !isAdmin
  });

  // Helper function to check if conference is applicable
  const isConferenceApplicable = (classType: ClassType) => {
    return ['conference', 'seminar', 'workshop'].includes(classType);
  };

  // Helper function to get application for a specific class
  const getApplicationForClass = (classId: string) => {
    return myApplications.find((app: any) => app.class_id === classId);
  };

  // Helper function to check if application deadline has passed
  const isDeadlinePassed = (classDate: string) => {
    const conferenceDate = parseISO(classDate);
    const today = new Date();
    const daysUntilConference = differenceInDays(conferenceDate, today);
    return daysUntilConference < 2; // Deadline is 2 days before
  };

  // Add class mutation
  const addClassMutation = useMutation({
    mutationFn: async (newClass: typeof formData) => {
      const urls = newClass.material_urls ? newClass.material_urls.split('\n').filter(u => u.trim()) : null;
      const displayTexts = newClass.url_display_texts ? newClass.url_display_texts.split('\n').filter(t => t.trim()) : null;
      
      // Calculate application_deadline (2 days before class_date) for conferences
      let applicationDeadline = null;
      const isConference = ['conference', 'seminar', 'workshop'].includes(newClass.class_type);
      if (isConference) {
        const classDate = parseISO(newClass.class_date);
        applicationDeadline = format(addDays(classDate, -2), 'yyyy-MM-dd');
      }

      // Determine if multi-day
      const isMultiDay = newClass.end_date && newClass.end_date !== newClass.class_date;
      
      const { error } = await supabase
        .from('classes')
        .insert([{
          title: newClass.title,
          class_type: newClass.class_type,
          class_date: newClass.class_date,
          end_date: newClass.end_date || null,
          is_multi_day: isMultiDay,
          application_deadline: applicationDeadline,
          start_time: newClass.start_time,
          end_time: newClass.end_time,
          topic: newClass.topic || null,
          moderator_name: newClass.moderator_name || null,
          location: newClass.location || 'Conference Room',
          notes: newClass.notes || null,
          batch: newClass.batch || null,
          department: newClass.department || null,
          speaker_name: newClass.speaker_name || null,
          study_material: newClass.study_material || null,
          material_urls: urls,
          url_display_texts: displayTexts
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({ title: 'Success', description: 'Class added successfully' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to add class', variant: 'destructive' });
      console.error(error);
    }
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const urls = data.material_urls ? data.material_urls.split('\n').filter(u => u.trim()) : null;
      const displayTexts = data.url_display_texts ? data.url_display_texts.split('\n').filter(t => t.trim()) : null;
      
      // Calculate application_deadline for conferences
      let applicationDeadline = null;
      const isConference = ['conference', 'seminar', 'workshop'].includes(data.class_type);
      if (isConference) {
        const classDate = parseISO(data.class_date);
        applicationDeadline = format(addDays(classDate, -2), 'yyyy-MM-dd');
      }

      // Determine if multi-day
      const isMultiDay = data.end_date && data.end_date !== data.class_date;
      
      const { error } = await supabase
        .from('classes')
        .update({
          title: data.title,
          class_type: data.class_type,
          class_date: data.class_date,
          end_date: data.end_date || null,
          is_multi_day: isMultiDay,
          application_deadline: applicationDeadline,
          start_time: data.start_time,
          end_time: data.end_time,
          topic: data.topic || null,
          moderator_name: data.moderator_name || null,
          location: data.location || 'Conference Room',
          notes: data.notes || null,
          batch: data.batch || null,
          department: data.department || null,
          speaker_name: data.speaker_name || null,
          study_material: data.study_material || null,
          material_urls: urls,
          url_display_texts: displayTexts
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({ title: 'Success', description: 'Class updated successfully' });
      setIsEditDialogOpen(false);
      setEditingClass(null);
      resetForm();
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to update class', variant: 'destructive' });
      console.error(error);
    }
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({ title: 'Success', description: 'Class deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to delete class', variant: 'destructive' });
      console.error(error);
    }
  });

  // Apply for conference mutation
  const applyForConferenceMutation = useMutation({
    mutationFn: async ({ classId, notes }: { classId: string; notes: string }) => {
      if (!doctorId) throw new Error('Doctor ID not found');
      
      const { data, error } = await supabase
        .rpc('apply_for_conference', {
          p_class_id: classId,
          p_doctor_id: doctorId,
          p_notes: notes || null
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-conference-applications'] });
      toast({ 
        title: 'Success', 
        description: 'Application submitted successfully' 
      });
      setIsApplyDialogOpen(false);
      setApplicationNotes('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to submit application', 
        variant: 'destructive' 
      });
    }
  });

  // Cancel conference application mutation
  const cancelApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      if (!doctorId) throw new Error('Doctor ID not found');
      
      const { data, error } = await supabase
        .rpc('cancel_conference_application', {
          p_application_id: applicationId,
          p_doctor_id: doctorId
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-conference-applications'] });
      toast({ 
        title: 'Success', 
        description: 'Application cancelled successfully' 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to cancel application', 
        variant: 'destructive' 
      });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      class_type: 'lecture',
      class_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      start_time: '07:00',
      end_time: '08:00',
      topic: '',
      moderator_name: '',
      location: 'Conference Room',
      notes: '',
      batch: '',
      department: '',
      speaker_name: '',
      study_material: '',
      material_urls: '',
      url_display_texts: ''
    });
  };

  const handleEdit = (classItem: ClassItem) => {
    setEditingClass(classItem);
    setFormData({
      title: classItem.title,
      class_type: classItem.class_type,
      class_date: classItem.class_date,
      end_date: classItem.end_date || '',
      start_time: classItem.start_time,
      end_time: classItem.end_time,
      topic: classItem.topic || '',
      moderator_name: classItem.moderator_name || '',
      location: classItem.location || 'Conference Room',
      notes: classItem.notes || '',
      batch: classItem.batch || '',
      department: classItem.department || '',
      speaker_name: classItem.speaker_name || '',
      study_material: classItem.study_material || '',
      material_urls: classItem.material_urls?.join('\n') || '',
      url_display_texts: classItem.url_display_texts?.join('\n') || ''
    });
    setIsDetailSheetOpen(false);
    setIsEditDialogOpen(true);
  };

  const handleViewDetails = (classItem: ClassItem) => {
    setSelectedClass(classItem);
    setIsDetailSheetOpen(true);
  };

  // Get days in current month
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
  }, [currentMonth]);

  // Get classes for a specific date
  const getClassesForDate = (date: Date) => {
    return classes.filter(c => isSameDay(parseISO(c.class_date), date));
  };

  // Selected date classes - apply filter
  const selectedDateClasses = selectedDate 
    ? getClassesForDate(selectedDate).filter(c => classTypeFilter === 'all' || c.class_type === classTypeFilter) 
    : [];

  // Filtered classes for stats
  const filteredClasses = classTypeFilter === 'all' 
    ? classes 
    : classes.filter(c => c.class_type === classTypeFilter);

  // Stats calculations
  const stats = useMemo(() => {
    const total = filteredClasses.length;
    const grandRounds = filteredClasses.filter(c => c.class_type === 'grand_rounds').length;
    const lectures = filteredClasses.filter(c => c.class_type === 'lecture').length;
    const casePresentations = filteredClasses.filter(c => c.class_type === 'case_presentation').length;
    const conferences = filteredClasses.filter(c => c.class_type === 'conference').length;
    return { total, grandRounds, lectures, casePresentations, conferences };
  }, [filteredClasses]);

  // Validation helper
  const validateForm = (isEdit: boolean = false): string | null => {
    if (!formData.title.trim()) {
      return 'Title is required';
    }
    if (!formData.class_date) {
      return 'Date is required';
    }
    
    // Check if date is not in the past (only for new classes)
    if (!isEdit) {
      const today = format(new Date(), 'yyyy-MM-dd');
      if (formData.class_date < today) {
        return 'Cannot add a class for a past date';
      }
    }
    
    // Validate start and end time
    if (formData.start_time && formData.end_time) {
      if (formData.end_time <= formData.start_time) {
        return 'End time must be after start time';
      }
    }
    
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm(false);
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }
    addClassMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const error = validateForm(true);
    if (error) {
      toast({ title: 'Validation Error', description: error, variant: 'destructive' });
      return;
    }
    updateClassMutation.mutate({ id: editingClass.id, data: formData });
  };

  // Get minimum date for date picker (today)
  const minDate = format(new Date(), 'yyyy-MM-dd');

  // Render function for the class form (not a component to avoid re-render issues)
  const renderClassForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean = false) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Class title"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Lecture Type *</Label>
          <Select
            value={formData.class_type}
            onValueChange={(value: ClassType) => setFormData({ ...formData, class_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(classTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            value={formData.department || 'none'}
            onValueChange={(value) => setFormData({ ...formData, department: value === 'none' ? '' : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Department</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Start Date *</Label>
        <Input
          type="date"
          value={formData.class_date}
          onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
          min={isEdit ? undefined : minDate}
          required
        />
      </div>

      {/* Show end date only for conferences, seminars, workshops */}
      {isConferenceApplicable(formData.class_type) && (
        <div className="space-y-2">
          <Label>End Date (Optional - for multi-day events)</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            min={formData.class_date}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for single-day events. Application deadline will be 2 days before start date.
          </p>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label>Start Time</Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>End Time</Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Topic</Label>
        <Input
          value={formData.topic}
          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
          placeholder="Topic details"
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Speaker</Label>
          <Input
            value={formData.speaker_name}
            onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
            placeholder="Speaker name(s)"
          />
        </div>
        <div className="space-y-2">
          <Label>Moderator</Label>
          <Input
            value={formData.moderator_name}
            onChange={(e) => setFormData({ ...formData, moderator_name: e.target.value })}
            placeholder="Moderator name"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Study Material</Label>
        <Input
          value={formData.study_material}
          onChange={(e) => setFormData({ ...formData, study_material: e.target.value })}
          placeholder="e.g., AAO BSCC Series, Chapter 11"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Material URLs (one per line)</Label>
        <Textarea
          value={formData.material_urls}
          onChange={(e) => setFormData({ ...formData, material_urls: e.target.value })}
          placeholder="https://drive.google.com/file/..."
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label>URL Display Texts (one per line)</Label>
        <Textarea
          value={formData.url_display_texts}
          onChange={(e) => setFormData({ ...formData, url_display_texts: e.target.value })}
          placeholder="Document 1.pdf"
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Conference Room"
          />
        </div>
        <div className="space-y-2">
          <Label>Batch</Label>
          <Input
            value={formData.batch}
            onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
            placeholder="e.g., Batch 1"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes"
          rows={2}
        />
      </div>
      
      <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => isEdit ? setIsEditDialogOpen(false) : setIsAddDialogOpen(false)} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={isEdit ? updateClassMutation.isPending : addClassMutation.isPending} className="w-full sm:w-auto">
          {isEdit 
            ? (updateClassMutation.isPending ? 'Saving...' : 'Save Changes')
            : (addClassMutation.isPending ? 'Adding...' : 'Add Class')
          }
        </Button>
      </DialogFooter>
    </form>
  );

  // Class Detail Content - shared for Sheet (mobile) and Dialog (desktop)
  const ClassDetailContent = () => {
    if (!selectedClass) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge className={cn('border', classTypeColors[selectedClass.class_type])}>
              {classTypeLabels[selectedClass.class_type]}
            </Badge>
            {selectedClass.department && (
              <Badge variant="outline">
                <Building className="w-3 h-3 mr-1" />
                {selectedClass.department}
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold break-words">{selectedClass.title}</h3>
          {selectedClass.topic && selectedClass.topic !== selectedClass.title && (
            <p className="text-muted-foreground mt-1 break-words">{selectedClass.topic}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">{format(parseISO(selectedClass.class_date), 'EEE, MMM d, yyyy')}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Time</p>
            <p className="font-medium">{selectedClass.start_time} - {selectedClass.end_time}</p>
          </div>
        </div>

        {(selectedClass.speaker_name || selectedClass.moderator_name) && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {selectedClass.speaker_name && (
              <div>
                <p className="text-muted-foreground">Speaker</p>
                <p className="font-medium break-words">{selectedClass.speaker_name}</p>
              </div>
            )}
            {selectedClass.moderator_name && (
              <div>
                <p className="text-muted-foreground">Moderator</p>
                <p className="font-medium break-words">{selectedClass.moderator_name}</p>
              </div>
            )}
          </div>
        )}

        {selectedClass.study_material && (
          <div className="text-sm">
            <p className="text-muted-foreground">Study Material</p>
            <p className="font-medium break-words">{selectedClass.study_material}</p>
          </div>
        )}

        {selectedClass.material_urls && selectedClass.material_urls.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Reference Materials</p>
            <div className="space-y-2">
              {selectedClass.material_urls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg border bg-accent/30 hover:bg-accent/50 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="flex-1 truncate">
                    {selectedClass.url_display_texts?.[index] || `Material ${index + 1}`}
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {selectedClass.location && (
          <div className="text-sm">
            <p className="text-muted-foreground">Location</p>
            <p className="font-medium">{selectedClass.location}</p>
          </div>
        )}

        {selectedClass.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">Notes</p>
            <p className="font-medium break-words">{selectedClass.notes}</p>
          </div>
        )}

        {/* Show end date if multi-day */}
        {selectedClass.end_date && selectedClass.end_date !== selectedClass.class_date && (
          <div className="text-sm">
            <p className="text-muted-foreground">End Date</p>
            <p className="font-medium">{format(parseISO(selectedClass.end_date), 'EEE, MMM d, yyyy')}</p>
          </div>
        )}

        {/* Application Status and Apply Button for Doctors */}
        {!isAdmin && isConferenceApplicable(selectedClass.class_type) && (
          <>
            {(() => {
              const application = getApplicationForClass(selectedClass.id);
              const deadlinePassed = isDeadlinePassed(selectedClass.class_date);
              
              if (application) {
                // Show application status
                return (
                  <div className="p-3 rounded-lg border bg-accent/30">
                    <div className="flex items-center gap-2 mb-1">
                      {application.status === 'pending' && (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="font-medium text-sm">Application Pending</span>
                        </>
                      )}
                      {application.status === 'approved' && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span className="font-medium text-sm">Application Approved</span>
                        </>
                      )}
                      {application.status === 'rejected' && (
                        <>
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-sm">Application Rejected</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Applied on {format(parseISO(application.applied_at), 'MMM d, yyyy')}
                    </p>
                    {application.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Admin note: {application.admin_notes}
                      </p>
                    )}
                    {(application.status === 'pending' || application.status === 'approved') && application.can_cancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this application?')) {
                            cancelApplicationMutation.mutate(application.application_id);
                          }
                        }}
                        disabled={cancelApplicationMutation.isPending}
                      >
                        {cancelApplicationMutation.isPending ? 'Cancelling...' : 'Cancel Application'}
                      </Button>
                    )}
                  </div>
                );
              } else if (!deadlinePassed) {
                // Show apply button
                return (
                  <Button
                    onClick={() => {
                      setSelectedClass(selectedClass);
                      setIsApplyDialogOpen(true);
                    }}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Apply for this {classTypeLabels[selectedClass.class_type]}
                  </Button>
                );
              } else {
                // Deadline passed
                return (
                  <div className="p-3 rounded-lg border bg-muted/50">
                    <p className="text-sm text-muted-foreground text-center">
                      Application deadline has passed
                    </p>
                  </div>
                );
              }
            })()}
          </>
        )}

        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={() => setIsDetailSheetOpen(false)} className="flex-1">
            Close
          </Button>
          {isAdmin && (
            <Button onClick={() => handleEdit(selectedClass)} className="flex-1">
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" />
            <span className="truncate">Academic</span>
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5 truncate">
            Classes & Academic Activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Class Type Filter */}
          <Select
            value={classTypeFilter}
            onValueChange={(value) => setClassTypeFilter(value as ClassType | 'all')}
          >
            <SelectTrigger className="w-[120px] sm:w-[140px] h-9">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(classTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <>
              {/* Conference Requests Button */}
              <Button
                size="sm"
                variant="outline"
                className="gap-1 flex-shrink-0"
                onClick={() => navigate('/conference-requests')}
              >
                <ClipboardList className="w-4 h-4" />
                <span className="hidden sm:inline">Requests</span>
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 flex-shrink-0">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Class</DialogTitle>
                  </DialogHeader>
                  {renderClassForm(handleSubmit, false)}
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards - Horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 flex-shrink-0 min-w-[140px]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 flex-shrink-0 min-w-[140px]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/20">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.grandRounds}</p>
                <p className="text-xs text-muted-foreground">Grand Rounds</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-400/10 to-blue-500/5 border-blue-400/20 flex-shrink-0 min-w-[140px]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-400/20">
                <GraduationCap className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.lectures}</p>
                <p className="text-xs text-muted-foreground">Lectures</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 flex-shrink-0 min-w-[140px]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/20">
                <Calendar className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.casePresentations}</p>
                <p className="text-xs text-muted-foreground">Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 flex-shrink-0 min-w-[140px]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.conferences}</p>
                <p className="text-xs text-muted-foreground">Conferences</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-2 px-3 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              {format(currentMonth, 'MMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setCurrentMonth(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {/* Days */}
                {daysInMonth.map(day => {
                  const dayClasses = getClassesForDate(day);
                  const hasClasses = dayClasses.length > 0;
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'aspect-square p-0.5 rounded-md transition-all relative flex flex-col items-center justify-start',
                        'hover:bg-accent/50 focus:outline-none focus:ring-1 focus:ring-primary/50',
                        isSelected && 'bg-primary/20 ring-1 ring-primary',
                        isToday(day) && !isSelected && 'bg-accent'
                      )}
                    >
                      <span className={cn(
                        'text-xs font-medium',
                        isToday(day) && 'text-primary font-bold'
                      )}>
                        {format(day, 'd')}
                      </span>
                      {hasClasses && (
                        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                          {dayClasses.slice(0, 2).map((c, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                'w-1 h-1 rounded-full',
                                c.class_type === 'case_presentation' ? 'bg-green-500' :
                                c.class_type === 'grand_rounds' ? 'bg-purple-500' :
                                c.class_type === 'conference' ? 'bg-emerald-500' :
                                c.class_type === 'seminar' ? 'bg-cyan-500' :
                                c.class_type === 'workshop' ? 'bg-teal-500' : 'bg-blue-500'
                              )} 
                            />
                          ))}
                          {dayClasses.length > 2 && (
                            <span className="text-[6px] text-muted-foreground">+</span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selected Date Classes */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {format(selectedDate, 'EEE, MMM d')}
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {selectedDateClasses.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No classes scheduled</p>
                {isAdmin && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setFormData({ ...formData, class_date: format(selectedDate, 'yyyy-MM-dd') });
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Class
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDateClasses.map(classItem => (
                  <div
                    key={classItem.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
                    onClick={() => handleViewDetails(classItem)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <Badge className={cn('border text-xs px-1.5 py-0', classTypeColors[classItem.class_type])}>
                            {classTypeLabels[classItem.class_type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {classItem.start_time}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm truncate">{classItem.title}</h4>
                        {classItem.speaker_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                            <User className="w-3 h-3 flex-shrink-0" />
                            {classItem.speaker_name}
                          </p>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(classItem)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Class</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this class?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteClassMutation.mutate(classItem.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Class Details Sheet (Mobile) / Dialog (Desktop) */}
      {isMobile ? (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Class Details
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(85vh-100px)]">
              <ClassDetailContent />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <DialogContent className="max-w-lg max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Class Details
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-4">
              <ClassDetailContent />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingClass(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
          </DialogHeader>
          {renderClassForm(handleEditSubmit, true)}
        </DialogContent>
      </Dialog>

      {/* Apply for Conference Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for {selectedClass ? classTypeLabels[selectedClass.class_type] : 'Conference'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedClass && (
              <div className="p-3 rounded-lg bg-accent/30">
                <h4 className="font-medium text-sm">{selectedClass.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(parseISO(selectedClass.class_date), 'MMMM d, yyyy')}
                  {selectedClass.end_date && selectedClass.end_date !== selectedClass.class_date && 
                    ` - ${format(parseISO(selectedClass.end_date), 'MMMM d, yyyy')}`
                  }
                </p>
                {selectedClass.location && (
                  <p className="text-xs text-muted-foreground">📍 {selectedClass.location}</p>
                )}
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Additional Notes (Optional)</Label>
              <Textarea
                value={applicationNotes}
                onChange={(e) => setApplicationNotes(e.target.value)}
                placeholder="Any specific reason or information for attending..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsApplyDialogOpen(false);
                setApplicationNotes('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedClass) {
                  applyForConferenceMutation.mutate({
                    classId: selectedClass.id,
                    notes: applicationNotes
                  });
                }
              }}
              disabled={applyForConferenceMutation.isPending}
              className="w-full sm:w-auto"
            >
              {applyForConferenceMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Academic;
