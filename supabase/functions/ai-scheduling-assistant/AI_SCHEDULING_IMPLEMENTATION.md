# AI Scheduling Assistant - CP-SAT Implementation Guide

## 🎯 Purpose

This document provides the **exact implementation** for the Supabase Edge Function `ai-scheduling-assistant` using **Google OR-Tools CP-SAT solver** to generate optimal monthly doctor rosters that satisfy all hospital constraints.

---

## 📦 Installation & Setup

### **1. Install OR-Tools in Edge Function**

```typescript
// supabase/functions/ai-scheduling-assistant/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Note: OR-Tools needs to be imported via Python subprocess
// Deno doesn't have native OR-Tools support
// We'll use Python bridge or implement simplified constraint solver
```

### **2. Alternative: Use Python Subprocess**

Create `solver.py` in function directory:

```python
from ortools.sat.python import cp_model
import json
import sys

def solve_roster(data):
    model = cp_model.CpModel()
    
    # Extract input
    doctors = data['doctors']
    departments = data['departments']
    days = list(range(1, data['total_days'] + 1))
    leaves = data['leaves']
    
    # Variables: x[d, day, dept] = 1 if doctor d works in dept on day
    x = {}
    for d in doctors:
        for day in days:
            for dept in departments:
                x[d['id'], day, dept['code']] = model.NewBoolVar(
                    f"x_{d['id']}_{day}_{dept['code']}"
                )
    
    # Constraint 1: One duty per doctor per day
    for d in doctors:
        for day in days:
            model.Add(
                sum(x[d['id'], day, dept['code']] 
                    for dept in departments) <= 1
            )
    
    # Constraint 2: Department min/max staffing
    for day in days:
        for dept in departments:
            assigned = sum(x[d['id'], day, dept['code']] 
                          for d in doctors)
            model.Add(assigned >= dept['min_doctors'])
            model.Add(assigned <= dept['max_doctors'])
    
    # Constraint 3: Leave blocking
    for leave in leaves:
        for day in range(leave['start_day'], leave['end_day'] + 1):
            for dept in departments:
                model.Add(x[leave['doctor_id'], day, dept['code']] == 0)
    
    # Constraint 4: Eligibility (designation & specialization)
    for d in doctors:
        for day in days:
            for dept in departments:
                if not is_eligible(d, dept):
                    model.Add(x[d['id'], day, dept['code']] == 0)
    
    # Constraint 5: Fellow 3-month restriction
    for d in doctors:
        if d['designation'] == 'FELLOW' and d['months_since_joining'] < 3:
            allowed_depts = ['FREE_UNIT', 'UNIT1', 'UNIT2', 'UNIT3', 'UNIT4']
            for day in days:
                for dept in departments:
                    if dept['code'] not in allowed_depts:
                        model.Add(x[d['id'], day, dept['code']] == 0)
    
    # Constraint 6: PG Year restrictions
    for d in doctors:
        if d['designation'] == 'PG':
            for day in days:
                for dept in departments:
                    if d['pg_year'] == 'YEAR1':
                        if dept['code'] not in ['PHYSICIAN', 'DAYCARE', 'FREE_UNIT']:
                            model.Add(x[d['id'], day, dept['code']] == 0)
                    elif d['pg_year'] == 'YEAR2':
                        if dept['code'] not in ['UNIT1', 'UNIT2', 'UNIT3', 'UNIT4']:
                            model.Add(x[d['id'], day, dept['code']] == 0)
    
    # Constraint 7: PG Year 3 mandatory rotations
    pg_rotations = {
        'UVEA': 15, 'ORBIT': 15, 'PAEDIATRIC': 15,
        'IOL': 30, 'RETINA': 30, 'GLAUCOMA': 30, 'CORNEA': 30
    }
    for d in doctors:
        if d['designation'] == 'PG' and d['pg_year'] == 'YEAR3':
            for dept_code, required_days in pg_rotations.items():
                # Get already completed days
                completed = d.get('rotation_completed', {}).get(dept_code, 0)
                remaining = required_days - completed
                if remaining > 0:
                    model.Add(
                        sum(x[d['id'], day, dept_code] for day in days) >= remaining
                    )
    
    # Constraint 8: Ward composition (Emergency, Paid, Free)
    senior_consultants = [d for d in doctors if d['designation'] == 'SENIOR_CONSULTANT']
    mos = [d for d in doctors if d['designation'] == 'MO']
    
    for day in days:
        # Emergency Ward: 1 Senior + 1 MO
        model.Add(
            sum(x[d['id'], day, 'EMERGENCY_WARD'] for d in senior_consultants) >= 1
        )
        model.Add(
            sum(x[d['id'], day, 'EMERGENCY_WARD'] for d in mos) >= 1
        )
        
        # Paid Ward: 1 Senior + 1 MO
        model.Add(
            sum(x[d['id'], day, 'PAID_WARD'] for d in senior_consultants) >= 1
        )
        model.Add(
            sum(x[d['id'], day, 'PAID_WARD'] for d in mos) >= 1
        )
        
        # Free Ward: 1 MO
        model.Add(
            sum(x[d['id'], day, 'FREE_WARD'] for d in mos) >= 1
        )
    
    # Constraint 9: Senior Consultant experience
    for d in doctors:
        if d['designation'] == 'SENIOR_CONSULTANT':
            if d['experience_years'] < 5:
                # Block all assignments
                for day in days:
                    for dept in departments:
                        model.Add(x[d['id'], day, dept['code']] == 0)
    
    # Objective: Minimize workload imbalance (fairness)
    workload = {}
    for d in doctors:
        workload[d['id']] = sum(
            x[d['id'], day, dept['code']]
            for day in days
            for dept in departments
        )
    
    max_load = model.NewIntVar(0, len(days), 'max_load')
    min_load = model.NewIntVar(0, len(days), 'min_load')
    
    model.AddMaxEquality(max_load, list(workload.values()))
    model.AddMinEquality(min_load, list(workload.values()))
    
    # Minimize difference (balance workload)
    model.Minimize(max_load - min_load)
    
    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60.0
    status = solver.Solve(model)
    
    if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
        # Extract solution
        roster = {}
        for day in days:
            roster[day] = {}
            for dept in departments:
                roster[day][dept['code']] = []
                for d in doctors:
                    if solver.Value(x[d['id'], day, dept['code']]) == 1:
                        roster[day][dept['code']].append(d['id'])
        
        return {
            'success': True,
            'roster': roster,
            'status': 'optimal' if status == cp_model.OPTIMAL else 'feasible',
            'solve_time': solver.WallTime()
        }
    else:
        return {
            'success': False,
            'error': 'No solution found',
            'status': 'infeasible'
        }

def is_eligible(doctor, department):
    """Check if doctor is eligible for department"""
    # Designation check
    if doctor['designation'] not in department['allowed_designations']:
        return False
    
    # Specialization check
    if department.get('specialization_required'):
        if doctor['specialization_type'] != department['specialization_required']:
            # PGs can work in any specialty for rotations
            if doctor['designation'] != 'PG':
                return False
    
    return True

if __name__ == '__main__':
    input_data = json.loads(sys.stdin.read())
    result = solve_roster(input_data)
    print(json.dumps(result))
```

