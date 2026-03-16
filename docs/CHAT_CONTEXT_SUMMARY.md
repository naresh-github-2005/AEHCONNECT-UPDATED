# AEHCONNECT - Hospital Duty Roster App Context Summary

## Project Overview
- **Name**: AEHCONNECT (Hospital Duty Roster Management System)
- **Tech Stack**: React + TypeScript, Vite, Tailwind CSS, shadcn/ui, Supabase
- **Supabase Project ID**: `kkinsccdzkvwqqrswkxa`
- **GitHub Repo**: `naresh-github-2005/AEHCONNECT`
- **Primary Color**: `#0496c7` (WCAG compliant theme)
- **Dev Server Port**: 8081

---

## Database Schema Summary

### Core Tables
1. **doctors** - Doctor profiles with specialties, departments, units, duties eligibility
2. **users** - Auth users linked to doctors
3. **duties** - Daily duty assignments
4. **duty_templates** - Reusable duty templates

### Leave & Permission System (Completed)
1. **leave_requests** - Doctor leave applications
   - Columns: doctor_id, leave_type, start_date, end_date, reason, status, reviewed_by, reviewed_at
   - Status values: `pending`, `approved`, `rejected` (lowercase)
   - Leave types: `Casual`, `Emergency`, `Medical`, `Annual`, `Festival`
   - Max 25 days/year total leave

2. **permission_requests** - Short-term permission requests
   - Columns: doctor_id, permission_date, start_time, end_time, hours_requested, reason, status
   - Max 3 hours/month permissions

### Academic System
1. **classes** - Academic classes, conferences, seminars, workshops
   - New columns added: `end_date`, `is_multi_day`, `application_deadline`, `max_attendees`, `requires_approval`
   - Class types: lecture, grand_rounds, case_presentation, journal_club, complication_meeting, nbems_class, pharma_quiz, exam, conference, seminar, workshop, other

2. **class_attendees** - Track attendance

### Conference Application System (NEW - In Progress)
1. **conference_applications** - Doctor applications for conferences
   - Columns: class_id, doctor_id, status, applied_at, reviewed_by, reviewed_at, admin_notes, doctor_notes
   - Status: `pending`, `approved`, `rejected`, `cancelled`
   - Unique constraint on (class_id, doctor_id)

2. **conference_duty_exclusions** - Tracks doctors unavailable due to conferences
   - Columns: doctor_id, class_id, application_id, exclusion_start_date, exclusion_end_date, reason
   - Used by roster generation to exclude doctors at conferences

### Test Marks System (NEW - Completed)
1. **test_marks** - Test performance tracking for Fellows and PG doctors
   - Columns: doctor_id, test_name, test_date, marks_obtained, total_marks, month, year, remarks, created_by
   - Percentile auto-calculated: `(marks_obtained / total_marks) × 100`
   - RLS policies: Admins can manage all, doctors can view their own
   - Indexes on doctor_id, month/year, created_by

### Database Functions Created
```sql
-- Roster Availability Functions
get_doctors_on_leave(p_date DATE)
get_doctors_with_permissions(p_date DATE)
get_available_doctors(p_date DATE) -- Updated to include conference exclusions
get_doctor_availability_for_date(p_doctor_id UUID, p_date DATE)
get_roster_availability_summary(p_date DATE) -- Updated with doctors_at_conferences

-- Conference Application Functions
apply_for_conference(p_class_id UUID, p_doctor_id UUID, p_notes TEXT)
approve_conference_application(p_application_id UUID, p_admin_id UUID, p_notes TEXT)
reject_conference_application(p_application_id UUID, p_admin_id UUID, p_notes TEXT)
cancel_conference_application(p_application_id UUID, p_doctor_id UUID)
get_conference_applications_summary()
get_conference_applications(p_class_id UUID)
get_my_conference_applications(p_doctor_id UUID)
get_doctors_at_conferences(p_date DATE)

-- Leave/Permission Functions
calculate_leaves_taken(p_doctor_id, p_leave_type, p_year)
get_doctor_leave_summary(p_doctor_id)
get_total_leaves_taken(p_doctor_id, p_year)
get_permission_hours_used(p_doctor_id, p_month, p_year)
get_leaves_by_type(p_doctor_id, p_year)
```

### Database Views
- `daily_doctor_availability` - Shows all doctors' availability status for today
- `doctors_on_leave_today` - Doctors currently on leave
- `doctors_with_permissions_today` - Doctors with permissions today
- `doctors_at_conference_today` - Doctors at conferences today

---

## Completed Features

### 1. Theme Update
- Changed primary color to `#0496c7`
- Updated in `tailwind.config.ts` and `index.css`
- WCAG compliant contrast ratios

### 2. Leave & Permissions Page (`src/pages/Leave.tsx`)
- Two tabs: Leave Requests & Permissions
- Balance cards showing days/hours remaining
- Request forms with date pickers
- Admin approval workflow
- Leave types: Casual, Emergency, Medical, Annual, Festival
- 25 days/year max leave, 3 hours/month permissions

### 3. PWA Build Fix
- Added `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` to vite.config.ts
- Added code splitting with `manualChunks` for vendor, supabase, ui, charts

