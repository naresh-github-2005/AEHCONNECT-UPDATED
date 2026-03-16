# 🎨 MONTHLY ROSTER SYSTEM - VISUAL ARCHITECTURE

## 📊 System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN INITIATES ROSTER                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │         Create Monthly Roster (Draft)              │
        │  • month = 2, year = 2026, total_days = 28         │
        └───────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
        ┌──────────────────────┐      ┌──────────────────────┐
        │   MANUAL ASSIGNMENT  │      │    AI GENERATION     │
        │                      │      │                      │
        │ Admin clicks "Add"   │      │ Click "Generate AI"  │
        │ Selects:             │      │                      │
        │  • Doctor            │      │ Edge Function calls  │
        │  • Date              │      │ Python OR-Tools      │
        │  • Department        │      │ CP-SAT Solver        │
        └──────────────────────┘      └──────────────────────┘
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │          INSERT roster_assignments                 │
        │  • roster_id                                       │
        │  • doctor_id                                       │
        │  • duty_date = '2026-02-15'                        │
        │  • department_code = 'CORNEA'                      │
        └───────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌───────────────────────────────────────────────────┐
        │       AUTOMATIC CONSTRAINT VALIDATION              │
        │  (via trg_validate_roster_assignment trigger)      │
        └───────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────┐
        │                                                     │
        ▼                                                     ▼
┌─────────────────┐                                  ┌─────────────────┐
│ ❌ VALIDATION   │                                  │ ✅ VALIDATION   │
│    FAILED       │                                  │    PASSED       │
├─────────────────┤                                  ├─────────────────┤
│ • Leave         │                                  │ Assignment      │
│   conflict      │                                  │ created!        │
│ • Multiple      │                                  │                 │
│   assignments   │                                  │ If PG Y3 &      │
│ • Wrong         │                                  │ status =        │
│   designation   │                                  │ 'completed':    │
│ • Fellow        │                                  │                 │
│   restriction   │                                  │ → Auto-update   │
│                 │                                  │   pg_rotation_  │
│ EXCEPTION       │                                  │   tracking      │
│ RAISED          │                                  │                 │
└─────────────────┘                                  └─────────────────┘
```

---

## 🏗️ Database Table Relationships

```
                    ┌──────────────────────────┐
                    │     auth.users           │
                    │ (Supabase Auth)          │
                    └────────┬─────────────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
                    ▼                  ▼
        ┌──────────────────┐    ┌──────────────────┐
        │   user_roles     │    │   doctors        │
        ├──────────────────┤    ├──────────────────┤
        │ user_id (FK)     │    │ user_id (FK)     │
        │ role: 'admin'    │    │ designation NEW  │
        └──────────────────┘    │ specialization   │
                                │ experience_years │
                                │ joining_date     │
                                │ pg_year          │
                                │ eligible_units   │
                                └────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │ monthly_rosters  │  │ leave_requests   │  │pg_rotation_      │
        ├──────────────────┤  ├──────────────────┤  │  tracking        │
        │ month            │  │ doctor_id (FK)   │  ├──────────────────┤
        │ year             │  │ start_date       │  │ doctor_id (FK)   │
        │ status           │  │ end_date         │  │ department_code  │
        │ total_days       │  │ status           │  │ required_days    │
        └────────┬─────────┘  └──────────────────┘  │ completed_days   │
                 │                                   │ remaining_days   │
                 │                                   │ is_completed     │
                 │                                   └──────────────────┘
                 │
                 │         ┌──────────────────┐
                 │         │department_config │
                 │         ├──────────────────┤
                 │         │ department_code  │
                 │         │ department_name  │
                 └─────┬───│ min_doctors      │
                       │   │ max_doctors      │
                       │   │ allowed_desig    │
                       │   │ specialization   │
                       │   └────────┬─────────┘
                       │            │
                       ▼            ▼
        ┌──────────────────────────────────┐
        │    roster_assignments            │
        ├──────────────────────────────────┤
        │ roster_id (FK)                   │
        │ doctor_id (FK)                   │
        │ duty_date                        │
        │ department_code (FK)             │
        │ status: 'assigned'/'completed'   │
        └──────────────┬───────────────────┘
                       │
                       │
                       ▼
        ┌──────────────────────────────────┐
        │    roster_swap_requests          │
        ├──────────────────────────────────┤
        │ requester_assignment_id (FK)     │
        │ target_assignment_id (FK)        │
        │ status: 'pending'/'approved'     │
        └──────────────────────────────────┘