---

## 🔧 Edge Function Implementation

```typescript
// supabase/functions/ai-scheduling-assistant/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SchedulingRequest {
  month: number;
  year: number;
  total_days?: number;
}

serve(async (req) => {
  try {
    // CORS headers
    if (req.method === 'OPTIONS') {
      return new Response('ok', { 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
        } 
      })
    }

    // Parse request
    const { month, year, total_days } = await req.json() as SchedulingRequest
    
    // Validate
    if (!month || !year) {
      return new Response(
        JSON.stringify({ error: 'Month and year required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Calculate total days if not provided
    const days = total_days || new Date(year, month, 0).getDate()

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get auth user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check admin role
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (userRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Generating roster for ${month}/${year} (${days} days)`)

    // STEP 1: Fetch all active doctors with full details
    const { data: doctors, error: doctorsError } = await supabaseClient
      .from('doctors')
      .select(`
        id, name, designation, specialization_type, experience_years,
        joining_date, pg_year, months_since_joining,
        eligible_units, eligible_departments, is_active
      `)
      .eq('is_active', true)

    if (doctorsError) throw doctorsError

    console.log(`Fetched ${doctors.length} active doctors`)

    // STEP 2: Fetch department configurations
    const { data: departments, error: deptsError } = await supabaseClient
      .from('department_config')
      .select('*')
      .eq('is_active', true)

    if (deptsError) throw deptsError

    console.log(`Fetched ${departments.length} departments`)

    // STEP 3: Fetch approved leaves for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = `${year}-${String(month).padStart(2, '0')}-${days}`

    const { data: leaves, error: leavesError } = await supabaseClient
      .from('leave_requests')
      .select('doctor_id, start_date, end_date')
      .eq('status', 'approved')
      .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)

    if (leavesError) throw leavesError

    console.log(`Fetched ${leaves.length} approved leaves`)

    // STEP 4: Fetch PG rotation status
    const { data: pgRotations, error: pgError } = await supabaseClient
      .from('pg_rotation_tracking')
      .select('doctor_id, department_code, completed_days, required_days')
      .eq('is_completed', false)

    if (pgError) throw pgError

    // Group rotations by doctor
    const rotationsByDoctor = pgRotations.reduce((acc, rot) => {
      if (!acc[rot.doctor_id]) acc[rot.doctor_id] = {}
      acc[rot.doctor_id][rot.department_code] = rot.completed_days
      return acc
    }, {} as Record<string, Record<string, number>>)

    // STEP 5: Check if roster already exists
    const { data: existingRoster } = await supabaseClient
      .from('monthly_rosters')
      .select('id, status')
      .eq('month', month)
      .eq('year', year)
      .single()

    let rosterId: string

    if (existingRoster) {
      if (existingRoster.status === 'finalized') {
        return new Response(
          JSON.stringify({ error: 'Roster already finalized' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      rosterId = existingRoster.id
      console.log(`Using existing roster: ${rosterId}`)
    } else {
      // Create new roster
      const { data: newRoster, error: rosterError } = await supabaseClient
        .from('monthly_rosters')
        .insert({
          month,
          year,
          total_days: days,
          status: 'draft',
          generated_by: user.id
        })
        .select()
        .single()

      if (rosterError) throw rosterError
      rosterId = newRoster.id
      console.log(`Created new roster: ${rosterId}`)
    }

    // STEP 6: Prepare data for Python solver
    const solverInput = {
      doctors: doctors.map(d => ({
        ...d,
        rotation_completed: rotationsByDoctor[d.id] || {}
      })),
      departments: departments.map(d => ({
        code: d.department_code,
        name: d.department_name,
        min_doctors: d.min_doctors,
        max_doctors: d.max_doctors,
        allowed_designations: d.allowed_designations,
        specialization_required: d.specialization_required
      })),
      total_days: days,
      leaves: leaves.map(l => ({
        doctor_id: l.doctor_id,
        start_day: new Date(l.start_date).getDate(),
        end_day: new Date(l.end_date).getDate()
      }))
    }

    // STEP 7: Call Python solver (via subprocess)
    const process = Deno.run({
      cmd: ['python3', 'solver.py'],
      stdin: 'piped',
      stdout: 'piped',
      stderr: 'piped'
    })

    await process.stdin.write(new TextEncoder().encode(JSON.stringify(solverInput)))
    await process.stdin.close()

    const output = await process.output()
    const errorOutput = await process.stderrOutput()
    process.close()

    if (errorOutput.length > 0) {
      console.error('Solver error:', new TextDecoder().decode(errorOutput))
      throw new Error('Solver failed')
    }

    const result = JSON.parse(new TextDecoder().decode(output))

    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not generate feasible roster',
          details: result.error 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // STEP 8: Save assignments to database
    const assignments = []
    for (const [day, deptAssignments] of Object.entries(result.roster)) {
      for (const [deptCode, doctorIds] of Object.entries(deptAssignments as Record<string, string[]>)) {
        for (const doctorId of doctorIds) {
          assignments.push({
            roster_id: rosterId,
            doctor_id: doctorId,
            duty_date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            department_code: deptCode,
            status: 'assigned',
            assigned_by: user.id,
            assigned_at: new Date().toISOString()
          })
        }
      }
    }

    // Delete old assignments if regenerating
    await supabaseClient
      .from('roster_assignments')
      .delete()
      .eq('roster_id', rosterId)

    // Insert new assignments
    const { error: assignError } = await supabaseClient
      .from('roster_assignments')
      .insert(assignments)

    if (assignError) throw assignError

    console.log(`Created ${assignments.length} assignments`)

    // STEP 9: Return success
    return new Response(
      JSON.stringify({
        success: true,
        roster_id: rosterId,
        assignments_created: assignments.length,
        solve_time_seconds: result.solve_time,
        status: result.status,
        metadata: {
          total_doctors: doctors.length,
          total_departments: departments.length,
          total_days: days
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## 🚀 Deployment Steps

### **1. Add Python solver to Edge Function**

```bash
cd supabase/functions/ai-scheduling-assistant
# Copy solver.py to function directory
```

### **2. Deploy Edge Function**

```bash
supabase functions deploy ai-scheduling-assistant
```

### **3. Test from Frontend**

```typescript
const { data, error } = await supabase.functions.invoke('ai-scheduling-assistant', {
  body: {
    month: 2,
    year: 2026
  }
})

if (error) {
  console.error('Scheduling failed:', error)
} else {
  console.log('Roster generated:', data)
  // Redirect to roster view page
  router.push(`/admin/roster/${data.roster_id}`)
}
```

---

## ✅ Validation & Testing

### **Test Cases**

1. ✅ Generate roster for February 2026 (28 days)
2. ✅ Verify all departments meet min/max staffing
3. ✅ Verify no leave conflicts
4. ✅ Verify Fellow 3-month restrictions
5. ✅ Verify PG year restrictions
6. ✅ Verify PG Year 3 mandatory rotations
7. ✅ Verify Emergency/Paid ward composition
8. ✅ Verify workload balance (fairness)

### **Query to Validate Generated Roster**

```sql
-- Check for violations
SELECT * FROM get_department_staffing('CORNEA', '2026-02-01');

-- Check PG rotations
SELECT * FROM pg_rotation_tracking WHERE is_completed = false;

-- Check workload balance
SELECT 
  d.name,
  COUNT(ra.id) as total_shifts
FROM doctors d
JOIN roster_assignments ra ON d.id = ra.doctor_id
GROUP BY d.id, d.name
ORDER BY total_shifts DESC;
```

---

## 📚 References

- [OR-Tools CP-SAT Solver](https://developers.google.com/optimization/cp/cp_solver)
- [Constraint Programming Guide](https://developers.google.com/optimization/cp)
- Hospital Duty Roster Rules (attached documents)

---

**Status: Ready for Implementation** ✅
