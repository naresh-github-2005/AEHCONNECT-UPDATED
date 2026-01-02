import { Database } from '@/integrations/supabase/types';

type DesignationLevel = Database['public']['Enums']['designation_level'];
type DutyType = Database['public']['Enums']['duty_type'];
type MedicalSpecialty = Database['public']['Enums']['medical_specialty'];

export interface DoctorProfile {
  id: string;
  name: string;
  designation: DesignationLevel | null;
  specialty: MedicalSpecialty;
  created_at?: string | null;
  // For fellowship duration calculations
  fellowshipStartDate?: Date;
}

export interface DutyRuleResult {
  allowed: boolean;
  reason?: string;
  isSupervised?: boolean;
  isLimited?: boolean;
  maxCount?: number;
}

export interface RoleRules {
  allowedDuties: DutyType[];
  restrictedDuties: DutyType[];
  supervisedDuties: DutyType[];
  maxOtTurns?: number;
  specialRules: string[];
  timeBasedRules: { duty: string; timeInfo: string }[];
}

// All duty types for reference
export const ALL_DUTY_TYPES: DutyType[] = [
  'OPD', 'OT', 'Ward', 'Night Duty', 'Camp', 'Emergency',
  'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT',
  'Today Doctor', 'Daycare', 'Physician', 'Block Room'
];

// Specialty OT types
export const SPECIALTY_OT_TYPES: DutyType[] = ['Retina OT', 'Glaucoma OT', 'Cornea OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT'];

// Get rules for each designation
export function getRoleRules(designation: DesignationLevel | null): RoleRules {
  switch (designation) {
    case 'mo':
      return {
        allowedDuties: ['Camp', 'Ward', 'OPD', 'OT', 'Emergency', 'Cataract OT', 'Today Doctor'],
        restrictedDuties: ['Night Duty', 'Retina OT', 'Glaucoma OT', 'Cornea OT'],
        supervisedDuties: [],
        maxOtTurns: 2,
        specialRules: [
          'Maximum 2 OT turns allowed',
          'OT is limited exposure, not full-day surgery',
          'No Night Duty allowed',
          'No Specialty OT (Retina/advanced) allowed'
        ],
        timeBasedRules: [
          { duty: 'Ward', timeInfo: 'Morning only (7:00 AM) - Post-op patients from previous day' },
          { duty: 'OPD', timeInfo: 'Day Care - Post-op follow-up for same-day morning surgery' }
        ]
      };

    case 'fellow':
      return {
        allowedDuties: ['Camp', 'Night Duty', 'Ward', 'OPD', 'OT', 'Emergency', 
                       'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT', 'Today Doctor'],
        restrictedDuties: [],
        supervisedDuties: [],
        maxOtTurns: undefined, // Mandatory OT requirements instead
        specialRules: [
          'Must have 1 Cataract OT turn + 1 Specialty OT turn',
          'IOL Fellow: 2 Cataract OT turns required',
          'Retina Fellow: 2 Retina OT turns required',
          'First 3 months: Only Free Units and General Units',
          'Cornea Fellow: General units for 9 months'
        ],
        timeBasedRules: []
      };

    case 'pg':
      return {
        allowedDuties: ['Camp', 'Night Duty', 'OPD', 'Ward', 'Emergency'],
        restrictedDuties: ['OT', 'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT', 'Today Doctor'],
        supervisedDuties: ['OT', 'Cataract OT'], // Can assist under supervision
        maxOtTurns: 0, // Independent OT not allowed
        specialRules: [
          'No Independent OT allowed',
          'OT participation is supervised only',
          'Specialty postings are educational, not workload-based',
          'No full surgical responsibility'
        ],
        timeBasedRules: []
      };

    case 'consultant':
      return {
        allowedDuties: ALL_DUTY_TYPES.filter(d => d !== 'Night Duty'),
        restrictedDuties: ['Night Duty'],
        supervisedDuties: [],
        specialRules: [
          'Senior supervisory and coordination role',
          'Can supervise junior doctors',
          'No Night Duty'
        ],
        timeBasedRules: []
      };

    default:
      // Default to most restrictive (PG-like)
      return {
        allowedDuties: ['Camp', 'Night Duty', 'OPD', 'Ward', 'Emergency'],
        restrictedDuties: ['OT', 'Cataract OT', 'Retina OT', 'Glaucoma OT', 'Cornea OT', 'Today Doctor'],
        supervisedDuties: [],
        specialRules: [],
        timeBasedRules: []
      };
  }
}

