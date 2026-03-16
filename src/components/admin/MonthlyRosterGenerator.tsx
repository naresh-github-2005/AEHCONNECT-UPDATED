import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CalendarDays, Loader2, Check, AlertCircle, Brain, Calendar, RefreshCw,
  ChevronLeft, ChevronRight, Sparkles, Users, Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isWeekend } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { RosterScheduler } from '@/lib/rosterScheduler';

type DutyType = Database['public']['Enums']['duty_type'];
type DbDutyType = Database['public']['Enums']['duty_type'];

interface DbDoctor {
  id: string;
  name: string;
  seniority: string;
  specialty: string;
  eligible_duties: string[] | null;
  max_night_duties_per_month: number;
}

// Helper function to check if doctor can do a specific duty category
const canDoDutyCategory = (eligibleDuties: string[] | null, category: 'opd' | 'ot' | 'ward' | 'camp' | 'night'): boolean => {
  if (!eligibleDuties) return false;
  
  const categoryMap: Record<string, string[]> = {
    opd: ['OPD'],
    ot: ['OT', 'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT'],
    ward: ['Ward'],
    camp: ['Camp'],
    night: ['Night Duty']
  };
  
  return eligibleDuties.some(duty => categoryMap[category].includes(duty));
};

interface GenerationProgress {
  current: number;
  total: number;
  currentDate: string;
  status: 'idle' | 'generating' | 'complete' | 'error';
}

