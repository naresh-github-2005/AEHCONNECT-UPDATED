import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import {
  DutyAssignment,
  LeaveRequest,
  ActivityLog,
  LeaveType,
  DutyType,
  Doctor,
  generateDutyAssignments,
  initialLeaveRequests,
  initialActivityLog,
  doctors,
} from '@/lib/mockData';

type DbDutyType = Database['public']['Enums']['duty_type'];

interface DataContextType {
  dutyAssignments: DutyAssignment[];
  leaveRequests: LeaveRequest[];
  activityLog: ActivityLog[];
  doctors: Doctor[];
  lastUpdated: Date;
  generateRoster: () => void;
  applyLeave: (startDate: string, endDate: string, leaveType: LeaveType) => void;
  approveLeave: (leaveId: string) => void;
  rejectLeave: (leaveId: string) => void;
  refreshData: () => void;
  applyAISuggestions: (assignments: any[], targetDate: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dutyAssignments, setDutyAssignments] = useState<DutyAssignment[]>(generateDutyAssignments());
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(initialActivityLog);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const addActivityLog = useCallback((action: string, details?: string) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      action,
      timestamp: new Date().toISOString(),
      details,
    };
    setActivityLog((prev) => [newLog, ...prev]);
  }, []);

  const generateRoster = useCallback(() => {
    const newAssignments = generateDutyAssignments().map((assignment) => ({
      ...assignment,
      id: Date.now().toString() + assignment.id,
    }));
    setDutyAssignments(newAssignments);
    setLastUpdated(new Date());
    addActivityLog('Roster generated', 'New daily roster created');
  }, [addActivityLog]);

  const applyLeave = useCallback(
    (startDate: string, endDate: string, leaveType: LeaveType) => {
      const newLeave: LeaveRequest = {
        id: Date.now().toString(),
        doctorId: '1',
        doctor: doctors[0],
        startDate,
        endDate,
        leaveType,
        status: 'Pending',
        appliedAt: new Date().toISOString(),
      };
      setLeaveRequests((prev) => [newLeave, ...prev]);
      addActivityLog('Leave applied', `${doctors[0].name} - ${leaveType} leave`);
    },
    [addActivityLog]
  );

  const approveLeave = useCallback(
    (leaveId: string) => {
      setLeaveRequests((prev) =>
        prev.map((leave) =>
          leave.id === leaveId ? { ...leave, status: 'Approved' } : leave
        )
      );
      const leave = leaveRequests.find((l) => l.id === leaveId);
      if (leave) {
        addActivityLog('Leave approved', `${leave.doctor.name} - ${leave.leaveType}`);
      }
    },
    [leaveRequests, addActivityLog]
  );

  const rejectLeave = useCallback(
    (leaveId: string) => {
      setLeaveRequests((prev) =>
        prev.map((leave) =>
          leave.id === leaveId ? { ...leave, status: 'Rejected' } : leave
        )
      );
      const leave = leaveRequests.find((l) => l.id === leaveId);
      if (leave) {
        addActivityLog('Leave rejected', `${leave.doctor.name} - ${leave.leaveType}`);
      }
    },
    [leaveRequests, addActivityLog]
  );

  const refreshData = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  const applyAISuggestions = useCallback(async (assignments: any[], targetDate: string) => {
    try {
      // First, delete existing assignments for the target date
      const { error: deleteError } = await supabase
        .from('duty_assignments')
        .delete()
        .eq('duty_date', targetDate);

      if (deleteError) {
        console.error('Error deleting existing assignments:', deleteError);
        toast.error('Failed to clear existing assignments');
        return;
      }

      // Prepare assignments for insertion with proper typing
      const validDutyTypes: DbDutyType[] = ['OPD', 'OT', 'Ward', 'Night Duty', 'Camp', 'Emergency', 'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT', 'Today Doctor'];
      
      const dbAssignments = assignments
        .filter((a) => validDutyTypes.includes(a.dutyType as DbDutyType))
        .map((a) => ({
          doctor_id: a.doctorId as string,
          duty_date: targetDate,
          duty_type: a.dutyType as DbDutyType,
          unit: (a.unit || 'Unit 1') as string,
          start_time: a.startTime as string,
          end_time: a.endTime as string,
        }));

      // Insert new assignments
      const { data, error: insertError } = await supabase
        .from('duty_assignments')
        .insert(dbAssignments)
        .select();

      if (insertError) {
        console.error('Error inserting assignments:', insertError);
        toast.error('Failed to save AI suggestions to database');
        return;
      }

      console.log('Successfully inserted', data?.length, 'assignments');
      
      // Log activity
      await supabase.from('activity_logs').insert({
        action: 'AI roster applied',
        details: `${assignments.length} assignments generated by AI for ${targetDate}`,
      });

      setLastUpdated(new Date());
      addActivityLog('AI roster applied', `${assignments.length} assignments saved to database for ${targetDate}`);
      toast.success(`${assignments.length} duty assignments saved to database!`);
    } catch (error) {
      console.error('Error applying AI suggestions:', error);
      toast.error('Failed to apply AI suggestions');
    }
  }, [addActivityLog]);

  return (
    <DataContext.Provider
      value={{
        dutyAssignments,
        leaveRequests,
        activityLog,
        doctors,
        lastUpdated,
        generateRoster,
        applyLeave,
        approveLeave,
        rejectLeave,
        refreshData,
        applyAISuggestions,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
