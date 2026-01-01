# DutyCare Connect — Role-Based Access Guide

This document explains what **Admins** and **Doctors** can do in the Hospital Duty Roster Management System.

---

## 📊 Quick Comparison

| Feature | Admin | Doctor |
|---------|:-----:|:------:|
| **Dashboard** | Admin Dashboard | Doctor Dashboard |
| **View Roster** | ✅ All doctors | ✅ All doctors |
| **Create/Edit Duties** | ✅ | ❌ |
| **AI Scheduling** | ✅ | ❌ |
| **Monthly Roster Generator** | ✅ | ❌ |
| **View Leave Requests** | ✅ All | ✅ Own only |
| **Submit Leave Request** | ❌ | ✅ |
| **Approve/Reject Leave** | ✅ | ❌ |
| **Manage Doctors** | ✅ Add/Edit/Deactivate | ❌ |
| **Camp Management** | ✅ Create/Assign | ❌ (view only) |
| **Analytics Dashboard** | ✅ | ❌ |
| **Attendance Tracking** | ✅ View all | ✅ Own punch in/out |
| **Academic Classes** | ✅ Create/Manage | ✅ View/Attend |
| **Swap Requests** | ✅ Approve all | ✅ Request/Accept own |
| **Messages** | ✅ All channels | ✅ Joined channels |

---

## 👨‍💼 ADMIN Functions

### Dashboard (`/dashboard` → AdminDashboard)

When an admin logs in, they see:

```
┌─────────────────────────────────────┐
│  Admin Dashboard                    │
│  "Manage rosters, approvals..."     │
├─────────────────────────────────────┤
│  [Camps]    [Doctors]    [Academic] │
│  [Messages] [Attendance] [Analytics]│
├─────────────────────────────────────┤
│  📊 Duties Today: 12                │
│  ⏰ Pending Leaves: 3               │
├─────────────────────────────────────┤
│  🚨 Pending Approvals               │
│  ├─ Dr. Kumar - Casual Leave        │
│  │   [✅ Approve] [❌ Reject]        │
│  └─ Dr. Sharma - Medical Leave      │
├─────────────────────────────────────┤
│  🤖 AI Scheduling Assistant         │
│  └─ Generate smart duty roster      │
├─────────────────────────────────────┤
│  📅 Monthly Roster Generator        │
│  └─ Bulk generate month schedule    │
├─────────────────────────────────────┤
│  📜 Activity Log                    │
│  └─ Recent system activities        │
└─────────────────────────────────────┘
```

### 1. **Duty Management** (Admin Only)

| Function | Description |
|----------|-------------|
| **Create Duty Assignments** | Assign doctors to OPD, OT, Ward, Night Duty, Camp, Emergency |
| **Edit Assignments** | Modify existing duty schedules |
| **Delete Assignments** | Remove duty assignments |
| **View All Assignments** | See complete roster for any date |

**Duty Types Available:**
- `OPD` - Outpatient Department
- `OT` / `Cataract OT` / `Retina OT` / `Glaucoma OT` / `Cornea OT` - Operation Theatre
- `Ward` - Ward rounds
- `Night Duty` - Overnight shifts
- `Camp` - Eye camp duty
- `Emergency` - Emergency department
- `Today Doctor` - Daily coordinator

### 2. **AI Scheduling Assistant** (Admin Only)

```typescript
// Accessible at: AdminDashboard → AI Scheduling Assistant
// Calls: supabase/functions/ai-scheduling-assistant

Features:
- 🧠 AI-powered duty suggestions using Gemini 2.5 Flash
- 📊 Considers doctor constraints (seniority, specialty, limits)
- ⚖️ Ensures fair distribution of duties
- 🏥 Respects medical hierarchy rules
- 📅 Accounts for leave requests and camps
```

**What AI considers:**
- Doctor seniority (PG, Fellow, MO, Consultant)
- Specialty matching (Retina → Retina OT)
- Leave requests (approved)
- Maximum night duties per month
- Fixed off days
- Health constraints
- Performance scores

### 3. **Monthly Roster Generator** (Admin Only)

- Generate complete month's roster in one click
- Day-by-day scheduling with fairness tracking
- Progress visualization during generation
- Apply or discard generated roster

### 4. **Leave Management** (Admin Only - Approval)

| Action | Description |
|--------|-------------|
| **View All Requests** | See all doctors' leave requests |
| **Approve Leave** | Accept leave request, updates status |
| **Reject Leave** | Deny leave request with timestamp |
| **Real-time Updates** | Live notifications when new requests arrive |

