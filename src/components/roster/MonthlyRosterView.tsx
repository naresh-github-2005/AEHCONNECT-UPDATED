import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DutyBadge, DoctorAvatar } from '@/components/ui/DutyComponents';
import { ChevronLeft, ChevronRight, RefreshCw, Users, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportMonthlyToPDF, exportMonthlyToExcel } from '@/lib/exportUtils';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type DutyType = Database['public']['Enums']['duty_type'];

interface DutyAssignment {
  id: string;
  duty_date: string;
  duty_type: DutyType;
  start_time: string;
  end_time: string;
  unit: string;
  doctor: {
    id: string;
    name: string;
    phone: string;
  };
}

const dutyTypeColors: Record<string, string> = {
  'OPD': 'bg-blue-500',
  'OT': 'bg-green-500',
  'Night Duty': 'bg-purple-500',
  'Ward': 'bg-orange-500',
  'Camp': 'bg-pink-500',
  'Emergency': 'bg-red-500',
  'Cataract OT': 'bg-teal-500',
  'Retina OT': 'bg-indigo-500',
  'Glaucoma OT': 'bg-cyan-500',
  'Cornea OT': 'bg-emerald-500',
  'Today Doctor': 'bg-amber-500',
};

const MonthlyRosterView: React.FC = () => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['monthly-roster', format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_assignments')
        .select(`
          id,
          duty_date,
          duty_type,
          start_time,
          end_time,
          unit,
          doctor:doctors!inner(id, name, phone)
        `)
        .gte('duty_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('duty_date', format(monthEnd, 'yyyy-MM-dd'))
        .order('duty_date', { ascending: true });

      if (error) throw error;
      return (data as unknown as DutyAssignment[]) || [];
    },
  });

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [monthStart, monthEnd]);

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, DutyAssignment[]> = {};
    assignments.forEach((assignment) => {
      const date = assignment.duty_date;
      if (!map[date]) map[date] = [];
      map[date].push(assignment);
    });
    return map;
  }, [assignments]);

  const selectedDateAssignments = useMemo(() => {
    if (!selectedDate) return [];
    return assignmentsByDate[format(selectedDate, 'yyyy-MM-dd')] || [];
  }, [selectedDate, assignmentsByDate]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setDetailsOpen(true);
  };

  // Get stats for the month
  const monthStats = useMemo(() => {
    const stats: Record<string, number> = {};
    assignments.forEach((a) => {
      stats[a.duty_type] = (stats[a.duty_type] || 0) + 1;
    });
    return stats;
  }, [assignments]);

  const handleExportPDF = () => {
    if (assignments.length === 0) {
      toast.error('No data to export');
      return;
    }
    const exportData = assignments.map(a => ({
      doctorName: a.doctor.name,
      unit: a.unit,
      dutyType: a.duty_type,
      date: format(new Date(a.duty_date), 'MMM d, yyyy'),
      startTime: a.start_time,
      endTime: a.end_time,
    }));
    exportMonthlyToPDF(exportData, format(currentDate, 'MMMM yyyy'));
    toast.success('PDF exported successfully');
  };

  const handleExportExcel = () => {
    if (assignments.length === 0) {
      toast.error('No data to export');
      return;
    }
    const exportData = assignments.map(a => ({
      doctorName: a.doctor.name,
      unit: a.unit,
      dutyType: a.duty_type,
      date: format(new Date(a.duty_date), 'MMM d, yyyy'),
      startTime: a.start_time,
      endTime: a.end_time,
    }));
    exportMonthlyToExcel(exportData, format(currentDate, 'MMMM yyyy'));
    toast.success('Excel exported successfully');
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Month Stats */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(monthStats).map(([type, count]) => (
          <Badge key={type} variant="secondary" className="text-xs">
            {type}: {count}
          </Badge>
        ))}
        {Object.keys(monthStats).length === 0 && !isLoading && (
          <span className="text-sm text-muted-foreground">No duties scheduled this month</span>
        )}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-2 sm:p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {daysInMonth.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAssignments = assignmentsByDate[dateKey] || [];
              const isCurrentDay = isToday(day);
              const hasMyDuty = user?.doctorId && dayAssignments.some(a => a.doctor.id === user.doctorId);

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "aspect-square p-1 rounded-lg border transition-all hover:bg-accent",
                    isCurrentDay && "ring-2 ring-primary",
                    hasMyDuty && "bg-primary/10 border-primary/30",
                    !isSameMonth(day, currentDate) && "opacity-50"
                  )}
                >
                  <div className="h-full flex flex-col">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        isCurrentDay && "text-primary"
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayAssignments.length > 0 && (
                      <div className="flex-1 flex flex-wrap gap-0.5 mt-1 overflow-hidden">
                        {dayAssignments.slice(0, 3).map((a, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              dutyTypeColors[a.duty_type] || 'bg-gray-500'
                            )}
                          />
                        ))}
                        {dayAssignments.length > 3 && (
                          <span className="text-[8px] text-muted-foreground">
                            +{dayAssignments.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(dutyTypeColors).slice(0, 6).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
            <span className="text-xs text-muted-foreground">{type}</span>
          </div>
        ))}
      </div>

      {/* Day Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {selectedDateAssignments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No duties scheduled for this day
                </p>
              ) : (
                selectedDateAssignments.map((assignment) => (
                  <Card key={assignment.id} className={cn(
                    assignment.doctor.id === user?.doctorId && "ring-1 ring-primary"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <DoctorAvatar name={assignment.doctor.name} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {assignment.doctor.name}
                            {assignment.doctor.id === user?.doctorId && (
                              <span className="ml-2 text-xs text-primary">(You)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <DutyBadge type={assignment.duty_type} />
                            <span className="text-xs text-muted-foreground">
                              {assignment.start_time} — {assignment.end_time}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {assignment.unit}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyRosterView;
