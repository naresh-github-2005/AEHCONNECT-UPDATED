import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type DutyAssignment = Tables<'duty_assignments'>;
type Doctor = Tables<'doctors'>;
type SwapRequest = Tables<'swap_requests'>;

export interface DutyWithDoctor extends DutyAssignment {
  doctor: Doctor;
}

export interface SwapRequestWithDetails extends SwapRequest {
  requester_doctor: Doctor;
  target_doctor: Doctor;
  requester_assignment: DutyAssignment;
  target_assignment: DutyAssignment;
}

export const useRealtimeDutyAssignments = (date?: string) => {
  const [assignments, setAssignments] = useState<DutyWithDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssignments = useCallback(async () => {
    try {
      let query = supabase
        .from('duty_assignments')
        .select('*, doctor:doctors(*)');
      
      if (date) {
        query = query.eq('duty_date', date);
      }
      
      const { data, error: fetchError } = await query.order('start_time');
      
      if (fetchError) throw fetchError;
      
      const mapped = (data || []).map(item => ({
        ...item,
        doctor: item.doctor as unknown as Doctor
      }));
      
      setAssignments(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchAssignments();

    // Subscribe to duty assignment changes
    const dutyChannel = supabase
      .channel('duty-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duty_assignments'
        },
        (payload) => {
          console.log('Duty assignment change:', payload);
          fetchAssignments();
        }
      )
      .subscribe();

    // Subscribe to leave request changes (approved leaves may affect roster)
    const leaveChannel = supabase
      .channel('leave-requests-for-roster')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leave_requests'
        },
        (payload) => {
          console.log('Leave request updated:', payload);
          // Refetch when leaves are approved/rejected as it may affect availability
          fetchAssignments();
        }
      )
      .subscribe();

    // Subscribe to camp changes (new camps may require roster adjustments)
    const campChannel = supabase
      .channel('camps-for-roster')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'camps'
        },
        (payload) => {
          console.log('Camp change:', payload);
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dutyChannel);
      supabase.removeChannel(leaveChannel);
      supabase.removeChannel(campChannel);
    };
  }, [fetchAssignments]);

  return { assignments, isLoading, error, refetch: fetchAssignments };
};

export const useRealtimeSwapRequests = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSwapRequests = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('swap_requests')
        .select(`
          *,
          requester_doctor:doctors!swap_requests_requester_doctor_id_fkey(*),
          target_doctor:doctors!swap_requests_target_doctor_id_fkey(*),
          requester_assignment:duty_assignments!swap_requests_requester_assignment_id_fkey(*),
          target_assignment:duty_assignments!swap_requests_target_assignment_id_fkey(*)
        `)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      const mapped = (data || []).map(item => ({
        ...item,
        requester_doctor: item.requester_doctor as unknown as Doctor,
        target_doctor: item.target_doctor as unknown as Doctor,
        requester_assignment: item.requester_assignment as unknown as DutyAssignment,
        target_assignment: item.target_assignment as unknown as DutyAssignment,
      }));
      
      setSwapRequests(mapped);
      setError(null);
    } catch (err) {
      console.error('Error fetching swap requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch swap requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSwapRequests();

    const channel = supabase
      .channel('swap-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'swap_requests'
        },
        (payload) => {
          console.log('Swap request change:', payload);
          fetchSwapRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSwapRequests]);

  return { swapRequests, isLoading, error, refetch: fetchSwapRequests };
};

export const useRealtimeDoctors = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return { doctors, isLoading, refetch: fetchDoctors };
};

export const createSwapRequest = async (
  requesterAssignmentId: string,
  targetAssignmentId: string,
  requesterDoctorId: string,
  targetDoctorId: string,
  reason?: string
) => {
  const { data, error } = await supabase
    .from('swap_requests')
    .insert({
      requester_assignment_id: requesterAssignmentId,
      target_assignment_id: targetAssignmentId,
      requester_doctor_id: requesterDoctorId,
      target_doctor_id: targetDoctorId,
      reason,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateSwapRequestStatus = async (
  requestId: string,
  status: 'approved' | 'rejected' | 'cancelled'
) => {
  const { data, error } = await supabase
    .from('swap_requests')
    .update({ 
      status, 
      reviewed_at: new Date().toISOString() 
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  
  // If approved, swap the doctors in the assignments
  if (status === 'approved') {
    const { data: request } = await supabase
      .from('swap_requests')
      .select('requester_assignment_id, target_assignment_id, requester_doctor_id, target_doctor_id')
      .eq('id', requestId)
      .single();
    
    if (request) {
      // Swap the doctor_ids in the assignments
      await supabase
        .from('duty_assignments')
        .update({ doctor_id: request.target_doctor_id })
        .eq('id', request.requester_assignment_id);
      
      await supabase
        .from('duty_assignments')
        .update({ doctor_id: request.requester_doctor_id })
        .eq('id', request.target_assignment_id);
    }
  }
  
  return data;
};