```typescript
// RLS Policy: Admins can manage all leave_requests
CREATE POLICY "Admins can manage leave requests" 
ON public.leave_requests FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));
```

### 5. **Doctor Management** (`/doctors` - Admin Only)

| Function | Description |
|----------|-------------|
| **View All Doctors** | Complete list with profiles |
| **Add New Doctor** | Create doctor profile |
| **Edit Doctor Profile** | Update name, specialty, unit, constraints |
| **Deactivate Doctor** | Mark as inactive (soft delete) |
| **Set Capabilities** | Configure what duties doctor can do |

**Doctor Attributes Managed:**
- Name, Phone, Department, Unit
- Designation (PG, Fellow, MO, Consultant)
- Seniority level
- Specialty (Cornea, Retina, Glaucoma, etc.)
- Max night duties per month
- Max hours per week
- Fixed off days
- Health constraints
- Capability flags (can_do_opd, can_do_ot, can_do_night, etc.)

### 6. **Camp Management** (`/camps` - Admin Only)

| Function | Description |
|----------|-------------|
| **Create Camp** | Schedule new eye camp |
| **Assign Doctors** | Add doctors to camp |
| **Edit Camp Details** | Update location, date, requirements |
| **View Camp Calendar** | See all scheduled camps |

**Camp Fields:**
- Name, Location, Date
- Start/End time
- Required doctors count
- Specialty required
- Notes

### 7. **Analytics Dashboard** (`/analytics` - Admin Only)

| Metric | Description |
|--------|-------------|
| **Duty Distribution** | Fairness across doctors |
| **Night Duty Stats** | Who's doing most nights |
| **Specialty Coverage** | OT session distribution |
| **Leave Trends** | Leave patterns over time |
| **Attendance Overview** | Hospital-wide attendance |

### 8. **Academic Class Management** (`/academic`)

Admins can:
- **Create classes** (lectures, grand rounds, case presentations, etc.)
- **Assign moderators**
- **Schedule sessions**
- **Track attendance**

Class Types: `lecture`, `grand_rounds`, `case_presentation`, `journal_club`, `complication_meeting`, `nbems_class`, `pharma_quiz`, `exam`, `other`

---

## 👨‍⚕️ DOCTOR Functions

### Dashboard (`/dashboard` → DoctorDashboard)

When a doctor logs in, they see:

```
┌─────────────────────────────────────┐
│  Hello, Dr. Kumar                   │
│  Tuesday, December 31               │
├─────────────────────────────────────┤
│  🏥 TODAY'S DUTY                    │
│  ┌─────────────────────────────┐   │
│  │ OPD                   [OPD] │   │
│  │ 📍 OPD-1, General Unit      │   │
│  │ ⏰ 08:00 — 14:00            │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  🌙 Night Duty Doctor              │
│  Dr. Sharma  [📞 Call]             │
├─────────────────────────────────────┤
│  📊 Your Stats                      │
│  ├─ 24 Patients Today              │
│  ├─ 18 Duties This Month           │
│  ├─ 312 Patients This Month        │
│  └─ 4 Night Duties                 │
├─────────────────────────────────────┤
│  📈 Monthly Performance            │
│  12 OPD Sessions • 6 Surgeries     │
│  Attendance: 98%                   │
├─────────────────────────────────────┤
│  👥 Who's on duty today            │
│  ├─ Dr. Patel - OT-1              │
│  ├─ Dr. Singh - Ward              │
│  └─ +3 more                       │
└─────────────────────────────────────┘
```

### 1. **View Personal Dashboard**

| Feature | Description |
|---------|-------------|
| **Today's Duty** | Current assigned duty with time & location |
| **Night Duty Contact** | Quick call to night duty doctor |
| **Personal Stats** | Patients handled, duties completed |
| **Performance Summary** | OPD sessions, surgeries, attendance |
| **Colleagues on Duty** | See who else is working today |

### 2. **View Roster** (`/roster`)

| Feature | Description |
|---------|-------------|
| **Monthly Calendar View** | See full month roster |
| **Yearly Overview** | Annual duty distribution |
| **Filter by Doctor** | Search specific doctor's schedule |
| **Export** | Download as PDF/Excel |

**Cannot:** Create, edit, or delete assignments

### 3. **Leave Requests** (`/leave`)

| Function | Description |
|----------|-------------|
| **Submit Leave Request** | Request Casual, Emergency, Medical, or Annual leave |
| **View Own Requests** | See status of submitted requests |
| **Track Approval Status** | Pending, Approved, or Rejected |

**Cannot:** View other doctors' leave requests or approve/reject

