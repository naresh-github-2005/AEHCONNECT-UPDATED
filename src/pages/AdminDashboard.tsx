import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, DoctorAvatar } from '@/components/ui/DutyComponents';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Clock,
  FileText,
  AlertTriangle,
  Tent,
  Users,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import AISchedulingAssistant from '@/components/admin/AISchedulingAssistant';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    dutyAssignments, 
    leaveRequests, 
    activityLog, 
    generateRoster, 
    approveLeave, 
    rejectLeave,
    lastUpdated 
  } = useData();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending');

  const handleGenerateRoster = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    generateRoster();
    toast({
      title: 'Roster Generated',
      description: 'Today\'s duty roster has been successfully generated.',
    });
    setIsGenerating(false);
  };

  const handleApproveLeave = (leaveId: string) => {
    approveLeave(leaveId);
    toast({
      title: 'Leave Approved',
      description: 'The leave request has been approved.',
    });
  };

  const handleRejectLeave = (leaveId: string) => {
    rejectLeave(leaveId);
    toast({
      title: 'Leave Rejected',
      description: 'The leave request has been rejected.',
    });
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-title text-foreground">Admin Dashboard</h2>
        <p className="text-caption text-muted-foreground">
          Manage rosters, approvals, and hospital operations
        </p>
      </div>

      {/* Quick Admin Links */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up">
        <Card 
          className="shadow-soft cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/camps')}
        >
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Tent className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">Camps</p>
                  <p className="text-tiny text-muted-foreground">Eye camps</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="shadow-soft cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => navigate('/doctors')}
        >
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-body font-medium text-foreground">Doctors</p>
                  <p className="text-tiny text-muted-foreground">Profiles</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Scheduling Assistant */}
      <div className="animate-slide-up">
        <AISchedulingAssistant />
      </div>

      {/* Generate Roster Card */}
      <Card className="shadow-card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 animate-slide-up">
        <CardContent className="py-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-subtitle font-semibold text-foreground">
                Daily Roster Generation
              </h3>
              <p className="text-caption text-muted-foreground mt-1">
                Generate optimized duty assignments for today
              </p>
            </div>
            <Button
              onClick={handleGenerateRoster}
              disabled={isGenerating}
              size="lg"
              className="w-full max-w-xs h-12"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Today's Roster
                </>
              )}
            </Button>
            <p className="text-tiny text-muted-foreground">
              Last generated: {format(lastUpdated, 'h:mm a')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up stagger-1">
        <Card className="shadow-soft">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-hero text-foreground">{dutyAssignments.length}</p>
                <p className="text-tiny text-muted-foreground">Duties Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-soft">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                pendingLeaves.length > 0 ? 'bg-warning/10' : 'bg-success/10'
              )}>
                <Clock className={cn(
                  'w-5 h-5',
                  pendingLeaves.length > 0 ? 'text-warning' : 'text-success'
                )} />
              </div>
              <div>
                <p className="text-hero text-foreground">{pendingLeaves.length}</p>
                <p className="text-tiny text-muted-foreground">Pending Leaves</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Leave Approvals */}
      {pendingLeaves.length > 0 && (
        <div className="animate-slide-up stagger-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <h3 className="text-subtitle text-foreground">Pending Approvals</h3>
          </div>
          <div className="space-y-3">
            {pendingLeaves.map((leave) => (
              <Card key={leave.id} className="shadow-soft border-warning/30">
                <CardContent className="py-4 px-4">
                  <div className="flex items-start gap-3">
                    <DoctorAvatar name={leave.doctor.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-foreground">
                        {leave.doctor.name}
                      </p>
                      <p className="text-tiny text-muted-foreground">
                        {leave.leaveType} Leave • {format(new Date(leave.startDate), 'MMM d')} — {format(new Date(leave.endDate), 'MMM d')}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => handleApproveLeave(leave.id)}
                      size="sm"
                      className="flex-1 h-9"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleRejectLeave(leave.id)}
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="animate-slide-up stagger-3">
        <h3 className="text-subtitle text-foreground mb-3">Recent Activity</h3>
        <Card className="shadow-soft">
          <CardContent className="py-2 px-0">
            {activityLog.slice(0, 5).map((log, index) => (
              <div
                key={log.id}
                className={cn(
                  'flex items-start gap-3 px-4 py-3',
                  index !== activityLog.length - 1 && 'border-b border-border'
                )}
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-body text-foreground">{log.action}</p>
                  {log.details && (
                    <p className="text-tiny text-muted-foreground mt-0.5">
                      {log.details}
                    </p>
                  )}
                </div>
                <p className="text-tiny text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
