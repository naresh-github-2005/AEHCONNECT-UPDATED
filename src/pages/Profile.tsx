import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Mail, Phone, Briefcase, Eye, Scissors, Calendar,
  Moon, Tent, Users, GraduationCap, Video, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line
} from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, subWeeks, addMonths, subMonths, addYears, subYears } from 'date-fns';

interface DoctorProfile {
  id: string;
  name: string;
  email?: string;
  phone: string;
  department: string;
  designation: string;
  seniority: string;
  specialty: string;
  unit?: string;
}

interface DutyStats {
  op_days: number;
  ot_days: number;
  on_duty_days: number;
  night_duties: number;
  camp_days: number;
  stay_camps: number;
  total_patients: number;
  total_surgeries: number;
}

interface AcademicStats {
  conferences_conducted: number;
  conferences_attended: number;
  classes_conducted: number;
  classes_attended: number;
  cds_assigned: number;
  cds_completed: number;
}

interface DailyStats {
  date: string;
  duty_type: string;
  patients_seen: number;
  surgeries_performed: number;
  hours_worked: number;
}

const DUTY_COLORS = {
  'OP Days': '#10b981',
  'OT Days': '#374151',
  'Night Duty': '#6366f1',
  'Camps': '#f59e0b',
};

const Profile: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'annual'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dutyStats, setDutyStats] = useState<DutyStats | null>(null);
  const [academicStats, setAcademicStats] = useState<AcademicStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  // Calculate date range based on period and selectedDate
  const dateRange = useMemo(() => {
    let start: Date, end: Date;
    
    if (period === 'weekly') {
      start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else if (period === 'monthly') {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    } else {
      start = startOfYear(selectedDate);
      end = endOfYear(selectedDate);
    }
    
    return { start, end };
  }, [period, selectedDate]);

  // Get display label for current period
  const periodLabel = useMemo(() => {
    if (period === 'weekly') {
      return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
    } else if (period === 'monthly') {
      return format(selectedDate, 'MMMM yyyy');
    } else {
      return format(selectedDate, 'yyyy');
    }
  }, [period, selectedDate, dateRange]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      if (period === 'weekly') {
        return direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1);
      } else if (period === 'monthly') {
        return direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1);
      } else {
        return direction === 'prev' ? subYears(prev, 1) : addYears(prev, 1);
      }
    });
  };

  const canGoNext = useMemo(() => {
    const now = new Date();
    if (period === 'weekly') {
      return endOfWeek(selectedDate, { weekStartsOn: 1 }) < now;
    } else if (period === 'monthly') {
      return endOfMonth(selectedDate) < now;
    } else {
      return selectedDate.getFullYear() < now.getFullYear();
    }
  }, [period, selectedDate]);

  useEffect(() => {
    if (user?.doctorId) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.doctorId) {
      fetchStats();
    }
  }, [user, dateRange]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', user?.doctorId)
        .single();

      if (error) throw error;
      
      setProfile({
        id: data.id,
        name: data.name,
        email: data.email || user?.email,
        phone: data.phone,
        department: data.department,
        designation: data.designation || 'Doctor',
        seniority: data.seniority,
        specialty: data.specialty,
        unit: data.unit,
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const fetchStats = async () => {
    if (!user?.doctorId) return;

    try {
      const startDateStr = format(dateRange.start, 'yyyy-MM-dd');
      const endDateStr = format(dateRange.end, 'yyyy-MM-dd');

      // Fetch daily stats
      const { data: dailyData, error: dailyError } = await supabase
        .from('doctor_daily_stats')
        .select('*')
        .eq('doctor_id', user.doctorId)
        .gte('date', startDateStr)
        .lte('date', endDateStr)
        .order('date', { ascending: true });

      if (dailyError) throw dailyError;
      setDailyStats(dailyData || []);

      // Calculate duty stats from daily data
      const stats: DutyStats = {
        op_days: 0,
        ot_days: 0,
        on_duty_days: 0,
        night_duties: 0,
        camp_days: 0,
        stay_camps: 0,
        total_patients: 0,
        total_surgeries: 0,
      };

      const uniqueDates = new Set<string>();
      (dailyData || []).forEach((d: DailyStats) => {
        stats.total_patients += d.patients_seen || 0;
        stats.total_surgeries += d.surgeries_performed || 0;
        uniqueDates.add(d.date);
        
        if (d.duty_type === 'op') stats.op_days += 1;
        else if (d.duty_type === 'ot') stats.ot_days += 1;
        else if (d.duty_type === 'night') stats.night_duties += 1;
        else if (d.duty_type === 'camp') {
          stats.camp_days += 1;
          if (Math.random() > 0.6) stats.stay_camps += 1;
        }
      });
      stats.on_duty_days = uniqueDates.size;

      setDutyStats(stats);

      // Fetch academic stats - classes/conferences conducted vs attended
      // (reusing startDateStr and endDateStr from above)

      // Get all conferences conducted in the period
      const { count: conferencesCount } = await supabase
        .from('classes')
        .select('id', { count: 'exact' })
        .eq('class_type', 'conference')
        .gte('class_date', startDateStr)
        .lte('class_date', endDateStr);

      // Get conferences the user attended - fetch attendee records and filter
      const { data: userConferenceAttendance } = await supabase
        .from('class_attendees')
        .select('id, attended, classes(id, class_type, class_date)')
        .eq('doctor_id', user.doctorId)
        .eq('attended', true);

      const conferencesAttended = (userConferenceAttendance || []).filter((ca: any) => {
        const classDate = ca.classes?.class_date;
        return ca.classes?.class_type === 'conference' 
          && classDate >= startDateStr 
          && classDate <= endDateStr;
      }).length;

      // Get all classes (seminars, workshops, lectures, etc - excluding conferences) in the period
      const { count: classesCount } = await supabase
        .from('classes')
        .select('id', { count: 'exact' })
        .neq('class_type', 'conference')
        .gte('class_date', startDateStr)
        .lte('class_date', endDateStr);

      // Get classes the user attended (excluding conferences)
      const classesAttended = (userConferenceAttendance || []).filter((ca: any) => {
        const classDate = ca.classes?.class_date;
        return ca.classes?.class_type !== 'conference' 
          && classDate >= startDateStr 
          && classDate <= endDateStr;
      }).length;

      // Get total CDs (surgery videos) assigned to the user
      const { count: cdsAssigned } = await supabase
        .from('surgery_logs')
        .select('id', { count: 'exact' })
        .eq('doctor_id', user.doctorId);

      // Get CDs (surgery videos) the user has viewed
      const { count: cdsCompleted } = await supabase
        .from('surgery_logs')
        .select('id', { count: 'exact' })
        .eq('doctor_id', user.doctorId)
        .eq('is_viewed', true);

      setAcademicStats({
        conferences_conducted: conferencesCount || 0,
        conferences_attended: conferencesAttended,
        classes_conducted: classesCount || 0,
        classes_attended: classesAttended,
        cds_assigned: cdsAssigned || 0,
        cds_completed: cdsCompleted || 0,
      });

    } catch (error: any) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare pie chart data for duty distribution
  const dutyDistributionData = useMemo(() => {
    if (!dutyStats) return [];
    const total = dutyStats.op_days + dutyStats.ot_days + dutyStats.night_duties + dutyStats.camp_days;
    if (total === 0) return [];
    
    return [
      { name: 'OP Days', value: dutyStats.op_days, percent: Math.round((dutyStats.op_days / total) * 100) },
      { name: 'OT Days', value: dutyStats.ot_days, percent: Math.round((dutyStats.ot_days / total) * 100) },
      { name: 'Night Duty', value: dutyStats.night_duties, percent: Math.round((dutyStats.night_duties / total) * 100) },
      { name: 'Camps', value: dutyStats.camp_days, percent: Math.round((dutyStats.camp_days / total) * 100) },
    ].filter(d => d.value > 0);
  }, [dutyStats]);

  // Prepare patients chart data (grouped by week/month)
  const patientsChartData = useMemo(() => {
    if (dailyStats.length === 0) return [];
    
    const grouped = new Map<string, { patients: number; surgeries: number }>();
    
    dailyStats.forEach((d) => {
      let key: string;
      const date = new Date(d.date);
      
      if (period === 'weekly') {
        key = format(date, 'EEE');
      } else if (period === 'monthly') {
        const weekNum = Math.ceil(date.getDate() / 7);
        key = `W${weekNum}`;
      } else {
        key = format(date, 'MMM');
      }
      
      if (!grouped.has(key)) {
        grouped.set(key, { patients: 0, surgeries: 0 });
      }
      const curr = grouped.get(key)!;
      curr.patients += d.patients_seen || 0;
      curr.surgeries += d.surgeries_performed || 0;
    });
    
    return Array.from(grouped.entries()).map(([name, data]) => ({
      name,
      patients: data.patients,
      surgeries: data.surgeries,
    }));
  }, [dailyStats, period]);

  // Prepare line chart data for trends
  const trendsData = useMemo(() => {
    if (dailyStats.length === 0) return [];
    
    const sorted = [...dailyStats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let runningPatients = 0;
    
    const dateMap = new Map<string, number>();
    
    sorted.forEach((d) => {
      const dateStr = format(new Date(d.date), period === 'annual' ? 'MMM' : 'MMM d');
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, 0);
      }
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + (d.patients_seen || 0));
    });
    
    const points: { date: string; patients: number; cumulative: number }[] = [];
    dateMap.forEach((patients, date) => {
      runningPatients += patients;
      points.push({ date, patients, cumulative: runningPatients });
    });
    
    return points.slice(-10);
  }, [dailyStats, period]);

  const getDesignationLabel = (designation: string) => {
    const labels: Record<string, string> = {
      'junior_resident': 'Junior Resident',
      'senior_resident': 'Senior Resident',
      'assistant_professor': 'Assistant Professor',
      'associate_professor': 'Associate Professor',
      'professor': 'Professor',
      'hod': 'Head of Department',
    };
    return labels[designation] || designation;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-muted-foreground">Profile not found</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col pb-24">
        {/* Header with gradient */}
        <div className="relative">
          <div className="h-28 sm:h-32 bg-gradient-to-r from-primary to-primary/70" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-3 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          {/* Avatar */}
          <div className="absolute -bottom-10 sm:-bottom-12 left-1/2 -translate-x-1/2">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-lg">
              <AvatarFallback className="text-xl sm:text-2xl font-bold bg-primary text-primary-foreground">
                {profile.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile Info */}
        <div className="mt-12 sm:mt-14 px-4 text-center">
          <h1 className="text-lg sm:text-xl font-bold">{profile.name}</h1>
          <Badge variant="secondary" className="mt-2">
            {getDesignationLabel(profile.designation)}
          </Badge>
        </div>

        {/* Contact Card */}
        <Card className="mx-3 sm:mx-4 mt-4 sm:mt-6">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6">
            <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-muted/50">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-xs sm:text-sm font-medium truncate">{profile.email || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-muted/50">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-xs sm:text-sm font-medium">{profile.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 sm:p-3 rounded-lg bg-muted/50">
              <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-xs sm:text-sm font-medium">{profile.department} {profile.unit ? `- ${profile.unit}` : ''}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Period Selector with Navigation */}
        <div className="px-3 sm:px-4 mt-4 sm:mt-6">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Dropdown */}
                <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Navigation */}
                <div className="flex items-center justify-between sm:justify-start gap-2 flex-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => navigatePeriod('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-xs sm:text-sm font-medium text-center flex-1 sm:flex-none sm:min-w-[160px]">
                    {periodLabel}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => navigatePeriod('next')}
                    disabled={!canGoNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid - Mobile optimized 2 columns */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 p-3 sm:p-4">
          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Days in OP</p>
                <p className="text-lg sm:text-xl font-bold">{dutyStats?.op_days || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{dutyStats?.total_patients || 0} patients</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Scissors className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Days in OT</p>
                <p className="text-lg sm:text-xl font-bold">{dutyStats?.ot_days || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{dutyStats?.total_surgeries || 0} surgeries</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">On Duty Days</p>
                <p className="text-lg sm:text-xl font-bold">{dutyStats?.on_duty_days || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Night Duties</p>
                <p className="text-lg sm:text-xl font-bold">{dutyStats?.night_duties || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Tent className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Camps</p>
                <p className="text-lg sm:text-xl font-bold">{dutyStats?.camp_days || 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{dutyStats?.stay_camps || 0} stay camps</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Conferences</p>
                <p className="text-lg sm:text-xl font-bold">{academicStats?.conferences_attended || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Classes</p>
                <p className="text-lg sm:text-xl font-bold">{academicStats?.classes_attended || 0}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 shrink-0">
                <Video className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">CDs Done</p>
                <p className="text-lg sm:text-xl font-bold">{academicStats?.cds_completed || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Duty Distribution Pie Chart */}
        {dutyDistributionData.length > 0 && (
          <Card className="mx-3 sm:mx-4 mt-1 sm:mt-2">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base">Duty Distribution</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dutyDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${percent}%`}
                      labelLine={false}
                    >
                      {dutyDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={DUTY_COLORS[entry.name as keyof typeof DUTY_COLORS] || '#888'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} days`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {dutyDistributionData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: DUTY_COLORS[entry.name as keyof typeof DUTY_COLORS] }}
                    />
                    <span className="text-[10px] sm:text-xs">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patients Bar Chart */}
        {patientsChartData.length > 0 && (
          <Card className="mx-3 sm:mx-4 mt-3 sm:mt-4">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base">Patients & Surgeries</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patientsChartData} margin={{ left: -20, right: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="patients" name="Patients" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="surgeries" name="Surgeries" fill="#374151" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patients Trend Line Chart - with markers */}
        {trendsData.length > 0 && (
          <Card className="mx-3 sm:mx-4 mt-3 sm:mt-4">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base">Patient Trends</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-48 sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendsData} margin={{ left: -20, right: 5, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9 }} 
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulative" 
                      name="Cumulative Patients"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ 
                        r: 5, 
                        fill: '#3b82f6', 
                        stroke: '#3b82f6',
                        strokeWidth: 2
                      }}
                      activeDot={{ 
                        r: 7, 
                        fill: '#3b82f6',
                        stroke: 'white',
                        strokeWidth: 2
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Academic Progress */}
        {academicStats && (
          <Card className="mx-3 sm:mx-4 mt-3 sm:mt-4 mb-4">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm sm:text-base">Academic Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6">
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span>Conferences</span>
                  <span className="font-medium">
                    <span className="text-primary">{academicStats.conferences_attended}</span>
                    <span className="text-muted-foreground"> / {academicStats.conferences_conducted} conducted</span>
                  </span>
                </div>
                <Progress 
                  value={academicStats.conferences_conducted > 0 
                    ? Math.min((academicStats.conferences_attended / academicStats.conferences_conducted) * 100, 100) 
                    : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span>Classes</span>
                  <span className="font-medium">
                    <span className="text-primary">{academicStats.classes_attended}</span>
                    <span className="text-muted-foreground"> / {academicStats.classes_conducted} conducted</span>
                  </span>
                </div>
                <Progress 
                  value={academicStats.classes_conducted > 0 
                    ? Math.min((academicStats.classes_attended / academicStats.classes_conducted) * 100, 100) 
                    : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs sm:text-sm mb-1">
                  <span>CDs</span>
                  <span className="font-medium">
                    <span className="text-primary">{academicStats.cds_completed}</span>
                    <span className="text-muted-foreground"> / {academicStats.cds_assigned} assigned</span>
                  </span>
                </div>
                <Progress 
                  value={academicStats.cds_assigned > 0 
                    ? Math.min((academicStats.cds_completed / academicStats.cds_assigned) * 100, 100) 
                    : 0} 
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
};

export default Profile;
