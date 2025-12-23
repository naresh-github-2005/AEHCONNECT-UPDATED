import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DutyBadge, PhoneButton, DoctorAvatar } from '@/components/ui/DutyComponents';
import { Clock, MapPin, Users, RefreshCw, Moon, Activity, CalendarCheck, Stethoscope, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

// Mock doctor stats (would come from API in real app)
const doctorStats = {
  patientsHandledToday: 24,
  patientsHandledThisMonth: 312,
  dutiesCompletedThisMonth: 18,
  nightDutiesThisMonth: 4,
  opdSessions: 12,
  surgeries: 6,
  avgPatientsPerDay: 26,
  attendanceRate: 98,
};

const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { dutyAssignments, lastUpdated, refreshData } = useData();

  // Get current doctor's duty (mock: first doctor)
  const myDuty = dutyAssignments.find((d) => d.doctorId === '1');
  
  // Get night duty doctor
  const nightDutyDoctor = dutyAssignments.find((d) => d.dutyType === 'Night Duty');
  
  // Get other doctors on duty today
  const otherDoctors = dutyAssignments.filter(
    (d) => d.doctorId !== '1' && d.dutyType !== 'Night Duty'
  );

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Greeting */}
      <div className="animate-fade-in">
        <p className="text-caption text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <h2 className="text-hero text-foreground mt-1">
          Hello, {user?.name?.split(' ')[1] || 'Doctor'}
        </h2>
      </div>

      {/* Today's Duty - Hero Card */}
      {myDuty && (
        <Card className="bg-duty-card border-duty-card-border shadow-card animate-slide-up overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <p className="text-caption text-muted-foreground font-medium">TODAY'S DUTY</p>
              <DutyBadge type={myDuty.dutyType} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-title text-foreground">{myDuty.unit}</p>
                <p className="text-caption text-muted-foreground">{myDuty.doctor.department}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-body font-medium">
                {myDuty.startTime} — {myDuty.endTime}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Night Duty Contact */}
      {nightDutyDoctor && (
        <Card className="bg-night-duty border-night-duty-border shadow-soft animate-slide-up stagger-1">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-tiny text-muted-foreground uppercase font-medium tracking-wide">
                    Night Duty Doctor
                  </p>
                  <p className="text-subtitle text-foreground mt-0.5">
                    {nightDutyDoctor.doctor.name}
                  </p>
                </div>
              </div>
              <PhoneButton phone={nightDutyDoctor.doctor.phone} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Analytics */}
      <div className="animate-slide-up stagger-2">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-subtitle text-foreground">Your Stats</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="shadow-soft">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-hero text-foreground">{doctorStats.patientsHandledToday}</p>
                  <p className="text-tiny text-muted-foreground">Patients Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-hero text-foreground">{doctorStats.dutiesCompletedThisMonth}</p>
                  <p className="text-tiny text-muted-foreground">Duties This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-hero text-foreground">{doctorStats.patientsHandledThisMonth}</p>
                  <p className="text-tiny text-muted-foreground">Patients This Month</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-soft">
            <CardContent className="py-4 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-hero text-foreground">{doctorStats.nightDutiesThisMonth}</p>
                  <p className="text-tiny text-muted-foreground">Night Duties</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Performance Summary */}
        <Card className="mt-3 shadow-soft">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <p className="text-body font-medium text-foreground">Monthly Performance</p>
                  <p className="text-tiny text-muted-foreground">
                    {doctorStats.opdSessions} OPD Sessions • {doctorStats.surgeries} Surgeries
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-title text-success font-semibold">{doctorStats.attendanceRate}%</p>
                <p className="text-tiny text-muted-foreground">Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Who Else is On Duty */}
      <div className="animate-slide-up stagger-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-subtitle text-foreground">Who's on duty today</h3>
          </div>
          <span className="text-tiny text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {otherDoctors.length} doctors
          </span>
        </div>
        
        <div className="space-y-2">
          {otherDoctors.slice(0, 4).map((assignment, index) => (
            <Card 
              key={assignment.id} 
              className="shadow-soft card-interactive"
              style={{ animationDelay: `${0.05 * index}s` }}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name={assignment.doctor.name} size="sm" />
                    <div>
                      <p className="text-body font-medium text-foreground">
                        {assignment.doctor.name}
                      </p>
                      <p className="text-tiny text-muted-foreground">
                        {assignment.unit}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DutyBadge type={assignment.dutyType} />
                    <PhoneButton phone={assignment.doctor.phone} size="sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-center gap-2 text-tiny text-muted-foreground animate-fade-in stagger-4">
        <button 
          onClick={refreshData}
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Last updated: {format(lastUpdated, 'h:mm a')}
        </button>
      </div>
    </div>
  );
};

export default DoctorDashboard;
