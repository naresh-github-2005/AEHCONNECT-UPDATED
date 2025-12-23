import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  DutyAssignment,
  LeaveRequest,
  ActivityLog,
  LeaveType,
  generateDutyAssignments,
  initialLeaveRequests,
  initialActivityLog,
  doctors,
} from '@/lib/mockData';

interface DataContextType {
  dutyAssignments: DutyAssignment[];
  leaveRequests: LeaveRequest[];
  activityLog: ActivityLog[];
  lastUpdated: Date;
  generateRoster: () => void;
  applyLeave: (startDate: string, endDate: string, leaveType: LeaveType) => void;
  approveLeave: (leaveId: string) => void;
  rejectLeave: (leaveId: string) => void;
  refreshData: () => void;
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
    // Simulate roster generation with slight variations
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
        doctorId: '1', // Current logged in doctor
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

  return (
    <DataContext.Provider
      value={{
        dutyAssignments,
        leaveRequests,
        activityLog,
        lastUpdated,
        generateRoster,
        applyLeave,
        approveLeave,
        rejectLeave,
        refreshData,
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