```

---

## 🎯 Constraint Validation Flow

```
INSERT/UPDATE roster_assignments
         │
         ▼
    ┌────────────────────────┐
    │   TRIGGER FIRED        │
    │   validate_roster_     │
    │   assignment()         │
    └────────┬───────────────┘
             │
    ┌────────▼────────┐
    │ 1. Get doctor   │
    │    details      │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │ 2. Get dept     │
    │    config       │
    └────────┬────────┘
             │
    ┌────────▼─────────────────────┐
    │ CHECK 1: Leave Conflict?     │
    │ → Query leave_requests       │
    └────────┬─────────────────────┘
             │ ❌ Conflict? RAISE EXCEPTION
             │ ✅ No conflict? Continue
             ▼
    ┌────────▼─────────────────────┐
    │ CHECK 2: Multiple Assign?    │
    │ → Query roster_assignments   │
    └────────┬─────────────────────┘
             │ ❌ Exists? RAISE EXCEPTION
             │ ✅ No conflict? Continue
             ▼
    ┌────────▼─────────────────────┐
    │ CHECK 3: Designation OK?     │
    │ → Compare with allowed_desig │
    └────────┬─────────────────────┘
             │ ❌ Not allowed? RAISE EXCEPTION
             │ ✅ Allowed? Continue
             ▼
    ┌────────▼─────────────────────┐
    │ CHECK 4: Fellow 3-Month?     │
    │ → If Fellow & < 3 months     │
    │   → Only allow Units 1-4,    │
    │     FREE_UNIT                │
    └────────┬─────────────────────┘
             │ ❌ Violation? RAISE EXCEPTION
             │ ✅ OK? Continue
             ▼
    ┌────────▼─────────────────────┐
    │ CHECK 5: Senior Experience?  │
    │ → If Senior Consultant       │
    │   → Must have ≥5 years exp   │
    └────────┬─────────────────────┘
             │ ❌ Insufficient? RAISE EXCEPTION
             │ ✅ OK? Continue
             ▼
    ┌────────▼─────────────────────┐
    │ CHECK 6: PG Year?            │
    │ → Year 1: Physician/Daycare  │
    │ → Year 2: Units 1-4 only     │
    │ → Year 3: Mandatory rotations│
    └────────┬─────────────────────┘
             │ ❌ Violation? RAISE EXCEPTION
             │ ✅ OK? Continue
             ▼
    ┌────────▼─────────────────────┐
    │ CHECK 7: Specialization?     │
    │ → If dept requires specialty │
    │   → Doctor must match        │
    └────────┬─────────────────────┘
             │ ❌ Mismatch? RAISE EXCEPTION
             │ ✅ Match? Continue
             ▼
    ┌────────▼─────────────────────┐
    │ ✅ ALL CHECKS PASSED          │
    │    Assignment created!        │
    └───────────────────────────────┘
```

---

## 🤖 AI Scheduling Flow (OR-Tools CP-SAT)

```
Admin clicks "Generate AI Roster"
         │
         ▼
