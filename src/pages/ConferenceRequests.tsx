import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ClipboardList, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  MapPin,
  User,
  Users,
  FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface ConferenceSummary {
  class_id: string;
  conference_title: string;
  class_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  application_deadline: string;
  is_deadline_passed: boolean;
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
}

interface ApplicationDetail {
  application_id: string;
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  designation: string;
  department: string;
  unit: string;
  status: ApplicationStatus;
  applied_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
  doctor_notes: string | null;
  admin_notes: string | null;
}

const ConferenceRequests: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedConference, setSelectedConference] = useState<ConferenceSummary | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationDetail | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');

  // Get admin's doctor ID (fetch if not available in context)
  const { data: adminDoctorId } = useQuery({
    queryKey: ['admin-doctor-id', user?.id],
    queryFn: async () => {
      if (user?.doctorId) return user.doctorId;
      
      // If no doctorId in context, fetch from database
      const { data, error } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error || !data) {
        console.error('Admin doctor ID not found:', error);
        return null;
      }
      
      return data.id;
    },
    enabled: !!user?.id
  });

  const doctorId = user?.doctorId || adminDoctorId;

  // Fetch conference applications summary
  const { data: conferences = [], isLoading } = useQuery({
    queryKey: ['conference-applications-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_conference_applications_summary');
      
      if (error) throw error;
      return data as ConferenceSummary[];
    }
  });

  // Fetch applications for a specific conference
  const { data: applications = [], isLoading: isLoadingApplications } = useQuery({
    queryKey: ['conference-applications', selectedConference?.class_id],
    queryFn: async () => {
      if (!selectedConference) return [];
      
      const { data, error } = await supabase
        .rpc('get_conference_applications', { p_class_id: selectedConference.class_id });
      
      if (error) throw error;
      return data as ApplicationDetail[];
    },
    enabled: !!selectedConference
  });

  // Approve application mutation
  const approveApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string; notes: string }) => {
      if (!doctorId) {
        console.error('Doctor ID not available:', {
          userId: user?.id,
          userDoctorId: user?.doctorId,
          fetchedDoctorId: adminDoctorId,
          userName: user?.name
        });
        throw new Error('Admin profile not found. Please ensure your account is linked to a doctor profile.');
      }
      
      const { data, error } = await supabase
        .rpc('approve_conference_application', {
          p_application_id: applicationId,
          p_admin_id: doctorId,
          p_notes: notes || null
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conference-applications'] });
      queryClient.invalidateQueries({ queryKey: ['conference-applications-summary'] });
      toast({ 
        title: 'Success', 
        description: 'Application approved and duty exclusion created' 
      });
      setIsReviewDialogOpen(false);
      setReviewNotes('');
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to approve application', 
        variant: 'destructive' 
      });
    }
  });

  // Reject application mutation
  const rejectApplicationMutation = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string; notes: string }) => {
      if (!doctorId) {
        console.error('Doctor ID not available:', {
          userId: user?.id,
          userDoctorId: user?.doctorId,
          fetchedDoctorId: adminDoctorId,
          userName: user?.name
        });
        throw new Error('Admin profile not found. Please ensure your account is linked to a doctor profile.');
      }
      
      const { data, error } = await supabase
        .rpc('reject_conference_application', {
          p_application_id: applicationId,
          p_admin_id: doctorId,
          p_notes: notes || null
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conference-applications'] });
      queryClient.invalidateQueries({ queryKey: ['conference-applications-summary'] });
      toast({ 
        title: 'Success', 
        description: 'Application rejected' 
      });
      setIsReviewDialogOpen(false);
      setReviewNotes('');
      setSelectedApplication(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to reject application', 
        variant: 'destructive' 
      });
    }
  });

  const handleReview = (application: ApplicationDetail, action: 'approve' | 'reject') => {
    setSelectedApplication(application);
    setReviewAction(action);
    setReviewNotes('');
    setIsReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!selectedApplication) return;
    
    if (reviewAction === 'approve') {
      approveApplicationMutation.mutate({
        applicationId: selectedApplication.application_id,
        notes: reviewNotes
      });
    } else {
      rejectApplicationMutation.mutate({
        applicationId: selectedApplication.application_id,
        notes: reviewNotes
      });
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Cancelled
          </Badge>
        );
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
            <Button onClick={() => navigate('/academic')} className="mt-4">
              Go to Academic Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Warning if doctor ID not found */}
      {!doctorId && (
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-destructive">Admin Profile Not Linked</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your admin account is not linked to a doctor profile. Please contact the system administrator to link your account with a doctor profile in the database.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  User ID: {user?.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/academic')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            Conference Requests
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
            Manage conference, seminar, and workshop applications
          </p>
        </div>
      </div>

      {/* Conference List or Application Details */}
      {!selectedConference ? (
        <div className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Loading conferences...
              </CardContent>
            </Card>
          ) : conferences.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No conference applications found
              </CardContent>
            </Card>
          ) : (
            conferences.map((conference) => (
              <Card
                key={conference.class_id}
                className="cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setSelectedConference(conference)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{conference.conference_title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(parseISO(conference.start_date), 'MMM d, yyyy')}
                          {conference.end_date && conference.end_date !== conference.start_date && 
                            ` - ${format(parseISO(conference.end_date), 'MMM d')}`
                          }
                        </span>
                        {conference.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {conference.location}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {conference.class_type}
                        </Badge>
                        {conference.is_deadline_passed && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Deadline Passed
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold">{conference.total_applications}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{conference.pending_applications} pending</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span>{conference.approved_applications} approved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Conference Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{selectedConference.conference_title}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseISO(selectedConference.start_date), 'MMM d, yyyy')}
                  {selectedConference.end_date && selectedConference.end_date !== selectedConference.start_date && 
                    ` - ${format(parseISO(selectedConference.end_date), 'MMM d')}`
                  }
                </span>
                {selectedConference.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {selectedConference.location}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <p className="text-xl font-bold text-blue-600">{selectedConference.total_applications}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <p className="text-xl font-bold text-amber-600">{selectedConference.pending_applications}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <p className="text-xl font-bold text-green-600">{selectedConference.approved_applications}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10">
                  <p className="text-xl font-bold text-red-600">{selectedConference.rejected_applications}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Applications List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingApplications ? (
                <p className="text-center text-muted-foreground py-4">Loading applications...</p>
              ) : applications.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No applications yet</p>
              ) : (
                <ScrollArea className="max-h-[calc(100vh-400px)]">
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <div
                        key={app.application_id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium truncate">{app.doctor_name}</h4>
                              {getStatusBadge(app.status)}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>{app.designation} • {app.specialty}</p>
                              <p>{app.department} - {app.unit}</p>
                              <p className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Applied: {format(parseISO(app.applied_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                            {app.doctor_notes && (
                              <div className="mt-2 p-2 rounded bg-accent/30 text-sm">
                                <p className="text-muted-foreground text-xs mb-1">Doctor's Note:</p>
                                <p>{app.doctor_notes}</p>
                              </div>
                            )}
                            {app.admin_notes && (
                              <div className="mt-2 p-2 rounded bg-accent/50 text-sm">
                                <p className="text-muted-foreground text-xs mb-1">Admin Note:</p>
                                <p>{app.admin_notes}</p>
                              </div>
                            )}
                            {app.reviewed_at && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Reviewed by {app.reviewed_by_name} on {format(parseISO(app.reviewed_at), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          {app.status === 'pending' && (
                            <div className="flex flex-col gap-2 flex-shrink-0">
                              <Button
                                size="sm"
                                onClick={() => handleReview(app, 'approve')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleReview(app, 'reject')}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => setSelectedConference(null)} className="w-full">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Conferences
          </Button>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Application
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedApplication && (
              <div className="p-3 rounded-lg bg-accent/30">
                <h4 className="font-medium text-sm">{selectedApplication.doctor_name}</h4>
                <p className="text-xs text-muted-foreground">{selectedApplication.designation} • {selectedApplication.specialty}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Admin Notes {reviewAction === 'reject' && '(Required)'}</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'approve' 
                  ? "Any notes for the doctor (optional)..." 
                  : "Please provide a reason for rejection..."
                }
                rows={3}
                required={reviewAction === 'reject'}
              />
            </div>

            {reviewAction === 'approve' && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-600">
                  ℹ️ Approving will create a duty exclusion record, making this doctor unavailable for roster assignments during the conference dates.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsReviewDialogOpen(false);
                setReviewNotes('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitReview}
              disabled={
                (reviewAction === 'reject' && !reviewNotes.trim()) ||
                approveApplicationMutation.isPending ||
                rejectApplicationMutation.isPending
              }
              className={cn(
                "w-full sm:w-auto",
                reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''
              )}
              variant={reviewAction === 'reject' ? 'destructive' : 'default'}
            >
              {approveApplicationMutation.isPending || rejectApplicationMutation.isPending
                ? 'Processing...'
                : reviewAction === 'approve'
                ? 'Approve & Create Exclusion'
                : 'Reject Application'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConferenceRequests;