```typescript
// RLS Policy: Doctors see only their own
CREATE POLICY "Doctors can view own leave requests" 
ON public.leave_requests FOR SELECT 
USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()) 
       OR has_role(auth.uid(), 'admin'));
```

### 4. **Swap Requests**

| Function | Description |
|----------|-------------|
| **Request Swap** | Ask another doctor to swap duties |
| **Accept/Reject Incoming** | Respond to swap requests from others |
| **View Swap History** | See past swap requests |

**Flow:**
1. Doctor A requests swap with Doctor B
2. Doctor B accepts/rejects
3. Admin final approval (optional based on policy)

### 5. **Attendance** (`/attendance`)

| Function | Description |
|---------|-------------|
| **Punch In** | Record arrival time |
| **Punch Out** | Record departure time |
| **View Own Records** | See personal attendance history |

**Cannot:** View other doctors' attendance

### 6. **Academic Classes** (`/academic`)

| Function | Description |
|---------|-------------|
| **View Schedule** | See upcoming classes |
| **Mark Attendance** | Confirm participation |
| **View Topics** | See class details and materials |

**Cannot:** Create or manage classes (admin only)

### 7. **Messages** (`/messages`)

| Function | Description |
|---------|-------------|
| **View Channels** | Team channels, duty-based auto-channels |
| **Send Messages** | Chat with colleagues |
| **Read Announcements** | Hospital-wide announcements |

---

## 🔐 Security & Access Control

### Row Level Security (RLS) Policies

| Table | Admin | Doctor |
|-------|-------|--------|
| `doctors` | Full CRUD | Read only |
| `duty_assignments` | Full CRUD | Read only |
| `leave_requests` | Full CRUD | Create own, Read own |
| `swap_requests` | Full CRUD | Create own, Update own/targeted |
| `camps` | Full CRUD | Read only |
| `camp_assignments` | Full CRUD | Read only |
| `attendance_records` | Read all | CRUD own |
| `classes` | Full CRUD | Read only |
| `class_attendees` | Full CRUD | Update own attendance |
| `chat_messages` | Full access | Channel-based access |
| `activity_logs` | Read all | Insert only |
| `ai_scheduling_suggestions` | Full CRUD | No access |

### Route Protection

```typescript
// Admin-only routes (redirects doctors to /dashboard)
<Route path="/admin" element={<ProtectedRoute adminOnly>...</ProtectedRoute>} />
<Route path="/analytics" element={<ProtectedRoute adminOnly>...</ProtectedRoute>} />
<Route path="/camps" element={<ProtectedRoute adminOnly>...</ProtectedRoute>} />
<Route path="/doctors" element={<ProtectedRoute adminOnly>...</ProtectedRoute>} />

// Shared routes (both roles can access)
<Route path="/roster" element={<ProtectedRoute>...</ProtectedRoute>} />
<Route path="/leave" element={<ProtectedRoute>...</ProtectedRoute>} />
<Route path="/attendance" element={<ProtectedRoute>...</ProtectedRoute>} />
<Route path="/academic" element={<ProtectedRoute>...</ProtectedRoute>} />
<Route path="/messages" element={<ProtectedRoute>...</ProtectedRoute>} />
```

---

## 📱 Bottom Navigation

### Admin View
| Icon | Label | Route |
|------|-------|-------|
| 🏠 | Dashboard | `/dashboard` (AdminDashboard) |
| 📅 | Roster | `/roster` |
| 🎓 | Academic | `/academic` |
| 📄 | Leave | `/leave` |
| 🚪 | Logout | Sign out |

### Doctor View
| Icon | Label | Route |
|------|-------|-------|
| 🏠 | Dashboard | `/dashboard` (DoctorDashboard) |
| 📅 | Roster | `/roster` |
| 🎓 | Academic | `/academic` |
| 📄 | Leave | `/leave` |
| 🚪 | Logout | Sign out |

**Note:** Both roles see the same bottom nav, but the Dashboard redirects to role-specific views.

---

## 🎯 Summary

### Admin = Hospital Operations Manager
- **Creates** duty schedules, camps, classes
- **Manages** doctor profiles and capabilities
- **Approves** leave requests and swaps
- **Analyzes** hospital-wide metrics
- **Uses AI** for smart scheduling

### Doctor = Healthcare Provider
- **Views** their schedule and colleagues
- **Requests** leave and duty swaps
- **Tracks** personal performance
- **Attends** classes
- **Communicates** via team channels

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@hospital.com | admin123 |
| **Doctor** | doctor@hospital.com | doctor123 |
