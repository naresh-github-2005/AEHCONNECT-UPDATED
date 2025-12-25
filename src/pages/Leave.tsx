import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/DutyComponents';
import { CalendarIcon, Plus, Check, Calendar as CalendarDays, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type LeaveRequest = Tables<'leave_requests'>;
type LeaveType = 'Casual' | 'Emergency' | 'Medical' | 'Annual';

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

  // Fetch doctor ID for current user
  useEffect(() => {
    const fetchDoctorId = async () => {
      if (!user) return;
      
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
  }, [user]);

  // Fetch leave requests with real-time updates
  useEffect(() => {
    const fetchLeaveRequests = async () => {
      if (!doctorId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
      } else {
        setLeaveRequests(data || []);
      }
      setIsLoading(false);
    };

    fetchLeaveRequests();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('leave-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leave_requests',
          filter: doctorId ? `doctor_id=eq.${doctorId}` : undefined,
        },
        () => {
          fetchLeaveRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [doctorId]);

  const handleSubmit = async () => {
    if (!startDate || !endDate || !selectedLeaveType || !doctorId) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('leave_requests').insert({
      doctor_id: doctorId,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      leave_type: selectedLeaveType,
      status: 'pending',
    });

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

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setSelectedLeaveType(null);
    }

    setIsSubmitting(false);
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

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
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
              {leaveTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedLeaveType(type)}
                  className={cn(
                    'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all',
                    selectedLeaveType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      selectedLeaveType === type
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {selectedLeaveType === type && (
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-body font-medium',
                      selectedLeaveType === type ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {type}
                  </span>
                </button>
              ))}
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