// Check if a duty is allowed for a doctor
export function isDutyAllowed(
  doctor: DoctorProfile,
  dutyType: DutyType,
  currentOtCount: number = 0
): DutyRuleResult {
  const rules = getRoleRules(doctor.designation);

  // Check if duty is in restricted list
  if (rules.restrictedDuties.includes(dutyType)) {
    // Check if it's allowed as supervised
    if (rules.supervisedDuties.includes(dutyType)) {
      return {
        allowed: true,
        isSupervised: true,
        reason: `${dutyType} allowed under supervision only`
      };
    }
    return {
      allowed: false,
      reason: getRestrictionReason(doctor.designation, dutyType)
    };
  }

  // Check OT limits for MO
  if (doctor.designation === 'mo' && isOtDuty(dutyType)) {
    if (currentOtCount >= (rules.maxOtTurns || 2)) {
      return {
        allowed: false,
        isLimited: true,
        maxCount: rules.maxOtTurns,
        reason: 'Medical Officers are limited to 2 OT turns'
      };
    }
    return {
      allowed: true,
      isLimited: true,
      maxCount: rules.maxOtTurns,
      reason: `OT turn ${currentOtCount + 1} of ${rules.maxOtTurns}`
    };
  }

  // Check Fellow specialty OT requirements
  if (doctor.designation === 'fellow' && isSpecialtyOt(dutyType)) {
    // Check fellowship duration
    const fellowshipMonths = getFellowshipDuration(doctor);
    if (fellowshipMonths < 3 && dutyType !== 'Cataract OT') {
      return {
        allowed: false,
        reason: 'Specialty posting enabled after 3 months of fellowship'
      };
    }
    
    // Cornea fellows have extended general unit requirement
    if (doctor.specialty === 'cornea' && fellowshipMonths < 9 && dutyType !== 'Cataract OT') {
      return {
        allowed: false,
        reason: 'Cornea Fellows must remain in general units for 9 months'
      };
    }
  }

  return {
    allowed: rules.allowedDuties.includes(dutyType),
    reason: rules.allowedDuties.includes(dutyType) ? undefined : `${dutyType} not allowed for this role`
  };
}

// Get allowed duties for a doctor
export function getAllowedDuties(doctor: DoctorProfile, currentOtCount: number = 0): {
  duty: DutyType;
  status: 'allowed' | 'supervised' | 'limited' | 'disabled';
  reason?: string;
}[] {
  return ALL_DUTY_TYPES.map(duty => {
    const result = isDutyAllowed(doctor, duty, currentOtCount);
    
    if (!result.allowed) {
      return { duty, status: 'disabled' as const, reason: result.reason };
    }
    if (result.isSupervised) {
      return { duty, status: 'supervised' as const, reason: result.reason };
    }
    if (result.isLimited) {
      return { duty, status: 'limited' as const, reason: result.reason };
    }
    return { duty, status: 'allowed' as const };
  });
}

// Get allowed duties for swap filtering
export function getSwappableDuties(doctor: DoctorProfile, currentOtCount: number = 0): DutyType[] {
  return getAllowedDuties(doctor, currentOtCount)
    .filter(d => d.status !== 'disabled')
    .map(d => d.duty);
}

// Check if duty type is an OT duty
export function isOtDuty(dutyType: DutyType): boolean {
  return dutyType === 'OT' || dutyType.includes('OT');
}

// Check if duty type is a specialty OT
export function isSpecialtyOt(dutyType: DutyType): boolean {
  return SPECIALTY_OT_TYPES.includes(dutyType);
}

// Get fellowship duration in months
function getFellowshipDuration(doctor: DoctorProfile): number {
  if (!doctor.fellowshipStartDate && doctor.created_at) {
    // Use created_at as proxy for fellowship start
    const start = new Date(doctor.created_at);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.max(0, months);
  }
  if (doctor.fellowshipStartDate) {
    const now = new Date();
    const months = (now.getFullYear() - doctor.fellowshipStartDate.getFullYear()) * 12 + 
                   (now.getMonth() - doctor.fellowshipStartDate.getMonth());
    return Math.max(0, months);
  }
  return 12; // Default to 12 months if unknown
}

