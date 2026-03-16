/**
 * Local Rule-Based Roster Scheduler
 * Generates monthly rosters based on hospital rules without any API calls
 */

import { supabase } from '@/integrations/supabase/client';
import { format, isWeekend } from 'date-fns';

interface Doctor {
  id: string;
  name: string;
  designation: string | null;
  specialization_type: string | null;
  pg_year: string | null;
  experience_years: number | null;
  joining_date: string | null;
  months_since_joining: number | null;
}

interface Assignment {
  doctor_id: string;
  duty_date: string;
  duty_type: 'OPD' | 'OT' | 'Ward' | 'Night Duty' | 'Camp' | 'Emergency';
  unit: string;
  start_time: string;
  end_time: string;
}

interface DoctorStats {
  doctor_id: string;
  total_duties: number;
  night_duties: number;
  weekend_duties: number;
  consecutive_days: number;
  last_duty_date: string | null;
}

interface LeaveRequest {
  doctor_id: string;
  start_date: string;
  end_date: string;
}

export class RosterScheduler {
  private doctors: Doctor[] = [];
  private departments: Map<string, string> = new Map(); // code -> id mapping
  private stats: Map<string, DoctorStats> = new Map();
  private assignments: Assignment[] = [];
  private leaveRequests: LeaveRequest[] = [];
  
  // Track unit assignments for Consultants/MOs (stays same for entire month)
  private monthlyUnitAssignments: Map<string, string> = new Map(); // doctorId -> unit
  
  // Track days per unit for PGs/Fellows (rotates between units)
  private unitDayCounts: Map<string, Map<string, number>> = new Map(); // doctorId -> (unit -> dayCount)

  /**
   * Initialize scheduler with doctors and existing data
   */
  async initialize(targetDate: Date) {
    const monthStart = format(targetDate, 'yyyy-MM-01');
    const monthEnd = format(new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0), 'yyyy-MM-dd');

    // Load departments
    const { data: depts, error: deptError } = await (supabase as any)
      .from('departments')
      .select('id, code');
    
    if (deptError) throw deptError;
    (depts || []).forEach((d: any) => {
      this.departments.set(d.code, d.id);
    });

    // Load active doctors with all required fields
    const { data: doctors, error: docError } = await supabase
      .from('doctors')
      .select('id, name, designation, specialty, pg_year, experience_years, joining_date')
      .eq('is_active', true);

    if (docError) throw docError;
    this.doctors = (doctors || []) as any[];

    // Load leave requests for the month
    const { data: leaves, error: leaveError } = await (supabase as any)
      .from('leaves')
      .select('doctor_id, start_date, end_date')
      .eq('status', 'APPROVED')
      .lte('start_date', monthEnd)
      .gte('end_date', monthStart);

    if (leaveError) throw leaveError;
    this.leaveRequests = (leaves || []) as LeaveRequest[];

    // Initialize stats for each doctor
    this.doctors.forEach(doc => {
      this.stats.set(doc.id, {
        doctor_id: doc.id,
        total_duties: 0,
        night_duties: 0,
        weekend_duties: 0,
        consecutive_days: 0,
        last_duty_date: null
      });
      
      // Initialize unit day counts for PGs/Fellows
      this.unitDayCounts.set(doc.id, new Map());
    });

    console.log(`[RosterScheduler] Initialized with ${this.doctors.length} doctors and ${this.departments.size} departments`);
    
    if (this.doctors.length === 0) {
      throw new Error('No active doctors found. Please add doctors to the system first.');
    }
    
