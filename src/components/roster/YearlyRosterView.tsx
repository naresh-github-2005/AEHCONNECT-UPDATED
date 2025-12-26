import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, RefreshCw, Calendar, Moon, Sun, Tent, Activity } from 'lucide-react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, addYears, subYears } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Database } from '@/integrations/supabase/types';

type DutyType = Database['public']['Enums']['duty_type'];

interface DoctorYearlyStats {
  doctorId: string;
  doctorName: string;
  unit: string;
  totalDuties: number;
  opdCount: number;
  otCount: number;
  nightCount: number;
  wardCount: number;
  campCount: number;
  emergencyCount: number;
  monthlyBreakdown: Record<number, number>;
}

const YearlyRosterView: React.FC = () => {
  const { user } = useAuth();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const yearStart = startOfYear(new Date(currentYear, 0, 1));
  const yearEnd = endOfYear(new Date(currentYear, 0, 1));

  const { data: assignments = [], isLoading, refetch } = useQuery({
    queryKey: ['yearly-roster', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_assignments')
        .select(`
          id,
          duty_date,
          duty_type,
          unit,
          doctor:doctors!inner(id, name, unit)
        `)
        .gte('duty_date', format(yearStart, 'yyyy-MM-dd'))
        .lte('duty_date', format(yearEnd, 'yyyy-MM-dd'))
        .order('duty_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const months = useMemo(() => {
    return eachMonthOfInterval({ start: yearStart, end: yearEnd });
  }, [yearStart, yearEnd]);

  const doctorStats = useMemo(() => {
    const statsMap: Record<string, DoctorYearlyStats> = {};

    assignments.forEach((assignment: any) => {
      const doctorId = assignment.doctor.id;
      if (!statsMap[doctorId]) {
        statsMap[doctorId] = {
          doctorId,
          doctorName: assignment.doctor.name,
          unit: assignment.doctor.unit || 'N/A',
          totalDuties: 0,
          opdCount: 0,
          otCount: 0,
          nightCount: 0,
          wardCount: 0,
          campCount: 0,
          emergencyCount: 0,
          monthlyBreakdown: {},
        };
      }

      const stats = statsMap[doctorId];
      stats.totalDuties++;

      const month = new Date(assignment.duty_date).getMonth();
      stats.monthlyBreakdown[month] = (stats.monthlyBreakdown[month] || 0) + 1;

      switch (assignment.duty_type) {
        case 'OPD':
          stats.opdCount++;
          break;
        case 'OT':
        case 'Cataract OT':
        case 'Retina OT':
        case 'Glaucoma OT':
        case 'Cornea OT':
          stats.otCount++;
          break;
        case 'Night Duty':
          stats.nightCount++;
          break;
        case 'Ward':
          stats.wardCount++;
          break;
        case 'Camp':
          stats.campCount++;
          break;
        case 'Emergency':
          stats.emergencyCount++;
          break;
      }
    });

    return Object.values(statsMap).sort((a, b) => b.totalDuties - a.totalDuties);
  }, [assignments]);

  const yearlyTotals = useMemo(() => {
    return {
      total: assignments.length,
      opd: assignments.filter((a: any) => a.duty_type === 'OPD').length,
      ot: assignments.filter((a: any) => ['OT', 'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT'].includes(a.duty_type)).length,
      night: assignments.filter((a: any) => a.duty_type === 'Night Duty').length,
      ward: assignments.filter((a: any) => a.duty_type === 'Ward').length,
      camp: assignments.filter((a: any) => a.duty_type === 'Camp').length,
    };
  }, [assignments]);

  const handlePrevYear = () => setCurrentYear(currentYear - 1);
  const handleNextYear = () => setCurrentYear(currentYear + 1);
  const handleCurrentYear = () => setCurrentYear(new Date().getFullYear());

  return (
    <div className="space-y-4">
      {/* Year Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevYear}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[80px] text-center">
            {currentYear}
          </h3>
          <Button variant="outline" size="icon" onClick={handleNextYear}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCurrentYear}>
            This Year
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{yearlyTotals.total}</p>
            <p className="text-xs text-muted-foreground">Total Duties</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Sun className="w-5 h-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{yearlyTotals.opd}</p>
            <p className="text-xs text-muted-foreground">OPD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{yearlyTotals.ot}</p>
            <p className="text-xs text-muted-foreground">OT</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Moon className="w-5 h-5 mx-auto text-purple-500 mb-1" />
            <p className="text-2xl font-bold">{yearlyTotals.night}</p>
            <p className="text-xs text-muted-foreground">Night Duty</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="w-5 h-5 mx-auto text-orange-500 mb-1" />
            <p className="text-2xl font-bold">{yearlyTotals.ward}</p>
            <p className="text-xs text-muted-foreground">Ward</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Tent className="w-5 h-5 mx-auto text-pink-500 mb-1" />
            <p className="text-2xl font-bold">{yearlyTotals.camp}</p>
            <p className="text-xs text-muted-foreground">Camp</p>
          </CardContent>
        </Card>
      </div>

      {/* Doctor-wise Stats Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Doctor-wise Duty Distribution</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10">Doctor</TableHead>
                    <TableHead className="text-center">Unit</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">OPD</TableHead>
                    <TableHead className="text-center">OT</TableHead>
                    <TableHead className="text-center">Night</TableHead>
                    <TableHead className="text-center">Ward</TableHead>
                    <TableHead className="text-center">Camp</TableHead>
                    {months.map((month) => (
                      <TableHead key={month.getTime()} className="text-center min-w-[50px]">
                        {format(month, 'MMM')}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={20} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : doctorStats.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                        No duty data for this year
                      </TableCell>
                    </TableRow>
                  ) : (
                    doctorStats.map((stats) => (
                      <TableRow 
                        key={stats.doctorId}
                        className={cn(
                          stats.doctorId === user?.doctorId && "bg-primary/5"
                        )}
                      >
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">
                          {stats.doctorName}
                          {stats.doctorId === user?.doctorId && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm">{stats.unit}</TableCell>
                        <TableCell className="text-center font-semibold">{stats.totalDuties}</TableCell>
                        <TableCell className="text-center">{stats.opdCount || '-'}</TableCell>
                        <TableCell className="text-center">{stats.otCount || '-'}</TableCell>
                        <TableCell className="text-center">{stats.nightCount || '-'}</TableCell>
                        <TableCell className="text-center">{stats.wardCount || '-'}</TableCell>
                        <TableCell className="text-center">{stats.campCount || '-'}</TableCell>
                        {months.map((month, idx) => (
                          <TableCell key={month.getTime()} className="text-center">
                            {stats.monthlyBreakdown[idx] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default YearlyRosterView;