// Get human-readable restriction reason
function getRestrictionReason(designation: DesignationLevel | null, dutyType: DutyType): string {
  switch (designation) {
    case 'mo':
      if (dutyType === 'Night Duty') return 'Medical Officers are not assigned Night Duty';
      if (isSpecialtyOt(dutyType)) return 'Specialty OT not available for Medical Officers';
      return `${dutyType} is restricted for Medical Officers`;
    case 'pg':
      if (isOtDuty(dutyType)) return 'PG students can only assist in OT under supervision';
      if (dutyType === 'Today Doctor') return 'Today Doctor requires senior designation';
      return `${dutyType} is restricted for PG students`;
    case 'consultant':
      if (dutyType === 'Night Duty') return 'Consultants are not assigned Night Duty';
      return `${dutyType} is restricted for Consultants`;
    default:
      return `${dutyType} is not allowed for this role`;
  }
}

// Get designation display label
export function getDesignationLabel(designation: DesignationLevel | null): string {
  switch (designation) {
    case 'mo': return 'Medical Officer';
    case 'fellow': return 'Fellow';
    case 'pg': return 'PG Student';
    case 'consultant': return 'Consultant';
    default: return 'Unknown';
  }
}

// Check if user can approve/reject leave (Admin or HoD)
export function canManageLeave(role: 'admin' | 'doctor', designation?: DesignationLevel | null): boolean {
  if (role === 'admin') return true;
  // HoD is typically a consultant with admin privileges
  if (designation === 'consultant') return true;
  return false;
}

// Validate duty assignment before creation
export function validateDutyAssignment(
  doctor: DoctorProfile,
  dutyType: DutyType,
  existingAssignments: { duty_type: DutyType }[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const currentOtCount = existingAssignments.filter(a => isOtDuty(a.duty_type)).length;
  const result = isDutyAllowed(doctor, dutyType, currentOtCount);

  if (!result.allowed) {
    errors.push(result.reason || `${dutyType} not allowed`);
  }

  if (result.isSupervised) {
    warnings.push(`${dutyType} will be marked as supervised`);
  }

  if (result.isLimited) {
    warnings.push(result.reason || 'Limited duty assignment');
  }

  // Check PG OT rules
  if (doctor.designation === 'pg' && isOtDuty(dutyType)) {
    errors.push('PG students cannot be assigned independent OT duties');
  }

  // Check MO OT limits
  if (doctor.designation === 'mo' && isOtDuty(dutyType) && currentOtCount >= 2) {
    errors.push('Medical Officers are limited to 2 OT turns');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Get duty-specific time information
export function getDutyTimeInfo(designation: DesignationLevel | null, dutyType: DutyType): string | null {
  const rules = getRoleRules(designation);
  const timeRule = rules.timeBasedRules.find(r => r.duty === dutyType);
  return timeRule?.timeInfo || null;
}

// Export rule summary for AI scheduling
export function getAISchedulingRules(): string {
  return `
## ROLE-BASED DUTY RULES (STRICT ENFORCEMENT)

### MEDICAL OFFICER (MO)
ALLOWED: Camps, Vision Center, Ward, Day Care, General OPD, Free Units, Conferences, Teaching, OT (max 2 turns)
RESTRICTED: ❌ Night Duty, ❌ Specialty OT (Retina/advanced)
RULES:
- Maximum 2 OT turns only
- OT is limited exposure, not full-day surgery
- Ward Rounds: Morning only (7:00 AM) for post-op patients
- Day Care: Post-op follow-up for same-day morning surgery

### FELLOW
ALLOWED: All duties including Camps, Night Duty, Ward, OT (mandatory & specialty-based)
MANDATORY OT REQUIREMENTS:
- Each Fellow must have: 1 Cataract OT + 1 Specialty OT
- IOL Fellow: 2 Cataract OT turns
- Retina Fellow: 2 Retina OT turns
POSTING RULES:
- First 3 months: Free Units and General Units only
- After 3 months: Respective specialty unit
- Cornea Fellow: General units for 9 months

### PG STUDENT
ALLOWED: Camps, Night Duties, Classes, General Units, Free Units, Specialty Postings (training), Conferences
RESTRICTED: ❌ Independent OT, ❌ Full surgical responsibility
RULES:
- OT participation is supervised only
- Specialty postings are educational, not workload-based
- No independent OT selection allowed

### CONSULTANT
ALLOWED: All duties except Night Duty
RESTRICTED: ❌ Night Duty
ROLE: Senior supervisory and coordination

### GLOBAL RULES
- Invalid duties must be hidden or disabled
- Duty swaps must respect role restrictions
- Roster updates reflect immediately
- Doctor views are read-only; only Admin/HoD can modify
`;
}
