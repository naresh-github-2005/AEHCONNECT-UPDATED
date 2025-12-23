import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doctors, leaveRequests, existingAssignments, targetDate, dutyStats, camps } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing advanced scheduling request for date:", targetDate);
    console.log("Doctors count:", doctors?.length);
    console.log("Leave requests count:", leaveRequests?.length);
    console.log("Duty stats count:", dutyStats?.length);
    console.log("Camps count:", camps?.length);

    const systemPrompt = `You are an intelligent hospital duty scheduling assistant for an eye hospital (Aravind Eye Hospital model). Your role is to create OPTIMAL and FAIR duty assignments based on REAL hospital patterns.

## DESIGNATION HIERARCHY (critical - determines duty eligibility)
- consultant: Senior-most, leadership roles, Today Doctor, no night duty
- mo (Medical Officer): Full OT days, specialty OTs, can be Today Doctor, minimal night duty
- fellow: Partial OT exposure, learning advanced procedures, can do night duty
- pg (Post-Graduate/Resident): OPD-heavy, ward rounds, night duty, LIMITED OT (never full day alone)

## REAL PATTERNS FROM HOSPITAL DATA
1. PGs are NEVER given full-day high-volume OTs alone
2. Fellows get quota-based OT exposure (partial blocks)
3. Consultants/MOs absorb high-load days
4. Performance score directly affects OT exposure
5. Night duty rotates among juniors (PG/Fellow), avoiding back-to-back

## PERFORMANCE-BASED ASSIGNMENT
- Doctors with higher performance_score (0-100) get:
  - More Cataract OT slots
  - More Specialty OT assignments
  - After-10:30 AM OT slots (premium)
- Low performers/trainees get: OPD, Free OP, short OT blocks only

## SPECIALTY MATCHING (for OT assignments)
- cataract: High-volume cataract surgeries
- retina: Retinal surgeries, laser procedures
- glaucoma: Glaucoma surgeries
- cornea: Corneal procedures, transplants
- oculoplasty: Eyelid, orbit surgeries
- pediatric: Children's eye care
- general: OPD, screening, basic procedures

## DUTY TYPES & ELIGIBILITY RULES
| Duty Type    | Eligible Designations        | Notes                           |
|--------------|-----------------------------|---------------------------------|
| Specialty OT | mo, consultant, fellow      | Match specialty required        |
| Cataract OT  | fellow, mo, consultant      | High volume, needs experience   |
| Night Duty   | pg, fellow                  | Rotate, avoid consecutive days  |
| Today Doctor | mo, consultant              | Senior supervisory/coordination |
| OPD          | all                         | Training opportunity for PGs    |
| Ward         | all                         | Post-op care, rounds            |
| Camp         | can_do_camp=true, senior preferred | Leadership required      |

## FAIRNESS RULES (CRITICAL)
1. Max night duties per week: 2
2. Max OT days per week (PG): 2
3. Avoid same duty 2 days in a row for same doctor
4. Rotate night duty among PG/Fellow doctors
5. Respect fixed_off_days (religious observances, childcare)
6. Consider health_constraints (pregnancy, medical conditions)
7. Track night_duty_count vs max_night_duties_per_month

## LEAVE HANDLING RULE
When many doctors on leave:
- OPD load increases for remaining seniors
- OT quotas remain protected (training requirement)
- OT absorbs shock → OPD absorbs remaining shock

## TRAINING QUOTAS (for PGs)
- PGs must appear in OT at least 8 hours/week (observation/assistance)
- But NEVER full-day OT alone
- Preference for varied specialty exposure

## OUTPUT FORMAT
Respond with a JSON object:
{
  "assignments": [
    {
      "doctorId": "uuid",
      "doctorName": "name",
      "designation": "pg|fellow|mo|consultant",
      "specialty": "specialty",
      "performanceScore": 0-100,
      "dutyType": "OPD|Cataract OT|Retina OT|Glaucoma OT|Cornea OT|Night Duty|Ward|Today Doctor|Camp|Emergency",
      "unit": "OT-1|OT-2|OPD-1|OPD-2|Emergency|Ward-A|etc",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "reason": "brief explanation (e.g., 'High performer, matched specialty')"
    }
  ],
  "reasoning": "overall explanation of scheduling decisions and fairness considerations",
  "workloadSummary": {
    "balanced": true/false,
    "fairnessScore": 0-100,
    "concerns": ["list of any fairness or coverage concerns"],
    "notes": "recommendations or warnings"
  },
  "campAssignments": [
    {
      "campId": "uuid",
      "campName": "name",
      "assignedDoctors": [{"doctorId": "uuid", "doctorName": "name", "role": "lead|support"}]
    }
  ]
}`;

    // Build detailed doctor info with constraints and performance data
    const doctorDetails = doctors?.map((d: any) => ({
      id: d.id,
      name: d.name,
      department: d.department,
      designation: d.designation || 'pg',
      seniority: d.seniority || 'resident',
      specialty: d.specialty || 'general',
      performanceScore: d.performance_score || 70,
      eligibleDuties: d.eligible_duties || [],
      unit: d.unit || 'Unit 1',
      maxNightDutiesPerMonth: d.max_night_duties_per_month || 8,
      maxHoursPerWeek: d.max_hours_per_week || 48,
      fixedOffDays: d.fixed_off_days || [],
      healthConstraints: d.health_constraints || null,
      capabilities: {
        canDoOpd: d.can_do_opd !== false,
        canDoOt: d.can_do_ot !== false,
        canDoWard: d.can_do_ward !== false,
        canDoCamp: d.can_do_camp === true,
        canDoNight: d.can_do_night !== false
      }
    })) || [];

    // Build duty stats context
    const statsContext = dutyStats?.map((s: any) => ({
      doctorId: s.doctor_id,
      month: s.month,
      year: s.year,
      nightDutyCount: s.night_duty_count,
      weekendDutyCount: s.weekend_duty_count,
      totalHours: s.total_hours,
      campCount: s.camp_count
    })) || [];

    // Build camp info
    const campDetails = camps?.map((c: any) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      date: c.camp_date,
      startTime: c.start_time,
      endTime: c.end_time,
      requiredDoctors: c.required_doctors,
      specialtyRequired: c.specialty_required,
      notes: c.notes
    })) || [];

    const userPrompt = `Create optimal duty assignments for ${targetDate}.

## AVAILABLE DOCTORS (with constraints)
${JSON.stringify(doctorDetails, null, 2)}

## LEAVE REQUESTS (doctors unavailable on ${targetDate})
${JSON.stringify(leaveRequests?.filter((l: any) => l.status === 'approved' || l.status === 'Approved') || [], null, 2)}

## CURRENT MONTH DUTY STATISTICS (for fairness tracking)
${JSON.stringify(statsContext, null, 2)}

## SCHEDULED CAMPS ON ${targetDate}
${JSON.stringify(campDetails.filter((c: any) => c.date === targetDate), null, 2)}

## RECENT ASSIGNMENTS (for context on workload patterns)
${JSON.stringify(existingAssignments?.slice(0, 30) || [], null, 2)}

## TASK
1. First, assign doctors to any camps scheduled for this date
2. Then, create a balanced schedule for remaining doctors
3. Ensure Emergency coverage (24/7 requirement)
4. Match specialties to appropriate units where possible
5. Respect all constraints (seniority, capabilities, limits)
6. Maximize fairness in duty distribution

Create assignments that are FAIR, SAFE, and OPTIMAL for patient care.`;

    console.log("Sending advanced scheduling request to AI...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log("AI response received, parsing...");

    // Extract JSON from the response
    let result;
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.log("Raw content:", content);
      
      // Return a structured error with the raw content
      return new Response(JSON.stringify({ 
        error: "Failed to parse AI response",
        rawContent: content 
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Successfully generated advanced scheduling suggestions");
    console.log("Assignments count:", result.assignments?.length);
    console.log("Camp assignments:", result.campAssignments?.length || 0);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in ai-scheduling-assistant:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
