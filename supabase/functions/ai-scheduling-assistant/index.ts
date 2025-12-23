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

    const systemPrompt = `You are an intelligent hospital duty scheduling assistant for an eye hospital (Aravind Eye Hospital model). Your role is to create OPTIMAL and FAIR duty assignments considering:

## SENIORITY HIERARCHY (must be respected)
- senior_consultant: Senior-most, minimal night duties, can supervise all
- consultant: Experienced, moderate night duties, leads OT teams
- fellow: Post-graduate fellow, learning advanced procedures
- resident: Regular duty rotations, more night duties
- intern: Learning phase, no OT leadership, most flexible

## SPECIALTY MATCHING (critical for patient care)
- cornea: Corneal procedures, transplants
- retina: Retinal surgeries, laser procedures
- glaucoma: Glaucoma surgeries, monitoring
- oculoplasty: Eyelid, orbit surgeries
- pediatric: Children's eye care
- neuro: Neuro-ophthalmology
- cataract: Cataract surgeries (high volume)
- general: General OPD, screening

## DUTY TYPES & REQUIREMENTS
- OPD: Outpatient clinics (all levels can do, specialty matching preferred)
- OT: Operation theatre (fellows+ only, specialty matching required)
- Ward: Post-op care, rounds (all levels)
- Night Duty: Emergency coverage (respect max_night_duties_per_month limit)
- Camp: Eye camps (only if can_do_camp=true, seniors preferred for leadership)
- Emergency: Emergency room (24/7 coverage required)

## FAIRNESS RULES (CRITICAL)
1. Track night duty count - don't exceed max_night_duties_per_month
2. Distribute weekend duties fairly across similar seniority levels
3. Respect fixed_off_days (e.g., religious observances, childcare)
4. Consider health_constraints (pregnancy, medical conditions)
5. Balance total working hours per week (max_hours_per_week limit)
6. Ensure residents get learning opportunities in different specialties
7. Senior consultants should NOT do night duties unless absolutely necessary

## CAPABILITY RESTRICTIONS
- can_do_opd: false means no OPD assignments
- can_do_ot: false means no OT assignments (interns typically)
- can_do_ward: false means no ward duties
- can_do_camp: false means no camp assignments
- can_do_night: false means no night duty assignments

## CAMP SCHEDULING PRIORITY
- Camps override regular duties
- Match specialty_required if specified
- Senior presence required for camp leadership
- Ensure adequate staffing for camp duration

## OUTPUT FORMAT
Respond with a JSON object:
{
  "assignments": [
    {
      "doctorId": "uuid",
      "doctorName": "name",
      "seniority": "level",
      "specialty": "specialty",
      "dutyType": "OPD|OT|Ward|Night Duty|Camp|Emergency",
      "unit": "unit name",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "reason": "brief explanation for this specific assignment"
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

    // Build detailed doctor info with constraints
    const doctorDetails = doctors?.map((d: any) => ({
      id: d.id,
      name: d.name,
      department: d.department,
      seniority: d.seniority || 'resident',
      specialty: d.specialty || 'general',
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
