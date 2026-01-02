import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/DutyComponents';
import { CalendarIcon, Plus, Check, Calendar as CalendarDays, Clock, CheckCircle2, XCircle, User } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type LeaveRequest = Tables<'leave_requests'> & {
  doctor?: { name: string } | null;
};
type LeaveType = 'Casual' | 'Emergency' | 'Medical' | 'Annual';

interface LeaveBalance {
  casualTaken: number;
  medicalTaken: number;
  emergencyTaken: number;
  annualTaken: number;
  maxCasual: number;
  maxMedical: number;
  maxEmergency: number;
  maxAnnual: number;
}

const leaveTypes: LeaveType[] = ['Casual', 'Emergency', 'Medical', 'Annual'];

const Leave: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null);

  const isAdmin = user?.role === 'admin';

  // Fetch doctor ID for current user (only for doctors)
  useEffect(() => {
    const fetchDoctorId = async () => {
      if (!user || isAdmin) return;
      
      const { data } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setDoctorId(data.id);
      }
    };
    
    fetchDoctorId();
  }, [user, isAdmin]);

  // Fetch leave balance for doctor (limits and taken)
  useEffect(() => {
    const fetchLeaveBalance = async () => {
      if (!doctorId || isAdmin) return;

      // Get doctor's leave limits
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('max_casual_leaves, max_medical_leaves, max_emergency_leaves, max_annual_leaves')
        .eq('id', doctorId)
        .maybeSingle();

      // Get approved leave requests for this year
      const currentYear = new Date().getFullYear();
      const { data: approvedLeaves } = await supabase
        .from('leave_requests')
        .select('leave_type, start_date, end_date')
        .eq('doctor_id', doctorId)
        .eq('status', 'approved')
        .gte('start_date', `${currentYear}-01-01`)
        .lte('end_date', `${currentYear}-12-31`);

      // Calculate days taken per leave type
      const summary = {
        casualTaken: 0,
        medicalTaken: 0,
        emergencyTaken: 0,
        annualTaken: 0,
        maxCasual: doctorData?.max_casual_leaves ?? 12,
        maxMedical: doctorData?.max_medical_leaves ?? 12,
        maxEmergency: doctorData?.max_emergency_leaves ?? 6,
        maxAnnual: doctorData?.max_annual_leaves ?? 30,
      };

      (approvedLeaves || []).forEach((leave) => {
        const days = differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1;
        switch (leave.leave_type) {
          case 'Casual':
            summary.casualTaken += days;
            break;
          case 'Medical':
            summary.medicalTaken += days;
            break;
          case 'Emergency':
            summary.emergencyTaken += days;
            break;
          case 'Annual':
            summary.annualTaken += days;
            break;
        }
      });

      setLeaveBalance(summary);
    };

    fetchLeaveBalance();
  }, [doctorId, isAdmin, leaveRequests]);

  // Fetch leave requests with real-time updates
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from('leave_requests')
        .select('*, doctor:doctors(name)')
        .order('created_at', { ascending: false });

      // If admin, show all requests (prioritize pending)
      // If doctor, show only their requests
      if (!isAdmin && doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching leave requests:', error);
      } else {
        // Sort to show pending first for admin
        const sorted = isAdmin 
          ? [...(data || [])].sort((a, b) => {
              if (a.status === 'pending' && b.status !== 'pending') return -1;
              if (a.status !== 'pending' && b.status === 'pending') return 1;
              return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
            })
          : data || [];
        setLeaveRequests(sorted);
      }
      setIsLoading(false);
    };

    if (isAdmin || doctorId) {
      fetchLeaveRequests();
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel('leave-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
        },
        () => {
          fetchLeaveRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, doctorId, isAdmin]);

  const handleSubmit = async () => {
    if (!startDate || !endDate || !selectedLeaveType || !doctorId) return;

    const requestedDays = differenceInDays(endDate, startDate) + 1;

    // Format date strings (YYYY-MM-DD) for reliable comparisons
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Server-side check: query DB for any overlapping approved/pending leaves
    // Overlap condition: start_date <= new_end AND end_date >= new_start
    const { data: overlapping, error: overlapError } = await supabase
      .from('leave_requests')
      .select('id, leave_type, status, start_date, end_date')
      .eq('doctor_id', doctorId)
      .in('status', ['approved', 'pending'])
      .lte('start_date', endDateStr)
      .gte('end_date', startDateStr);

    if (overlapError) {
      console.error('Error checking overlapping leaves:', overlapError);
    }

    if (overlapping && overlapping.length > 0) {
      const conflictingLeave = overlapping[0];
      const conflictStatus = conflictingLeave.status === 'approved' ? 'approved' : 'pending';
      toast({
        title: 'Leave Conflict',
        description: `You already have a ${conflictStatus} ${conflictingLeave.leave_type?.toLowerCase()} leave from ${format(new Date(conflictingLeave.start_date), 'MMM d')} to ${format(new Date(conflictingLeave.end_date), 'MMM d')}. You cannot apply for overlapping dates.`,
        variant: 'destructive',
      });
      return;
    }

    // Validate against remaining leaves
    if (leaveBalance) {
      let taken = 0;
      let max = 0;

      switch (selectedLeaveType) {
        case 'Casual':
          taken = leaveBalance.casualTaken;
          max = leaveBalance.maxCasual;
          break;
        case 'Medical':
          taken = leaveBalance.medicalTaken;
          max = leaveBalance.maxMedical;
          break;
        case 'Emergency':
          taken = leaveBalance.emergencyTaken;
          max = leaveBalance.maxEmergency;
          break;
        case 'Annual':
          taken = leaveBalance.annualTaken;
          max = leaveBalance.maxAnnual;
          break;
      }

      const remaining = max - taken;
      if (remaining <= 0) {
        toast({
          title: 'No Leave Balance',
          description: `You have exhausted all your ${selectedLeaveType.toLowerCase()} leaves for this year. You cannot apply for more.`,
          variant: 'destructive',
        });
        return;
      }
      
      if (requestedDays > remaining) {
        toast({
          title: 'Insufficient Leave Balance',
          description: `You have only ${remaining} ${selectedLeaveType.toLowerCase()} leave day(s) remaining. You are requesting ${requestedDays} day(s).`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    // Insert and return the created row so we can optimistically update UI
    const { data: inserted, error } = await supabase
      .from('leave_requests')
      .insert({
        doctor_id: doctorId,
        start_date: startDateStr,
        end_date: endDateStr,
        leave_type: selectedLeaveType,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit leave request. Please try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Leave Request Submitted',
        description: `Your ${selectedLeaveType.toLowerCase()} leave request has been submitted for approval.`,
      });

      // Optimistically update local list so UI shows the new pending request immediately
      if (inserted) {
        setLeaveRequests((prev) => [inserted as any, ...(prev || [])]);
      }

      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedLeaveType(null);
    }

    setIsSubmitting(false);
  };

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'approved', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to approve leave request.', variant: 'destructive' });
    } else {
      toast({ title: 'Approved', description: 'Leave request has been approved.' });
    }
    setProcessingId(null);
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'rejected', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to reject leave request.', variant: 'destructive' });
    } else {
      toast({ title: 'Rejected', description: 'Leave request has been rejected.' });
    }
    setProcessingId(null);
  };

  // Calculate analytics
  const analytics = {
    total: leaveRequests.length,
    pending: leaveRequests.filter((l) => l.status === 'pending').length,
    approved: leaveRequests.filter((l) => l.status === 'approved').length,
    rejected: leaveRequests.filter((l) => l.status === 'rejected').length,
    totalDays: leaveRequests
      .filter((l) => l.status === 'approved')
      .reduce((acc, l) => {
        const days = differenceInDays(new Date(l.end_date), new Date(l.start_date)) + 1;
        return acc + days;
      }, 0),
  };

  const canSubmit = startDate && endDate && selectedLeaveType && !isSubmitting && doctorId;
  const leaveDays = startDate && endDate ? differenceInDays(endDate, startDate) + 1 : 0;

  // Admin View - Leave Approval
  if (isAdmin) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="animate-fade-in">
          <h2 className="text-title text-foreground">Leave Management</h2>
          <p className="text-caption text-muted-foreground">
            Review and approve leave requests
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up">
          <Card className="shadow-soft bg-warning/5 border-warning/20">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{analytics.pending}</p>
                  <p className="text-tiny text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft bg-success/5 border-success/20">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{analytics.approved}</p>
                  <p className="text-tiny text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft bg-destructive/5 border-destructive/20">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{analytics.rejected}</p>
                  <p className="text-tiny text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft bg-primary/5 border-primary/20">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{analytics.total}</p>
                  <p className="text-tiny text-muted-foreground">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Leave Requests List */}
        <div className="animate-slide-up stagger-1">
          <h3 className="text-subtitle text-foreground mb-3">Leave Requests</h3>
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="shadow-soft animate-pulse">
                    <CardContent className="py-4 px-4">
                      <div className="h-16 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : leaveRequests.length > 0 ? (
              leaveRequests.map((leave) => (
                <Card key={leave.id} className={cn("shadow-soft", leave.status === 'pending' && "border-warning/30 bg-warning/5")}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-body font-medium text-foreground">
                            {leave.doctor?.name || 'Unknown Doctor'}
                          </span>
                          <StatusBadge status={(leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1)) as 'Approved' | 'Pending' | 'Rejected' || 'Pending'} />
                        </div>
                        <p className="text-caption text-muted-foreground">
                          {leave.leave_type} Leave • {format(new Date(leave.start_date), 'MMM d')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                        </p>
                        <p className="text-tiny text-muted-foreground mt-0.5">
                          {differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1} day(s) • Applied {leave.created_at && format(new Date(leave.created_at), 'MMM d')}
                        </p>
                      </div>
                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(leave.id)}
                            disabled={processingId === leave.id}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(leave.id)}
                            disabled={processingId === leave.id}
                            className="bg-success hover:bg-success/90"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-body text-muted-foreground">No leave requests found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Doctor View - Leave Application
  return (
    <div className="px-4 py-6 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-title text-foreground">Apply Leave</h2>
        <p className="text-caption text-muted-foreground">
          Submit your leave request for approval
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up">
        <Card className="shadow-soft bg-primary/5 border-primary/20">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics.total}</p>
                <p className="text-tiny text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft bg-success/5 border-success/20">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics.approved}</p>
                <p className="text-tiny text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft bg-warning/5 border-warning/20">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics.pending}</p>
                <p className="text-tiny text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft bg-accent/5 border-accent/20">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics.totalDays}</p>
                <p className="text-tiny text-muted-foreground">Days Taken</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balance Section */}
      {leaveBalance && (
        <Card className="shadow-card animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-subtitle flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Leave Balance ({new Date().getFullYear()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <p className="text-tiny font-medium text-blue-600 dark:text-blue-400 mb-1">Casual</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground">{leaveBalance.maxCasual - leaveBalance.casualTaken}</span>
                  <span className="text-tiny text-muted-foreground">/ {leaveBalance.maxCasual} remaining</span>
                </div>
                <p className="text-tiny text-muted-foreground mt-1">{leaveBalance.casualTaken} taken</p>
              </div>

              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <p className="text-tiny font-medium text-green-600 dark:text-green-400 mb-1">Medical</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground">{leaveBalance.maxMedical - leaveBalance.medicalTaken}</span>
                  <span className="text-tiny text-muted-foreground">/ {leaveBalance.maxMedical} remaining</span>
                </div>
                <p className="text-tiny text-muted-foreground mt-1">{leaveBalance.medicalTaken} taken</p>
              </div>

              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                <p className="text-tiny font-medium text-orange-600 dark:text-orange-400 mb-1">Emergency</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground">{leaveBalance.maxEmergency - leaveBalance.emergencyTaken}</span>
                  <span className="text-tiny text-muted-foreground">/ {leaveBalance.maxEmergency} remaining</span>
                </div>
                <p className="text-tiny text-muted-foreground mt-1">{leaveBalance.emergencyTaken} taken</p>
              </div>

              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <p className="text-tiny font-medium text-purple-600 dark:text-purple-400 mb-1">Annual</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-foreground">{leaveBalance.maxAnnual - leaveBalance.annualTaken}</span>
                  <span className="text-tiny text-muted-foreground">/ {leaveBalance.maxAnnual} remaining</span>
                </div>
                <p className="text-tiny text-muted-foreground mt-1">{leaveBalance.annualTaken} taken</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leave Form */}
      <Card className="shadow-card animate-slide-up stagger-1">
        <CardHeader className="pb-4">
          <CardTitle className="text-subtitle flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Leave Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-tiny font-medium text-muted-foreground mb-1.5 block">
                Start Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'MMM d') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date && (!endDate || date > endDate)) {
                        setEndDate(date);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-tiny font-medium text-muted-foreground mb-1.5 block">
                End Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'MMM d') : 'Select'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < (startDate || new Date())}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {leaveDays > 0 && (
            <div className="bg-muted rounded-lg px-3 py-2 text-center">
              <span className="text-caption text-muted-foreground">
                Duration: <span className="font-medium text-foreground">{leaveDays} day{leaveDays > 1 ? 's' : ''}</span>
              </span>
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="text-tiny font-medium text-muted-foreground mb-2 block">
              Leave Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              {leaveTypes.map((type) => {
                // Calculate remaining for this type
                let remaining = 999; // default if no balance loaded
                if (leaveBalance) {
                  switch (type) {
                    case 'Casual':
                      remaining = leaveBalance.maxCasual - leaveBalance.casualTaken;
                      break;
                    case 'Medical':
                      remaining = leaveBalance.maxMedical - leaveBalance.medicalTaken;
                      break;
                    case 'Emergency':
                      remaining = leaveBalance.maxEmergency - leaveBalance.emergencyTaken;
                      break;
                    case 'Annual':
                      remaining = leaveBalance.maxAnnual - leaveBalance.annualTaken;
                      break;
                  }
                }
                const isExhausted = remaining <= 0;
                
                return (
                  <button
                    key={type}
                    onClick={() => !isExhausted && setSelectedLeaveType(type)}
                    disabled={isExhausted}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl border-2 transition-all',
                      isExhausted 
                        ? 'border-destructive/30 bg-destructive/5 cursor-not-allowed opacity-60'
                        : selectedLeaveType === type
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                          isExhausted
                            ? 'border-destructive/50'
                            : selectedLeaveType === type
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                        )}
                      >
                        {selectedLeaveType === type && !isExhausted && (
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-body font-medium',
                          isExhausted 
                            ? 'text-destructive/70'
                            : selectedLeaveType === type 
                              ? 'text-primary' 
                              : 'text-foreground'
                        )}
                      >
                        {type}
                      </span>
                    </div>
                    {leaveBalance && (
                      <span className={cn(
                        'text-tiny',
                        isExhausted ? 'text-destructive' : 'text-muted-foreground'
                      )}>
                        {isExhausted ? 'Exhausted' : `${remaining} left`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 text-body font-semibold"
            size="lg"
          >
            {isSubmitting ? (
              <span className="animate-pulse-subtle">Submitting...</span>
            ) : (
              'Submit Leave Request'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Leave History */}
      <div className="animate-slide-up stagger-2">
        <h3 className="text-subtitle text-foreground mb-3">Leave History</h3>
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="shadow-soft animate-pulse">
                  <CardContent className="py-4 px-4">
                    <div className="h-12 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : leaveRequests.length > 0 ? (
            leaveRequests.map((leave) => (
              <Card key={leave.id} className="shadow-soft">
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-body font-medium text-foreground">
                          {leave.leave_type} Leave
                        </span>
                        <StatusBadge status={(leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1)) as 'Approved' | 'Pending' | 'Rejected' || 'Pending'} />
                      </div>
                      <p className="text-caption text-muted-foreground mt-1">
                        {format(new Date(leave.start_date), 'MMM d')} — {format(new Date(leave.end_date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-tiny text-muted-foreground mt-0.5">
                        {differenceInDays(new Date(leave.end_date), new Date(leave.start_date)) + 1} day(s)
                      </p>
                    </div>
                    <p className="text-tiny text-muted-foreground">
                      {leave.created_at && format(new Date(leave.created_at), 'MMM d')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-body text-muted-foreground">No leave requests yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leave;