┌─────────────────────────────┐
│ Supabase Edge Function      │
│ ai-scheduling-assistant     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ STEP 1: Fetch Data          │
│ • Active doctors            │
│ • Department configs        │
│ • Approved leaves           │
│ • PG rotation status        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ STEP 2: Build Model         │
│ • Create variables:         │
│   x[doctor, day, dept]      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ STEP 3: Add Constraints     │
│ • One duty per day          │
│ • Dept min/max staffing     │
│ • Leave conflicts           │
│ • Designation rules         │
│ • Fellow restrictions       │
│ • PG year rules             │
│ • PG mandatory rotations    │
│ • Ward composition          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ STEP 4: Set Objective       │
│ Minimize: max_load - min_load│
│ (Fairness = Balance workload)│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ STEP 5: Solve with CP-SAT  │
│ OR-Tools solver runs        │
│ Max time: 60 seconds        │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌───────┐ ┌───────┐
│ NO    │ │ YES   │
│ SOL   │ │ SOL   │
└───┬───┘ └───┬───┘
    │         │
    │         ▼
    │    ┌─────────────────────────────┐
    │    │ STEP 6: Extract Solution    │
    │    │ • Parse x[d, day, dept]     │
    │    │ • Build roster JSON         │
    │    └────────┬────────────────────┘
    │             │
    │             ▼
    │    ┌─────────────────────────────┐
    │    │ STEP 7: Save to Database    │
    │    │ • Delete old assignments    │
    │    │ • Insert new assignments    │
    │    └────────┬────────────────────┘
    │             │
    │             ▼
    │    ┌─────────────────────────────┐
    │    │ ✅ SUCCESS!                  │
    │    │ Return roster_id &           │
    │    │ assignments_created          │
    │    └──────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│ ❌ FAILED                    │
│ Return error message         │
│ (Impossible to satisfy       │
│  all constraints)            │
└──────────────────────────────┘
```

---

## 📅 Monthly Roster Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  DRAFT   │ --> │PUBLISHED │ --> │FINALIZED │ --> │ ARCHIVED │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                 │                 │
     │                │                 │                 │
     ▼                ▼                 ▼                 ▼
Admin can       Visible to        Locked -          Historical
edit/delete     all users      no changes         record only
assignments                       allowed
     │                │                 │
     │                │                 │
     ▼                ▼                 ▼
Can add new    Doctors can        Marked as
assignments    request swaps      'completed'
manually or                       for stats
via AI

Status transitions (UPDATE):
• draft → published → finalized → archived
• Can skip to finalized directly
• Cannot go backwards
```

---

## 👥 User Roles & Permissions

```
┌─────────────────────────────────────────────────────────┐
│                    ADMIN USER                            │
├─────────────────────────────────────────────────────────┤
│ ✅ CREATE: Generate rosters, add assignments             │
│ ✅ READ: View all rosters, analytics, violations         │
│ ✅ UPDATE: Edit assignments, approve swaps, finalize     │
│ ✅ DELETE: Remove assignments, cancel rosters            │
│ ✅ MANAGE: Department configs, doctor profiles           │
└─────────────────────────────────────────────────────────┘
                             │
                             │
        ┌────────────────────┴────────────────────┐
        │                                         │
        ▼                                         ▼
┌─────────────────────┐               ┌─────────────────────┐
│   DOCTOR USER       │               │    PUBLIC           │
├─────────────────────┤               ├─────────────────────┤
│ ✅ READ: Own duties  │               │ ✅ READ: All rosters │
│ ✅ READ: Rotation    │               │ ✅ READ: Dept config │
│   progress          │               │ ❌ Cannot modify     │
│ ✅ CREATE: Swap      │               └─────────────────────┘
│   requests          │
│ ❌ Cannot modify     │
│   others' duties    │
└─────────────────────┘
```

---

## 🎓 PG Year 3 Rotation Tracking