### 4. Database Migrations Applied
- `20260103160000_leave_permissions_system.sql` - Leave/permission tables and functions
- `20260103180000_roster_availability_system.sql` - Roster availability views/functions
- `20260104100000_conference_application_system.sql` - Conference application system
- `20260104120000_add_admin_doctor_profile.sql` - Add admin user to doctors table
- `20260104130000_create_test_marks_table.sql` - Test marks system for Fellows/PG

### 5. Conference Application System (COMPLETE)
- **Academic.tsx Updates**:
  - Added date range selection (start_date, end_date) for conferences/seminars/workshops
  - Added "Requests" button in header (admin only) to view conference applications
  - Doctors can apply for conferences with notes
  - Apply button automatically disabled 2 days before conference start
  - Application status badges (Pending, Approved, Rejected)
  - Doctors can cancel pending/approved applications
  
- **New Page: ConferenceRequests.tsx**:
  - Admin-only page to manage conference applications
  - View all conferences with application counts
  - View detailed applications per conference
  - Approve applications (creates duty exclusion automatically)
  - Reject applications with reason
  - Track approval/rejection history

- **Database Integration**:
  - Uses RPC functions: `apply_for_conference`, `approve_conference_application`, `reject_conference_application`
  - Automatic duty exclusion creation on approval
  - Clean database tracking via `conference_duty_exclusions` table

### 6. Test Marks Management System (COMPLETE)
- **Admin Test Marks Page (`src/pages/TestMarks.tsx`)**:
  - Filter doctors by designation (Fellow or PG)
  - Add test marks with auto-calculated percentile
  - View all test records in comprehensive table
  - Edit and delete test marks
  - Color-coded performance (Green ≥75%, Yellow ≥50%, Red <50%)
  
- **Doctor Test Marks View (`src/pages/MyTestMarks.tsx`)**:
  - Fellows and PG doctors can view their own test marks
  - Month/year filter for period selection
  - Monthly average performance card with progress bar
  - Individual test cards with detailed scores
  - All-time performance statistics
  - Performance labels: Excellent (≥90%), Good (≥75%), Average (≥50%), Needs Improvement (<50%)

- **Navigation Updates**:
  - Added "Test Marks" menu item in kebab menu (admin only)
  - Added "My Test Marks" menu item (fellows/PG only)
  - Routes: `/test-marks` (admin), `/my-test-marks` (fellows/PG)

- **Enhanced Components**:
  - Updated Progress component with `indicatorClassName` prop for custom colors
  - AuthContext now includes `designation` field from doctors table

- **Database**:
  - `test_marks` table with RLS policies
  - Auto-calculated percentile display
  - Month/year categorization for easy filtering

---

## Key Files

### Pages
- `src/pages/Academic.tsx` - Academic calendar with conference application features
- `src/pages/ConferenceRequests.tsx` - Admin page for managing conference applications
- `src/pages/TestMarks.tsx` - Admin page for managing test marks (Fellows/PG)
- `src/pages/MyTestMarks.tsx` - Doctor view for their test marks (Fellows/PG)
- `src/pages/Leave.tsx` - Leave & Permissions management (completed)
- `src/pages/Roster.tsx` - Duty roster
- `src/pages/AdminDashboard.tsx` - Admin panel
- `src/pages/DoctorDashboard.tsx` - Doctor view

### Components
- `src/components/admin/MonthlyRosterGenerator.tsx` - Roster generation
- `src/components/roster/MonthlyRosterView.tsx` - Roster display

### Config
- `vite.config.ts` - Build config with PWA settings
- `tailwind.config.ts` - Theme colors
- `src/index.css` - CSS variables

### Database
- `supabase/migrations/` - All migrations
- `src/integrations/supabase/types.ts` - Generated TypeScript types
- `src/integrations/supabase/client.ts` - Supabase client

---

## How to Use This Context

When starting a new chat, provide this summary and specify what you want to work on. For example:

**To continue Conference Application System:**
```
Continue implementing the Conference Application System for Academic.tsx:
1. Add date range picker for conferences (start_date, end_date)
2. Add conference requests icon for admin
3. Create ConferenceRequests page
4. Add Apply button for doctors on conference details
5. Show application status on conference cards

Database is ready with:
- conference_applications table
- conference_duty_exclusions table
- All RPC functions (apply_for_conference, approve_conference_application, etc.)
```

---

## Important Notes

1. **Status values are lowercase**: `pending`, `approved`, `rejected` (not Capitalized)
2. **Doctor relation uses `name` column**, not `full_name`
3. **Dev server runs on port 8081** (8080 is in use)
4. **Use `cmd /c` for piped commands** in Windows PowerShell to preserve output
5. **TypeScript types must be regenerated** after database migrations:
   ```
   npx supabase gen types typescript --project-id kkinsccdzkvwqqrswkxa > src/integrations/supabase/types.ts
   ```

---

## Migration Naming Convention
Format: `YYYYMMDDHHMMSS_description.sql`
Example: `20260104100000_conference_application_system.sql`

Check existing migrations before creating new ones to avoid timestamp conflicts.

---

*Last Updated: January 4, 2026*
