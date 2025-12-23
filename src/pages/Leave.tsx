import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StatusBadge } from '@/components/ui/DutyComponents';
import { LeaveType } from '@/lib/mockData';
import { CalendarIcon, Plus, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const leaveTypes: LeaveType[] = ['Casual', 'Emergency'];

const Leave: React.FC = () => {
  const { leaveRequests, applyLeave } = useData();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!startDate || !endDate || !selectedLeaveType) return;

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    applyLeave(
      format(startDate, 'yyyy-MM-dd'),
      format(endDate, 'yyyy-MM-dd'),
      selectedLeaveType
    );

    toast({
      title: 'Leave Request Submitted',
      description: `Your ${selectedLeaveType.toLowerCase()} leave request has been submitted for approval.`,
    });

    // Reset form
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedLeaveType(null);
    setIsSubmitting(false);
  };

  const canSubmit = startDate && endDate && selectedLeaveType && !isSubmitting;
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

      {/* Leave Form */}
      <Card className="shadow-card animate-slide-up">
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
      <div className="animate-slide-up stagger-1">
        <h3 className="text-subtitle text-foreground mb-3">Leave History</h3>
        <div className="space-y-3">
          {leaveRequests.map((leave, index) => (
            <Card key={leave.id} className="shadow-soft">
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-body font-medium text-foreground">
                        {leave.leaveType} Leave
                      </span>
                      <StatusBadge status={leave.status} />
                    </div>
                    <p className="text-caption text-muted-foreground mt-1">
                      {format(new Date(leave.startDate), 'MMM d')} — {format(new Date(leave.endDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <p className="text-tiny text-muted-foreground">
                    {format(new Date(leave.appliedAt), 'MMM d')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {leaveRequests.length === 0 && (
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
