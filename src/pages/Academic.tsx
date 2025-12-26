import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, isToday } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { 
  Calendar, 
  BookOpen, 
  Users, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ClassType = 'lecture' | 'grand_rounds' | 'case_presentation' | 'journal_club' | 'complication_meeting' | 'nbems_class' | 'pharma_quiz' | 'exam' | 'other';

interface ClassItem {
  id: string;
  title: string;
  class_type: ClassType;
  class_date: string;
  start_time: string;
  end_time: string;
  topic: string | null;
  moderator_name: string | null;
  location: string | null;
  notes: string | null;
  batch: string | null;
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
  other: 'Other'
};

const Academic: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 11, 1)); // December 2025
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    class_type: 'lecture' as ClassType,
    class_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '16:00',
    end_time: '17:00',
    topic: '',
    moderator_name: '',
    location: 'Conference Room',
    notes: '',
    batch: ''
  });

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

  // Add class mutation
  const addClassMutation = useMutation({
    mutationFn: async (newClass: typeof formData) => {
      const { error } = await supabase
        .from('classes')
        .insert([{
          title: newClass.title,
          class_type: newClass.class_type,
          class_date: newClass.class_date,
          start_time: newClass.start_time,
          end_time: newClass.end_time,
          topic: newClass.topic || null,
          moderator_name: newClass.moderator_name || null,
          location: newClass.location || 'Conference Room',
          notes: newClass.notes || null,
          batch: newClass.batch || null
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

  const resetForm = () => {
    setFormData({
      title: '',
      class_type: 'lecture',
      class_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '16:00',
      end_time: '17:00',
      topic: '',
      moderator_name: '',
      location: 'Conference Room',
      notes: '',
      batch: ''
    });
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

  // Get today's and upcoming classes
  const upcomingClasses = useMemo(() => {
    const today = new Date();
    return classes.filter(c => parseISO(c.class_date) >= today).slice(0, 5);
  }, [classes]);

  // Selected date classes
  const selectedDateClasses = selectedDate ? getClassesForDate(selectedDate) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.class_date) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    addClassMutation.mutate(formData);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            Academic Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Classes, Grand Rounds & Academic Activities
          </p>
        </div>
        {user?.role === 'admin' && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Class</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Class title"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
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
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={formData.class_date}
                      onChange={(e) => setFormData({ ...formData, class_date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
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
                
                <div className="space-y-2">
                  <Label>Moderator</Label>
                  <Input
                    value={formData.moderator_name}
                    onChange={(e) => setFormData({ ...formData, moderator_name: e.target.value })}
                    placeholder="Moderator name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
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
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addClassMutation.isPending}>
                    {addClassMutation.isPending ? 'Adding...' : 'Add Class'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{classes.length}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {classes.filter(c => c.class_type === 'grand_rounds').length}
                </p>
                <p className="text-xs text-muted-foreground">Grand Rounds</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {classes.filter(c => c.class_type === 'case_presentation').length}
                </p>
                <p className="text-xs text-muted-foreground">Presentations</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {classes.filter(c => c.class_type === 'nbems_class').length}
                </p>
                <p className="text-xs text-muted-foreground">NBEMS Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {format(currentMonth, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
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
                    'aspect-square p-1 rounded-lg transition-all relative',
                    'hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
                    isSelected && 'bg-primary/20 ring-2 ring-primary',
                    isToday(day) && !isSelected && 'bg-accent'
                  )}
                >
                  <span className={cn(
                    'text-sm font-medium',
                    isToday(day) && 'text-primary font-bold'
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasClasses && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayClasses.slice(0, 3).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Classes */}
      {selectedDate && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Classes on {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDateClasses.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No classes scheduled</p>
            ) : (
              <div className="space-y-3">
                {selectedDateClasses.map(classItem => (
                  <div
                    key={classItem.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn('border', classTypeColors[classItem.class_type])}>
                            {classTypeLabels[classItem.class_type]}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {classItem.start_time} - {classItem.end_time}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground">{classItem.title}</h4>
                        {classItem.topic && (
                          <p className="text-sm text-muted-foreground mt-1">{classItem.topic}</p>
                        )}
                        {classItem.moderator_name && (
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            Moderator: {classItem.moderator_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Classes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Upcoming Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Loading...</div>
          ) : upcomingClasses.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No upcoming classes</p>
          ) : (
            <div className="space-y-3">
              {upcomingClasses.map(classItem => (
                <div
                  key={classItem.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('border text-xs', classTypeColors[classItem.class_type])}>
                          {classTypeLabels[classItem.class_type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(classItem.class_date), 'MMM d')} • {classItem.start_time}
                        </span>
                      </div>
                      <h4 className="font-medium text-foreground text-sm">{classItem.title}</h4>
                      {classItem.moderator_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Moderator: {classItem.moderator_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Academic;