```
Doctor: Dr. John Doe (PG Year 3)

┌────────────────────────────────────────────────────────┐
│        PG ROTATION TRACKING (Auto-Updates)             │
├────────────────────────────────────────────────────────┤
│ Department  │ Required │ Completed │ Remaining │ Done │
├─────────────┼──────────┼───────────┼───────────┼──────┤
│ UVEA        │  15 days │   15 days │    0 days │  ✅  │
│ ORBIT       │  15 days │   10 days │    5 days │  ⏳  │
│ PAEDIATRIC  │  15 days │    0 days │   15 days │  ❌  │
│ IOL         │  30 days │   20 days │   10 days │  ⏳  │
│ RETINA      │  30 days │    5 days │   25 days │  ⏳  │
│ GLAUCOMA    │  30 days │    0 days │   30 days │  ❌  │
│ CORNEA      │  30 days │    0 days │   30 days │  ❌  │
├─────────────┼──────────┼───────────┼───────────┼──────┤
│ TOTAL       │ 165 days │   50 days │  115 days │  30% │
└─────────────┴──────────┴───────────┴───────────┴──────┘

When assignment status = 'completed':
→ Trigger automatically updates completed_days + 1
→ remaining_days recalculated
→ is_completed = true when completed >= required
```

---

## 📊 Dashboard Analytics Queries

```
┌──────────────────────────────────────────────────────┐
│           ADMIN DASHBOARD WIDGETS                     │
├──────────────────────────────────────────────────────┤
│                                                       │
│  📅 CURRENT ROSTER STATUS                             │
│  • Status: Published                                 │
│  • Total Assignments: 420                            │
│  • Doctors Involved: 15                              │
│  • Completion: 45% (189/420)                         │
│                                                       │
│  ⚠️  CONSTRAINT VIOLATIONS                            │
│  • Critical: 0                                       │
│  • High: 2 (Understaffed ORBIT on Feb 15, 22)       │
│  • Medium: 5                                         │
│                                                       │
│  👥 WORKLOAD BALANCE                                  │
│  • Max shifts: Dr. A (22 shifts)                     │
│  • Min shifts: Dr. B (10 shifts)                     │
│  • Avg shifts: 14 shifts                             │
│  • Balance score: 85% (Good)                         │
│                                                       │
│  🎓 PG ROTATION PROGRESS                              │
│  • Dr. X: 45% complete (75/165 days)                 │
│  • Dr. Y: 20% complete (33/165 days)                 │
│  • Dr. Z: 80% complete (132/165 days)                │
│                                                       │
│  🔄 PENDING SWAP REQUESTS                             │
│  • 3 pending                                         │
│  • 12 approved this month                            │
│  • 1 rejected                                        │
│                                                       │
└──────────────────────────────────────────────────────┘

All powered by SQL queries in implementation guide!
```

---

## 🚀 Quick Start Checklist

```
[ ] 1. Run ADD_ROSTER_SYSTEM.sql in Supabase SQL Editor
        ↓
[ ] 2. Update doctors table with:
        • designation (SENIOR_CONSULTANT, MO, FELLOW, PG)
        • specialization_type (CORNEA, RETINA, etc.)
        • experience_years (integer)
        • joining_date (date)
        • pg_year (YEAR1/YEAR2/YEAR3 for PG only)
        ↓
[ ] 3. Initialize PG rotations:
        SELECT initialize_pg_rotations(id) 
        FROM doctors WHERE pg_year = 'YEAR3';
        ↓
[ ] 4. Test manual assignment:
        INSERT INTO roster_assignments (...)
        ↓
[ ] 5. Build frontend UI:
        • Admin roster management page
        • Doctor roster view page
        ↓
[ ] 6. Deploy AI Edge Function:
        • Copy solver.py
        • Deploy to Supabase
        ↓
[ ] 7. Test AI generation:
        supabase.functions.invoke('ai-scheduling-assistant')
        ↓
[ ] 8. Train admin users on CRUD operations
        ↓
[ ] ✅ PRODUCTION READY!
```

---

**🎨 All diagrams are conceptual representations of the implementation**

For actual SQL code and examples, see:
- `ADD_ROSTER_SYSTEM.sql` - Execute this first
- `ROSTER_EXECUTION_SUMMARY.md` - Step-by-step guide
- `docs/MONTHLY_ROSTER_IMPLEMENTATION_GUIDE.md` - Complete reference
