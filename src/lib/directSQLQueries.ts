// Direct SQL query utility to bypass PostgREST cache issues
// Use this when PostgREST hasn't refreshed schema cache yet

import { supabase } from '@/integrations/supabase/client';

export interface RosterRow {
  id: string;
  month: string;
  generated_by: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Create a roster using direct SQL (bypasses PostgREST schema cache)
 */
export async function createRosterDirectSQL(
  month: string,
  generatedBy: string | null = null,
  status: string = 'DRAFT'
): Promise<{ data: RosterRow | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('create_roster_direct', {
      p_month: month,
      p_generated_by: generatedBy,
      p_status: status
    });

    if (error) throw error;
    
    return { data: data?.[0] || null, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get roster by month using direct SQL
 */
export async function getRosterByMonthDirectSQL(
  month: string
): Promise<{ data: RosterRow | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc('get_roster_by_month', {
      p_month: month
    });

    if (error) throw error;
    
    return { data: data?.[0] || null, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Create roster assignment using direct SQL
 */
export async function createRosterAssignmentDirectSQL(
  rosterId: string,
  doctorId: string,
  departmentId: string,
  dutyDate: string,
  shiftType: string = 'day'
): Promise<{ error: any }> {
  try {
    const { error } = await supabase.rpc('create_roster_assignment_direct', {
      p_roster_id: rosterId,
      p_doctor_id: doctorId,
      p_department_id: departmentId,
      p_duty_date: dutyDate,
      p_shift_type: shiftType
    });

    return { error };
  } catch (error: any) {
    return { error };
  }
}
