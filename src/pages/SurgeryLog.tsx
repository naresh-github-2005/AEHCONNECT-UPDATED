import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Video, Calendar as CalendarIcon, Star, ExternalLink, 
  User, Clock, MessageSquare, Play, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

interface SurgeryLog {
  id: string;
  doctor_id: string;
  surgery_date: string;
  surgery_type: string;
  video_url: string;
  video_title: string | null;
  patient_mrn: string | null;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  feedback_given_at: string | null;
  is_viewed: boolean;
  created_at: string;
  doctors?: {
    id: string;
    name: string;
    department: string;
  };
}

const SurgeryLog: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [surgeryLogs, setSurgeryLogs] = useState<SurgeryLog[]>([]);
  const [allLogs, setAllLogs] = useState<SurgeryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set());
  
  // Feedback dialog state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SurgeryLog | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Fetch all surgery logs
  useEffect(() => {
    fetchSurgeryLogs();
  }, []);

  // Filter logs by selected date
  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const filtered = allLogs.filter(log => log.surgery_date === dateStr);
    setSurgeryLogs(filtered);
  }, [selectedDate, allLogs]);

  const fetchSurgeryLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('surgery_logs')
        .select(`
          *,
          doctors (id, name, department)
        `)
        .order('surgery_date', { ascending: false });

      if (error) throw error;
      setAllLogs(data || []);
    } catch (error) {
      console.error('Error fetching surgery logs:', error);
      toast.error('Failed to load surgery logs');
    } finally {
      setLoading(false);
    }
  };

  // Get dates that have surgeries for calendar highlighting
  const getDatesWithSurgeries = () => {
    const dates = new Set<string>();
    allLogs.forEach(log => dates.add(log.surgery_date));
    return dates;
  };

  const datesWithSurgeries = getDatesWithSurgeries();

  const handleVideoClick = async (log: SurgeryLog) => {
    // Mark as viewed
    setViewedVideos(prev => new Set(prev).add(log.id));
    
    // Update in database
    await supabase
      .from('surgery_logs')
      .update({ 
        is_viewed: true, 
        viewed_at: new Date().toISOString()
      })
      .eq('id', log.id);

    // Open YouTube link
    window.open(log.video_url, '_blank');
  };

  const openFeedbackDialog = (log: SurgeryLog) => {
    setSelectedLog(log);
    setFeedbackText(log.feedback || '');
    setFeedbackRating(log.rating || 0);
    setFeedbackDialogOpen(true);
  };

  const submitFeedback = async () => {
    if (!selectedLog) return;
    if (feedbackRating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('surgery_logs')
        .update({
          feedback: feedbackText,
          rating: feedbackRating,
          feedback_given_at: new Date().toISOString()
        })
        .eq('id', selectedLog.id);

      if (error) throw error;

      // Update local state
      setAllLogs(prev => prev.map(log => 
        log.id === selectedLog.id 
          ? { ...log, feedback: feedbackText, rating: feedbackRating, feedback_given_at: new Date().toISOString() }
          : log
      ));

      toast.success('Feedback submitted successfully');
      setFeedbackDialogOpen(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const StarRating = ({ rating, onRate, readonly = false }: { rating: number; onRate?: (r: number) => void; readonly?: boolean }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'text-gray-300'
            } ${!readonly ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={() => !readonly && onRate && onRate(star)}
          />
        ))}
      </div>
    );
  };

  const VideoCard = ({ log }: { log: SurgeryLog }) => {
    const isViewed = viewedVideos.has(log.id) || log.is_viewed;
    
    return (
      <Card className={`transition-all duration-200 hover:shadow-lg ${isViewed ? 'border-primary/50 bg-primary/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Header with doctor info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{log.doctors?.name || 'Unknown Doctor'}</p>
                  <p className="text-xs text-muted-foreground">{log.doctors?.department}</p>
                </div>
              </div>
              {isViewed && (
                <Badge variant="outline" className="text-xs bg-primary/10">
                  <Eye className="w-3 h-3 mr-1" />
                  Viewed
                </Badge>
              )}
            </div>

            {/* Surgery details */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{log.surgery_type}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(log.surgery_date), 'MMM d, yyyy')}
                </span>
              </div>
              {log.video_title && (
                <p className="text-sm font-medium">{log.video_title}</p>
              )}
            </div>

            {/* Video link button */}
            <Button 
              variant={isViewed ? "outline" : "default"}
              size="sm"
              className="w-full gap-2"
              onClick={() => handleVideoClick(log)}
            >
              <Play className="w-4 h-4" />
              Watch on YouTube
              <ExternalLink className="w-3 h-3" />
            </Button>

            {/* Rating display */}
            {log.rating && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <span className="text-xs text-muted-foreground">Rating:</span>
                <StarRating rating={log.rating} readonly />
              </div>
            )}

            {/* Feedback display */}
            {log.feedback && (
              <div className="bg-muted/50 rounded-lg p-2 mt-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <MessageSquare className="w-3 h-3" />
                  Feedback
                </p>
                <p className="text-sm">{log.feedback}</p>
              </div>
            )}

            {/* Admin feedback button */}
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                className="w-full gap-2 mt-2"
                onClick={() => openFeedbackDialog(log)}
              >
                <MessageSquare className="w-4 h-4" />
                {log.feedback ? 'Edit Feedback' : 'Give Feedback'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center">
            <Video className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Surgery Log</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'View all surgery videos and provide feedback' : 'View your surgery videos'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Section */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  hasSurgery: (date) => datesWithSurgeries.has(format(date, 'yyyy-MM-dd'))
                }}
                modifiersStyles={{
                  hasSurgery: { 
                    backgroundColor: 'hsl(var(--primary) / 0.2)',
                    fontWeight: 'bold'
                  }
                }}
              />
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 rounded bg-primary/20" />
                <span>Days with surgeries</span>
              </div>
            </CardContent>
          </Card>

          {/* Surgery Videos Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Video className="w-5 h-5" />
                    Surgeries on {format(selectedDate, 'MMMM d, yyyy')}
                  </span>
                  <Badge variant="secondary">{surgeryLogs.length} videos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : surgeryLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No surgery videos for this date</p>
                    <p className="text-sm">Select a highlighted date to view videos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {surgeryLogs.map((log) => (
                      <VideoCard key={log.id} log={log} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Feedback Dialog */}
        <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Give Feedback</DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="font-medium">{selectedLog.doctors?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedLog.surgery_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(selectedLog.surgery_date), 'MMMM d, yyyy')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rating</label>
                  <StarRating rating={feedbackRating} onRate={setFeedbackRating} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Feedback Comments</label>
                  <Textarea
                    placeholder="Enter your feedback about this surgery..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitFeedback} disabled={submittingFeedback}>
                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default SurgeryLog;
