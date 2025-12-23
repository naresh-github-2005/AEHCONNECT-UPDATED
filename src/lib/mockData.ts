// Mock data for Hospital Duty Management System

export type DutyType = 'OPD' | 'OT' | 'Night Duty' | 'Ward' | 'Camp';
export type LeaveType = 'Casual' | 'Emergency';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type UserRole = 'doctor' | 'admin';

export interface Doctor {
  id: string;
  name: string;
  phone: string;
  department: string;
  avatar?: string;
}

export interface DutyAssignment {
  id: string;
  doctorId: string;
  doctor: Doctor;
  dutyType: DutyType;
  unit: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface LeaveRequest {
  id: string;
  doctorId: string;
  doctor: Doctor;
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  status: LeaveStatus;
  appliedAt: string;
  reason?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

// Mock Doctors
export const doctors: Doctor[] = [
  { id: '1', name: 'Dr. Sarah Johnson', phone: '+1 555-0101', department: 'General Medicine' },
  { id: '2', name: 'Dr. Michael Chen', phone: '+1 555-0102', department: 'Surgery' },
  { id: '3', name: 'Dr. Emily Williams', phone: '+1 555-0103', department: 'Pediatrics' },
  { id: '4', name: 'Dr. James Anderson', phone: '+1 555-0104', department: 'Cardiology' },
  { id: '5', name: 'Dr. Lisa Martinez', phone: '+1 555-0105', department: 'Orthopedics' },
  { id: '6', name: 'Dr. Robert Taylor', phone: '+1 555-0106', department: 'Emergency' },
  { id: '7', name: 'Dr. Amanda Brown', phone: '+1 555-0107', department: 'Neurology' },
  { id: '8', name: 'Dr. David Wilson', phone: '+1 555-0108', department: 'Oncology' },
];

// Get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];

// Mock Duty Assignments
export const generateDutyAssignments = (): DutyAssignment[] => {
  const today = getToday();
  return [
    { id: '1', doctorId: '1', doctor: doctors[0], dutyType: 'OPD', unit: 'OPD Block A', date: today, startTime: '08:00', endTime: '14:00' },
    { id: '2', doctorId: '2', doctor: doctors[1], dutyType: 'OT', unit: 'Operation Theatre 1', date: today, startTime: '09:00', endTime: '17:00' },
    { id: '3', doctorId: '3', doctor: doctors[2], dutyType: 'Ward', unit: 'Pediatric Ward', date: today, startTime: '08:00', endTime: '16:00' },
    { id: '4', doctorId: '4', doctor: doctors[3], dutyType: 'Night Duty', unit: 'ICU', date: today, startTime: '20:00', endTime: '08:00' },
    { id: '5', doctorId: '5', doctor: doctors[4], dutyType: 'OPD', unit: 'OPD Block B', date: today, startTime: '10:00', endTime: '16:00' },
    { id: '6', doctorId: '6', doctor: doctors[5], dutyType: 'Ward', unit: 'Emergency Ward', date: today, startTime: '08:00', endTime: '20:00' },
    { id: '7', doctorId: '7', doctor: doctors[6], dutyType: 'Camp', unit: 'Community Health Camp', date: today, startTime: '09:00', endTime: '15:00' },
    { id: '8', doctorId: '8', doctor: doctors[7], dutyType: 'OT', unit: 'Operation Theatre 2', date: today, startTime: '07:00', endTime: '15:00' },
  ];
};

// Mock Leave Requests
export const initialLeaveRequests: LeaveRequest[] = [
  {
    id: '1',
    doctorId: '3',
    doctor: doctors[2],
    startDate: '2024-01-20',
    endDate: '2024-01-22',
    leaveType: 'Casual',
    status: 'Approved',
    appliedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    doctorId: '5',
    doctor: doctors[4],
    startDate: '2024-01-25',
    endDate: '2024-01-25',
    leaveType: 'Emergency',
    status: 'Pending',
    appliedAt: '2024-01-18T14:00:00Z',
  },
];

// Mock Activity Log
export const initialActivityLog: ActivityLog[] = [
  { id: '1', action: 'Roster generated', timestamp: new Date().toISOString(), details: 'Daily roster created for today' },
  { id: '2', action: 'Leave approved', timestamp: new Date(Date.now() - 3600000).toISOString(), details: 'Dr. Emily Williams - Casual leave' },
  { id: '3', action: 'Duty swapped', timestamp: new Date(Date.now() - 7200000).toISOString(), details: 'Dr. Chen ↔ Dr. Taylor in OT' },
];

// Analytics Data
export interface AnalyticsData {
  dutyLoadBalance: 'Good' | 'Moderate' | 'Needs Review';
  nightDutyDistribution: { [key: string]: number };
  doctorsOnLeaveToday: number;
  rosterChangesToday: number;
  totalDoctors: number;
  averageDutiesPerDoctor: number;
}

export const getAnalyticsData = (): AnalyticsData => ({
  dutyLoadBalance: 'Good',
  nightDutyDistribution: {
    'Dr. James Anderson': 5,
    'Dr. Robert Taylor': 4,
    'Dr. Michael Chen': 4,
    'Dr. Sarah Johnson': 3,
  },
  doctorsOnLeaveToday: 1,
  rosterChangesToday: 3,
  totalDoctors: doctors.length,
  averageDutiesPerDoctor: 4.2,
});

// Current logged in user (mock)
export interface User {
  id: string;
  name: string;
  role: UserRole;
  doctorId?: string;
}

export const mockUsers: { [key: string]: User } = {
  doctor: {
    id: 'u1',
    name: 'Dr. Sarah Johnson',
    role: 'doctor',
    doctorId: '1',
  },
  admin: {
    id: 'u2',
    name: 'Admin User',
    role: 'admin',
  },
};