    if (this.departments.size === 0) {
      throw new Error('No departments found. Please run the production schema migration.');
    }
  }

  /**
   * Check if doctor is on leave
   */
  private isOnLeave(doctorId: string, date: string): boolean {
    return this.leaveRequests.some(leave => 
      leave.doctor_id === doctorId &&
      date >= leave.start_date &&
      date <= leave.end_date
    );
  }

  /**
   * Check if doctor meets Fellow 3-month restriction
   */
  private checkFellowRestriction(doctor: Doctor): { allowed: boolean; reason?: string } {
    const designation = (doctor.designation || '').toLowerCase();
    if (designation !== 'fellow') return { allowed: true };
    
    // Calculate months since joining
    if (doctor.joining_date) {
      const joinDate = new Date(doctor.joining_date);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
      
      if (monthsDiff < 3) {
        return { 
          allowed: false, 
          reason: `Fellow with ${monthsDiff} months experience (needs 3+ months for advanced duties)` 
        };
      }
    }
    
    return { allowed: true };
  }

  /**
   * Check if PG can do specific duty based on year
   */
  private checkPGRestriction(doctor: Doctor, dutyType: string): { allowed: boolean; reason?: string } {
    if (!doctor.pg_year) return { allowed: true };

    const pgYear = typeof doctor.pg_year === 'string' ? parseInt(doctor.pg_year) : doctor.pg_year;

    // PG Year 1: Limited duties (Ward, Basic OPD only)
    if (pgYear === 1) {
      if (['EMERGENCY', 'OT', 'CATH', 'ICU', 'CCU'].includes(dutyType)) {
        return { allowed: false, reason: 'PG Year 1 limited to Ward and OPD' };
      }
    }

    // PG Year 2: Can do OPD, Ward, some clinics, but not emergency/OT alone
    if (pgYear === 2) {
      if (['EMERGENCY', 'OT', 'CATH'].includes(dutyType)) {
        return { allowed: false, reason: 'PG Year 2 not allowed Emergency/OT/Cath independently' };
      }
    }

    // PG Year 3: Full duties allowed
    return { allowed: true };
  }

  /**
   * Get eligible doctors for a specific unit and duty type
   */
  private getEligibleDoctors(
    unit: string, 
    dutyType: string, 
    date: string,
    assignedToday: Set<string>
  ): Doctor[] {
    const eligible = this.doctors.filter(doctor => {
      // Check if already assigned today (one duty per day per doctor)
      if (assignedToday.has(doctor.id)) return false;
      
      // Check leave
      if (this.isOnLeave(doctor.id, date)) return false;

      // Check consecutive day limit (max 6 consecutive days) - but be lenient if needed
      const stats = this.stats.get(doctor.id);
      // Only enforce consecutive day limit if there are enough doctors to cover
      // If all doctors have high consecutive days, we still need to assign someone
      if (stats && stats.consecutive_days >= 6 && assignedToday.size < this.doctors.length - 1) {
        return false;
      }

      // Check night duty limits (max 10 per month)
      if (dutyType === 'Night Duty' && stats && stats.night_duties >= 10) return false;

      return true;
    });
    
    console.log(`[RosterScheduler] ${eligible.length} eligible doctors for ${unit} (${dutyType}) on ${date}`);
    return eligible;
  }

  /**
   * Select best doctor based on workload balancing and unit assignment rules
   * - Consultants/MOs: Assigned to ONE unit for entire month
   * - PGs/Fellows: Can rotate between units
   */
  private selectBestDoctor(candidates: Doctor[], isWeekendDuty: boolean, unit: string): Doctor | null {
    if (candidates.length === 0) return null;

    // Filter candidates based on monthly unit assignment rules
    const filteredCandidates = candidates.filter(doctor => {
      const designation = (doctor.designation || '').toLowerCase();
      const isConsultantOrMO = designation === 'consultant' || designation === 'mo';
      
      // For Consultants/MOs: Check if already assigned to a different unit this month
      if (isConsultantOrMO) {
        const assignedUnit = this.monthlyUnitAssignments.get(doctor.id);
        if (assignedUnit && assignedUnit !== unit) {
          // Already assigned to a different unit this month
          return false;
        }
      }
      
      return true;
    });

    if (filteredCandidates.length === 0) return null;

    // Sort by workload (least duties first)
    const sorted = filteredCandidates.sort((a, b) => {
      const statsA = this.stats.get(a.id)!;
      const statsB = this.stats.get(b.id)!;

      // Primary: Total duties
      if (statsA.total_duties !== statsB.total_duties) {
        return statsA.total_duties - statsB.total_duties;
      }

      // Secondary: Weekend duties (for weekend shifts)
      if (isWeekendDuty && statsA.weekend_duties !== statsB.weekend_duties) {
        return statsA.weekend_duties - statsB.weekend_duties;
      }

      // Tertiary: Consecutive days (prefer doctors with rest)
      return statsA.consecutive_days - statsB.consecutive_days;
    });

    return sorted[0];
  }

  /**
   * Update doctor statistics after assignment
   */
  private updateStats(doctorId: string, date: string, shiftType: string) {
    const stats = this.stats.get(doctorId)!;
    
    stats.total_duties++;
    
    if (shiftType === 'NIGHT') {
      stats.night_duties++;
    }

    const dayOfWeek = new Date(date).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      stats.weekend_duties++;
    }

    // Check consecutive days
    if (stats.last_duty_date) {
      const lastDate = new Date(stats.last_duty_date);
      const currentDate = new Date(date);
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        stats.consecutive_days++;
      } else {
        stats.consecutive_days = 1;
      }
    } else {
      stats.consecutive_days = 1;
    }

    stats.last_duty_date = date;
  }

  /**
   * Generate assignments for a single day
   */
  async generateDayAssignments(date: string): Promise<Assignment[]> {
    const dayAssignments: Assignment[] = [];
    const assignedToday = new Set<string>(); // Track doctors assigned on this specific day
    const dateObj = new Date(date);
    const isWeekendDay = isWeekend(dateObj);

    // Department requirements - mapping to duty_assignments format
    // duty_type enum: 'OPD', 'OT', 'Ward', 'Night Duty', 'Camp', 'Emergency'
    const departments = [
      // OPD Units
      { unit: 'Unit 1', dutyType: 'OPD' as const, startTime: '09:00', endTime: '13:00', count: 1 },
      { unit: 'Unit 2', dutyType: 'OPD' as const, startTime: '09:00', endTime: '13:00', count: 1 },
      { unit: 'Unit 3', dutyType: 'OPD' as const, startTime: '09:00', endTime: '13:00', count: 1 },
      { unit: 'Unit 4', dutyType: 'OPD' as const, startTime: '09:00', endTime: '13:00', count: 1 },
      { unit: 'Cornea', dutyType: 'OPD' as const, startTime: '09:00', endTime: '13:00', count: 1 },
      { unit: 'Retina', dutyType: 'OPD' as const, startTime: '09:00', endTime: '13:00', count: 1 },
      { unit: 'Glaucoma', dutyType: 'OPD' as const, startTime: '09:00', endTime: '13:00', count: 1 },
      
      // OT (Surgery)
      { unit: 'Cataract OT', dutyType: 'OT' as const, startTime: '08:00', endTime: '16:00', count: 1 },
      { unit: 'Retina OT', dutyType: 'OT' as const, startTime: '08:00', endTime: '16:00', count: 1 },
      { unit: 'Cornea OT', dutyType: 'OT' as const, startTime: '08:00', endTime: '16:00', count: 1 },
      
      // Ward
      { unit: 'General Ward', dutyType: 'Ward' as const, startTime: '08:00', endTime: '17:00', count: 2 },
      
      // Night Duty
      { unit: 'Night Duty', dutyType: 'Night Duty' as const, startTime: '17:00', endTime: '08:00', count: 2 },
      
      // Emergency
      { unit: 'Emergency', dutyType: 'Emergency' as const, startTime: '08:00', endTime: '20:00', count: 1 },
      { unit: 'Emergency Night', dutyType: 'Emergency' as const, startTime: '20:00', endTime: '08:00', count: 1 },
    ];

    // Generate assignments for each department
    for (const dept of departments) {
      for (let i = 0; i < dept.count; i++) {
        const eligible = this.getEligibleDoctors(dept.unit, dept.dutyType, date, assignedToday);
        const selected = this.selectBestDoctor(eligible, isWeekendDay, dept.unit);

        if (selected) {
          const assignment: Assignment = {
            doctor_id: selected.id,
            duty_date: date,
            duty_type: dept.dutyType,
            unit: dept.unit,
            start_time: dept.startTime,
            end_time: dept.endTime
          };

          dayAssignments.push(assignment);
          assignedToday.add(selected.id); // Mark doctor as assigned for today
          
          // Track monthly unit assignment for Consultants/MOs
          const designation = (selected.designation || '').toLowerCase();
          const isConsultantOrMO = designation === 'consultant' || designation === 'mo';
          if (isConsultantOrMO && !this.monthlyUnitAssignments.has(selected.id)) {
            this.monthlyUnitAssignments.set(selected.id, dept.unit);
            console.log(`[RosterScheduler] ${selected.name} (${designation}) assigned to ${dept.unit} for entire month`);
          }
          
          // Track unit day counts for PGs/Fellows
          const isPGorFellow = designation === 'pg' || designation === 'fellow';
          if (isPGorFellow) {
            const unitCounts = this.unitDayCounts.get(selected.id)!;
            unitCounts.set(dept.unit, (unitCounts.get(dept.unit) || 0) + 1);
          }
          
          this.updateStats(selected.id, date, dept.dutyType.includes('Night') ? 'NIGHT' : 'DAY');
        } else {
          console.warn(`[RosterScheduler] No eligible doctor for ${dept.unit} (${dept.dutyType}) on ${date}`);
        }
      }
    }

    return dayAssignments;
  }

  /**
   * Save assignments to database (duty_assignments table)
   */
  async saveAssignments(assignments: Assignment[]): Promise<{ success: boolean; error?: string }> {
    if (assignments.length === 0) {
      return { success: false, error: 'No assignments to save' };
    }

    console.log(`[RosterScheduler] Saving ${assignments.length} assignments to duty_assignments:`, assignments[0]);

    try {
      // Save to duty_assignments table (the one dashboard reads from)
      const { data, error: insertError } = await (supabase as any)
        .from('duty_assignments')
        .insert(assignments)
        .select();

      if (insertError) {
        console.error('[RosterScheduler] Error saving assignments:', insertError);
        return { success: false, error: insertError.message };
      }

      console.log(`[RosterScheduler] Saved ${data?.length || 0} assignments successfully to duty_assignments`);
      return { success: true };
    } catch (err: any) {
      console.error('[RosterScheduler] Exception saving assignments:', err);
      return { success: false, error: err.message || 'Unknown error' };
    }
  }

  /**
   * Get current statistics
   */
  getStats(): Map<string, DoctorStats> {
    return this.stats;
  }

  /**
   * Get unit day counts for PGs/Fellows
   * Returns Map of doctorId -> (unit -> dayCount)
   */
  getUnitDayCounts(): Map<string, Map<string, number>> {
    return this.unitDayCounts;
  }

  /**
   * Get monthly unit assignments for Consultants/MOs
   * Returns Map of doctorId -> assigned unit
   */
  getMonthlyUnitAssignments(): Map<string, string> {
    return this.monthlyUnitAssignments;
  }
}
