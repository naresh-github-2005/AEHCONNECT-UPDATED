// Mock data for Hospital Duty Management System - Based on real Aravind Eye Hospital patterns

export type DutyType = 'OPD' | 'OT' | 'Night Duty' | 'Ward' | 'Camp' | 'Emergency' | 'Cataract OT' | 'Retina OT' | 'Glaucoma OT' | 'Cornea OT' | 'Today Doctor';
export type LeaveType = 'Casual' | 'Emergency' | 'Medical' | 'Annual';
export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type UserRole = 'doctor' | 'admin';
export type SeniorityLevel = 'intern' | 'resident' | 'fellow' | 'consultant' | 'senior_consultant';
export type MedicalSpecialty = 'general' | 'cornea' | 'retina' | 'glaucoma' | 'oculoplasty' | 'pediatric' | 'neuro' | 'cataract';
export type DesignationLevel = 'pg' | 'fellow' | 'mo' | 'consultant';

export interface Doctor {
  id: string;
  name: string;
  phone: string;
  department: string;
  avatar?: string;
  seniority?: SeniorityLevel;
  specialty?: MedicalSpecialty;
  designation?: DesignationLevel;
  eligible_duties?: string[];
  unit?: string;
  max_night_duties_per_month?: number;
  max_hours_per_week?: number;
}

export interface Camp {
  id: string;
  name: string;
  location: string;
  camp_date: string;
  start_time: string;
  end_time: string;
  required_doctors: number;
  specialty_required?: MedicalSpecialty;
  notes?: string;
}