const MonthlyRosterGenerator: React.FC = () => {
  const [targetMonth, setTargetMonth] = useState(addMonths(new Date(), 1));
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    current: 0,
    total: 0,
    currentDate: '',
    status: 'idle'
  });
  const [dbDoctors, setDbDoctors] = useState<DbDoctor[]>([]);
  const [existingAssignments, setExistingAssignments] = useState<number>(0);

  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Fetch doctors and existing assignments
  useEffect(() => {
    const fetchData = async () => {
      const { data: doctors } = await supabase
        .from('doctors')
        .select('id, name, seniority, specialty, eligible_duties, max_night_duties_per_month')
        .eq('is_active', true);
      
      if (doctors) {
        setDbDoctors(doctors as DbDoctor[]);
        console.log('[MonthlyRosterGenerator] Loaded active doctors:', doctors.length);
        console.log('[MonthlyRosterGenerator] Doctor names:', doctors.map(d => d.name).join(', '));
      } else {
        console.log('[MonthlyRosterGenerator] No active doctors found in database!');
      }

      // Count existing assignments for the month
      const { count } = await supabase
        .from('duty_assignments')
        .select('*', { count: 'exact', head: true })
        .gte('duty_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('duty_date', format(monthEnd, 'yyyy-MM-dd'));
      
      setExistingAssignments(count || 0);
    };

    fetchData();
  }, [monthStart, monthEnd]);

  const handlePrevMonth = () => setTargetMonth(subMonths(targetMonth, 1));
  const handleNextMonth = () => setTargetMonth(addMonths(targetMonth, 1));

  const generateMonthRoster = async () => {
    if (dbDoctors.length === 0) {
      toast.error('No doctors available for scheduling');
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: daysInMonth.length, currentDate: '', status: 'generating' });

    try {
      console.log('[MonthlyRosterGenerator] Starting local rule-based generation...');
      
      // Step 1: Create rosters entry (tables should be visible now)
      const monthYear = format(targetMonth, 'yyyy-MM');
      
      // Try to get existing roster
      const { data: existingRosterData, error: existingError } = await supabase
        .from('rosters')
        .select('id')
        .eq('month', monthYear)
        .maybeSingle();

      let rosterId: string;
      
      if (existingRosterData && !existingError) {
        rosterId = existingRosterData.id;
        console.log(`[MonthlyRosterGenerator] Using existing roster: ${rosterId}`);
      } else {
        // Create new roster
        const { data: { user } } = await supabase.auth.getUser();
        const { data: newRosterData, error: rosterError } = await supabase
          .from('rosters')
          .insert({
            month: monthYear,
            generated_by: user?.id || null,
            status: 'DRAFT'
          })
          .select('id')
          .single();

        if (rosterError || !newRosterData) {
          console.error('[MonthlyRosterGenerator] Error creating roster:', rosterError);
          throw new Error(`Failed to create roster: ${rosterError?.message || 'Unknown error'}`);
        }
        
        rosterId = newRosterData.id;
        console.log(`[MonthlyRosterGenerator] Created new roster: ${rosterId}`);
      }
      
      // Initialize the local scheduler
      const scheduler = new RosterScheduler();
      await scheduler.initialize(targetMonth);

      let successCount = 0;
      let errorCount = 0;

      // Generate roster for each day
      for (let i = 0; i < daysInMonth.length; i++) {
        const day = daysInMonth[i];
        const dateStr = format(day, 'yyyy-MM-dd');
        
        setProgress(prev => ({
          ...prev,
          current: i + 1,
          currentDate: format(day, 'MMM d')
        }));

        // Check if assignments already exist for this day in duty_assignments
        const { count: existingCount } = await (supabase as any)
          .from('duty_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('duty_date', dateStr);

        if (existingCount && existingCount > 0) {
          console.log(`[${dateStr}] Skipping - already has ${existingCount} assignments in duty_assignments`);
          successCount++; // Count as success since it's already done
          continue;
        }

        try {
          console.log(`[${dateStr}] Generating assignments...`);
          
          // Generate assignments using local rule-based scheduler
          const assignments = await scheduler.generateDayAssignments(dateStr);
          
          if (assignments.length > 0) {
            const result = await scheduler.saveAssignments(assignments);
            
            if (result.success) {
              console.log(`[${dateStr}] ✅ Saved ${assignments.length} assignments`);
              successCount++;
            } else {
              console.error(`[${dateStr}] ❌ Failed to save: ${result.error}`);
              errorCount++;
            }
          } else {
            console.warn(`[${dateStr}] ⚠️ No assignments generated`);
            errorCount++;
          }
        } catch (err) {
          console.error(`[${dateStr}] ❌ Exception:`, err);
          errorCount++;
        }

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Update roster status to FINAL if all days succeeded
      if (errorCount === 0) {
        await (supabase as any)
          .from('rosters')
          .update({ status: 'FINAL' })
          .eq('id', rosterId);
      }

      setProgress(prev => ({ ...prev, status: 'complete' }));
      
      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'Monthly roster generated',
        details: `Generated ${successCount} days for ${format(targetMonth, 'MMMM yyyy')}. Errors: ${errorCount}`,
      });

      // Show summary with statistics
      const stats = scheduler.getStats();
      const unitAssignments = scheduler.getMonthlyUnitAssignments();
      const unitDayCounts = scheduler.getUnitDayCounts();
      
      console.log('[MonthlyRosterGenerator] Final Statistics:');
      stats.forEach((stat, doctorId) => {
        const doctor = dbDoctors.find(d => d.id === doctorId);
        const designation = doctor?.designation?.toLowerCase();
        
        // Show monthly unit assignment for Consultants/MOs
        const assignedUnit = unitAssignments.get(doctorId);
        if (assignedUnit && (designation === 'consultant' || designation === 'mo')) {
          console.log(`  ${doctor?.name} (${designation?.toUpperCase()}): Assigned to ${assignedUnit} for entire month - ${stat.total_duties} duties`);
        }
        // Show unit day counts for PGs/Fellows
        else {
          const dayCounts = unitDayCounts.get(doctorId);
          const unitBreakdown = dayCounts ? 
            Array.from(dayCounts.entries()).map(([unit, count]) => `${unit}: ${count}d`).join(', ') : 
            'No assignments';
          console.log(`  ${doctor?.name} (${designation?.toUpperCase()}): ${stat.total_duties} duties - ${unitBreakdown}`);
        }
      });

      if (errorCount === 0) {
        toast.success(`Successfully generated roster for ${format(targetMonth, 'MMMM yyyy')}! ${successCount} days scheduled.`);
      } else {
        toast.warning(`Generated roster with ${errorCount} errors. ${successCount} days completed.`);
      }
    } catch (error: any) {
      console.error('[MonthlyRosterGenerator] Fatal error:', error);
      setProgress(prev => ({ ...prev, status: 'error' }));
      toast.error(error.message || 'Failed to generate monthly roster');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearMonthRoster = async () => {
    if (!confirm(`Are you sure you want to clear all assignments for ${format(targetMonth, 'MMMM yyyy')}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('duty_assignments')
        .delete()
        .gte('duty_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('duty_date', format(monthEnd, 'yyyy-MM-dd'));

      if (error) throw error;

      setExistingAssignments(0);
      toast.success(`Cleared all assignments for ${format(targetMonth, 'MMMM yyyy')}`);
    } catch (error) {
      console.error('Error clearing roster:', error);
      toast.error('Failed to clear roster');
    }
  };

  return (
    <Card className="border-accent/20 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent via-primary to-accent" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">Monthly Roster Generator</CardTitle>
              <p className="text-tiny text-muted-foreground mt-0.5">
                Rule-based roster generation following hospital policies
              </p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Month Selection */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} disabled={isGenerating}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="min-w-[140px] text-center">
              <h3 className="font-semibold">{format(targetMonth, 'MMMM yyyy')}</h3>
              <p className="text-xs text-muted-foreground">{daysInMonth.length} days</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isGenerating}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Users className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-sm font-medium">{dbDoctors.length}</p>
            <p className="text-[10px] text-muted-foreground">Active Doctors</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <CalendarDays className="w-4 h-4 mx-auto text-accent mb-1" />
            <p className="text-sm font-medium">{daysInMonth.length}</p>
            <p className="text-[10px] text-muted-foreground">Days to Generate</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <Clock className="w-4 h-4 mx-auto text-orange-500 mb-1" />
            <p className="text-sm font-medium">{existingAssignments}</p>
            <p className="text-[10px] text-muted-foreground">Existing Duties</p>
          </div>
        </div>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary animate-pulse" />
                Generating {progress.currentDate}...
              </span>
              <span className="text-muted-foreground">
                {progress.current}/{progress.total}
              </span>
            </div>
            <Progress value={(progress.current / progress.total) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Applying hospital rules: Fellow 3-month restriction, PG year limits, workload balancing
            </p>
          </div>
        )}

        {/* Success Message */}
        {progress.status === 'complete' && !isGenerating && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/20 flex items-center gap-3">
            <Check className="w-5 h-5 text-success" />
            <div>
              <p className="font-medium text-success">Generation Complete!</p>
              <p className="text-xs text-muted-foreground">
                Monthly roster for {format(targetMonth, 'MMMM yyyy')} is ready
              </p>
            </div>
          </div>
        )}

        {/* Warning if assignments exist */}
        {existingAssignments > 0 && !isGenerating && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <p className="text-xs text-warning">
              {existingAssignments} assignments already exist. New generation will skip existing dates.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {existingAssignments > 0 && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={clearMonthRoster}
              disabled={isGenerating}
            >
              <RefreshCw className="w-4 h-4" />
              Clear Month
            </Button>
          )}
          <Button
            className="flex-1 gap-2"
            onClick={generateMonthRoster}
            disabled={isGenerating || dbDoctors.length === 0}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Month Roster
              </>
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="outline" className="text-[10px]">Fellow 3-Month Rule</Badge>
          <Badge variant="outline" className="text-[10px]">PG Year Restrictions</Badge>
          <Badge variant="outline" className="text-[10px]">Leave Aware</Badge>
          <Badge variant="outline" className="text-[10px]">Workload Balancing</Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyRosterGenerator;
