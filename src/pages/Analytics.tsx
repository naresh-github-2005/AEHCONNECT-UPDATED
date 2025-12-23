import React from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalyticsData } from '@/lib/mockData';
import { 
  BarChart3, 
  Moon, 
  Users, 
  RefreshCw,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Analytics: React.FC = () => {
  const { dutyAssignments, leaveRequests, activityLog } = useData();
  const analytics = getAnalyticsData();

  const doctorsOnLeaveToday = leaveRequests.filter(
    (l) => l.status === 'Approved' && new Date(l.startDate) <= new Date() && new Date(l.endDate) >= new Date()
  ).length;

  const getStatusIcon = (status: 'Good' | 'Moderate' | 'Needs Review') => {
    switch (status) {
      case 'Good':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'Moderate':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'Needs Review':
        return <AlertCircle className="w-5 h-5 text-destructive" />;
    }
  };

  const getStatusColor = (status: 'Good' | 'Moderate' | 'Needs Review') => {
    switch (status) {
      case 'Good':
        return 'bg-success/10 border-success/20 text-success';
      case 'Moderate':
        return 'bg-warning/10 border-warning/20 text-warning';
      case 'Needs Review':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-title text-foreground">Analytics Overview</h2>
        <p className="text-caption text-muted-foreground">
          Key metrics at a glance for hospital leadership
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 animate-slide-up">
        {/* Duty Load Balance */}
        <Card className={cn('shadow-card border', getStatusColor(analytics.dutyLoadBalance))}>
          <CardContent className="py-5 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  analytics.dutyLoadBalance === 'Good' ? 'bg-success/20' : 
                  analytics.dutyLoadBalance === 'Moderate' ? 'bg-warning/20' : 'bg-destructive/20'
                )}>
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-tiny font-medium opacity-80 uppercase tracking-wide">
                    Duty Load Balance
                  </p>
                  <p className="text-title mt-0.5">{analytics.dutyLoadBalance}</p>
                </div>
              </div>
              {getStatusIcon(analytics.dutyLoadBalance)}
            </div>
          </CardContent>
        </Card>

        {/* Night Duty Distribution */}
        <Card className="shadow-card animate-slide-up stagger-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-subtitle flex items-center gap-2">
              <Moon className="w-5 h-5 text-accent" />
              Night Duty Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {Object.entries(analytics.nightDutyDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([doctor, count]) => (
                  <div key={doctor} className="flex items-center justify-between">
                    <span className="text-body text-foreground">{doctor}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${(count / 6) * 100}%` }}
                        />
                      </div>
                      <span className="text-caption text-muted-foreground w-6 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up stagger-2">
          {/* Doctors on Leave */}
          <Card className="shadow-soft">
            <CardContent className="py-5 px-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6 text-warning" />
                </div>
                <p className="text-hero text-foreground">{doctorsOnLeaveToday}</p>
                <p className="text-tiny text-muted-foreground mt-1">On Leave Today</p>
              </div>
            </CardContent>
          </Card>

          {/* Roster Changes */}
          <Card className="shadow-soft">
            <CardContent className="py-5 px-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <RefreshCw className="w-6 h-6 text-primary" />
                </div>
                <p className="text-hero text-foreground">{activityLog.length}</p>
                <p className="text-tiny text-muted-foreground mt-1">Changes Today</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Insights */}
        <Card className="shadow-card animate-slide-up stagger-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-subtitle flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-success" />
              Quick Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-body text-muted-foreground">Total Doctors</span>
                <span className="text-body font-semibold text-foreground">{analytics.totalDoctors}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-body text-muted-foreground">Active Duties Today</span>
                <span className="text-body font-semibold text-foreground">{dutyAssignments.length}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-body text-muted-foreground">Avg. Duties / Doctor</span>
                <span className="text-body font-semibold text-foreground">{analytics.averageDutiesPerDoctor.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-body text-muted-foreground">Pending Leave Requests</span>
                <span className="text-body font-semibold text-foreground">
                  {leaveRequests.filter((l) => l.status === 'Pending').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