export interface DoctorDutyStats {
  id: string;
  doctor_id: string;
  month: number;
  year: number;
  night_duty_count: number;
  weekend_duty_count: number;
  total_hours: number;
  camp_count: number;
  opd_sessions: number;
  ot_sessions: number;
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

// Duty Types with priority (from real hospital patterns)
export const dutyTypes = [
  { code: 'OPD', label: 'OPD', priority: 1 },
  { code: 'Cataract OT', label: 'Cataract OT', priority: 3 },
  { code: 'Retina OT', label: 'Retina OT', priority: 4 },
  { code: 'Glaucoma OT', label: 'Glaucoma OT', priority: 4 },
  { code: 'Cornea OT', label: 'Cornea OT', priority: 4 },
  { code: 'Neuro OT', label: 'Neuro OT', priority: 4 },
  { code: 'ORBIT OT', label: 'ORBIT OT', priority: 4 },
  { code: 'Pediatrics OT', label: 'Pediatrics OT', priority: 4 },
  { code: 'IOL OT', label: 'IOL OT', priority: 4 },
  { code: 'Night Duty', label: 'Night Duty', priority: 2 },
  { code: 'Ward', label: 'Ward Rounds', priority: 1 },
  { code: 'Today Doctor', label: 'Today Doctor', priority: 5 },
  { code: 'Camp', label: 'Camp', priority: 3 },
  { code: 'Emergency', label: 'Emergency', priority: 2 },
  { code: 'Daycare', label: 'Daycare', priority: 2 },
  { code: 'Physician', label: 'Physician', priority: 3 },
  { code: 'Block Room', label: 'Block Room', priority: 3 },
];

// Mock Doctors - Realistic profiles based on hospital patterns
export const doctors: Doctor[] = [
  { 
    id: '1', 
    name: 'Dr. Anisha Menon', 
    phone: '+91 90000-00001', 
    department: 'Ophthalmology',
    designation: 'mo',
    seniority: 'consultant',
    specialty: 'cataract',
    unit: 'Unit 3',
    eligible_duties: ['Cataract OT', 'OPD', 'Today Doctor'],
  },
  { 
    id: '2', 
    name: 'Dr. Neethu Krishnan', 
    phone: '+91 90000-00002', 
    department: 'Ophthalmology',
    designation: 'fellow',
    seniority: 'fellow',
    specialty: 'glaucoma',
    unit: 'Unit 2',
    eligible_duties: ['Glaucoma OT', 'Cataract OT', 'Night Duty'],
  },
  { 
    id: '3', 
    name: 'Dr. Akhil Sharma', 
    phone: '+91 90000-00003', 
    department: 'Ophthalmology',
    designation: 'pg',
    seniority: 'resident',
    specialty: 'general',
    unit: 'Unit 1',
    eligible_duties: ['OPD', 'Ward', 'Night Duty'],
  },
  { 
    id: '4', 
    name: 'Dr. Varuna Reddy', 
    phone: '+91 90000-00004', 
    department: 'Ophthalmology',
    designation: 'mo',
    seniority: 'consultant',
    specialty: 'retina',
    unit: 'Unit 4',
    eligible_duties: ['Retina OT', 'Cataract OT', 'Today Doctor'],
  },
  { 
    id: '5', 
    name: 'Dr. Niyathi Patel', 
    phone: '+91 90000-00005', 
    department: 'Ophthalmology',
    designation: 'pg',
    seniority: 'resident',
    specialty: 'general',
    unit: 'Unit 2',
    eligible_duties: ['OPD', 'Night Duty'],
  },
  { 
    id: '6', 
    name: 'Dr. Priya Sundaram', 
    phone: '+91 90000-00006', 
    department: 'Ophthalmology',
    designation: 'consultant',
    seniority: 'senior_consultant',
    specialty: 'cornea',
    unit: 'Unit 1',
    eligible_duties: ['Cornea OT', 'Retina OT', 'Today Doctor', 'OPD'],
  },
  { 
    id: '7', 
    name: 'Dr. Rajesh Kumar', 
    phone: '+91 90000-00007', 
    department: 'Ophthalmology',
    designation: 'fellow',
    seniority: 'fellow',
    specialty: 'retina',
    unit: 'Unit 3',
    eligible_duties: ['Retina OT', 'Cataract OT', 'Night Duty', 'OPD'],
  },
  { 
    id: '8', 
    name: 'Dr. Kavitha Rajan', 
    phone: '+91 90000-00008', 
    department: 'Ophthalmology',
    designation: 'mo',
    seniority: 'consultant',
    specialty: 'pediatric',
    unit: 'Unit 4',
    eligible_duties: ['Cataract OT', 'OPD', 'Today Doctor'],
  },
];

// Get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];

// Generate realistic duty assignments following hospital patterns
export const generateDutyAssignments = (): DutyAssignment[] => {
  const today = getToday();
  return [
    // Consultants/MOs get specialty OTs and Today Doctor role
    { id: '1', doctorId: '1', doctor: doctors[0], dutyType: 'Cataract OT', unit: 'OT-2', date: today, startTime: '07:30', endTime: '13:30' },
    { id: '2', doctorId: '4', doctor: doctors[3], dutyType: 'Retina OT', unit: 'OT-3', date: today, startTime: '08:00', endTime: '14:00' },
    { id: '3', doctorId: '6', doctor: doctors[5], dutyType: 'Today Doctor', unit: 'Coordination', date: today, startTime: '07:00', endTime: '19:00' },
    // Fellows get partial OT exposure and some night duty
    { id: '4', doctorId: '2', doctor: doctors[1], dutyType: 'Glaucoma OT', unit: 'OT-1', date: today, startTime: '10:30', endTime: '14:00' },
    { id: '5', doctorId: '7', doctor: doctors[6], dutyType: 'Cataract OT', unit: 'OT-4', date: today, startTime: '09:00', endTime: '13:00' },
    // PGs get OPD, Ward, and Night Duty (no full OT)
    { id: '6', doctorId: '3', doctor: doctors[2], dutyType: 'OPD', unit: 'OPD-1', date: today, startTime: '09:00', endTime: '16:00' },
    { id: '7', doctorId: '5', doctor: doctors[4], dutyType: 'OPD', unit: 'OPD-2', date: today, startTime: '08:00', endTime: '15:00' },
    { id: '8', doctorId: '3', doctor: doctors[2], dutyType: 'Night Duty', unit: 'Emergency', date: today, startTime: '20:00', endTime: '08:00' },
    // MO on OPD after OT
    { id: '9', doctorId: '8', doctor: doctors[7], dutyType: 'OPD', unit: 'OPD-3', date: today, startTime: '14:00', endTime: '17:00' },
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
  { id: '1', action: 'Roster generated', timestamp: new Date().toISOString(), details: 'AI-generated roster for today based on performance scores' },
  { id: '2', action: 'Leave approved', timestamp: new Date(Date.now() - 3600000).toISOString(), details: 'Dr. Akhil Sharma - Casual leave' },
  { id: '3', action: 'Duty swapped', timestamp: new Date(Date.now() - 7200000).toISOString(), details: 'Dr. Neethu ↔ Dr. Rajesh in Glaucoma OT' },
];

// Analytics Data - Reflecting realistic patterns
export interface AnalyticsData {
  dutyLoadBalance: 'Good' | 'Moderate' | 'Needs Review';
  nightDutyDistribution: { [key: string]: number };
  doctorsOnLeaveToday: number;
  rosterChangesToday: number;
  totalDoctors: number;
  averageDutiesPerDoctor: number;
  designationDistribution: { [key: string]: number };
}

export const getAnalyticsData = (): AnalyticsData => ({
  dutyLoadBalance: 'Good',
  nightDutyDistribution: {
    'PG': 70,
    'Fellow': 25,
    'MO': 5,
  },
  designationDistribution: {
    'Consultant': 2,
    'MO': 3,
    'Fellow': 2,
    'PG': 1,
  },
  doctorsOnLeaveToday: 1,
  rosterChangesToday: 2,
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
    name: 'Dr. Anisha Menon',
    role: 'doctor',
    doctorId: '1',
  },
  admin: {
    id: 'u2',
    name: 'Admin User',
    role: 'admin',
  },
};

// Scheduling Rules (implicit rules for AI to follow)
export const schedulingRules = {
  eligibility: {
    'Specialty OT': ['mo', 'consultant', 'fellow'],
    'Cataract OT': ['fellow', 'mo', 'consultant'],
    'Retina OT': ['mo', 'consultant'],
    'Glaucoma OT': ['fellow', 'mo', 'consultant'],
    'Cornea OT': ['mo', 'consultant'],
    'Night Duty': ['pg', 'fellow'],
    'Today Doctor': ['mo', 'consultant'],
    'OPD': ['pg', 'fellow', 'mo', 'consultant'],
    'Ward': ['pg', 'fellow', 'mo', 'consultant'],
  },
  fairnessConstraints: {
    maxNightDutiesPerWeek: 2,
    maxOTDaysPerWeekPG: 2,
    avoidConsecutiveSameDuty: true,
  },
  trainingQuotas: {
    pgMinOTHoursPerWeek: 8,
    pgNeverFullDayOTAlone: true,
  },
  performanceWeighting: {
    minScoreForSpecialtyOT: 75,
    minScoreForCataractOT: 70,
    higherScorePreferredForOT: true,
  },
};
